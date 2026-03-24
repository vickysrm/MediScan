import { useState, useEffect, useRef, useCallback } from "react";
import { Upload, Camera, X, Image as ImageIcon } from "lucide-react";
import { validateFile } from "../utils/file";

const s = {
  heroTitle: { textAlign: "center", fontSize: 30, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: -1 },
  heroTitleAccent: { color: "#0d9488", fontStyle: "italic" },
  heroSub: { textAlign: "center", fontSize: 14, color: "#64748b", maxWidth: 360, margin: "8px auto 0", lineHeight: 1.6 },
  uploadZone: { position: "relative", height: 220, borderRadius: 20, border: "2px dashed #99f6e4", background: "#fff", cursor: "pointer", overflow: "hidden", transition: "border-color 0.2s, box-shadow 0.2s", display: "flex", alignItems: "center", justifyContent: "center" },
  uploadInner: { display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" },
  uploadIconBox: { width: 64, height: 64, borderRadius: 18, background: "#f0fdf9", border: "1px solid #ccfbf1", display: "flex", alignItems: "center", justifyContent: "center" },
  uploadTitle: { fontWeight: 600, fontSize: 15, color: "#374151", margin: 0 },
  uploadSub: { fontSize: 12, color: "#9ca3af", margin: "4px 0 0" },
  chooseBtn: { padding: "8px 20px", background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(13,148,136,0.3)" },
  cameraBtn: { padding: "8px 20px", background: "#fff", color: "#0d9488", border: "2px solid #0d9488", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer" },
  previewContainer: { position: "relative", width: "100%", height: "100%" },
  previewImage: { width: "100%", height: "100%", objectFit: "cover" },
  previewOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, padding: 16, background: "linear-gradient(transparent, rgba(0,0,0,0.7))", display: "flex", alignItems: "center", justifyContent: "center", gap: 12 },
  analyzeBtn: { padding: "8px 20px", background: "#0d9488", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(13,148,136,0.3)" },
  cancelBtn: { padding: "8px 20px", background: "rgba(255,255,255,0.2)", color: "#fff", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: "pointer", backdropFilter: "blur(4px)" },
  errorText: { fontSize: 12, color: "#ef4444", fontWeight: 600, marginTop: 8 },
  scanningOverlay: { position: "absolute", inset: 0, background: "rgba(13,148,136,0.08)", borderRadius: 20 },
};

export default function UploadZone({ onScan, isScanning }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const handleFile = useCallback((f) => {
    const result = validateFile(f);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError(null);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }, []);

  useEffect(() => {
    const el = dropRef.current;
    if (!el || isScanning) return;
    const onDrop = e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };
    const onDragOver = e => { e.preventDefault(); setDragOver(true); };
    const onDragLeave = () => setDragOver(false);
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("dragleave", onDragLeave);
    el.addEventListener("drop", onDrop);
    return () => {
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("dragleave", onDragLeave);
      el.removeEventListener("drop", onDrop);
    };
  }, [isScanning, handleFile]);

  const handleAnalyze = () => {
    if (file) onScan(file);
  };

  const handleCancel = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleKeyDown = (e) => {
    if (isScanning) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileRef.current?.click();
    }
  };

  return (
    <>
      {!preview && !isScanning && (
        <div className="fadeUp">
          <h2 style={s.heroTitle}>Analyze <span style={s.heroTitleAccent}>Medical Documents</span></h2>
          <p style={s.heroSub}>Upload a prescription or clinical note for automated extraction and translation.</p>
        </div>
      )}

      <div
        ref={dropRef}
        style={{
          ...s.uploadZone,
          borderColor: dragOver ? "#0d9488" : isScanning || preview ? "transparent" : "#99f6e4",
          borderStyle: isScanning || preview ? "solid" : "dashed",
          boxShadow: dragOver ? "0 4px 20px rgba(13,148,136,0.12)" : "none",
          cursor: isScanning ? "default" : "pointer",
        }}
        onClick={() => !preview && !isScanning && fileRef.current?.click()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={preview ? "Image preview" : "Upload document image"}
      >
        {preview ? (
          <div style={s.previewContainer}>
            <img src={preview} alt="Prescription preview" style={s.previewImage} />
            {!isScanning && (
              <div style={s.previewOverlay}>
                <button style={s.analyzeBtn} onClick={(e) => { e.stopPropagation(); handleAnalyze(); }}>
                  Analyze Prescription
                </button>
                <button style={s.cancelBtn} onClick={(e) => { e.stopPropagation(); handleCancel(); }}>
                  <X size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Cancel
                </button>
              </div>
            )}
            {isScanning && <div style={s.scanningOverlay} />}
          </div>
        ) : isScanning ? (
          <div style={s.scanningOverlay} />
        ) : (
          <div style={s.uploadInner}>
            <div style={s.uploadIconBox}><Upload size={26} color="#0d9488" /></div>
            <div>
              <p style={s.uploadTitle}>Upload Document Image</p>
              <p style={s.uploadSub}>Click to browse · JPG, PNG, WEBP</p>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button style={s.chooseBtn} onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}>
                <ImageIcon size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Choose Image
              </button>
              <button style={s.cameraBtn} onClick={(e) => { e.stopPropagation(); cameraRef.current?.click(); }}>
                <Camera size={14} style={{ verticalAlign: "middle", marginRight: 4 }} /> Take Photo
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p style={s.errorText} role="alert">{error}</p>}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={e => { const f = e.target.files[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
    </>
  );
}
