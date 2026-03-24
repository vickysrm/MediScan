import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { fileToBase64, preprocessImage } from "./file.js";

const responseCache = new Map();
const GEMINI_MODEL = "gemini-2.5-flash";

const RESPONSE_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    medications: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          drugClass: { type: SchemaType.STRING },
          drugName: { type: SchemaType.STRING },
          dosage: { type: SchemaType.STRING },
          frequency: { type: SchemaType.STRING },
          prescriber: { type: SchemaType.STRING },
          refills: { type: SchemaType.STRING },
          confidence: { type: SchemaType.STRING },
          instructions: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          warnings: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
          interactions: {
            type: SchemaType.ARRAY,
            items: {
              type: SchemaType.OBJECT,
              properties: {
                substance: { type: SchemaType.STRING },
                risk: { type: SchemaType.STRING },
                detail: { type: SchemaType.STRING },
              },
            },
          },
          alternatives: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
      },
    },
  },
};

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
}

function getModel(apiKey) {
  if (!apiKey) {
    throw new Error("Missing Gemini API key.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  });
}

function buildPrompt(language) {
  return `You are an expert clinical pharmacist.
Read the uploaded prescription image and extract medication details.
Return JSON only.
Translate patient-facing text to ${language}.
If a field is unreadable, use "Not specified".
If no medicine is confidently detected, return {"medications":[]}.`;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeMedication(medication) {
  if (!medication || typeof medication !== "object") {
    return null;
  }

  return {
    drugClass: medication.drugClass || "Unknown",
    drugName: medication.drugName || "Unknown",
    dosage: medication.dosage || "Not specified",
    frequency: medication.frequency || "Not specified",
    prescriber: medication.prescriber || "Not specified",
    refills: medication.refills || "Not specified",
    confidence: medication.confidence || "medium",
    instructions: Array.isArray(medication.instructions) ? medication.instructions.filter(Boolean) : [],
    warnings: Array.isArray(medication.warnings) ? medication.warnings.filter(Boolean) : [],
    interactions: Array.isArray(medication.interactions) ? medication.interactions.filter(Boolean) : [],
    alternatives: Array.isArray(medication.alternatives) ? medication.alternatives.filter(Boolean) : [],
  };
}

function parseGeminiPayload(text) {
  if (!text?.trim()) {
    throw new Error("Empty response from Gemini.");
  }

  const cleaned = text.replace(/```json|```/gi, "").trim();
  const parsed = JSON.parse(cleaned);

  if (Array.isArray(parsed)) {
    return { medications: parsed.map(normalizeMedication).filter(Boolean) };
  }

  if (Array.isArray(parsed?.medications)) {
    return {
      ...parsed,
      medications: parsed.medications.map(normalizeMedication).filter(Boolean),
    };
  }

  const singleMedication = normalizeMedication(parsed);
  if (singleMedication && singleMedication.drugName !== "Unknown") {
    return { medications: [singleMedication] };
  }

  return { medications: [] };
}

function mapGeminiError(err) {
  const message = `${err?.status || ""} ${err?.message || ""}`.toLowerCase();

  if (message.includes("api key") || message.includes("401") || message.includes("403") || message.includes("permission_denied")) {
    return "Invalid API key.";
  }

  if (message.includes("429") || message.includes("rate") || message.includes("quota") || message.includes("resource_exhausted")) {
    return "Rate limit reached. Wait 1 minute and try again.";
  }

  if (message.includes("404") || message.includes("not_found") || message.includes("model")) {
    return "Gemini model request failed. Refresh and try again.";
  }

  if (message.includes("network") || message.includes("fetch")) {
    return "Network error while contacting Gemini. Try again.";
  }

  if (message.includes("json") || message.includes("parse")) {
    return "Could not parse Gemini response. Try a clearer image.";
  }

  return "Could not read prescription. Try a clearer image.";
}

export async function interpretPrescriptionFromImage(file, language, onProgress, apiKey) {
  try {
    onProgress?.(10);

    const enhancedFile = await preprocessImage(file);
    onProgress?.(25);

    const { base64, mimeType } = await fileToBase64(enhancedFile);
    onProgress?.(40);

    const cacheKey = await hashString(`${language}:${base64.slice(0, 500)}`);
    if (responseCache.has(cacheKey)) {
      onProgress?.(100);
      return responseCache.get(cacheKey);
    }

    await delay(250);
    onProgress?.(55);

    const model = getModel(apiKey);
    const result = await model.generateContent([
      buildPrompt(language),
      { inlineData: { data: base64, mimeType } },
    ]);

    onProgress?.(85);

    const parsed = parseGeminiPayload(result.response.text());
    onProgress?.(100);

    responseCache.set(cacheKey, parsed);
    if (responseCache.size > 5) {
      const oldestKey = responseCache.keys().next().value;
      responseCache.delete(oldestKey);
    }

    return parsed;
  } catch (err) {
    console.error("Prescription scan failed:", err);
    throw new Error(mapGeminiError(err));
  }
}
