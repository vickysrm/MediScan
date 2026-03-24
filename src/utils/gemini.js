import { GoogleGenerativeAI } from "@google/generative-ai";
import { fileToBase64, preprocessImage } from "./file.js";

const modelCache = new Map();

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

STEP-BY-STEP PROCESS:
1. First, transcribe ALL visible text exactly as written (this goes in rawText)
2. Then identify each medication mentioned
3. For each medication, extract: name, dosage, frequency, instructions, warnings
4. Cross-check: Does the dosage match the drug? (e.g., Metformin is usually 500mg or 1000mg, not 50mg)

ACCURACY RULES:
- Read character by character, especially numbers
- If handwriting is unclear, consider what makes pharmacological sense
- A "5" might be "S", a "0" might be "O", "1" might be "l"
- Drug names often end in common suffixes: -olol, -pril, -sartan, -statin, -azole, -mycin
- Dosages are almost always in mg, ml, mcg, or IU - verify units match

COMMON DRUG DATABASE:
Pain: Ibuprofen(200-800mg), Paracetamol(500-1000mg), Diclofenac(50-100mg), Tramadol(50-100mg)
BP: Amlodipine(2.5-10mg), Losartan(25-100mg), Telmisartan(20-80mg), Ramipril(1.25-10mg), Metoprolol(25-200mg)
Diabetes: Metformin(500-2000mg), Glimepiride(1-4mg), Sitagliptin(25-100mg), Voglibose(0.2-0.3mg)
Cholesterol: Atorvastatin(10-80mg), Rosuvastatin(5-40mg)
Gastric: Pantoprazole(20-40mg), Omeprazole(20-40mg), Rabeprazole(10-20mg)
Antibiotics: Amoxicillin(250-1000mg), Azithromycin(250-500mg), Ciprofloxacin(250-750mg)
Allergy: Cetirizine(10mg), Montelukast(10mg), Fexofenadine(120-180mg)
Blood Thinners: Aspirin(75-325mg), Clopidogrel(75mg), Ecosprin(75-150mg)
Thyroid: Thyroxine(25-200mcg)
Respiratory: Salbutamol(inhaler), Budesonide(inhaler)

INDIAN BRANDS: Zevert(16/24mg), Ecosprin(75/150mg), Amlodac(5mg), Glycomet SR(500mg), Pantop(20/40mg), Biselect(5mg), Hopace(5mg), Dicorate ER(250/500mg), Storvas(10/20mg), Rosuvas(5/10mg), Telma(20/40mg), Cilacar(10mg), Stamlo(5mg), Nexpro(20/40mg), Pan(20/40mg), Razo(20mg), Omez(20mg)`;

  const passNote = passNum === 2
    ? `\n\n=== VERIFICATION PASS ===
This is a second, careful verification read. Compare each character against the image.
- Are the drug names pharmacologically correct for the dosage shown?
- Could any characters be misread? (5/S, 0/O, 1/l, rn/m)
- Double-check all numbers, especially dosages.`
    : "";

  return `${basePrompt}${passNote}

Return ONLY this JSON:
{
  "medications": [
    {
      "drugClass": "pharmacological class",
      "drugName": "brand/generic name as written",
      "dosage": "e.g. 500mg",
      "frequency": "e.g. Twice daily",
      "instructions": ["specific instructions"],
      "warnings": ["safety warnings"],
      "interactions": [{"substance": "what to avoid", "risk": "high|moderate|low", "detail": "explanation"}],
      "alternatives": ["other possible readings if uncertain"],
      "confidence": "high|medium|low",
      "prescriber": "doctor name if visible, or Not specified",
      "refills": "refill info or Not specified"
    }
  ],
  "rawText": "EVERYTHING visible in the image, mark illegible parts with [?]"
}

