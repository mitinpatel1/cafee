import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../api/api";
import { useSocket } from "../../context/SocketContext";
import { portalMoney } from "../../components/ui/PortalPieces";
import {
  PageHead, Metric, Tabs, DataTable, SearchField, Status,
  orderId, orderItemsText,
} from "../../components/ui/CafeteriaKit";
import { Clock3, RefreshCw, ShoppingBag } from "lucide-react";

const STATUSES = ["All", "Pending", "Confirmed", "Preparing", "Ready", "Picked Up", "Cancelled"];
const formatDate = (value) => value
  ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
  : "—";

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [searchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim().toLowerCase();
  const { socket } = useSocket();

  const refresh = useCallback(async () => {
    try {
      const result = await api.getAllOrders();
      setOrders(Array.isArray(result.orders) ? result.orders : []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.getAllOrders()
      .then((result) => {
        if (active) {
          setOrders(Array.isArray(result.orders) ? result.orders : []);
          setError("");
        }
      })
      .catch((err) => {
        if (active) setError(err.message || "Unable to load orders.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!socket) return undefined;
    const update = () => refresh();
    const events = ["new_order", "order_status_updated", "payment_confirmed", "franchise_order_updated"];
    events.forEach((event) => socket.on(event, update));
    return () => events.forEach((event) => socket.off(event, update));
  }, [socket, refresh]);

  useEffect(() => {
    const id = setInterval(() => { if (!document.hidden) refresh(); }, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const metrics = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((order) => order.status === "Pending").length,
    active: orders.filter((order) => ["Confirmed", "Preparing", "Ready"].includes(order.status)).length,
  }), [orders]);

  const filtered = useMemo(() => orders.filter((order) => {
    const text = [
      order.orderNumber,
      order.trackingCode,
      order.userId?.name,
      order.franchiseId?.name,
      order.seatNumber,
      orderItemsText(order),
    ].filter(Boolean).join(" ").toLowerCase();
    return (filter === "All" || order.status === filter)
      && text.includes(search.trim().toLowerCase())
      && text.includes(query);
  }), [orders, filter, search, query]);

  return (
    <div className="ob-portal-page cf-page">
      <PageHead title="Customer Orders" subtitle="View orders across franchises. Franchise teams manage payments and order status.">
        <button className="cf-outlined" type="button" onClick={refresh} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </PageHead>

      <div className="cf-stat-grid">
        <Metric icon={ShoppingBag} label="Total Orders" value={metrics.total} sub="Across all franchises" />
        <Metric icon={Clock3} label="Pending" value={metrics.pending} sub="Awaiting franchise action" tint="peach" />
        <Metric icon={Clock3} label="In Progress" value={metrics.active} sub="Being handled by franchises" tint="green" />
      </div>

      {error && <div className="ob-portal-error" role="alert">{error}</div>}

      <section className="cf-panel">
        <div className="cf-panel-head">
          <div><h2>All Franchise Orders</h2><p>Order actions are available to the owning franchise only.</p></div>
          <SearchField value={search} onChange={setSearch} placeholder="Search order, customer or franchise..." />
        </div>
        <Tabs items={STATUSES} value={filter} onChange={setFilter} />
        <DataTable
          headers={["Order", "Customer", "Franchise / Items", "Total", "Payment", "Status", "Seat"]}
          loading={loading}
          empty={!loading && filtered.length === 0 ? "No matching orders." : null}
        >
          {filtered.map((order) => (
            <tr key={order._id}>
              <td><b>{orderId(order)}</b><small className="cf-cell-sub">{formatDate(order.createdAt)}</small></td>
              <td>{order.isGuestOrder ? "Walk-in Guest" : (order.userId?.name || "Customer")}</td>
              <td>{order.franchiseId?.name || "Franchise"}<small className="cf-cell-sub">{orderItemsText(order)}</small></td>
              <td>{portalMoney(order.total)}</td>
              <td><Status status={order.paymentStatus} /></td>
              <td><Status status={order.status} /></td>
              <td>{order.seatNumber ? `Seat ${order.seatNumber}` : "Pending"}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
};

export default AdminOrdersPage;
