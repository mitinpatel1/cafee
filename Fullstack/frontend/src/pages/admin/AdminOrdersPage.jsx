
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";
import { api } from "../../api/api";
import { useSocket } from "../../context/SocketContext";
import { portalMoney } from "../../components/ui/PortalPieces";

import {
  PageHead,
  Metric,
  Tabs,
  DataTable,
  SearchField,
  Status,
  orderId,
  orderItemsText,
} from "../../components/ui/CafeteriaKit";

import {
  Armchair,
  CheckCircle2,
  ChefHat,
  ChevronDown,
  Clock3,
  CreditCard,
  RefreshCw,
  ShoppingBag,
  Trash2,
  Wallet,
} from "lucide-react";

// ============================================
// CONSTANTS
// ============================================

const statuses = [
  "All",
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready",
  "Picked Up",
  "Cancelled",
];

const nextStatus = {
  Pending: "Confirmed",
  Confirmed: "Preparing",
  Preparing: "Ready",
  Ready: "Picked Up",
};

const nextLabel = {
  Confirmed: "Confirm Order",
  Preparing: "Start Preparing",
  Ready: "Mark Ready",
  "Picked Up": "Complete Order",
};

const counterMethods = [
  "Counter Cash",
  "Counter UPI",
  "Cash on Pickup",
];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

const customerHasSeat = (order) =>
  Number.isInteger(Number(order?.seatNumber)) &&
  Number(order?.seatNumber) > 0;

