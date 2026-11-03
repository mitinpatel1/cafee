import React, { useCallback, useEffect, useState } from "react";
import { Download, AlertTriangle, TrendingUp, Trash2, RefreshCw } from "lucide-react";
import { api } from "../../api/api";
const forest = "#173f35";
const orange = "#ee7843";
const blank = { name: "", quantity: "1", unit: "pcs", reason: "Unsold", cost: "0", note: "" };
const request = async (url, opts = {}) => {
    const response = await fetch(url, { cache: "no-store", ...opts, headers: { Authorization: `Bearer ${localStorage.getItem("officebite_token") || ""}`, ...(opts.body ? { "Content-Type": "application/json" } : {}), ...(opts.headers || {}) } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");
    return data;
};
function csvCell(value) {
    const cell = String(value ?? "");
    const safe = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
    return `"${safe.replace(/"/g, '""')}"`;
}
function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function FranchiseOperationsPage() {
    const [outlets, setOutlets] = useState([]), [franchiseId, setFranchiseId] = useState("");
    const [inventory, setInventory] = useState([]), [summary, setSummary] = useState(null), [waste, setWaste] = useState([]);
    const [feedback, setFeedback] = useState([]), [rating, setRating] = useState(0);
    const [form, setForm] = useState(blank), [error, setError] = useState(""), [success, setSuccess] = useState(""), [busy, setBusy] = useState(false);
    useEffect(() => { api.getMyFranchises().then(r => { const items = r.franchises || []; setOutlets(items); setFranchiseId(items[0]?._id || ""); }).catch(e => setError(e.message)); }, []);
    const refresh = useCallback(async () => {
        if (!franchiseId) return;
        try {
            const [stock, stats, register, reviews] = await Promise.all([
                api.getFranchiseInventory(franchiseId),
                request(`/api/operations/franchise/${franchiseId}/summary`),
                request(`/api/operations/franchise/${franchiseId}/waste`),
                request(`/api/feedback/franchise/${franchiseId}`),
            ]);
            setInventory(stock.ingredients || []); setSummary(stats.summary || null); setWaste(register.entries || []); setFeedback(reviews.entries || []); setRating(reviews.averageRating || 0); setError("");
        } catch (err) { setError(err.message); }
    }, [franchiseId]);
    useEffect(() => { refresh(); const timer = setInterval(() => { if (!document.hidden) refresh(); }, 15000); return () => clearInterval(timer); }, [refresh]);
    const submit = async (e) => {
        e.preventDefault(); if (!franchiseId) return; setBusy(true); setError(""); setSuccess("");
        try { await request(`/api/operations/franchise/${franchiseId}/waste`, { method: "POST", body: JSON.stringify({ ...form, quantity: Number(form.quantity), cost: Number(form.cost) }) }); setSuccess("Wastage recorded."); setForm(blank); await refresh(); }
        catch (err) { setError(err.message); } finally { setBusy(false); }
    };
    const inputStyle = { padding: 11, border: "1px solid #e5ebe4", borderRadius: 10, minWidth: 0, width: "100%" };
    return <div style={{ padding: 25, minHeight: "100vh", background: "#faf9f5", color: forest }}>
        <header style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 15, alignItems: "center" }}><div><h1>Franchise Operations</h1><p>Low stock, daily revenue, wastage and CSV exports</p></div><button type="button" onClick={refresh} style={inputStyle}><RefreshCw size={15} /> Refresh</button></header>
        <label>Outlet <select style={{ ...inputStyle, maxWidth: 320, marginLeft: 8 }} value={franchiseId} onChange={e => setFranchiseId(e.target.value)}>{outlets.map(o => <option key={o._id} value={o._id}>{o.name}</option>)}</select></label>
        {error && <p role="alert" style={{ color: "#b45335" }}>{error}</p>}{success && <p role="status" style={{ color: "#167d49" }}>{success}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 13, margin: "23px 0" }}>
            {[["Orders today", summary?.ordersToday ?? "—"], ["Paid revenue", `₹${summary?.revenueToday ?? 0}`], ["Low stock", summary?.lowStock?.length ?? "—"], ["Waste cost today", `₹${summary?.wasteCostToday ?? 0}`]].map(([name, value]) => <div key={name} style={{ background: "white", border: "1px solid #e5ebe4", borderRadius: 15, padding: 20 }}><small>{name}</small><h2 style={{ marginBottom: 0 }}>{value}</h2></div>)}
        </div>
        <section style={{ padding: 20, background: "white", borderRadius: 16, marginBottom: 17 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><h2><AlertTriangle color={orange} size={19} /> Low-stock alerts</h2><button type="button" onClick={() => downloadCsv("officebite-inventory.csv", [["Ingredient", "Stock", "Minimum", "Unit", "Category"], ...inventory.map(i => [i.name, i.currentStock, i.minStock, i.unit, i.category])])}><Download size={16} /> Export inventory CSV</button></div>
            {(summary?.lowStock || []).length ? <ul>{summary.lowStock.map(i => <li key={i._id}>{i.name}: {i.currentStock} {i.unit} (minimum {i.minStock})</li>)}</ul> : <p>All inventory items are above minimum stock.</p>}
        </section>
        <section style={{ padding: 20, background: "white", borderRadius: 16, marginBottom: 17 }}><h2><Trash2 size={20} /> Record food wastage</h2>
            <form onSubmit={submit} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
                <label>Item<input style={inputStyle} maxLength={100} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
                <label>Quantity<input style={inputStyle} type="number" step="0.001" min="0.001" required value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} /></label>
                <label>Unit<select style={inputStyle} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>{["kg", "g", "L", "ml", "pcs"].map(x => <option key={x}>{x}</option>)}</select></label>
                <label>Reason<select style={inputStyle} value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>{["Expired", "Damaged", "Preparation", "Unsold", "Other"].map(x => <option key={x}>{x}</option>)}</select></label>
                <label>Cost (₹)<input style={inputStyle} type="number" step="0.01" min="0" value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} /></label>
                <button type="submit" disabled={busy || !franchiseId} style={{ border: 0, borderRadius: 10, background: orange, color: "white", padding: 12, fontWeight: 850 }}>{busy ? "Saving…" : "Save wastage"}</button>
            </form>
        </section>
        <section style={{ padding: 20, background: "white", borderRadius: 16 }}><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}><h2>Waste register</h2><button type="button" onClick={() => downloadCsv("officebite-waste.csv", [["Date", "Item", "Quantity", "Unit", "Reason", "Cost"], ...waste.map(w => [new Date(w.createdAt).toLocaleDateString("en-IN"), w.name, w.quantity, w.unit, w.reason, w.cost])])}><Download size={15} /> Export CSV</button></div>
            <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse" }}><thead><tr>{["Item", "Quantity", "Reason", "Cost", "Date"].map(h => <th style={{ textAlign: "left", padding: 10 }} key={h}>{h}</th>)}</tr></thead><tbody>{waste.map(w => <tr key={w._id}>{[w.name, `${w.quantity} ${w.unit}`, w.reason, `₹${w.cost}`, new Date(w.createdAt).toLocaleString("en-IN")].map((v, i) => <td key={i} style={{ padding: 10, borderTop: "1px solid #e5ebe4" }}>{v}</td>)}</tr>)}</tbody></table></div>
            {!waste.length && <p>No wastage entries yet.</p>}
        </section>
        <section style={{ padding: 20, background: "white", borderRadius: 16, marginTop: 18 }}>
            <h2>Customer feedback · {rating} / 5 ★</h2>
            {feedback.length ? feedback.slice(0, 20).map(f => <div key={f._id} style={{ padding: "12px 0", borderTop: "1px solid #e5ebe4" }}><b>{"★".repeat(f.rating)}{"☆".repeat(5 - f.rating)}</b><p style={{ margin: "8px 0" }}>{f.comment || "No comment"}</p><small>{new Date(f.createdAt).toLocaleDateString("en-IN")}</small></div>) : <p>No customer ratings yet.</p>}
        </section>
    </div>;
}
export default FranchiseOperationsPage;
