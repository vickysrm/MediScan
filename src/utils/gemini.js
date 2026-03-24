import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileToBase64, preprocessImage } from "./file.js";

const modelCache = new Map();
const responseCache = new Map();

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getModel(apiKey) {
  if (!apiKey) throw new Error("Missing Gemini API key. Please enter your API key.");
  if (modelCache.has(apiKey)) return modelCache.get(apiKey);
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
      topP: 0.8,
      topK: 20,
    },
  });
  modelCache.set(apiKey, model);
  return model;
}

function buildPrompt(language, passNum) {
  const basePrompt = `You are an expert clinical pharmacist and OCR specialist. Your job is to read prescription images with extreme accuracy.

TASK: Read this prescription image and extract every piece of medication information.

ACCURACY RULES:
- Read character by character, especially numbers
- If handwriting is unclear, consider what makes pharmacological sense
- Drug names often end in: -olol, -pril, -sartan, -statin, -azole, -mycin

COMMON MEDICATIONS:
Pain: Ibuprofen(200-800mg), Paracetamol(500-1000mg), Diclofenac(50-100mg)
BP: Amlodipine(2.5-10mg), Losartan(25-100mg), Metoprolol(25-200mg)
Diabetes: Metformin(500-2000mg), Glimepiride(1-4mg)
Cholesterol: Atorvastatin(10-80mg), Rosuvastatin(5-40mg)
Gastric: Pantoprazole(20-40mg), Omeprazole(20-40mg)
Antibiotics: Amoxicillin(250-1000mg), Azithromycin(250-500mg)

INDIAN BRANDS: Zevert, Ecosprin, Amlodac, Glycomet SR, Pantop, Storvas, Rosuvas, Telma`;

  return `${basePrompt}

Return ONLY this JSON:
{
  "medications": [
    {
      "drugClass": "pharmacological class",
      "drugName": "name as written",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "instructions": [],
      "warnings": [],
      "interactions": [],
      "alternatives": [],
      "confidence": "high",
      "prescriber": "Not specified",
      "refills": "Not specified"
    }
  ]
}

Translate to ${language}.`;
}

async function callAPI(model, prompt, imagePart, timeoutMs = 60000) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
    });

    try {
      const content = imagePart ? [prompt, imagePart] : [prompt];
      const result = await Promise.race([
        model.generateContent(content),
        timeoutPromise,
      ]);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (attempt < 2 && (err.message?.includes("429") || err.message?.includes("rate") || err.message?.includes("RESOURCE_EXHAUSTED"))) {
        await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

export async function interpretPrescriptionFromImage(file, language, onProgress, apiKey) {
  onProgress?.(10);

  const enhancedFile = await preprocessImage(file);
  onProgress?.(25);

  const { base64, mimeType } = await fileToBase64(enhancedFile);
  onProgress?.(40);

  // Check cache
  const cacheKey = await hashString(base64.substring(0, 1000));
  if (responseCache.has(cacheKey)) {
    console.log('Using cached result');
    onProgress?.(100);
    return responseCache.get(cacheKey);
  }

  const model = getModel(apiKey);
  const imagePart = { inlineData: { data: base64, mimeType } };
  const prompt = buildPrompt(language, 1);
  
  onProgress?.(50);
  const result = await callAPI(model, prompt, imagePart);
  onProgress?.(100);

  if (result && result.medications) {
    responseCache.set(cacheKey, result);
    if (responseCache.size > 10) {
      const firstKey = responseCache.keys().next().value;
      responseCache.delete(firstKey);
    }
  }

  return result;
}