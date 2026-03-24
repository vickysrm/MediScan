import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileToBase64, preprocessImage } from "./file.js";

const responseCache = new Map();

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function getModel(apiKey) {
  if (!apiKey) throw new Error("Missing Gemini API key");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });
}

function buildPrompt(language) {
  return `You are an expert clinical pharmacist. Read this prescription image and extract medication details.

Extract: drugClass, drugName, dosage, frequency, instructions, warnings.

Return ONLY JSON:
{"medications": [{"drugClass": "class", "drugName": "name", "dosage": "dose", "frequency": "freq", "instructions": [], "warnings": [], "interactions": [], "alternatives": [], "confidence": "high", "prescriber": "N/A", "refills": "N/A"}]}

Translate to ${language}.`;
}

export async function interpretPrescriptionFromImage(file, language, onProgress, apiKey) {
  onProgress?.(10);

  const enhancedFile = await preprocessImage(file);
  onProgress?.(25);

  const { base64, mimeType } = await fileToBase64(enhancedFile);
  onProgress?.(40);

  // Check cache
  const cacheKey = await hashString(base64.substring(0, 500));
  if (responseCache.has(cacheKey)) {
    onProgress?.(100);
    return responseCache.get(cacheKey);
  }

  onProgress?.(50);

  const model = getModel(apiKey);
  
  try {
    const result = await model.generateContent([
      buildPrompt(language),
      { inlineData: { data: base64, mimeType } }
    ]);
    
    const text = result.response.text();
    const cleaned = text.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) throw new Error("No JSON in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    onProgress?.(100);

    if (parsed.medications) {
      responseCache.set(cacheKey, parsed);
      if (responseCache.size > 5) {
        const keys = Array.from(responseCache.keys());
        responseCache.delete(keys[0]);
      }
    }

    return parsed;
  } catch (err) {
    if (err.message?.includes("429") || err.message?.includes("rate")) {
      throw new Error("Rate limit reached. Please wait 1 minute and try again.");
    }
    throw err;
  }
}