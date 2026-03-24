# MediScan: Medical Translator

MediScan is an intelligent, AI-powered web application that instantly scans, translates, and structures illegible medical prescriptions. Upload an image of a doctor's note or prescription label, and the app decodes the handwriting into a clear, structured list of medications with plain-English instructions and safety warnings.

## Features

- **Dual-Pass AI Verification** — Sends each image to Gemini twice, compares results, and flags discrepancies for higher accuracy
- **Image Preprocessing** — Auto-enhances contrast, brightness, and sharpness before sending to the AI
- **Advanced Handwriting OCR** — Reads doctor handwriting and medical shorthand using Gemini 2.5 Flash
- **Confidence Scoring** — Each reading is rated high/medium/low confidence with alternative interpretations shown when uncertain
- **Pharmacological Cross-Referencing** — Validates drug names against 100+ common medications and dosages
- **Multi-Medication Support** — Handles prescriptions with multiple drugs, separating them into individual cards
- **30+ Language Translation** — Translates medical terms into Hindi, Tamil, Spanish, French, and more
- **Camera Capture** — Take photos directly on mobile devices
- **Image Preview** — Review and confirm before scanning
- **Mobile Responsive** — Works beautifully on phones and tablets

## Getting Started

### Prerequisites
- Node.js v18+
- A Google Gemini API Key

### Setup
```bash
git clone https://github.com/vickysrm/MediScan.git
cd MediScan
npm install
```

Create a `.env` file:
```env
VITE_GEMINI_API_KEY=your-api-key-here
```

Run:
```bash
npm run dev
```

## How It Works

1. **Upload** — Drop an image or take a photo. The app validates file type and size (max 10MB)
2. **Preprocess** — Image is auto-enhanced (contrast +40%, brightness +20%, sharpening) for better OCR
3. **Pass 1** — First AI read extracts drug names, dosages, and instructions from the enhanced image
4. **Pass 2** — Second verification read checks for character-level errors (5 vs S, 0 vs O)
5. **Merge** — Results are compared. Discrepancies lower confidence and add alternative readings
6. **Display** — Medications shown in cards with confidence badges, warnings, and drug interactions

## Tech Stack
- **Framework**: React 19 (Vite 8)
- **AI Engine**: `@google/generative-ai` (Gemini 2.5 Flash)
- **Icons**: Lucide React
- **Styling**: Inline styles + CSS animations

## Project Structure
```
src/
  App.jsx                — Main orchestrator (120 lines)
  components/
    Header.jsx           — Logo, language selector, new scan button
    UploadZone.jsx       — File input, drag-drop, camera capture, preview
    ProgressCard.jsx     — Scanning animation with 2-step progress
    ResultCard.jsx       — Medication card with confidence and alternatives
    ResultSection.jsx    — Results container with raw OCR toggle
    ErrorView.jsx        — Error state with retry
  utils/
    gemini.js            — API client, dual-pass verification, image preprocessing
    file.js              — File validation, base64 encoding, canvas enhancement
  constants/
    languages.js         — 30 supported languages
```
