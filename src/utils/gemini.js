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
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

function buildPrompt(language) {
  return `You are an expert clinical pharmacist. Read this prescription image and extract medication details.

Return ONLY JSON:
{"medications": [{"drugClass": "class", "drugName": "name", "dosage": "dose", "frequency": "freq", "instructions": [], "warnings": [], "interactions": [], "alternatives": [], "confidence": "high", "prescriber": "N/A", "refills": "N/A"}]}

Translate to ${language}.`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function interpretPrescriptionFromImage(file, language, onProgress, apiKey) {
  try {
    onProgress?.(10);
    console.log("Processing image...");

    const enhancedFile = await preprocessImage(file);
    onProgress?.(25);
    console.log("Image preprocessed");

    const { base64, mimeType } = await fileToBase64(enhancedFile);
    onProgress?.(40);
    console.log("Image converted to base64, mime:", mimeType);

    // Check cache
    const cacheKey = await hashString(base64.substring(0, 500));
    if (responseCache.has(cacheKey)) {
      console.log("Using cached result");
      onProgress?.(100);
      return responseCache.get(cacheKey);
    }

    onProgress?.(50);

    // Wait a moment before API call
    await delay(500);

    const model = getModel(apiKey);
    console.log("Calling Gemini API...");
    
    const result = await model.generateContent([
      buildPrompt(language),
      { inlineData: { data: base64, mimeType } }
    ]);
    
    console.log("Got response from Gemini");
    const text = result.response.text();
    console.log("Response text length:", text.length);
    
    const cleaned = text.replace(/```json|```/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (!jsonMatch) {
      console.log("Raw response:", text);
      throw new Error("Could not parse prescription. Please try a clearer image.");
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    onProgress?.(100);
    console.log("Parsed result:", parsed);

    if (parsed.medications) {
      responseCache.set(cacheKey, parsed);
      if (responseCache.size > 5) {
        const keys = Array.from(responseCache.keys());
        responseCache.delete(keys[0]);
      }
    }

    return parsed;
  } catch (err) {
    console.error("Error:", err.message);
    if (err.message?.includes("429") || err.message?.includes("rate")) {
      throw new Error("Rate limit. Wait 1 minute.");
    }
    if (err.message?.includes("API key") || err.message?.includes("401") || err.message?.includes("403")) {
      throw new Error("Invalid API key.");
    }
    throw new Error("Could not read prescription. Try a clearer image.");
  }
}