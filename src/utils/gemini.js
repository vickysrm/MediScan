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

async function extractTextWithOCR(imageBase64, mimeType) {
  const formData = new FormData();
  const blob = await fetch(`data:${mimeType};base64,${imageBase64}`).then(r => r.blob());
  formData.append('file', blob, 'prescription.jpg');
  formData.append('language', 'auto');
  formData.append('isOverlay', 'false');

  const response = await fetch('https://api.ocr.space/parse', {
    method: 'POST',
    headers: {
      'apikey': 'helloworld', // Free demo key - 100 requests/day
    },
    body: formData
  });

  const data = await response.json();
  if (data.IsError) {
    throw new Error(data.ErrorMessage[0]);
  }
  return data.ParsedResults[0]?.ParsedText || '';
}

function buildPromptWithText(text, language) {
  const basePrompt = `You are an expert clinical pharmacist. Your job is to analyze this prescription text and extract medication information.

PRESCRIPTION TEXT:
${text}

TASK: Extract medication details - name, dosage, frequency, instructions, warnings.

COMMON MEDICATIONS:
Pain: Ibuprofen(200-800mg), Paracetamol(500-1000mg), Diclofenac(50-100mg), Tramadol(50-100mg)
BP: Amlodipine(2.5-10mg), Losartan(25-100mg), Telmisartan(20-80mg), Ramipril(1.25-10mg), Metoprolol(25-200mg)
Diabetes: Metformin(500-2000mg), Glimepiride(1-4mg), Sitagliptin(25-100mg)
Cholesterol: Atorvastatin(10-80mg), Rosuvastatin(5-40mg)
Gastric: Pantoprazole(20-40mg), Omeprazole(20-40mg)
Antibiotics: Amoxicillin(250-1000mg), Azithromycin(250-500mg), Ciprofloxacin(250-750mg)

Return ONLY this JSON:
{
  "medications": [
    {
      "drugClass": "pharmacological class",
      "drugName": "name as written",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "instructions": ["instructions"],
      "warnings": ["warnings"],
      "interactions": [],
      "alternatives": [],
      "confidence": "high",
      "prescriber": "doctor name if visible",
      "refills": "refill info"
    }
  ]
}`;

  return language !== 'English' ? `${basePrompt}\n\nTranslate to ${language}.` : basePrompt;
}

async function callAPI(model, prompt, timeoutMs = 60000) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
    });

    try {
      const result = await Promise.race([
        model.generateContent(prompt),
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

  // Check cache using image hash
  const cacheKey = await hashString(base64.substring(0, 1000));
  if (responseCache.has(cacheKey)) {
    console.log('Using cached result');
    onProgress?.(100);
    return responseCache.get(cacheKey);
  }

  onProgress?.(50);

  let extractedText;
  try {
    extractedText = await extractTextWithOCR(base64, mimeType);
  } catch (err) {
    console.warn('OCR failed, using Gemini directly:', err.message);
    extractedText = '';
  }

  onProgress?.(70);

  const model = getModel(apiKey);
  const prompt = buildPromptWithText(extractedText || '[Image]', language);
  
  const result = await callAPI(model, prompt);
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