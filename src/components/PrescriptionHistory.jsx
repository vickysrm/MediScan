import { useState, useEffect } from "react";
import { Pill, Calendar, ChevronDown, ChevronUp, Trash2, ExternalLink } from "lucide-react";

const s = {
  container: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 20 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  title: { fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0, textTransform: "uppercase", letterSpacing: 1 },
  historyItem: { borderBottom: "1px solid #e2e8f0", paddingBottom: 12, marginBottom: 12 },
  historyHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" },
  historyDate: { fontSize: 12, color: "#64748b" },
  historyMeds: { fontSize: 13, fontWeight: 700, color: "#0f172a" },
  historyCount: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  medList: { marginTop: 12, paddingLeft: 0 },
  medItem: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 12, color: "#374151" },
  emptyState: { textAlign: "center", padding: 24, color: "#94a3b8" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 },
};

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-US", { 
    day: "numeric", 
    month: "short", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

export default function PrescriptionHistory({ onLoadPrescription }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("mediscan_prescriptions");
    if (saved) {
      const parsed = JSON.parse(saved);
      setPrescriptions(parsed);
      const initialExpanded = {};
      parsed.forEach(p => { initialExpanded[p.id] = false; });
      setExpanded(initialExpanded);
    }
  }, []);

  const handleDelete = (id) => {
    const updated = prescriptions.filter(p => p.id !== id);
    setPrescriptions(updated);
    localStorage.setItem("mediscan_prescriptions", JSON.stringify(updated));
  };

  const toggleExpand = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (prescriptions.length === 0) {
    return (
      <div style={s.container}>
        <div style={s.header}>
          <h3 style={s.title}>Prescription History</h3>
        </div>
        <div style={s.emptyState}>
          <Pill size={32} color="#e2e8f0" style={{ marginBottom: 8 }} />
          <p>No prescriptions yet</p>
          <p style={{ fontSize: 11 }}>Scan a prescription to start building your history</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h3 style={s.title}>Prescription History</h3>
        <span style={{ fontSize: 11, color: "#64748b" }}>{prescriptions.length} prescriptions</span>
      </div>

      {prescriptions.map((rx) => (
        <div key={rx.id} style={s.historyItem}>
          <div style={s.historyHeader} onClick={() => toggleExpand(rx.id)}>
            <div>
              <p style={s.historyDate}>{formatDate(rx.date)}</p>
              <p style={s.historyMeds}>
                {rx.medications?.slice(0, 3).map(m => m.drugName).join(", ")}
                {rx.medications?.length > 3 && ` +${rx.medications.length - 3} more`}
              </p>
              <p style={s.historyCount}>{rx.medications?.length || 0} medications</p>
            </div>
            {expanded[rx.id] ? <ChevronUp size={18} color="#64748b" /> : <ChevronDown size={18} color="#64748b" />}
          </div>

          {expanded[rx.id] && (
            <div style={s.medList}>
              {rx.medications?.map((med, idx) => (
                <div key={idx} style={s.medItem}>
                  <Pill size={12} color="#0d9488" />
                  <span><strong>{med.drugName}</strong> - {med.dosage} ({med.frequency})</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button 
                  onClick={() => onLoadPrescription?.(rx)}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "#0d9488", color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer" }}
                >
                  <ExternalLink size={10} /> Load to Dashboard
                </button>
                <button style={s.deleteBtn} onClick={() => handleDelete(rx.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}