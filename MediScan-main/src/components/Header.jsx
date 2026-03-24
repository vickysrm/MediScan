import { Pill, RefreshCw, Brain, Key } from "lucide-react";
import { LANGUAGES } from "../constants/languages";

const s = {
  header: { background: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #e0f7f4", position: "sticky", top: 0, zIndex: 20 },
  headerInner: { maxWidth: 640, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 },
  logo: { display: "flex", alignItems: "center", gap: 12 },
  logoIcon: { width: 38, height: 38, borderRadius: 12, background: "linear-gradient(135deg,#0d9488,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(13,148,136,0.3)" },
  logoTitle: { fontWeight: 800, fontSize: 20, color: "#0f172a", margin: 0, letterSpacing: -0.5 },
  logoSub: { fontSize: 10, color: "#0d9488", fontWeight: 700, textTransform: "uppercase", letterSpacing: 2, margin: 0 },
  changeKeyBtn: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "none", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 },
  resetBtn: { display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "none", border: "none", cursor: "pointer", fontWeight: 600 },
  controls: { display: "flex", alignItems: "center", gap: 16 },
  select: { padding: "6px 12px", borderRadius: 8, border: "1px solid #cbd5e1", fontSize: 13, color: "#334155", background: "#fff", outline: "none", cursor: "pointer", fontWeight: 600 },
};

export default function Header({ language, onLanguageChange, showNewScan, onNewScan, onTrainClick, onChangeApiKey }) {
  return (
    <header style={s.header}>
      <div style={s.headerInner}>
        <div style={s.logo}>
          <div style={s.logoIcon}><Pill size={18} color="#fff" /></div>
          <div>
            <p style={s.logoTitle}>MediScan</p>
            <p style={s.logoSub}>Medical Translator</p>
          </div>
        </div>
        <div style={s.controls}>
          {onChangeApiKey && (
            <button
              onClick={onChangeApiKey}
              style={s.changeKeyBtn}
            >
              <Key size={14} /> Change API Key
            </button>
          )}
          {!showNewScan && (
            <button
              onClick={onTrainClick}
              style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#667eea", background: "none", border: "1px solid #667eea", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 600 }}
            >
              <Brain size={14} /> Train Model
            </button>
          )}
          {!showNewScan && (
            <select
              value={language}
              onChange={e => onLanguageChange(e.target.value)}
              style={s.select}
            >
              {LANGUAGES.map(lang => <option key={lang} value={lang}>{lang}</option>)}
            </select>
          )}
          {showNewScan && (
            <button style={s.resetBtn} onClick={onNewScan}>
              <RefreshCw size={13} /> New Scan
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
