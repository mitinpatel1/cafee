import React, { useCallback, useEffect, useState } from "react";
import { Armchair, RefreshCw } from "lucide-react";
import { api } from "../../api/api";

export function SeatMonitorPage({ role = "admin" }) {
    const [outlets, setOutlets] = useState([]);
    const [selected, setSelected] = useState("");
    const [data, setData] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    useEffect(() => {
        const call = role === "admin" ? api.getAllFranchises : api.getMyFranchises;
        call().then(r => { const items = r.franchises || []; setOutlets(items); setSelected(items[0]?._id || ""); }).catch(e => setError(e.message));
    }, [role]);
    const reload = useCallback(async () => {
        if (!selected) { setData(null); return; }
        setLoading(true);
        try {
            const token = localStorage.getItem("officebite_token") || "";
            const response = await fetch(`/api/operations/seats/${encodeURIComponent(selected)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || "Unable to load seats.");
            setData(result); setError("");
        } catch (e) { setError(e.message); } finally { setLoading(false); }
    }, [selected]);
    useEffect(() => { reload(); const interval = setInterval(() => { if (!document.hidden) reload(); }, 10000); return () => clearInterval(interval); }, [reload]);
    const card = { border: "1px solid #e5ebe4", borderRadius: 16, padding: 16, background: "white" };
    return <div className="ob-portal-page cf-page" style={{ color: "#173f35" }}>
        <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 15, alignItems: "center" }}><div><h1>Live Seat Occupancy</h1><p>Read-only view. Customers choose and confirm their seats on the kiosk.</p></div><button className="cf-outlined" type="button" onClick={reload}><RefreshCw size={16} /> Refresh</button></header>
        <label style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", margin: "20px 0" }}>Cafeteria <select value={selected} onChange={e => setSelected(e.target.value)} style={{ padding: "11px 15px", borderRadius: 12, border: "1px solid #e5ebe4", minWidth: 240 }}>{outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}</select></label>
        {error && <p role="alert" style={{ color: "#b45335" }}>{error}</p>}
        {loading && !data && <p>Loading seat occupancy…</p>}
        {data && <><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 14, marginBottom: 21 }}>{[["Total seats", data.capacity], ["Available", data.available.length], ["Occupied", data.occupied.length]].map(([k, v]) => <div key={k} style={card}><small>{k}</small><h2 style={{ margin: "8px 0" }}>{v}</h2></div>)}</div>
            <div style={{ ...card, display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(100px,1fr))", gap: 12 }}>{Array.from({ length: data.capacity }, (_, i) => i + 1).map(n => { const occupied = data.occupied.includes(n); return <div key={n} title={occupied ? "Occupied" : "Available"} style={{ display: "grid", justifyItems: "center", gap: 5, border: `1px solid ${occupied ? "#e5b5ae" : "#bae2c9"}`, borderRadius: 13, padding: 15, color: occupied ? "#b54c3b" : "#177f4a", background: occupied ? "#fff2ee" : "#effaf3" }}><Armchair size={25} /><b>Seat {n}</b><small>{occupied ? "Occupied" : "Available"}</small></div> })}</div>
        </>}
        <p style={{ marginTop: 16, color: "#74867c", fontSize: 13 }}>To prevent double booking, seat reservations are controlled only by the customer order-key secured kiosk endpoint.</p>
    </div>;
}
export default SeatMonitorPage;
