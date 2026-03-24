import { CheckCircle } from "lucide-react";

const STAGE_LABELS = {
  loading_image: "Encoding Image",
  analyzing_meaning: "Analyzing Prescription",
};

const s = {
  progressCard: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: "20px 24px" },
  stepsRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 16 },
  stepCircle: (active, done) => ({
    width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 11, fontWeight: 700, flexShrink: 0, transition: "all 0.4s",
    background: done ? "#0d9488" : active ? "#f0fdf9" : "#f1f5f9",
    border: active ? "2px solid #0d9488" : "none",
    color: done ? "#fff" : active ? "#0d9488" : "#9ca3af",
  }),
  stepLine: (done) => ({ flex: 1, height: 2, background: done ? "#0d9488" : "#e2e8f0", transition: "background 0.5s" }),
  progressLabel: { fontSize: 13, fontWeight: 700, color: "#0d9488", marginBottom: 8 },
  progressBarBg: { height: 6, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" },
  progressBarFill: (pct) => ({ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#0d9488,#06b6d4)", borderRadius: 99, transition: "width 0.3s" }),
  analyzingDot: { width: 6, height: 6, borderRadius: "50%", background: "#0d9488", flexShrink: 0 },
  analyzingRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#94a3b8", marginTop: 8 },
  previewContainer: { marginTop: 16, borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0" },
  previewImage: { width: "100%", display: "block" },
};

const STEPS = ["loading_image", "analyzing_meaning"];

export default function ProgressCard({ progress, stage, preview }) {
  const currentStep = STEPS.indexOf(stage);

  return (
    <div style={s.progressCard} className="fadeUp">
      <div style={s.stepsRow}>
        {STEPS.map((step, i) => (
          <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, flex: i < STEPS.length - 1 ? 1 : "none" }}>
            <div style={s.stepCircle(i === currentStep, i < currentStep)} className={i === currentStep ? "pulse" : ""}>
              {i < currentStep ? <CheckCircle size={13} /> : i + 1}
            </div>
            {i < STEPS.length - 1 && <div style={s.stepLine(i < currentStep)} />}
          </div>
        ))}
      </div>
      <p style={s.progressLabel}>{STAGE_LABELS[stage] || "Processing…"}</p>
      <div style={s.progressBarBg}>
        <div style={s.progressBarFill(progress)} />
      </div>
      {stage === "analyzing_meaning" && ["Parsing abbreviations…", "Identifying interactions…", "Generating plain English…"].map((t) => (
        <div key={t} style={s.analyzingRow}><div style={s.analyzingDot} className="pulse" />{t}</div>
      ))}
      {preview && (
        <div style={s.previewContainer}>
          <img src={preview} alt="Uploaded prescription" style={s.previewImage} />
        </div>
      )}
    </div>
  );
}
