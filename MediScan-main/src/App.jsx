import { useState } from "react";
import { AlertTriangle, X, Key, Eye, EyeOff } from "lucide-react";
import Header from "./components/Header";
import UploadZone from "./components/UploadZone";
import ProgressCard from "./components/ProgressCard";
import ResultSection from "./components/ResultSection";
import ErrorView from "./components/ErrorView";
import ModelTrainer from "./components/ModelTrainer";
import { interpretPrescriptionFromImage } from "./utils/gemini";

const s = {
  page: { minHeight: "100vh", background: "#f8fffe", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif" },
  main: { maxWidth: 640, margin: "0 auto", padding: "32px 20px", display: "flex", flexDirection: "column", gap: 24 },
  footer: { borderTop: "1px solid #e2e8f0", background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)", marginTop: 40 },
  footerInner: { maxWidth: 640, margin: "0 auto", padding: "24px 20px" },
  disclaimerBox: { display: "flex", alignItems: "flex-start", gap: 12, padding: 16, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14 },
  disclaimerTitle: { fontSize: 10, fontWeight: 800, color: "#92400e", textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px" },
  disclaimerText: { fontSize: 12, color: "#b45309", lineHeight: 1.6, margin: 0 },
  footerCopy: { textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 16 },
  apiKeyWarning: { maxWidth: 640, margin: "0 auto", padding: "12px 20px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 12, fontSize: 13, color: "#b91c1c", fontWeight: 600, display: "flex", alignItems: "center", gap: 8 },
  apiKeyCard: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 32, textAlign: "center", maxWidth: 440, margin: "0 auto" },
  apiKeyIconBox: { width: 64, height: 64, borderRadius: 18, background: "#f0fdf9", border: "1px solid #ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  apiKeyTitle: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", letterSpacing: -0.5 },
  apiKeyTitleAccent: { color: "#0d9488", fontStyle: "italic" },
  apiKeySub: { fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" },
  apiKeyForm: { display: "flex", flexDirection: "column", gap: 12 },
  apiKeyInputWrap: { position: "relative", display: "flex", alignItems: "center" },
  apiKeyInput: { width: "100%", padding: "12px 44px 12px 16px", borderRadius: 12, border: "1.5px solid #cbd5e1", fontSize: 14, outline: "none", fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif", boxSizing: "border-box", transition: "border-color 0.2s" },
  apiKeyToggle: { position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex" },
  apiKeyErr: { fontSize: 12, color: "#ef4444", fontWeight: 600, margin: 0, textAlign: "left" },
  apiKeyBtn: { padding: "12px 24px", background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(13,148,136,0.3)", marginTop: 4 },
  apiKeyHelp: { fontSize: 12, color: "#94a3b8", margin: "16px 0 0" },
  apiKeyLink: { color: "#0d9488", fontWeight: 600, textDecoration: "none" },
};

function mapErrorMessage(err) {
  const msg = err.message || "";
  if (msg.includes("timed out")) return "The request took too long. Please try again with a clearer image.";
  if (msg.includes("429") || msg.includes("rate")) return "Too many requests. Please wait a moment and try again.";
  if (msg.includes("API key") || msg.includes("401") || msg.includes("403")) return "Invalid API key. Please check your configuration.";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) return "Network error. Please check your connection and try again.";
  return "Could not read the prescription. Please ensure the image is clear and try again.";
}

export default function App() {
  const [stage, setStage] = useState("idle");
  const [language, setLanguage] = useState("English");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showTrainer, setShowTrainer] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyError, setApiKeyError] = useState("");

  function handleApiKeySubmit(e) {
    e.preventDefault();
    if (!apiKey.trim()) {
      setApiKeyError("Please enter your Gemini API key.");
      return;
    }
    if (!/^AIza[0-9A-Za-z\-_]{30,}$/.test(apiKey.trim())) {
      setApiKeyError("Invalid API key format. Gemini keys start with 'AIza'.");
      return;
    }
    setApiKeyError("");
    setApiKeySet(true);
  }

  function handleChangeApiKey() {
    setApiKeySet(false);
    setApiKey("");
    setShowApiKey(false);
    reset();
  }

  async function handleScan(file) {
    if (stage === "scanning") return;
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setStage("scanning");
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const parsed = await interpretPrescriptionFromImage(file, language, setProgress, apiKey);
      if (parsed.medications) {
        parsed.medications = parsed.medications.map(m => ({
          instructions: [],
          warnings: [],
          interactions: [],
          alternatives: [],
          confidence: "high",
          ...m,
        }));
      }
      setResult(parsed);
      setStage("result");
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("API key") || msg.includes("401") || msg.includes("403")) {
        handleChangeApiKey();
        return;
      }
      setError(mapErrorMessage(err));
      setStage("error");
    }
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setStage("idle");
    setResult(null);
    setError(null);
    setProgress(0);
  }

  const showNewScan = stage !== "idle" && apiKeySet;

  if (!apiKeySet) {
    return (
      <div style={s.page}>
        <Header
          language={language}
          onLanguageChange={setLanguage}
          showNewScan={false}
          onNewScan={reset}
          onTrainClick={() => setShowTrainer(true)}
        />
        <main style={s.main}>
          <div className="fadeUp" style={s.apiKeyCard}>
            <div style={s.apiKeyIconBox}>
              <Key size={28} color="#0d9488" />
            </div>
            <h2 style={s.apiKeyTitle}>Enter Your <span style={s.apiKeyTitleAccent}>API Key</span></h2>
            <p style={s.apiKeySub}>
              MediScan requires a Google Gemini API key to analyze prescriptions. Your key stays in your browser and is never stored on any server.
            </p>
            <form onSubmit={handleApiKeySubmit} style={s.apiKeyForm}>
              <div style={s.apiKeyInputWrap}>
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={e => { setApiKey(e.target.value); setApiKeyError(""); }}
                  placeholder="Enter your Gemini API key"
                  style={s.apiKeyInput}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(v => !v)}
                  style={s.apiKeyToggle}
                  aria-label={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {apiKeyError && <p style={s.apiKeyErr}>{apiKeyError}</p>}
              <button type="submit" style={s.apiKeyBtn}>Continue</button>
            </form>
            <p style={s.apiKeyHelp}>
              Don't have a key? Get one free at{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={s.apiKeyLink}>
                Google AI Studio
              </a>
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <Header
        language={language}
        onLanguageChange={setLanguage}
        showNewScan={showNewScan}
        onNewScan={reset}
        onTrainClick={() => setShowTrainer(true)}
        onChangeApiKey={handleChangeApiKey}
      />

      {showTrainer && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <div style={{ maxWidth: 500, width: "100%", maxHeight: "90vh", overflow: "auto" }}>
            <button
              onClick={() => setShowTrainer(false)}
              style={{
                position: "absolute", top: 20, right: 20,
                background: "white", border: "none", borderRadius: "50%",
                width: 40, height: 40, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
              }}
            >
              <X size={20} color="#64748b" />
            </button>
            <ModelTrainer onClose={() => setShowTrainer(false)} />
          </div>
        </div>
      )}

      <main style={s.main}>
        {stage === "idle" && <UploadZone onScan={handleScan} isScanning={false} />}
        {stage === "scanning" && <ProgressCard progress={progress} stage={progress < 50 ? "loading_image" : "analyzing_meaning"} preview={preview} />}
        {stage === "result" && <ResultSection result={result} />}
        {stage === "error" && <ErrorView error={error} onRetry={reset} />}
      </main>

      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.disclaimerBox}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={s.disclaimerTitle}>Medical Disclaimer</p>
              <p style={s.disclaimerText}>
                MediScan is an educational tool designed to help patients better understand their prescriptions. It is <strong>not a substitute for professional medical advice, diagnosis, or treatment.</strong> Always consult your pharmacist or physician with any questions about your medications. In case of emergency, call your local emergency services immediately.
              </p>
            </div>
          </div>
          <p style={s.footerCopy}>© {new Date().getFullYear()} MediScan · Built with care for patient clarity</p>
        </div>
      </footer>
    </div>
  );
}
