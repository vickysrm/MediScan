import { useState, useEffect } from "react";
import { Clock, Pill, Bell, Calendar, CheckCircle, XCircle, Trash2, Upload, Home, History } from "lucide-react";
import PrescriptionHistory from "./PrescriptionHistory";

const s = {
  container: { padding: "32px 20px", maxWidth: 800, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 },
  nextDoseCard: { background: "linear-gradient(135deg, #0d9488, #0891b2)", borderRadius: 20, padding: 24, color: "#fff", marginBottom: 24 },
  nextDoseTime: { fontSize: 42, fontWeight: 800, margin: "8px 0" },
  nextDoseMed: { fontSize: 16, opacity: 0.9 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 },
  statCard: { background: "#fff", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0" },
  statValue: { fontSize: 28, fontWeight: 800, color: "#0d9488" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 16 },
  medCard: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 },
  medIcon: { background: "#f0fdf9", borderRadius: 12, padding: 10 },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" },
  medDetails: { fontSize: 12, color: "#64748b", margin: 0 },
  medTime: { fontSize: 11, background: "#f0fdf4", color: "#0d9488", padding: "4px 10px", borderRadius: 8, fontWeight: 600 },
  emptyState: { textAlign: "center", padding: 48, color: "#94a3b8" },
  scanBtn: { display: "flex", alignItems: "center", gap: 8, background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, padding: "12px 20px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", color: "#ef4444", padding: 4 },
  takenBtn: { background: "#10b981", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer" },
  skipBtn: { background: "#ef4444", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 600, cursor: "pointer", marginLeft: 6 },
  takenCard: { background: "#fff", borderRadius: 16, padding: 16, marginBottom: 12, border: "2px solid #10b981" },
};

function parseFrequency(freq) {
  const lower = (freq || "").toLowerCase();
  if (lower.includes("once") || lower === "od" || lower === "1-0-0" || lower === "0-0-1" || lower.includes("at night") || lower.includes("in the morning") || lower.includes("daily")) {
    return [{ hour: 8 }];
  }
  if (lower.includes("twice") || lower === "bd" || lower === "1-0-1" || lower === "2 times") {
    return [{ hour: 8 }, { hour: 20 }];
  }
  if (lower.includes("tds") || lower === "3 times" || lower === "1-1-1" || lower.includes("three")) {
    return [{ hour: 8 }, { hour: 14 }, { hour: 20 }];
  }
  if (lower.includes("qid") || lower.includes("four") || lower === "4 times") {
    return [{ hour: 8 }, { hour: 12 }, { hour: 16 }, { hour: 20 }];
  }
  if (lower.includes("every 8") || lower.includes("q8h")) {
    return [{ hour: 8 }, { hour: 16 }, { hour: 0 }];
  }
  return [{ hour: 8 }];
}

function getNextDoseTime(medications) {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMins = now.getMinutes();
  
  let nextMed = null;
  let nextTime = null;
  let nextMins = Infinity;

  medications.forEach(med => {
    const times = parseFrequency(med.frequency);
    times.forEach(time => {
      const totalMins = time.hour * 60;
      const medMins = currentHour * 60 + currentMins;
      let diff = totalMins - medMins;
      if (diff <= 0) diff += 24 * 60;
      if (diff < nextMins) {
        nextMins = diff;
        nextTime = time;
        nextMed = med;
      }
    });
  });

  if (nextMed) {
    const timeStr = `${String(nextTime.hour).padStart(2, "0")}:${String(currentMins).padStart(2, "0")}`;
    return { med: nextMed, time: nextTime, timeStr, mins: nextMins };
  }
  return null;
}

function formatTimeFromMins(mins) {
  const hours = Math.floor(mins / 60);
  const minutes = mins % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export default function Dashboard({ onScanClick, onDeletePrescription }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [takenToday, setTakenToday] = useState({});

  useEffect(() => {
    const saved = localStorage.getItem("mediscan_prescriptions");
    if (saved) {
      setPrescriptions(JSON.parse(saved));
    }
    const taken = localStorage.getItem("mediscan_taken");
    if (taken) {
      const parsed = JSON.parse(taken);
      const today = new Date().toDateString();
      if (parsed.date !== today) {
        localStorage.removeItem("mediscan_taken");
      } else {
        setTakenToday(parsed.doses || {});
      }
    }
  }, []);

  const allMedications = prescriptions.flatMap(p => (p.medications || []).map(m => ({ ...m, prescriptionId: p.id })));
  const nextDose = getNextDoseTime(allMedications);

  const getTimeSlots = () => {
    const slots = {};
    const times = [6, 8, 10, 12, 14, 16, 18, 20, 22];
    times.forEach(h => {
      slots[h] = allMedications.filter(med => {
        const freqTimes = parseFrequency(med.frequency);
        return freqTimes.some(t => t.hour === h);
      });
    });
    return slots;
  };

  const timeSlots = getTimeSlots();

  const markTaken = (medName, prescriptionId) => {
    const key = `${prescriptionId}_${medName}`;
    const today = new Date().toDateString();
    const updated = { ...takenToday, [key]: true };
    setTakenToday(updated);
    localStorage.setItem("mediscan_taken", JSON.stringify({ date: today, doses: updated }));
  };

  const handleDelete = (id) => {
    const updated = prescriptions.filter(p => p.id !== id);
    setPrescriptions(updated);
    localStorage.setItem("mediscan_prescriptions", JSON.stringify(updated));
    onDeletePrescription?.(id);
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.title}>Medicine Dashboard</h1>
        <button style={s.scanBtn} onClick={onScanClick}>
          <Upload size={16} /> Scan Prescription
        </button>
      </div>

      {nextDose && (
        <div style={s.nextDoseCard}>
          <p style={{ margin: 0, opacity: 0.8, fontSize: 12, textTransform: "uppercase", letterSpacing: 2 }}>Next Dose In</p>
          <p style={s.nextDoseTime}>{formatTimeFromMins(nextDose.mins)}</p>
          <p style={s.nextDoseMed}>{nextDose.med.drugName} - {nextDose.med.dosage}</p>
          <p style={{ margin: "8px 0 0", fontSize: 12, opacity: 0.7 }}>Take at {nextDose.timeStr}</p>
        </div>
      )}

      <div style={s.grid}>
        <div style={s.statCard}>
          <p style={s.statValue}>{allMedications.length}</p>
          <p style={s.statLabel}>Active Medications</p>
        </div>
        <div style={s.statCard}>
          <p style={s.statValue}>{prescriptions.length}</p>
          <p style={s.statLabel}>Prescriptions</p>
        </div>
        <div style={s.statCard}>
          <p style={s.statValue}>{Object.keys(takenToday).length}</p>
          <p style={s.statLabel}>Doses Taken Today</p>
        </div>
      </div>

      {allMedications.length === 0 ? (
        <div style={s.emptyState}>
          <Pill size={48} color="#e2e8f0" style={{ marginBottom: 16 }} />
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>No prescriptions yet</p>
          <p style={{ fontSize: 13 }}>Scan a prescription to start tracking your medications</p>
        </div>
      ) : (
        <>
          <h2 style={s.sectionTitle}>Today's Schedule</h2>
          {Object.entries(timeSlots).filter(([_, meds]) => meds.length > 0).map(([hour, meds]) => (
            <div key={hour} style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 12, color: "#64748b", fontWeight: 700, marginBottom: 8 }}>
                <Clock size={12} style={{ marginRight: 4 }} /> {hour}:00
              </p>
              {meds.map((med, idx) => {
                const key = `${med.prescriptionId}_${med.drugName}`;
                const isTaken = takenToday[key];
                return (
                  <div key={idx} style={isTaken ? s.takenCard : s.medCard}>
                    <div style={s.medIcon}><Pill size={16} color="#0d9488" /></div>
                    <div style={s.medInfo}>
                      <p style={s.medName}>{med.drugName} {isTaken && <CheckCircle size={14} color="#10b981" style={{ marginLeft: 4 }} />}</p>
                      <p style={s.medDetails}>{med.dosage}</p>
                    </div>
                    {!isTaken ? (
                      <>
                        <button style={s.takenBtn} onClick={() => markTaken(med.drugName, med.prescriptionId)}>Mark Taken</button>
                        <button style={s.skipBtn}>Skip</button>
                      </>
                    ) : (
                      <span style={{ color: "#10b981", fontSize: 12, fontWeight: 600 }}>Taken</span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          <h2 style={s.sectionTitle}>All Medications</h2>
          {allMedications.map((med, idx) => (
            <div key={idx} style={s.medCard}>
              <div style={s.medIcon}><Pill size={16} color="#0d9488" /></div>
              <div style={s.medInfo}>
                <p style={s.medName}>{med.drugName}</p>
                <p style={s.medDetails}>{med.dosage} - {med.frequency}</p>
              </div>
              <button style={s.deleteBtn} onClick={() => handleDelete(med.prescriptionId)}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}

          <PrescriptionHistory />
        </>
      )}
    </div>
  );
}