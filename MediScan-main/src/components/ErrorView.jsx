import { AlertTriangle, RefreshCw } from "lucide-react";

const s = {
  errorCard: { background: "#fef2f2", borderRadius: 20, border: "1px solid #fecaca", padding: 20, display: "flex", alignItems: "flex-start", gap: 12 },
  errorTitle: { fontSize: 13, fontWeight: 700, color: "#b91c1c", margin: "0 0 4px" },
  errorMsg: { fontSize: 12, color: "#ef4444", margin: 0 },
  errorBtn: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#b91c1c", background: "none", border: "none", cursor: "pointer", fontWeight: 600, textDecoration: "underline", marginTop: 8, padding: 0 },
};

export default function ErrorView({ error, onRetry }) {
  return (
    <div style={s.errorCard} className="fadeUp">
      <AlertTriangle size={17} color="#ef4444" style={{ flexShrink: 0, marginTop: 2 }} />
      <div>
        <p style={s.errorTitle}>Scan Failed</p>
        <p style={s.errorMsg}>{error || "Something went wrong"}</p>
        <button style={s.errorBtn} onClick={onRetry}>
          <RefreshCw size={13} /> Try Again
        </button>
      </div>
    </div>
  );
}
