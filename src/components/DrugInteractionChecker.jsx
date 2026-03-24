import { useState } from "react";
import { AlertTriangle, Shield, Zap, Info, X } from "lucide-react";

const KNOWN_INTERACTIONS = {
  "metformin": {
    "alcohol": { risk: "moderate", detail: "May increase risk of lactic acidosis. Avoid heavy alcohol consumption." },
    "contrast dye": { risk: "high", detail: "Temporarily stop Metformin before imaging procedures with contrast." },
  },
  "amlodipine": {
    "grapefruit": { risk: "moderate", detail: "Grapefruit can increase Amlodipine levels in blood." },
    "simvastatin": { risk: "moderate", detail: "May increase risk of muscle pain when combined with Simvastatin." },
  },
  "losartan": {
    "potassium": { risk: "moderate", detail: "Avoid potassium supplements as Losartan increases potassium levels." },
    "ibuprofen": { risk: "moderate", detail: "NSAIDs may reduce the blood pressure lowering effect of Losartan." },
  },
  "atorvastatin": {
    "grapefruit": { risk: "high", detail: "Grapefruit can increase Atorvastatin levels, raising risk of muscle damage." },
    "clarithromycin": { risk: "high", detail: "May increase risk of muscle damage. Use with caution or avoid." },
  },
  "omeprazole": {
    "clopidogrel": { risk: "moderate", detail: "Omeprazole may reduce the effectiveness of Clopidogrel." },
    "iron": { risk: "low", detail: "May reduce absorption of iron supplements." },
  },
  "ciprofloxacin": {
    "dairy": { risk: "moderate", detail: "Dairy products can reduce absorption of Ciprofloxacin." },
    "caffeine": { risk: "moderate", detail: "May increase caffeine side effects." },
    "antacids": { risk: "moderate", detail: "Antacids reduce absorption. Take 2 hours before or 6 hours after." },
  },
  "azithromycin": {
    "warfarin": { risk: "moderate", detail: "May increase risk of bleeding. Monitor closely." },
    "digoxin": { risk: "moderate", detail: "May increase Digoxin levels." },
  },
  "cetirizine": {
    "alcohol": { risk: "moderate", detail: "May increase drowsiness. Avoid alcohol." },
  },
  "paracetamol": {
    "alcohol": { risk: "high", detail: "Regular alcohol use with Paracetamol increases risk of liver damage." },
    "warfarin": { risk: "moderate", detail: "May increase anticoagulant effect of Warfarin." },
  },
  "ibuprofen": {
    "aspirin": { risk: "moderate", detail: "May reduce Aspirin's heart-protective effect." },
    "warfarin": { risk: "high", detail: "Increased risk of bleeding. Use with caution." },
    "lisinopril": { risk: "moderate", detail: "NSAIDs may reduce blood pressure lowering effect and increase kidney risk." },
  },
  "aspirin": {
    "ibuprofen": { risk: "moderate", detail: "May reduce Aspirin's heart-protective effect." },
    "warfarin": { risk: "high", detail: "Increased risk of bleeding." },
  },
  "metoprolol": {
    "fluoxetine": { risk: "moderate", detail: "May increase Metoprolol levels." },
    "verapamil": { risk: "high", detail: "May cause severe bradycardia. Avoid combination." },
  },
  "levothyroxine": {
    "calcium": { risk: "moderate", detail: "Calcium reduces absorption. Take 4 hours apart." },
    "iron": { risk: "moderate", detail: "Iron reduces absorption. Take 4 hours apart." },
  },
};

const s = {
  container: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 20 },
  header: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  iconBox: { background: "#fef2f2", borderRadius: 12, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0, textTransform: "uppercase", letterSpacing: 1 },
  interactionRow: { display: "flex", alignItems: "flex-start", gap: 12, background: "#f8fafc", borderRadius: 14, padding: 14, marginBottom: 10 },
  badge: (risk) => {
    const colors = { high: { bg: "#fee2e2", color: "#b91c1c" }, moderate: { bg: "#fef3c7", color: "#b45309" }, low: { bg: "#dbeafe", color: "#1d4ed8" } };
    const c = colors[risk] || colors.low;
    return { fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, padding: "4px 10px", borderRadius: 99, background: c.bg, color: c.color };
  },
  medNames: { fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" },
  detail: { fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.5 },
  noInteractions: { textAlign: "center", padding: 20, color: "#10b981", fontSize: 13 },
  sectionSubtitle: { fontSize: 12, color: "#64748b", marginTop: 4 },
};

function findInteractions(medications) {
  const interactions = [];
  const medNames = medications.map(m => {
    const name = (m.drugName || "").toLowerCase();
    const parts = name.split(" ");
    return parts[0];
  });

  for (let i = 0; i < medNames.length; i++) {
    for (let j = i + 1; j < medNames.length; j++) {
      const med1 = medNames[i];
      const med2 = medNames[j];

      for (const [key1, interactions1] of Object.entries(KNOWN_INTERACTIONS)) {
        if (med1.includes(key1) || key1.includes(med1)) {
          if (interactions1[med2] || interactions1[med2.replace(" ", "")]) {
            interactions.push({
              drugs: [med1, med2],
              ...(interactions1[med2] || interactions1[med2.replace(" ", "")])
            });
          }
        }
        if (med2.includes(key1) || key1.includes(med2)) {
          if (interactions1[med1] || interactions1[med1.replace(" ", "")]) {
            interactions.push({
              drugs: [med2, med1],
              ...(interactions1[med1] || interactions1[med1.replace(" ", "")])
            });
          }
        }
      }
    }
  }

  return interactions;
}

export default function DrugInteractionChecker({ medications = [] }) {
  const interactions = findInteractions(medications);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.iconBox}>
          <Zap size={18} color="#b91c1c" />
        </div>
        <div>
          <h3 style={s.title}>Drug Interactions</h3>
          <p style={s.sectionSubtitle}>Check for known interactions between your medicines</p>
        </div>
      </div>

      {interactions.length === 0 ? (
        <div style={s.noInteractions}>
          <Shield size={24} style={{ marginBottom: 8 }} />
          <p>No known interactions found between your medications.</p>
          <p style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Always consult your doctor or pharmacist.</p>
        </div>
      ) : (
        <div>
          {interactions.map((interaction, idx) => (
            <div key={idx} style={s.interactionRow}>
              <span style={s.badge(interaction.risk)}>{interaction.risk}</span>
              <div>
                <p style={s.medNames}>{interaction.drugs[0]} + {interaction.drugs[1]}</p>
                <p style={s.detail}>{interaction.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}