import { useState } from "react";
import { CheckCircle, Info } from "lucide-react";
import ResultCard from "./ResultCard";
import PharmacyLocator from "./PharmacyLocator";

const s = {
  successRow: { display: "flex", alignItems: "center", gap: 8 },
  successText: { fontSize: 13, fontWeight: 700, color: "#0d9488" },
  rawPre: { background: "#0f172a", color: "#34d399", fontSize: 11, borderRadius: 14, padding: 16, overflow: "auto", fontFamily: "monospace", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" },
  rawToggle: { display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94a3b8", background: "none", border: "none", cursor: "pointer", fontWeight: 600 },
  emptyCard: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 32, textAlign: "center" },
  emptyTitle: { fontSize: 16, fontWeight: 700, color: "#374151", margin: "0 0 8px" },
  emptyText: { fontSize: 13, color: "#94a3b8", margin: 0, lineHeight: 1.6 },
};

export default function ResultSection({ result }) {
  const [showRaw, setShowRaw] = useState(false);
  const medications = result.medications || [];
  const rawText = result.rawText || "";

  return (
    <div className="fadeUp" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <div style={{ ...s.successRow, marginBottom: 0 }}>
        <CheckCircle size={17} color="#0d9488" />
        <p style={s.successText}>Prescription decoded successfully ({medications.length} medications found)</p>
      </div>

      {medications.length === 0 ? (
        result.drugName ? (
          <ResultCard result={result} />
        ) : (
          <div style={s.emptyCard}>
            <p style={s.emptyTitle}>No medications detected</p>
            <p style={s.emptyText}>We couldn't identify any medications from the image. Try uploading a clearer photo of the prescription label.</p>
          </div>
        )
      ) : (
        medications.map((med, idx) => (
          <ResultCard key={idx} result={med} />
        ))
      )}

      {rawText && (
        <>
          <button style={s.rawToggle} onClick={() => setShowRaw(v => !v)}>
            <Info size={13} /> {showRaw ? "Hide" : "Show"} raw OCR text
          </button>
          {showRaw && <pre style={s.rawPre}>{rawText}</pre>}
        </>
      )}

      {(medications.length > 0 || result.drugName) && <PharmacyLocator medications={medications.length > 0 ? medications : [result]} />}
    </div>
  );
}
