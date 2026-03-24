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
  // Clear cache for new API key to ensure fresh model
  if (!modelCache.has(apiKey)) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-002",
    });
    modelCache.set(apiKey, model);
  }
  return modelCache.get(apiKey);
}

function buildPrompt(language) {
  return `You are an expert clinical pharmacist. Read this prescription image and extract medication details.

Extract: drug name, dosage, frequency, instructions, warnings.

Return JSON:
{"medications": [{"drugClass": "class", "drugName": "name", "dosage": "dose", "frequency": "freq", "instructions": [], "warnings": [], "interactions": [], "alternatives": [], "confidence": "high", "prescriber": "N/A", "refills": "N/A"}]}

Translate to ${language}.`;
}

async function callAPI(model, prompt, imagePart, timeoutMs = 60000) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const result = await Promise.race([
        model.generateContent([prompt, imagePart]),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Request timed out")), timeoutMs)),
      ]);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      if (attempt < 2 && (err.message?.includes("429") || err.message?.includes("rate"))) {
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
  const cacheKey = await hashString(base64.substring(0, 500));
  if (responseCache.has(cacheKey)) {
    onProgress?.(100);
    return responseCache.get(cacheKey);
  }

  const model = getModel(apiKey);
  const imagePart = { inlineData: { data: base64, mimeType } };
  
  onProgress?.(50);
  const result = await callAPI(model, buildPrompt(language), imagePart);
  onProgress?.(100);

  if (result?.medications) {
    responseCache.set(cacheKey, result);
    if (responseCache.size > 5) {
      const keys = Array.from(responseCache.keys());
      responseCache.delete(keys[0]);
    }
  }

  return result;
}