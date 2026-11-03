import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, CheckCircle2, RefreshCw, Clock3, Armchair } from "lucide-react";

const COLORS = { forest: "#173f35", orange: "#ee7843", paper: "#fff", line: "#e5ebe4" };
const NEXT = { Pending: "Confirmed", Confirmed: "Preparing", Preparing: "Ready", Ready: "Picked Up" };
const ACTION = { Confirmed: "Confirm", Preparing: "Start cooking", Ready: "Mark ready", "Picked Up": "Picked up" };
const minutesSince = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
const money = (price) => `₹${Number(price || 0).toLocaleString("en-IN")}`;

export function KitchenDisplayPage() {
    const [orders, setOrders] = useState([]);
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("All");
    const [now, setNow] = useState(Date.now());

    const load = useCallback(async () => {
        try {
            const token = localStorage.getItem("officebite_token");
            const res = await fetch("/api/operations/kitchen", { headers: { Authorization: `Bearer ${token || ""}` }, cache: "no-store" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || "Unable to load kitchen orders.");
            setOrders(Array.isArray(data.orders) ? data.orders : []);
            setError("");
        } catch (err) { setError(err.message); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => {
        load();
        const interval = setInterval(() => { if (!document.hidden) load(); }, 5000);
        const timer = setInterval(() => setNow(Date.now()), 15000);
        return () => { clearInterval(interval); clearInterval(timer); };
    }, [load]);

    const update = async (order, status) => {
        if (!NEXT[order.status] || busy) return;
        setBusy(order._id); setError("");
        try {
            const token = localStorage.getItem("officebite_token");
            const response = await fetch(`/api/operations/kitchen/${encodeURIComponent(order._id)}/status`, {
                method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || ""}` },
                body: JSON.stringify({ status, readyInMinutes: order.readyInMinutes || 15 }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || "Could not update kitchen order.");
            await load();
        } catch (err) { setError(err.message); }
        finally { setBusy(""); }
    };

    const displayed = useMemo(() => filter === "All" ? orders : orders.filter(o => o.status === filter), [orders, filter]);
    const counts = useMemo(() => Object.fromEntries(["Pending", "Confirmed", "Preparing", "Ready"].map(s => [s, orders.filter(o => o.status === s).length])), [orders]);
    void now;

    return (
        <div style={{ padding: "25px", background: "#faf9f5", minHeight: "100vh", color: COLORS.forest }}>
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 15, flexWrap: "wrap", marginBottom: 22 }}>
                <div><h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 10 }}><ChefHat /> Kitchen Display</h1><p style={{ color: "#6f8378" }}>Live paid orders with customer-selected seats</p></div>
                <button type="button" onClick={load} style={{ padding: "11px 16px", border: `1px solid ${COLORS.line}`, borderRadius: 12, background: "white" }}><RefreshCw size={15} /> Refresh</button>
            </header>
            {error && <p role="alert" style={{ padding: 15, background: "#fff1e9", borderRadius: 12 }}>{error}</p>}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 23 }}>
                {["All", "Pending", "Confirmed", "Preparing", "Ready"].map(s => <button type="button" key={s} onClick={() => setFilter(s)} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 12, padding: "12px 15px", background: filter === s ? COLORS.forest : "white", color: filter === s ? "white" : COLORS.forest, fontWeight: 750 }}>{s} {s === "All" ? orders.length : counts[s]}</button>)}
            </div>
            {loading && <p>Loading live kitchen queue…</p>}
            {!loading && displayed.length === 0 && <p>No orders in this queue.</p>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 17 }}>
                {displayed.map(order => {
                    const next = NEXT[order.status];
                    return <article key={order._id} style={{ border: `1px solid ${COLORS.line}`, borderRadius: 18, background: COLORS.paper, overflow: "hidden", boxShadow: "0 6px 24px #173f3510" }}>
                        <div style={{ background: order.status === "Ready" ? "#e9f7ef" : "#f2f6ef", padding: 18 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><b>{order.orderNumber}</b><span style={{ fontSize: 12, fontWeight: 750 }}>{order.status}</span></div>
                            <div style={{ marginTop: 13, display: "flex", alignItems: "center", gap: 9, fontWeight: 850 }}><Armchair size={21} /> Seat {order.seatNumber}</div>
                            <small style={{ color: "#64796d" }}>{order.franchiseId?.name || "Cafeteria"}</small>
                        </div>
                        <div style={{ padding: 18 }}>
                            <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: "#738579" }}><Clock3 size={14} /> {minutesSince(order.createdAt)} minutes since order</div>
                            <ul style={{ paddingLeft: 20, margin: "15px 0", lineHeight: 1.8 }}>{(order.items || []).map((item, i) => <li key={i}><b>{item.quantity}×</b> {item.name}{item.instructions && <div style={{ color: "#9d6836", fontSize: 12 }}>{item.instructions}</div>}</li>)}</ul>
                            {next && <button type="button" disabled={Boolean(busy)} onClick={() => update(order, next)} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: 7, padding: 13, borderRadius: 12, border: 0, fontWeight: 850, color: "white", background: COLORS.orange }}><CheckCircle2 size={16} /> {busy === order._id ? "Updating…" : ACTION[next]}</button>}
                        </div>
                    </article>;
                })}
            </div>
        </div>
    );
}
export default KitchenDisplayPage;
