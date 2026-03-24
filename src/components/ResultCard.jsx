import { Pill, Clock, CheckCircle, Shield, AlertTriangle, ChevronRight, Zap, HelpCircle } from "lucide-react";

const s = {
  drugCard: (confidence) => ({ borderRadius: 20, padding: 22, background: confidence === "low" ? "linear-gradient(135deg,#f59e0b,#d97706)" : "linear-gradient(135deg,#0d9488,#0891b2)", color: "#fff", boxShadow: "0 4px 20px rgba(13,148,136,0.25)", overflowWrap: "break-word" }),
  drugHeader: { display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 18 },
  drugIconBox: { background: "rgba(255,255,255,0.2)", borderRadius: 14, padding: 10, flexShrink: 0 },
  drugClass: { fontSize: 10, color: "#99f6e4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, margin: "0 0 4px" },
  drugName: { fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.2 },
  drugPrescriber: { fontSize: 13, color: "#a7f3d0", margin: "4px 0 0" },
  confidenceBadge: (confidence) => ({ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, padding: "2px 8px", borderRadius: 99, background: confidence === "high" ? "rgba(34,197,94,0.3)" : confidence === "medium" ? "rgba(250,204,21,0.3)" : "rgba(239,68,68,0.3)", color: "#fff", marginLeft: 8 }),
  drugGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 },
  drugCell: { background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 12 },
  drugCellLabel: { fontSize: 10, color: "#99f6e4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 4px", display: "flex", alignItems: "center", gap: 5 },
  drugCellValue: { fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.4 },
  refillsText: { fontSize: 12, color: "#a7f3d0", marginTop: 12 },
  alternativesBox: { background: "rgba(255,255,255,0.15)", borderRadius: 14, padding: 12, marginTop: 12 },
  alternativesLabel: { fontSize: 10, color: "#99f6e4", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, margin: "0 0 6px", display: "flex", alignItems: "center", gap: 5 },
  altChip: { display: "inline-block", background: "rgba(255,255,255,0.2)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 600, marginRight: 6, marginBottom: 4 },
  whiteCard: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 20 },
  amberCard: { background: "#fffbeb", borderRadius: 20, border: "1px solid #fde68a", padding: 20 },
  cardHeader: { display: "flex", alignItems: "center", gap: 8, marginBottom: 14 },
  cardTitle: (color) => ({ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color, margin: 0 }),
  listItem: { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#374151", marginBottom: 8, lineHeight: 1.5 },
  amberListItem: { display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "#92400e", marginBottom: 8, lineHeight: 1.5 },
  interactionRow: { display: "flex", alignItems: "flex-start", gap: 12, background: "#f8fafc", borderRadius: 14, padding: 12, marginBottom: 8 },
  interactionName: { fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 2px" },
  interactionDetail: { fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5, wordBreak: "break-word" },
  badge: (risk) => {
    const map = { high: { bg: "#fee2e2", color: "#b91c1c", border: "#fecaca" }, moderate: { bg: "#fef3c7", color: "#b45309", border: "#fde68a" }, low: { bg: "#dbeafe", color: "#1d4ed8", border: "#bfdbfe" } };
    const c = map[risk] || map.low;
    return { fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, padding: "3px 8px", borderRadius: 99, background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: "nowrap" };
  },
};

export default function ResultCard({ result }) {
  const instructions = result.instructions || [];
  const warnings = result.warnings || [];
  const interactions = result.interactions || [];
  const alternatives = result.alternatives || [];
  const drugName = result.drugName || "Unknown";
  const drugClass = result.drugClass || "Unknown";
  const dosage = result.dosage || "Not specified";
  const frequency = result.frequency || "Not specified";
  const refills = result.refills || "Not specified";
  const prescriber = result.prescriber || "";
  const confidence = result.confidence || "high";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={s.drugCard(confidence)}>
        <div style={s.drugHeader}>
          <div style={s.drugIconBox}><Pill size={22} color="#fff" /></div>
          <div>
            <p style={s.drugClass}>
              {drugClass}
              <span style={s.confidenceBadge(confidence)}>{confidence} confidence</span>
            </p>
            <h2 style={s.drugName}>{drugName}</h2>
            {prescriber && prescriber !== "—" && <p style={s.drugPrescriber}>Prescribed by {prescriber}</p>}
          </div>
        </div>
        <div style={s.drugGrid}>
          <div style={s.drugCell}>
            <p style={s.drugCellLabel}><Pill size={12} /> Dosage</p>
            <p style={s.drugCellValue}>{dosage}</p>
          </div>
          <div style={s.drugCell}>
            <p style={s.drugCellLabel}><Clock size={12} /> Frequency</p>
            <p style={s.drugCellValue}>{frequency}</p>
          </div>
        </div>
        {refills && refills !== "Not specified" && <p style={s.refillsText}>Refills: {refills}</p>}
        {alternatives.length > 0 && (
          <div style={s.alternativesBox}>
            <p style={s.alternativesLabel}><HelpCircle size={12} /> Could also be</p>
            {alternatives.map((alt) => (
              <span key={alt} style={s.altChip}>{alt}</span>
            ))}
          </div>
        )}
      </div>

      {instructions.length > 0 && (
        <div style={s.whiteCard}>
          <div style={s.cardHeader}>
            <CheckCircle size={16} color="#0d9488" />
            <p style={s.cardTitle("#0d9488")}>How to Take It</p>
          </div>
          {instructions.map((inst) => (
            <div key={inst} style={s.listItem}>
              <ChevronRight size={14} color="#0d9488" style={{ marginTop: 2, flexShrink: 0 }} />
              {inst}
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={s.amberCard}>
          <div style={s.cardHeader}>
            <Shield size={16} color="#d97706" />
            <p style={s.cardTitle("#92400e")}>Safety Warnings</p>
          </div>
          {warnings.map((w) => (
            <div key={w} style={s.amberListItem}>
              <AlertTriangle size={13} color="#d97706" style={{ marginTop: 2, flexShrink: 0 }} />
              {w}
            </div>
          ))}
        </div>
      )}

      {interactions.length > 0 && (
        <div style={s.whiteCard}>
          <div style={s.cardHeader}>
            <Zap size={16} color="#e11d48" />
            <p style={s.cardTitle("#0f172a")}>Drug & Food Interactions</p>
          </div>
          {interactions.map((item, i) => (
            <div key={item.substance || `interaction-${i}`} style={s.interactionRow}>
              <span style={s.badge(item.risk)}>{item.risk || "unknown"}</span>
              <div>
                <p style={s.interactionName}>{item.substance || "Unknown"}</p>
                <p style={s.interactionDetail}>{item.detail || ""}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
