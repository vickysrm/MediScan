import { fileToBase64, preprocessImage } from "./file.js";

const responseCache = new Map();

async function hashString(str) {
  const encoder = new TextEncoder();
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Use OCR.space API - free, no key needed for basic use
async function extractTextFromImage(base64, mimeType) {
  const formData = new FormData();
  
  // Convert base64 to blob
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  formData.append('file', blob, 'prescription.jpg');
  formData.append('language', 'eng');
  formData.append('isOverlay', 'false');
  formData.append('detectOrientation', 'true');
  formData.append('scale', 'true');

  const response = await fetch('https://api.ocr.space/parse', {
    method: 'POST',
    headers: {
      'apikey': 'helloworld' // Free demo key - 100 requests/day
    },
    body: formData
  });

  const data = await response.json();
  
  if (data.IsError) {
    throw new Error(data.ErrorMessage?.[0] || 'OCR failed');
  }
  
  return data.ParsedResults?.[0]?.ParsedText || '';
}

function parsePrescriptionText(text, language) {
  // Parse the extracted text to find medications
  const lines = text.split('\n').filter(l => l.trim());
  
  const medications = [];
  const commonMeds = {
    'metformin': 'Diabetes',
    'glimepiride': 'Diabetes',
    'sitagliptin': 'Diabetes',
    'glycomet': 'Diabetes',
    'amlodipine': 'Blood Pressure',
    'losartan': 'Blood Pressure',
    'telmisartan': 'Blood Pressure',
    'ramipril': 'Blood Pressure',
    'metoprolol': 'Blood Pressure',
    'atorvastatin': 'Cholesterol',
    'rosuvastatin': 'Cholesterol',
    'storvas': 'Cholesterol',
    'pantoprazole': 'Gastric',
    'omeprazole': 'Gastric',
    'nexpro': 'Gastric',
    'rabeprazole': 'Gastric',
    'ibuprofen': 'Pain',
    'paracetamol': 'Pain',
    'acetaminophen': 'Pain',
    'diclofenac': 'Pain',
    'amoxicillin': 'Antibiotic',
    'azithromycin': 'Antibiotic',
    'ciprofloxacin': 'Antibiotic',
    'cetirizine': 'Allergy',
    'montelukast': 'Allergy',
    'aspirin': 'Blood Thinner',
    'ecosprin': 'Blood Thinner',
    'clopidogrel': 'Blood Thinner',
    'thyroxine': 'Thyroid',
    'thyronorm': 'Thyroid'
  };
  
  const frequencies = ['once', 'twice', 'daily', 'bd', 'tds', 'od', '1-0-0', '1-0-1', '0-1-1', '1-1-1'];
  const dosages = /\d+\s*(mg|ml|mcg|g|iu)/i;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    for (const [medName, drugClass] of Object.entries(commonMeds)) {
      if (lowerLine.includes(medName)) {
        // Try to extract dosage
        const doseMatch = line.match(dosages);
        const dosage = doseMatch ? doseMatch[0] : 'As prescribed';
        
        // Try to extract frequency
        let frequency = 'As directed';
        for (const freq of frequencies) {
          if (lowerLine.includes(freq)) {
            frequency = freq.toUpperCase();
            break;
          }
        }
        
        // Capitalize medicine name
        const drugName = medName.charAt(0).toUpperCase() + medName.slice(1);
        
        medications.push({
          drugClass,
          drugName,
          dosage,
          frequency,
          instructions: [],
          warnings: [],
          interactions: [],
          alternatives: [],
          confidence: 'medium',
          prescriber: 'Not specified',
          refills: 'Not specified'
        });
        break;
      }
    }
  }
  
  // If no medications found, create a generic entry with raw text
  if (medications.length === 0 && text.trim()) {
    medications.push({
      drugClass: 'Unknown',
      drugName: text.substring(0, 50) + '...',
      dosage: 'See prescription',
      frequency: 'As directed',
      instructions: ['Please consult your doctor or pharmacist'],
      warnings: [],
      interactions: [],
      alternatives: [],
      confidence: 'low',
      prescriber: 'Not specified',
      refills: 'Not specified'
    });
  }
  
  return { medications };
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

  try {
    // Extract text using OCR
    const text = await extractTextFromImage(base64, mimeType);
    onProgress?.(70);
    
    if (!text || text.trim().length < 5) {
      throw new Error("Could not read text from image. Please try a clearer image.");
    }
    
    // Parse the extracted text
    const result = parsePrescriptionText(text, language);
    onProgress?.(100);

    if (result.medications) {
      responseCache.set(cacheKey, result);
      if (responseCache.size > 5) {
        const keys = Array.from(responseCache.keys());
        responseCache.delete(keys[0]);
      }
    }

    // Also store raw text for reference
    result.rawText = text;
    
    return result;
  } catch (err) {
    throw new Error(`Failed to read prescription: ${err.message}`);
  }
}