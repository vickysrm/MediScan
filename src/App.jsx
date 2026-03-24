import { useState, useEffect } from "react";
import { AlertTriangle, X, Home, PlusCircle } from "lucide-react";
import Header from "./components/Header";
import UploadZone from "./components/UploadZone";
import ProgressCard from "./components/ProgressCard";
import ResultSection from "./components/ResultSection";
import ErrorView from "./components/ErrorView";
import ModelTrainer from "./components/ModelTrainer";
import Dashboard from "./components/Dashboard";
import { interpretPrescriptionFromImage } from "./utils/gemini";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";

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
  setupCard: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 32, textAlign: "center", maxWidth: 440, margin: "40px auto" },
};

function mapErrorMessage(err) {
  const msg = err.message || "";
  if (msg.includes("timed out")) return "The request took too long. Please try again with a clearer image.";
  if (msg.includes("429") || msg.includes("rate")) return "Too many requests. Please wait a moment and try again.";
  if (msg.includes("API key") || msg.includes("401") || msg.includes("403")) return "Invalid API key. Please check your configuration.";
  if (msg.includes("network") || msg.includes("fetch") || msg.includes("Failed to fetch")) return "Network error. Please check your connection and try again.";
  return "Could not read the prescription. Please ensure the image is clear and try again.";
}

function SetupNotice() {
  return (
    <div style={s.setupCard}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>Setup Required</h2>
      <p style={{ fontSize: 13, color: "#64748b", marginBottom: 16 }}>
        To use MediScan, you need to add your Gemini API key to Vercel environment variables.
      </p>
      <ol style={{ textAlign: "left", fontSize: 13, color: "#374151", lineHeight: 2 }}>
        <li>Go to <strong>Vercel Dashboard</strong> → Your Project</li>
        <li>Click <strong>Settings</strong> → <strong>Environment Variables</strong></li>
        <li>Add: <code style={{ background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>VITE_GEMINI_API_KEY</code></li>
        <li>Value: Your Gemini API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{ color: "#0d9488" }}>Google AI Studio</a></li>
        <li><strong>Redeploy</strong> the project</li>
      </ol>
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
  const [showTrainer, setShowTrainer] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("mediscan_prescriptions");
    if (saved) {
      setPrescriptions(JSON.parse(saved));
    }
  }, []);

  function savePrescription(parsed) {
    const newRx = {
      id: Date.now(),
      date: new Date().toISOString(),
      medications: parsed.medications || [],
    };
    const updated = [newRx, ...prescriptions];
    setPrescriptions(updated);
    localStorage.setItem("mediscan_prescriptions", JSON.stringify(updated));
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
      const parsed = await interpretPrescriptionFromImage(file, language, setProgress, API_KEY);
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
      savePrescription(parsed);
      setResult(parsed);
      setStage("result");
    } catch (err) {
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

  function goToScan() {
    setView("scan");
    reset();
  }

  function goToDashboard() {
    setView("dashboard");
    reset();
  }

  if (!API_KEY) {
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
        <SetupNotice />
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

  return (
    <div style={s.page}>
      <div style={s.navBar}>
        <button style={s.navBtn(view === "dashboard")} onClick={goToDashboard}>
          <Home size={14} /> Dashboard
        </button>
        <button style={s.navBtn(view === "scan")} onClick={goToScan}>
          <PlusCircle size={14} /> New Scan
        </button>
      </div>

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

      {view === "dashboard" && (
        <Dashboard onScanClick={goToScan} />
      )}

      {view === "scan" && (
        <main style={s.main}>
          <Header
            language={language}
            onLanguageChange={setLanguage}
            showNewScan={stage !== "idle"}
            onNewScan={reset}
            onTrainClick={() => setShowTrainer(true)}
          />
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