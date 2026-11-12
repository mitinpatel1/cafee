import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/api";
import { useSocket } from "../../context/SocketContext";
import { portalMoney } from "../../components/ui/PortalPieces";
import {
  PageHead, Metric, Tabs, DataTable, SearchField, Status,
  orderId, orderItemsText,
} from "../../components/ui/CafeteriaKit";
import {
  Armchair, CheckCircle2, ChefHat, ChevronDown, Clock3,
  CreditCard, RefreshCw, ShoppingBag, Trash2, Wallet,
} from "lucide-react";

const statuses = ["All", "Pending", "Confirmed", "Preparing", "Ready", "Picked Up", "Cancelled"];
const nextStatus = { Pending: "Confirmed", Confirmed: "Preparing", Preparing: "Ready", Ready: "Picked Up" };
const nextLabel = { Confirmed: "Confirm Order", Preparing: "Start Preparing", Ready: "Mark Ready", "Picked Up": "Complete Order" };
const counterMethods = ["Counter Cash", "Counter UPI", "Cash on Pickup"];

const formatDate = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "—";

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [eta, setEta] = useState({});
  const [refs, setRefs] = useState({});
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const { socket } = useSocket();

  const refresh = useCallback(async () => {
    try {
      const result = await api.getAllOrders();
      setOrders(Array.isArray(result.orders) ? result.orders : []);
    } catch (err) {
      setError(err.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!socket) return;
    const update = () => refresh();
    const events = ["new_order", "order_status_updated", "payment_confirmed", "franchise_order_updated"];
    events.forEach((event) => socket.on(event, update));
    return () => events.forEach((event) => socket.off(event, update));
  }, [socket, refresh]);

  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  // Expanding an order no longer triggers admin-side seat lookups.
  // Customers select their own seats after payment is verified.
  const openOrder = (order) => {
    setExpanded((previous) => previous === order._id ? null : order._id);
  };

  const confirmCounterPayment = async (order) => {
    if (busy) return;
    const reference = String(refs[order._id] || "").trim();
    if (order.paymentMethod === "Counter UPI" && (reference.length < 4 || reference.length > 120)) {
      setError("Enter a valid UPI transaction reference.");
      return;
    }
    if (!window.confirm(`Have you received ${portalMoney(order.total)} via ${order.paymentMethod}?`)) return;
    setBusy(order._id); setError(""); setNotice("");
    try {
      await api.collectCounterPayment(order._id, reference);
      setNotice(`Payment verified for ${orderId(order)}. Customer can now select an available seat.`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const updateStatus = async (order, status) => {
    if (busy) return;
    if (status !== "Cancelled" && order.paymentStatus !== "Paid") {
      setError("Payment must be verified first.");
      return;
    }
    if (status === "Confirmed" && !order.seatNumber) {
      setError("Customer must select a seat before the order can be confirmed.");
      return;
    }
    if (status === "Cancelled" && order.paymentStatus === "Paid") {
      setError("Paid orders require a refund before cancellation.");
      return;
    }
    let minutes;
    if (["Confirmed", "Preparing"].includes(status)) {
      minutes = Number(eta[order._id] ?? order.readyInMinutes ?? 15);
      if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
        setError("ETA must be between 1 and 180 minutes.");
        return;
      }
    }
    if (!window.confirm(`Move ${orderId(order)} to ${status}?`)) return;
    setBusy(order._id); setError(""); setNotice("");
    try {
      await api.updateOrderStatus(order._id, status, minutes);
      setNotice(`${orderId(order)}: ${status}${status === "Picked Up" ? " (seat released)" : ""}.`);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const metrics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((o) => o.status === "Pending").length,
    preparing: orders.filter((o) => o.status === "Preparing").length,
    paidWaiting: orders.filter((o) => o.paymentStatus === "Paid" && !o.seatNumber && !["Cancelled", "Picked Up"].includes(o.status)).length,
  }), [orders]);

  const filtered = useMemo(() => orders.filter((order) => {
    const text = [order.orderNumber, order.trackingCode, order.userId?.name,
      order.franchiseId?.name, order.seatNumber, orderItemsText(order)]
      .filter(Boolean).join(" ").toLowerCase();
    return (filter === "All" || order.status === filter) &&
      text.includes(search.trim().toLowerCase()) && text.includes(query);
  }), [orders, search, filter, query]);

  return (
    <div className="ob-portal-page cf-page">
      <PageHead title="Order Management" subtitle="Verify payments and manage guest orders. Customers choose their own seats.">
        <button className="cf-outlined" type="button" onClick={refresh} disabled={Boolean(busy)}>
          <RefreshCw size={16} /> Refresh
        </button>
      </PageHead>

      <div className="cf-stat-grid">
        <Metric icon={ShoppingBag} label="Total Orders" value={metrics.total} sub="All customers" />
        <Metric icon={Clock3} label="Pending" value={metrics.pending} sub="Awaiting action" tint="peach" />
        <Metric icon={ChefHat} label="Preparing" value={metrics.preparing} sub="In kitchen" tint="orange" />
        <Metric icon={Armchair} label="Paid / Seat Pending" value={metrics.paidWaiting} sub="Awaiting customer selection" tint="green" />
      </div>

      {error && <div className="ob-portal-error" role="alert">{error}
        <button type="button" onClick={() => setError("")}>Dismiss</button>
      </div>}
      {notice && <div className="cf-notice" role="status"><CheckCircle2 size={16} />{notice}</div>}

      <section className="cf-panel">
        <div className="cf-panel-head">
          <div><h2>All Customer Orders</h2><p>Multiple guests can order simultaneously. Paid customers choose their own seats.</p></div>
          <SearchField value={search} onChange={setSearch} placeholder="Search order, guest or seat..." />
        </div>
        <Tabs items={statuses} value={filter} onChange={setFilter} />
        <DataTable
          headers={["Order", "Customer", "Franchise / Items", "Total", "Payment", "Status", "Seat", "Action"]}
          loading={loading}
          empty={!loading && filtered.length === 0 ? "No matching orders." : null}
        >
          {filtered.map((order) => {
            const expandedHere = expanded === order._id;
            const next = nextStatus[order.status];
            const canPay = counterMethods.includes(order.paymentMethod) && order.paymentStatus !== "Paid" && order.status !== "Cancelled";
            return (
              <React.Fragment key={order._id}>
                <tr>
                  <td><b>{orderId(order)}</b><small className="cf-cell-sub">{formatDate(order.createdAt)}</small></td>
                  <td>{order.isGuestOrder ? "Walk-in Guest" : (order.userId?.name || "Customer")}</td>
                  <td>{order.franchiseId?.name || "Franchise"}<small className="cf-cell-sub">{orderItemsText(order)}</small></td>
                  <td>{portalMoney(order.total)}</td>
                  <td><Status status={order.paymentStatus} /></td>
                  <td><Status status={order.status} /></td>
                  <td>{order.seatNumber ? <b><Armchair size={14} /> {order.seatNumber}</b> : "Pending"}</td>
                  <td><button type="button" className="cf-outlined cf-expand" onClick={() => openOrder(order)} aria-expanded={expandedHere}>Details <ChevronDown size={14} /></button></td>
                </tr>
                {expandedHere && (
                  <tr className="cf-expanded-row"><td colSpan={8}>
                    <div className="cf-order-details">
                      <div>
                        <h3>{orderId(order)} · Customer & Payment</h3>
                        <p><strong>Customer:</strong> {order.isGuestOrder ? "Walk-in Guest" : order.userId?.name || "Customer"}</p>
                        <p><strong>Tracking:</strong> {order.trackingCode || "—"}</p>
                        <p><strong>Method:</strong> {order.paymentMethod}</p>
                        <p><strong>Payment:</strong> {order.paymentStatus}</p>
                        <p><strong>Order:</strong> {order.status}</p>
                        <p><strong>Seat:</strong> {order.seatNumber != null ? `Seat ${order.seatNumber}` : "Not selected by customer"}</p>
                        <p><strong>ETA:</strong> {formatDate(order.estimatedReadyTime)}</p>
                        <p><strong>Items:</strong> {orderItemsText(order)}</p>
                        {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
                      </div>
                      <div className="cf-order-actions">
                        {canPay && (
                          <>
                            {order.paymentMethod === "Counter UPI" &&
                              <input type="text" className="cf-upi-input" maxLength={120}
                                placeholder="UPI reference" aria-label="UPI reference"
                                value={refs[order._id] || ""}
                                onChange={(e) => setRefs((p) => ({ ...p, [order._id]: e.target.value }))} />}
                            <button className="cf-primary" type="button" disabled={Boolean(busy)} onClick={() => confirmCounterPayment(order)}>
                              <Wallet size={16} /> Confirm Counter Payment
                            </button>
                          </>
                        )}

                        {order.seatNumber && <p style={{ color: "#15803d", fontWeight: 700 }}><CheckCircle2 size={16} /> Seat {order.seatNumber} selected by customer</p>}
                        {next && (
                          <>
                            {["Pending", "Confirmed"].includes(order.status) &&
                              <label className="cf-eta-label">ETA (minutes)
                                <input type="number" min={1} max={180}
                                  value={eta[order._id] ?? order.readyInMinutes ?? 15}
                                  onChange={(e) => setEta((p) => ({ ...p, [order._id]: e.target.value }))} />
                              </label>}
                            <button type="button" className="cf-primary"
                              disabled={Boolean(busy) || order.paymentStatus !== "Paid" || (next === "Confirmed" && !order.seatNumber)}
                              onClick={() => updateStatus(order, next)}>
                              <CheckCircle2 size={16} /> {nextLabel[next]}
                            </button>
                          </>
                        )}
                        {["Pending", "Confirmed"].includes(order.status) && order.paymentStatus !== "Paid" &&
                          <button type="button" className="cf-outlined" disabled={Boolean(busy)} onClick={() => updateStatus(order, "Cancelled")}>
                            <Trash2 size={15} /> Cancel Unpaid Order
                          </button>}
                        {order.paymentStatus === "Paid" && !order.seatNumber &&
                          <p style={{ color: "#b45309" }}><CreditCard size={14} /> Payment received — awaiting customer seat selection.</p>}
                      </div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </DataTable>
      </section>
    </div>
  );
};

export default AdminOrdersPage;
