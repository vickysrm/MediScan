import { useState, useEffect, useRef } from "react";
import { AlertTriangle, X, Home, PlusCircle, Key, Eye, EyeOff } from "lucide-react";
import Header from "./components/Header";
import UploadZone from "./components/UploadZone";
import ProgressCard from "./components/ProgressCard";
import ResultSection from "./components/ResultSection";
import ErrorView from "./components/ErrorView";
import Dashboard from "./components/Dashboard";
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
  navBar: { position: "sticky", top: 0, background: "#fff", borderBottom: "1px solid #e2e8f0", padding: "12px 20px", display: "flex", justifyContent: "center", gap: 16, zIndex: 50 },
  navBtn: (active) => ({ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", background: active ? "#0d9488" : "#f1f5f9", color: active ? "#fff" : "#64748b" }),
  apiKeyCard: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 32, textAlign: "center", maxWidth: 440, margin: "40px auto" },
  apiKeyIconBox: { width: 64, height: 64, borderRadius: 18, background: "#f0fdf9", border: "1px solid #ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" },
  apiKeyTitle: { fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 8px", letterSpacing: -0.5 },
  apiKeyTitleAccent: { color: "#0d9488", fontStyle: "italic" },
  apiKeySub: { fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: "0 0 24px" },
  apiKeyForm: { display: "flex", flexDirection: "column", gap: 12 },
  apiKeyInputWrap: { position: "relative", display: "flex", alignItems: "center" },
  apiKeyInput: { width: "100%", padding: "12px 44px 12px 16px", borderRadius: 12, border: "1.5px solid #cbd5e1", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" },
  apiKeyToggle: { position: "absolute", right: 12, background: "none", border: "none", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex" },
  apiKeyErr: { fontSize: 12, color: "#ef4444", fontWeight: 600, margin: 0, textAlign: "left" },
  apiKeyBtn: { padding: "12px 24px", background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(13,148,136,0.3)", marginTop: 4 },
  apiKeyHelp: { fontSize: 12, color: "#94a3b8", margin: "16px 0 0" },
  apiKeyLink: { color: "#0d9488", fontWeight: 600, textDecoration: "none" },
};

function mapErrorMessage(err) {
  const msg = err.message || "";
  if (msg.includes("timed out")) return "Request timed out. Try again.";
  if (msg.includes("429") || msg.includes("rate")) return "Rate limit reached. Wait 1 minute.";
  if (msg.includes("API key") || msg.includes("401") || msg.includes("403")) return "Invalid API key.";
  return "Could not read prescription.";
}

function ApiKeyInput({ onSubmit, error }) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    onSubmit(apiKey.trim());
  }

  return (
    <div className="fadeUp" style={s.apiKeyCard}>
      <div style={s.apiKeyIconBox}>
        <Key size={28} color="#0d9488" />
      </div>
      <h2 style={s.apiKeyTitle}>Enter Your <span style={s.apiKeyTitleAccent}>API Key</span></h2>
      <p style={s.apiKeySub}>Enter your Gemini API key to scan prescriptions.</p>
      <form onSubmit={handleSubmit} style={s.apiKeyForm}>
        <div style={s.apiKeyInputWrap}>
          <input
            type={showKey ? "text" : "password"}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Enter Gemini API key"
            style={s.apiKeyInput}
            autoComplete="new-password"
          />
          <button type="button" onClick={() => setShowKey(v => !v)} style={s.apiKeyToggle}>
            {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && <p style={s.apiKeyErr}>{error}</p>}
        <button type="submit" style={s.apiKeyBtn}>Continue</button>
      </form>
      <p style={s.apiKeyHelp}>Get free key: <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style={s.apiKeyLink}>Google AI Studio</a></p>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("dashboard");
  const [stage, setStage] = useState("idle");
  const [language, setLanguage] = useState("English");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const envKey = import.meta.env.VITE_GEMINI_API_KEY || "";
  const [apiKey, setApiKey] = useState(envKey);
  const [showApiKeyInput, setShowApiKeyInput] = useState(!envKey);
  const [apiKeyError, setApiKeyError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const lastRequestTime = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem("mediscan_prescriptions");
    if (saved) setPrescriptions(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  function savePrescription(parsed) {
    const newRx = { id: Date.now(), date: new Date().toISOString(), medications: parsed.medications || [] };
    const updated = [newRx, ...prescriptions];
    setPrescriptions(updated);
    localStorage.setItem("mediscan_prescriptions", JSON.stringify(updated));
  }

  function handleApiKeySubmit(key) {
    if (!key.trim()) { setApiKeyError("Enter API key"); return; }
    if (!/^AIza[0-9A-Za-z\-_]{30,}$/.test(key)) { setApiKeyError("Invalid key format"); return; }
    setApiKey(key);
    setApiKeyError("");
    setShowApiKeyInput(false);
  }

  async function handleScan(file) {
    if (stage === "scanning") return;
    if (!apiKey) { setShowApiKeyInput(true); return; }

    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setStage("scanning");
    setProgress(0);
    setResult(null);
    setError(null);

    try {
      const parsed = await interpretPrescriptionFromImage(file, language, setProgress, apiKey);
      if (!parsed) {
        throw new Error("No response from API");
      }
      if (parsed.medications) {
        parsed.medications = parsed.medications.map(m => ({ instructions: [], warnings: [], interactions: [], alternatives: [], confidence: "high", ...m }));
      }
      savePrescription(parsed);
      setResult(parsed);
      setStage("result");
    } catch (err) {
      console.error("Scan error:", err);
      const msg = err.message || "";
      if (msg.includes("429") || msg.includes("rate")) {
        setCountdown(60);
        setError("API rate limit. Wait 60 seconds.");
      } else if (msg.includes("Invalid") || msg.includes("API key") || msg.includes("401") || msg.includes("403")) {
        setApiKey("");
        setShowApiKeyInput(true);
        setError("Invalid API key. Please enter a new one.");
      } else {
        setError("Could not read prescription. Try with a clearer image.");
      }
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
    setCountdown(0);
  }

  function goToScan() { setView("scan"); reset(); }
  function goToDashboard() { setView("dashboard"); reset(); }

  if (showApiKeyInput) {
    return (
      <div style={s.page}>
        <div style={s.navBar}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg,#0d9488,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontWeight: 800, fontSize: 14 }}>M</span>
            </div>
            <span style={{ fontWeight: 800, color: "#0f172a" }}>MediScan</span>
          </div>
        </div>
        <main style={s.main}>
          <ApiKeyInput onSubmit={handleApiKeySubmit} error={apiKeyError} />
        </main>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.navBar}>
        <button style={s.navBtn(view === "dashboard")} onClick={goToDashboard}><Home size={14} /> Dashboard</button>
        <button style={s.navBtn(view === "scan")} onClick={goToScan}><PlusCircle size={14} /> New Scan</button>
      </div>

      {view === "dashboard" && <Dashboard onScanClick={goToScan} />}

      {view === "scan" && (
        <main style={s.main}>
          <Header language={language} onLanguageChange={setLanguage} showNewScan={stage !== "idle"} onNewScan={reset} onTrainClick={() => {}} />
          {stage === "idle" && <UploadZone onScan={handleScan} isScanning={false} />}
          {stage === "scanning" && <ProgressCard progress={progress} stage={progress < 50 ? "loading_image" : "analyzing_meaning"} preview={preview} />}
          {stage === "result" && <ResultSection result={result} />}
          {stage === "error" && <ErrorView error={error} onRetry={reset} />}
        </main>
      )}

      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div style={s.disclaimerBox}>
            <AlertTriangle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <p style={s.disclaimerTitle}>Medical Disclaimer</p>
              <p style={s.disclaimerText}>MediScan is for educational purposes only. Consult your doctor for medical advice.</p>
            </div>
          </div>
          <p style={s.footerCopy}>© {new Date().getFullYear()} MediScan</p>
        </div>
      </footer>
    </div>
  );
}
