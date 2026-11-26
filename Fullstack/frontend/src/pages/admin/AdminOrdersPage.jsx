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
  CreditCard, RefreshCw, ShoppingBag, Smartphone, Trash2, Wallet,
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
  const [selectedSeats, setSelectedSeats] = useState({});
  const [seatsData, setSeatsData] = useState({});
  const [seatsLoading, setSeatsLoading] = useState(false);
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

  const getFranchiseId = (order) =>
    typeof order?.franchiseId === "object"
      ? order?.franchiseId?._id
      : order?.franchiseId;

  const loadSeatsForOrder = async (order) => {
    const fId = getFranchiseId(order);
    if (!fId) return;
    setSeatsLoading(true);
    try {
      const data = await api.getAdminSeats(fId);
      setSeatsData((prev) => ({ ...prev, [fId]: data }));
    } catch (e) {
      console.error("Failed to load seats for admin orders:", e);
    } finally {
      setSeatsLoading(false);
    }
  };

  const openOrder = (order) => {
    setExpanded((previous) => {
      const nextExp = previous === order._id ? null : order._id;
      if (nextExp) {
        loadSeatsForOrder(order);
      }
      return nextExp;
    });
  };

  const assignCustomSeat = async (order) => {
    const seatNumber = Number(selectedSeats[order._id]);
    if (!Number.isInteger(seatNumber) || seatNumber < 1) {
      setError("Please select a valid seat number.");
      return;
    }
    setBusy(order._id);
    setError("");
    setNotice("");
    try {
      await api.assignAdminSeat(order._id, seatNumber);
      setNotice(`Seat ${seatNumber} assigned to ${orderId(order)}.`);
      await refresh();
      await loadSeatsForOrder(order);
    } catch (err) {
      setError(err.message || "Unable to assign seat.");
    } finally {
      setBusy(null);
    }
  };

  const confirmCounterPayment = async (order) => {
    if (busy) return;
    const reference = String(
      refs[order._id] !== undefined
        ? refs[order._id]
        : (order.counterPaymentReference || "")
    ).trim();
    if (order.paymentMethod === "Counter UPI" && (reference.length < 4 || reference.length > 120)) {
      setError("Enter a valid UPI transaction reference.");
      return;
    }
    if (!window.confirm(`Have you received ${portalMoney(order.total)} via ${order.paymentMethod}?`)) return;
    setBusy(order._id); setError(""); setNotice("");
    try {
      await api.collectCounterPayment(order._id, reference);
      const isCash = order.paymentMethod === "Counter Cash" || order.paymentMethod === "Cash on Pickup";
      setNotice(`Payment verified for ${orderId(order)}. ${isCash ? "Please assign a seat below." : "Customer can now select an available seat."}`);
      await refresh();
      await loadSeatsForOrder(order);
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
      const isCash = order.paymentMethod === "Counter Cash" || order.paymentMethod === "Cash on Pickup";
      setError(
        isCash
          ? "Please assign a seat to this cash order before confirming."
          : "Customer must select a seat on Kiosk before this order can be confirmed."
      );
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
            const isCashOrder = order.paymentMethod === "Counter Cash" || order.paymentMethod === "Cash on Pickup";
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
                        {order.counterPaymentReference && (
                          <p>
                            <strong>Transaction Ref / UTR:</strong>{" "}
                            <span style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              background: "#ecfdf5",
                              border: "1px solid #6ee7b7",
                              borderRadius: 4,
                              color: "#065f46",
                              fontFamily: "monospace",
                              fontWeight: 700,
                            }}>
                              {order.counterPaymentReference}
                            </span>
                          </p>
                        )}
                        <p><strong>Order:</strong> {order.status}</p>
                        <p><strong>Seat:</strong> {order.seatNumber != null ? `Seat ${order.seatNumber} (${isCashOrder ? "Assigned by Admin" : "Selected by Customer"})` : isCashOrder ? "Not assigned (Admin assigns)" : "Not selected yet (Customer chooses on Kiosk)"}</p>
                        <p><strong>ETA:</strong> {formatDate(order.estimatedReadyTime)}</p>
                        <p><strong>Items:</strong> {orderItemsText(order)}</p>
                        {order.notes && <p><strong>Notes:</strong> {order.notes}</p>}
                      </div>
                      <div className="cf-order-actions">
                        {canPay && (
                          <>
                            {order.paymentMethod === "Counter UPI" && (
                              <div style={{ width: "100%", marginBottom: "6px" }}>
                                {order.counterPaymentReference && (
                                  <div style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    padding: "5px 10px",
                                    background: "#ecfdf5",
                                    border: "1.5px solid #6ee7b7",
                                    borderRadius: "6px",
                                    color: "#065f46",
                                    fontSize: "0.85rem",
                                    fontWeight: 600,
                                    marginBottom: "6px"
                                  }}>
                                    <Smartphone size={15} />
                                    <span>Customer UPI Ref: <strong style={{ color: "#047857", letterSpacing: "0.5px" }}>{order.counterPaymentReference}</strong></span>
                                  </div>
                                )}
                                <input type="text" className="cf-upi-input" maxLength={120}
                                  placeholder="UPI reference" aria-label="UPI reference"
                                  value={refs[order._id] !== undefined ? refs[order._id] : (order.counterPaymentReference || "")}
                                  onChange={(e) => setRefs((p) => ({ ...p, [order._id]: e.target.value }))} />
                              </div>
                            )}
                            <button className="cf-primary" type="button" disabled={Boolean(busy)} onClick={() => confirmCounterPayment(order)}>
                              <Wallet size={16} /> Confirm Counter Payment
                            </button>
                          </>
                        )}

                        {/* CASH ORDER: SEAT ASSIGNMENT BY ADMIN */}
                        {isCashOrder && order.paymentStatus === "Paid" && !order.seatNumber && (
                          <div style={{
                            display: "grid",
                            gap: 8,
                            width: "100%",
                            padding: 12,
                            border: "1px solid #f1d8c0",
                            borderRadius: 8,
                            background: "#fffaf5",
                            margin: "6px 0",
                          }}>
                            <label htmlFor={`seat-${order._id}`} style={{ fontWeight: 700 }}>
                              Assign Seat to Customer (Cash Order)
                            </label>
                            <select
                              id={`seat-${order._id}`}
                              value={selectedSeats[order._id] || ""}
                              onChange={(e) => setSelectedSeats((p) => ({ ...p, [order._id]: e.target.value }))}
                              disabled={Boolean(busy) || Boolean(seatsLoading)}
                              style={{
                                width: "100%",
                                padding: "8px 10px",
                                border: "1px solid #ead8c8",
                                borderRadius: 6,
                                background: "#ffffff",
                              }}
                            >
                              <option value="">Select available seat</option>
                              {(seatsData[getFranchiseId(order)]?.available || []).map((num) => (
                                <option key={num} value={num}>
                                  Seat {num}
                                </option>
                              ))}
                            </select>
                            <button
                              className="cf-primary"
                              type="button"
                              disabled={Boolean(busy) || !selectedSeats[order._id] || Boolean(seatsLoading)}
                              onClick={() => assignCustomSeat(order)}
                            >
                              <Armchair size={15} /> Assign Seat to Customer
                            </button>
                          </div>
                        )}

                        {/* ONLINE ORDER: WAITING FOR CUSTOMER SELECTION */}
                        {!isCashOrder && order.paymentStatus === "Paid" && !order.seatNumber && (
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "10px 12px",
                            background: "#eff6ff",
                            border: "1.5px solid #bfdbfe",
                            borderRadius: 6,
                            color: "#1e40af",
                            fontSize: "0.88rem",
                            fontWeight: 600,
                            margin: "6px 0",
                          }}>
                            <Armchair size={16} />
                            <span>Online Order: Customer is selecting seat on Kiosk.</span>
                          </div>
                        )}

                        {order.seatNumber && (
                          <p style={{ color: "#15803d", fontWeight: 700 }}>
                            <CheckCircle2 size={16} /> Seat {order.seatNumber} ({isCashOrder ? "Assigned by Admin" : "Selected by Customer"})
                          </p>
                        )}

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
