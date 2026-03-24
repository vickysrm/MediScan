import { useState } from "react";
import { MapPin, Navigation, Loader2, Search } from "lucide-react";

const s = {
  container: { background: "#fff", borderRadius: 20, border: "1px solid #f1f5f9", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", padding: 20 },
  header: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  iconBox: { background: "#f0fdf9", borderRadius: 12, padding: 8, display: "flex", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0, textTransform: "uppercase", letterSpacing: 1 },
  searchRow: { display: "flex", gap: 8, marginBottom: 16 },
  searchInput: { flex: 1, padding: "10px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 13, outline: "none", fontFamily: "inherit" },
  searchBtn: { display: "flex", alignItems: "center", gap: 6, background: "#0d9488", color: "#fff", border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer" },
  pharmacyList: { display: "flex", flexDirection: "column", gap: 10 },
  pharmacyCard: { display: "flex", alignItems: "flex-start", gap: 12, padding: 14, background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0" },
  pharmacyIcon: { background: "#e0f2fe", borderRadius: 10, padding: 8, flexShrink: 0 },
  pharmacyInfo: { flex: 1, minWidth: 0 },
  pharmacyName: { fontSize: 13, fontWeight: 700, color: "#0f172a", margin: "0 0 4px" },
  pharmacyAddress: { fontSize: 11, color: "#64748b", margin: 0, lineHeight: 1.4 },
  directionsBtn: { display: "flex", alignItems: "center", gap: 4, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 10, fontWeight: 600, color: "#0d9488", cursor: "pointer", flexShrink: 0 },
  loadingRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 20, color: "#64748b", fontSize: 12 },
  errorText: { color: "#ef4444", fontSize: 12, textAlign: "center", padding: 12 },
  emptyText: { color: "#94a3b8", fontSize: 12, textAlign: "center", padding: 12 },
};

export default function PharmacyLocator() {
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchPharmacies = async (city) => {
    if (!city.trim()) return;
    setLoading(true);
    setError("");
    try {
      const geoRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`
      );
      const geoData = await geoRes.json();
      if (!geoData.length) {
        setError("City not found. Try a different name.");
        setLoading(false);
        return;
      }
      const { lat, lon } = geoData[0];
      const pharmRes = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=pharmacy&lat=${lat}&lon=${lon}&limit=5&radius=10000`
      );
      const pharmData = await pharmRes.json();
      setPharmacies(pharmData);
    } catch (err) {
      setError("Could not find pharmacies. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => fetchPharmacies(searchQuery);

  const openDirections = (pharmacy) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(pharmacy.display_name)}`;
    window.open(url, "_blank");
  };

  return (
    <div style={s.container}>
      <div style={s.header}>
        <div style={s.iconBox}>
          <MapPin size={18} color="#0d9488" />
        </div>
        <h3 style={s.title}>Find Pharmacies</h3>
      </div>

      <div style={s.searchRow}>
        <input
          type="text"
          placeholder="Enter city name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          style={s.searchInput}
        />
        <button style={s.searchBtn} onClick={handleSearch} disabled={loading}>
          {loading ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
          Search
        </button>
      </div>

      {error && <p style={s.errorText}>{error}</p>}

      {loading && (
        <div style={s.loadingRow}>
          <Loader2 size={16} className="spin" />
          Finding pharmacies...
        </div>
      )}

      {!loading && pharmacies.length > 0 && (
        <div style={s.pharmacyList}>
          {pharmacies.map((pharmacy, idx) => (
            <div key={idx} style={s.pharmacyCard}>
              <div style={s.pharmacyIcon}>
                <MapPin size={16} color="#0891b2" />
              </div>
              <div style={s.pharmacyInfo}>
                <p style={s.pharmacyName}>{pharmacy.display_name.split(",")[0]}</p>
                <p style={s.pharmacyAddress}>{pharmacy.display_name.split(",").slice(1).join(",").trim()}</p>
              </div>
              <button style={s.directionsBtn} onClick={() => openDirections(pharmacy)}>
                <Navigation size={10} /> Directions
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && pharmacies.length === 0 && searchQuery && (
        <p style={s.emptyText}>No pharmacies found in this city.</p>
      )}
    </div>
  );
}