// ============================================
// ADMIN ORDERS PAGE
// ============================================

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
  const { socket } = useSocket();

  const query = (
    searchParams.get("q") || ""
  ).trim().toLowerCase();

  // ==========================================
  // LOAD ORDERS
  // ==========================================

  const refresh = useCallback(async () => {
    try {
      const result = await api.getAllOrders();

      setOrders(
        Array.isArray(result.orders)
          ? result.orders
          : []
      );
    } catch (err) {
      setError(
        err.message || "Unable to load orders."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ==========================================
  // REAL-TIME UPDATES
  // ==========================================

  useEffect(() => {
    if (!socket) return;

    const update = () => refresh();

    const events = [
      "new_order",
      "order_status_updated",
      "order_tracking_update",
      "payment_confirmed",
      "franchise_order_updated",
    ];

    events.forEach((event) => {
      socket.on(event, update);
    });

    return () => {
      events.forEach((event) => {
        socket.off(event, update);
      });
    };
  }, [socket, refresh]);

  // ==========================================
  // BACKUP REFRESH
  // ==========================================

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) {
        refresh();
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [refresh]);

  // ==========================================
  // EXPAND ORDER
  // ==========================================

  const openOrder = (order) => {
    setExpanded((current) =>
      current === order._id
        ? null
        : order._id
    );
  };

  // ==========================================
  // VERIFY COUNTER PAYMENT
  // SEAT IS NOT ASSIGNED HERE
  // ==========================================

  const confirmCounterPayment = async (order) => {
    if (busy) return;

    const reference = String(
      refs[order._id] || ""
    ).trim();

    if (
      order.paymentMethod === "Counter UPI" &&
      (
        reference.length < 4 ||
        reference.length > 120
      )
    ) {
      setError(
        "Enter a valid UPI transaction reference."
      );
      return;
    }

    if (
      !window.confirm(
        `Have you received ${portalMoney(
          order.total
        )} via ${order.paymentMethod}?`
      )
    ) {
      return;
    }

    setBusy(order._id);
    setError("");
    setNotice("");

    try {
      await api.collectCounterPayment(
        order._id,
        reference
      );

      setNotice(
        `Payment verified for ${orderId(
          order
        )}. Customer can now select a seat.`
      );

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  // ==========================================
  // UPDATE ORDER STATUS
  // ==========================================

  const updateStatus = async (order, status) => {
    if (busy) return;

    // Payment must be verified.
    if (
      status !== "Cancelled" &&
      order.paymentStatus !== "Paid"
    ) {
      setError(
        "Payment must be verified first."
      );
      return;
    }

    // Customer must choose seat.
    // Admin is not allowed to assign one.
    if (
      status === "Confirmed" &&
      !customerHasSeat(order)
    ) {
      setError(
        "Wait until the customer confirms their seat."
      );
      return;
    }

    if (
      status === "Cancelled" &&
      order.paymentStatus === "Paid"
    ) {
      setError(
        "Paid orders require a refund before cancellation."
      );
      return;
    }

    let minutes;

    if (
      ["Confirmed", "Preparing"].includes(
        status
      )
    ) {
      minutes = Number(
        eta[order._id] ??
          order.readyInMinutes ??
          15
      );

      if (
        !Number.isInteger(minutes) ||
        minutes < 1 ||
        minutes > 180
      ) {
        setError(
          "ETA must be between 1 and 180 minutes."
        );
        return;
      }
    }

    if (
      !window.confirm(
        `Move ${orderId(order)} to ${status}?`
      )
    ) {
      return;
    }

    setBusy(order._id);
    setError("");
    setNotice("");

    try {
      await api.updateOrderStatus(
        order._id,
        status,
        minutes
      );

      if (status === "Confirmed") {
        setNotice(
          `${orderId(order)} confirmed. Kiosk will automatically return to the menu.`
        );
      } else {
        setNotice(
          `${orderId(order)} status changed to ${status}.`
        );
      }

      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  // ==========================================
  // METRICS
  // ==========================================

  const metrics = useMemo(
    () => ({
      total: orders.length,

      pending: orders.filter(
        (order) => order.status === "Pending"
      ).length,

      preparing: orders.filter(
        (order) => order.status === "Preparing"
      ).length,

      seatPending: orders.filter(
        (order) =>
          order.paymentStatus === "Paid" &&
          !customerHasSeat(order) &&
          !["Cancelled", "Picked Up"].includes(
            order.status
          )
      ).length,
    }),
    [orders]
  );

  // ==========================================
  // FILTER ORDERS
  // ==========================================

  const filtered = useMemo(
    () =>
      orders.filter((order) => {
        const text = [
          order.orderNumber,
          order.trackingCode,
          order.userId?.name,
          order.franchiseId?.name,
          order.seatNumber,
          orderItemsText(order),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return (
          (
            filter === "All" ||
            order.status === filter
          ) &&
          text.includes(
            search.trim().toLowerCase()
          ) &&
          text.includes(query)
        );
      }),
    [orders, search, filter, query]
  );

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="ob-portal-page cf-page">
      <PageHead
        title="Order Management"
        subtitle="Verify payments and manage orders. Customers select their own seats."
      >
        <button
          type="button"
          className="cf-outlined"
          onClick={refresh}
          disabled={Boolean(busy)}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageHead>

      {/* DASHBOARD METRICS */}

      <div className="cf-stat-grid">
        <Metric
          icon={ShoppingBag}
          label="Total Orders"
          value={metrics.total}
          sub="All customers"
        />

        <Metric
          icon={Clock3}
          label="Pending Orders"
          value={metrics.pending}
          sub="Awaiting action"
          tint="peach"
        />

        <Metric
          icon={ChefHat}
          label="Preparing"
          value={metrics.preparing}
          sub="In kitchen"
          tint="orange"
        />

        <Metric
          icon={Armchair}
          label="Seat Pending"
          value={metrics.seatPending}
          sub="Customer choosing"
          tint="green"
        />
      </div>

      {/* ERROR */}

      {error && (
        <div
          className="ob-portal-error"
          role="alert"
        >
          {error}

          <button
            type="button"
            onClick={() => setError("")}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* SUCCESS MESSAGE */}

      {notice && (
        <div
          className="cf-notice"
          role="status"
        >
          <CheckCircle2 size={16} />
          {notice}
        </div>
      )}

      {/* ORDERS TABLE */}

      <section className="cf-panel">
        <div className="cf-panel-head">
          <div>
            <h2>All Customer Orders</h2>

            <p>
              Admin verifies payment and confirms
              the order after customer seat selection.
            </p>
          </div>

          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search order, guest or seat..."
          />
        </div>

        <Tabs
          items={statuses}
          value={filter}
          onChange={setFilter}
        />

        <DataTable
          headers={[
            "Order",
            "Customer",
            "Franchise / Items",
            "Total",
            "Payment",
            "Status",
            "Seat",
            "Action",
          ]}
          loading={loading}
          empty={
            !loading && filtered.length === 0
              ? "No matching orders."
              : null
          }
        >
          {filtered.map((order) => {
            const expandedHere =
              expanded === order._id;

            const next = nextStatus[order.status];

            const seatSelected =
              customerHasSeat(order);

            const canPay =
              counterMethods.includes(
                order.paymentMethod
              ) &&
              order.paymentStatus === "Pending" &&
              !["Cancelled", "Picked Up"].includes(
                order.status
              );

            return (
              <React.Fragment key={order._id}>
                <tr>
                  <td>
                    <b>{orderId(order)}</b>

                    <small className="cf-cell-sub">
                      {formatDate(order.createdAt)}
                    </small>
                  </td>

                  <td>
                    {order.isGuestOrder
                      ? "Walk-in Guest"
                      : order.userId?.name ||
                        "Customer"}
                  </td>

                  <td>
                    {order.franchiseId?.name ||
                      "Franchise"}

                    <small className="cf-cell-sub">
                      {orderItemsText(order)}
                    </small>
                  </td>

                  <td>
                    {portalMoney(order.total)}
                  </td>

                  <td>
                    <Status
                      status={order.paymentStatus}
                    />
                  </td>

                  <td>
                    <Status status={order.status} />
                  </td>

                  {/* DISPLAY CUSTOMER SEAT ONLY */}

                  <td>
                    {seatSelected ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          color: "#198754",
                          fontWeight: 800,
                        }}
                      >
                        <Armchair size={16} />
                        Seat {order.seatNumber}
                      </span>
                    ) : (
                      <span
                        style={{
                          color: "#a36a20",
                          fontSize: 12,
                        }}
                      >
                        {order.paymentStatus === "Paid"
                          ? "Customer selecting"
                          : "Payment pending"}
                      </span>
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className="cf-outlined cf-expand"
                      onClick={() => openOrder(order)}
                      aria-expanded={expandedHere}
                    >
                      Details
                      <ChevronDown size={14} />
                    </button>
                  </td>
                </tr>

                {/* EXPANDED DETAILS */}

                {expandedHere && (
                  <tr className="cf-expanded-row">
                    <td colSpan={8}>
                      <div className="cf-order-details">
                        <div>
                          <h3>
                            {orderId(order)}
                            {" · "}
                            Customer & Payment
                          </h3>

                          <p>
                            <strong>Customer:</strong>{" "}
                            {order.isGuestOrder
                              ? "Walk-in Guest"
                              : order.userId?.name ||
                                "Customer"}
                          </p>

                          <p>
                            <strong>Tracking:</strong>{" "}
                            {order.trackingCode || "—"}
                          </p>

                          <p>
                            <strong>Payment Method:</strong>{" "}
                            {order.paymentMethod}
                          </p>

                          <p>
                            <strong>Payment Status:</strong>{" "}
                            {order.paymentStatus}
                          </p>

                          <p>
                            <strong>Order Status:</strong>{" "}
                            {order.status}
                          </p>

                          <p>
                            <strong>Customer Seat:</strong>{" "}
                            {seatSelected
                              ? `Seat ${order.seatNumber}`
                              : "Waiting for customer selection"}
                          </p>

                          <p>
                            <strong>ETA:</strong>{" "}
                            {formatDate(
                              order.estimatedReadyTime
                            )}
                          </p>

                          <p>
                            <strong>Items:</strong>{" "}
                            {orderItemsText(order)}
                          </p>

                          {order.notes && (
                            <p>
                              <strong>Notes:</strong>{" "}
                              {order.notes}
                            </p>
                          )}
                        </div>

                        {/* ACTIONS */}

                        <div className="cf-order-actions">
                          {/* COUNTER PAYMENT */}

                          {canPay && (
                            <>
                              {order.paymentMethod ===
                                "Counter UPI" && (
                                <input
                                  type="text"
                                  className="cf-upi-input"
                                  maxLength={120}
                                  placeholder="UPI transaction reference"
                                  aria-label="UPI transaction reference"
                                  value={
                                    refs[order._id] || ""
                                  }
                                  onChange={(event) =>
                                    setRefs((prev) => ({
                                      ...prev,
                                      [order._id]:
                                        event.target.value,
                                    }))
                                  }
                                />
                              )}

                              <button
                                type="button"
                                className="cf-primary"
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  confirmCounterPayment(order)
                                }
                              >
                                <Wallet size={16} />
                                Confirm Counter Payment
                              </button>
                            </>
                          )}

                          {/* NO ASSIGN SEAT BUTTON */}

                          {seatSelected ? (
                            <p
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 7,
                                color: "#198754",
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle2 size={17} />
                              Seat {order.seatNumber}
                              {" "}selected by customer
                            </p>
                          ) : (
                            order.paymentStatus === "Paid" &&
                            order.status === "Pending" && (
                              <p
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 7,
                                  color: "#a36a20",
                                }}
                              >
                                <CreditCard size={16} />
                                Payment received. Waiting for
                                customer to confirm a seat.
                              </p>
                            )
                          )}

                          {/* ETA */}

                          {next &&
                            ["Pending", "Confirmed"].includes(
                              order.status
                            ) && (
                              <label className="cf-eta-label">
                                ETA (minutes)

                                <input
                                  type="number"
                                  min={1}
                                  max={180}
                                  value={
                                    eta[order._id] ??
                                    order.readyInMinutes ??
                                    15
                                  }
                                  onChange={(event) =>
                                    setEta((prev) => ({
                                      ...prev,
                                      [order._id]:
                                        event.target.value,
                                    }))
                                  }
                                />
                              </label>
                            )}

                          {/* ORDER ACTION */}

                          {next && (
                            <button
                              type="button"
                              className="cf-primary"
                              disabled={
                                Boolean(busy) ||
                                order.paymentStatus !== "Paid" ||
                                (
                                  next === "Confirmed" &&
                                  !seatSelected
                                )
                              }
                              onClick={() =>
                                updateStatus(order, next)
                              }
                            >
                              <CheckCircle2 size={16} />
                              {nextLabel[next]}
                            </button>
                          )}

                          {/* CANCEL UNPAID ORDER */}

                          {order.status === "Pending" &&
                            order.paymentStatus !== "Paid" && (
                              <button
                                type="button"
                                className="cf-outlined"
                                disabled={Boolean(busy)}
                                onClick={() =>
                                  updateStatus(
                                    order,
                                    "Cancelled"
                                  )
                                }
                              >
                                <Trash2 size={15} />
                                Cancel Unpaid Order
                              </button>
                            )}
                        </div>
                      </div>
                    </td>
                  </tr>
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
