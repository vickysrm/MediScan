import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileToBase64, preprocessImage } from "./file.js";

export async function interpretPrescriptionFromImage(file, language, onProgress, apiKey) {
  try {
    onProgress?.(10);

    const { base64, mimeType } = await fileToBase64(file);
    onProgress?.(30);

    // Use different model name - gemini-pro-vision
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-pro-vision"
    });
    onProgress?.(50);

    // Try with different content structure
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mimeType,
          data: base64
        }
      },
      "Extract all medications from this prescription. Return as JSON with medications array containing drugName, dosage, frequency, drugClass."
    ]);
    
    onProgress?.(80);

    const responseText = result.response.text();
    
    // Find JSON in response
    let jsonStr = responseText;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      // Try to find array format
      const arrayMatch = responseText.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        try {
          const arr = JSON.parse(arrayMatch[0]);
          parsed = { medications: arr };
        } catch (e2) {}
      }
      
      if (!parsed) {
        parsed = {
          medications: [{
            drugClass: "Unknown",
            drugName: "Could not parse",
            dosage: "N/A",
            frequency: "N/A",
            instructions: ["Consult doctor"],
            warnings: [],
            interactions: [],
            alternatives: [],
            confidence: "low",
            prescriber: "N/A",
            refills: "N/A"
          }]
        };
      }
    }

    // Ensure medications array exists
    if (!parsed.medications) {
      parsed.medications = [];
    }

    onProgress?.(100);
    return parsed;

  } catch (err) {
    console.error("Error:", err);
    if (err.message?.includes("429")) {
      throw new Error("Rate limit. Wait 60 seconds.");
    }
    if (err.message?.includes("invalid") || err.message?.includes("API key") || err.message?.includes("not support")) {
      throw new Error("API key issue. Please get a new key with vision access from https://aistudio.google.com/app/apikey");
    }
    throw new Error("Could not read prescription: " + err.message);
  }
}