Translate to ${language}. Drug names: keep original + translated.`;
}

async function callAPI(model, prompt, imagePart, timeoutMs = 60000) {
  let timeoutId;

  for (let attempt = 0; attempt < 3; attempt++) {
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Request timed out")), timeoutMs);
    });

    try {
      const result = await Promise.race([
        model.generateContent([prompt, imagePart]),
        timeoutPromise,
      ]);
      clearTimeout(timeoutId);
      const text = result.response.text();
      const cleaned = text.replace(/```json|```/g, "").trim();
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON object found in response");
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.message === "Request timed out") throw err;
      if (err.message?.includes("429") || err.message?.includes("rate") || err.message?.includes("RESOURCE_EXHAUSTED")) {
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
          continue;
        }
      }
      throw new Error(`Failed to parse AI response: ${err.message}`);
    }
  }
}

function mergeResults(pass1, pass2) {
  if (!pass1?.medications?.length) return pass2;
  if (!pass2?.medications?.length) return pass1;

  const merged = { ...pass1 };
  const usedPass2 = new Set();

  merged.medications = pass1.medications.map((med1) => {
    // Find best match in pass2 by drugName
    let bestMatch = null;
    let bestIdx = -1;
    for (let i = 0; i < pass2.medications.length; i++) {
      if (usedPass2.has(i)) continue;
      const med2 = pass2.medications[i];
      if (med1.drugName && med2.drugName &&
          med1.drugName.toLowerCase() === med2.drugName.toLowerCase()) {
        bestMatch = med2;
        bestIdx = i;
        break;
      }
    }

    // If no exact match, try first unused
    if (!bestMatch) {
      for (let i = 0; i < pass2.medications.length; i++) {
        if (!usedPass2.has(i)) {
          bestMatch = pass2.medications[i];
          bestIdx = i;
          break;
        }
      }
    }

    if (bestMatch) usedPass2.add(bestIdx);

    const result = { ...med1 };
    if (!bestMatch) return result;

    // If drug names differ, add as alternative and lower confidence
    if (med1.drugName && bestMatch.drugName && med1.drugName.toLowerCase() !== bestMatch.drugName.toLowerCase()) {
      const alternatives = new Set(result.alternatives || []);
      alternatives.add(bestMatch.drugName);
      if (med1.alternatives) med1.alternatives.forEach(a => alternatives.add(a));
      result.alternatives = [...alternatives];
      if (result.confidence === "high") result.confidence = "medium";
    }

    // Prefer pass2 dosage if more specific
    if (bestMatch.dosage && bestMatch.dosage !== "Not specified" && bestMatch.dosage.length > (med1.dosage || "").length) {
      result.dosage = bestMatch.dosage;
    }

    // Merge instructions and warnings (union)
    const allInstructions = new Set([...(med1.instructions || []), ...(bestMatch.instructions || [])]);
    result.instructions = [...allInstructions];
    const allWarnings = new Set([...(med1.warnings || []), ...(bestMatch.warnings || [])]);
    result.warnings = [...allWarnings];

    return result;
  });

  // Append any unmatched pass2 medications
  for (let i = 0; i < pass2.medications.length; i++) {
    if (!usedPass2.has(i)) {
      merged.medications.push(pass2.medications[i]);
    }
  }

  if (pass2.rawText && pass2.rawText.length > (pass1.rawText || "").length) {
    merged.rawText = pass2.rawText;
  }

  return merged;
}

export async function interpretPrescriptionFromImage(file, language, onProgress, apiKey) {
  onProgress?.(10);

  const enhancedFile = await preprocessImage(file);
  onProgress?.(25);

  const { base64, mimeType } = await fileToBase64(enhancedFile);
  onProgress?.(40);

  const model = getModel(apiKey);
  const imagePart = { inlineData: { data: base64, mimeType } };

  // Single pass extraction
  const prompt1 = buildPrompt(language, 1);
  onProgress?.(50);
  const result = await callAPI(model, prompt1, imagePart);
  onProgress?.(100);

  return result;
}
