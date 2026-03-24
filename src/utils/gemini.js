import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileToBase64, preprocessImage } from "./file.js";

export async function interpretPrescriptionFromImage(file, language, onProgress, apiKey) {
  try {
    onProgress?.(10);

    // Simple image processing
    const { base64, mimeType } = await fileToBase64(file);
    onProgress?.(30);

    // Create model
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash"
    });
    onProgress?.(50);

    // Create content with image
    const contents = [
      {
        role: "user",
        parts: [
          { text: "Extract all medication names, dosages, and frequencies from this prescription image. Return as JSON array." },
          { inlineData: { mimeType: mimeType, data: base64 } }
        ]
      }
    ];

    const result = await model.generateContent({ contents });
    onProgress?.(80);

    const responseText = result.response.text();
    
    // Try to extract JSON
    let jsonStr = responseText;
    if (responseText.includes("```json")) {
      jsonStr = responseText.split("```json")[1].split("```")[0];
    } else if (responseText.includes("{")) {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) jsonStr = match[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // If JSON parsing fails, create a basic response
      parsed = {
        medications: [{
          drugClass: "Unknown",
          drugName: "Could not parse",
          dosage: "N/A",
          frequency: "N/A",
          instructions: ["Please consult doctor"],
          warnings: [],
          interactions: [],
          alternatives: [],
          confidence: "low",
          prescriber: "N/A",
          refills: "N/A"
        }]
      };
    }

    onProgress?.(100);
    return parsed;

  } catch (err) {
    console.error("Error:", err);
    if (err.message?.includes("429")) {
      throw new Error("Rate limit. Please wait 60 seconds.");
    }
    if (err.message?.includes("invalid") || err.message?.includes("API key")) {
      throw new Error("Invalid API key. Get a new one from https://aistudio.google.com/app/apikey");
    }
    throw new Error("Could not read prescription. Try again with a clearer image.");
  }
}