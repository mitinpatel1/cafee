
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";

import { api } from "../../api/api";

import { useSocket } from "../../context/SocketContext";

import {
  portalMoney,
} from "../../components/ui/PortalPieces";

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
  ShoppingBag,
  Clock3,
  CheckCircle2,
  IndianRupee,
  RefreshCw,
  ChevronDown,
  Armchair,
  CreditCard,
  UserRound,
  Store,
  ChefHat,
  Receipt,
  Timer,
  Wallet,
} from "lucide-react";

// ============================================
// ORDER STATUS CONFIGURATION
// ============================================

const STATUSES = [
  "All",
  "Pending",
  "Confirmed",
  "Preparing",
  "Ready",
  "Picked Up",
  "Cancelled",
];

const PAYMENT_STATUSES = [
  "All",
  "Paid",
  "Pending",
  "Failed",
  "Refunded",
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatTime = (value) => {
  if (!value) return "Not assigned";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not assigned";
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const customerName = (order) => {
  if (order.isGuestOrder) {
    return "Walk-in Guest";
  }

  return order.userId?.name || "Customer";
};

const isActiveSeat = (order) => {
  return (
    Boolean(order.seatNumber) &&
    ["Confirmed", "Preparing", "Ready"].includes(
      order.status
    )
  );
};

// ============================================
// FRANCHISE ORDERS PAGE
// ============================================

export const FranchiseOrdersPage = () => {
  // ========================================
  // STATE MANAGEMENT
  // ========================================

  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const [paymentFilter, setPaymentFilter] =
    useState("All");

  const [franchiseFilter, setFranchiseFilter] =
    useState("All");

  const [search, setSearch] = useState("");

  const [expandedOrder, setExpandedOrder] =
    useState(null);

  const [lastUpdated, setLastUpdated] =
    useState(null);

  const [searchParams] = useSearchParams();

  const dashboardQuery = (
    searchParams.get("q") || ""
  )
    .trim()
    .toLowerCase();

  const { socket } = useSocket();

  // ========================================
  // FETCH FRANCHISE ORDERS
  // ========================================

  const fetchOrders = useCallback(async () => {
    try {
      // Backend returns only the logged-in
      // franchise owner's orders.

      const response =
        await api.getFranchiseOrders();

      if (!response.success) {
        throw new Error(
          "Unable to load franchise orders."
        );
      }

      setOrders(
        Array.isArray(response.orders)
          ? response.orders
          : []
      );

      setLastUpdated(new Date());
      setError("");
    } catch (err) {
      setError(
        err.message ||
          "Unable to fetch franchise orders."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ========================================
  // INITIAL DATA LOAD
  // ========================================

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // ========================================
  // SOCKET.IO REAL-TIME UPDATES
  // ========================================

  useEffect(() => {
    if (!socket) return;

    const events = [
      "franchise_order_updated",
      "new_order",
      "order_status_updated",
      "payment_confirmed",
    ];

    const handleOrderUpdate = () => {
      fetchOrders();
    };

    events.forEach((eventName) => {
      socket.on(eventName, handleOrderUpdate);
    });

    return () => {
      events.forEach((eventName) => {
        socket.off(eventName, handleOrderUpdate);
      });
    };
  }, [socket, fetchOrders]);

  // ========================================
  // AUTO REFRESH EVERY 20 SECONDS
  // ========================================

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchOrders();
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [fetchOrders]);

  // ========================================
  // MANUAL REFRESH
  // ========================================

  const handleRefresh = async () => {
    if (refreshing) return;

    setRefreshing(true);
    await fetchOrders();
  };

  // ========================================
  // FRANCHISE OUTLET OPTIONS
  // ========================================

  const franchiseOptions = useMemo(() => {
    const unique = new Map();

    orders.forEach((order) => {
      const franchise = order.franchiseId;

      if (
        franchise &&
        typeof franchise === "object" &&
        franchise._id
      ) {
        unique.set(franchise._id, {
          id: franchise._id,
          name: franchise.name,
          city: franchise.city,
        });
      }
    });

    return Array.from(unique.values());
  }, [orders]);

  // ========================================
  // DASHBOARD METRICS
  // ========================================

  const metrics = useMemo(() => {
    const paidOrders = orders.filter(
      (order) =>
        order.paymentStatus === "Paid" &&
        order.status !== "Cancelled"
    );

    const revenue = paidOrders.reduce(
      (sum, order) =>
        sum + Number(order.total || 0),
      0
    );

    return {
      total: orders.length,

      pending: orders.filter(
        (order) => order.status === "Pending"
      ).length,

      confirmed: orders.filter(
        (order) => order.status === "Confirmed"
      ).length,

      preparing: orders.filter(
        (order) => order.status === "Preparing"
      ).length,

      ready: orders.filter(
        (order) => order.status === "Ready"
      ).length,

      completed: orders.filter(
        (order) => order.status === "Picked Up"
      ).length,

      unpaid: orders.filter(
        (order) =>
          order.paymentStatus !== "Paid" &&
          order.status !== "Cancelled"
      ).length,

      guestOrders: orders.filter(
        (order) => order.isGuestOrder
      ).length,

      occupiedSeats:
        orders.filter(isActiveSeat).length,

      revenue,
    };
  }, [orders]);

  // ========================================
  // FILTER ORDERS
  // ========================================

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "All" ||
        order.status === statusFilter;

      const matchesPayment =
        paymentFilter === "All" ||
        order.paymentStatus === paymentFilter;

      const outletId =
        order.franchiseId?._id ||
        order.franchiseId;

      const matchesFranchise =
        franchiseFilter === "All" ||
        String(outletId) === franchiseFilter;

      const searchableText = [
        order.orderNumber,
        order.trackingCode,
        customerName(order),
        order.franchiseId?.name,
        order.franchiseId?.city,
        order.paymentMethod,
        order.paymentStatus,
        order.status,
        order.seatNumber,
        orderItemsText(order),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch =
        searchableText.includes(
          search.trim().toLowerCase()
        );

      const matchesDashboardQuery =
        searchableText.includes(
          dashboardQuery
        );

      return (
        matchesStatus &&
        matchesPayment &&
        matchesFranchise &&
        matchesSearch &&
        matchesDashboardQuery
      );
    });
  }, [
    orders,
    statusFilter,
    paymentFilter,
    franchiseFilter,
    search,
    dashboardQuery,
  ]);

  // ========================================
  // EXPAND / COLLAPSE DETAILS
  // ========================================

  const toggleDetails = (id) => {
    setExpandedOrder((previous) =>
      previous === id ? null : id
    );
  };

  // ========================================
  // RENDER DASHBOARD
  // ========================================

  return (
    <div className="ob-portal-page cf-page">

      {/* ====================================
          PAGE HEADER
      ==================================== */}

      <PageHead
        title="Franchise Orders"
        subtitle="Monitor kiosk orders, payments, seating and food preparation across your outlets."
      >
        <button
          type="button"
          className="cf-outlined"
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw
            size={17}
            className={
              refreshing ? "animate-spin" : ""
            }
          />

          {refreshing
            ? "Refreshing..."
            : "Refresh Orders"}
        </button>
      </PageHead>

      {/* ====================================
          ORDER STATISTICS
      ==================================== */}

      <div className="cf-stat-grid">

        <Metric
          icon={ShoppingBag}
          label="Total Orders"
          value={metrics.total}
          sub="All franchise orders"
        />

        <Metric
          icon={Clock3}
          label="Pending Orders"
          value={metrics.pending}
          sub="Awaiting payment or confirmation"
          tint="peach"
        />

        <Metric
          icon={ChefHat}
          label="Preparing"
          value={metrics.preparing}
          sub="Currently cooking"
          tint="orange"
        />

        <Metric
          icon={CheckCircle2}
          label="Completed Orders"
          value={metrics.completed}
          sub="Successfully collected"
          tint="green"
        />

        <Metric
          icon={IndianRupee}
          label="Revenue Collected"
          value={portalMoney(
            metrics.revenue
          )}
          sub="Verified paid orders"
          tint="orange"
        />

        <Metric
          icon={UserRound}
          label="Guest Orders"
          value={metrics.guestOrders}
          sub="Self-service kiosk customers"
          tint="peach"
        />

        <Metric
          icon={Armchair}
          label="Reserved Seats"
          value={metrics.occupiedSeats}
          sub="Active order reservations"
          tint="green"
        />

        <Metric
          icon={Wallet}
          label="Unpaid Orders"
          value={metrics.unpaid}
          sub="Payments awaiting confirmation"
          tint="peach"
        />

      </div>

      {/* ====================================
          ERROR MESSAGE
      ==================================== */}

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

      {/* ====================================
          ORDER MANAGEMENT PANEL
      ==================================== */}

      <section className="cf-panel">

        <div className="cf-panel-head">
          <div>
            <h2>Live Customer Orders</h2>

            <p>
              View orders from your registered
              franchise outlets.
            </p>

            {lastUpdated && (
              <small
                className="cf-cell-sub"
                style={{ marginTop: 6 }}
              >
                Last updated:{" "}
                {formatTime(lastUpdated)}
              </small>
            )}
          </div>

          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search order, customer or seat..."
          />
        </div>

        {/* ==================================
            FRANCHISE FILTER
        ================================== */}

        <div
          style={{
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "center",
            marginBottom: 18,
          }}
        >

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <Store size={18} />

            <select
              value={franchiseFilter}
              onChange={(event) =>
                setFranchiseFilter(
                  event.target.value
                )
              }
              style={{
                padding: "10px 12px",
                border: "1px solid #ead8c8",
                borderRadius: 10,
                background: "#fff",
                minWidth: 170,
                maxWidth: "100%",
              }}
            >
              <option value="All">
                All My Outlets
              </option>

              {franchiseOptions.map(
                (franchise) => (
                  <option
                    key={franchise.id}
                    value={franchise.id}
                  >
                    {franchise.name}
                    {franchise.city
                      ? ` — ${franchise.city}`
                      : ""}
                  </option>
                )
              )}
            </select>
          </label>

          {/* PAYMENT STATUS FILTER */}

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
            }}
          >
            <CreditCard size={18} />

            <select
              value={paymentFilter}
              onChange={(event) =>
                setPaymentFilter(
                  event.target.value
                )
              }
              style={{
                padding: "10px 12px",
                border: "1px solid #ead8c8",
                borderRadius: 10,
                background: "#fff",
              }}
            >
              {PAYMENT_STATUSES.map(
                (status) => (
                  <option
                    key={status}
                    value={status}
                  >
                    {status === "All"
                      ? "All Payments"
                      : status}
                  </option>
                )
              )}
            </select>
          </label>

        </div>

        {/* ==================================
            ORDER STATUS TABS
        ================================== */}

        <Tabs
          items={STATUSES}
          value={statusFilter}
          onChange={setStatusFilter}
        />

        {/* ==================================
            ORDERS DATA TABLE
        ================================== */}

        <DataTable
          headers={[
            "Order",
            "Customer",
            "Franchise & Items",
            "Amount",
            "Payment",
            "Status",
            "Seat / ETA",
            "Action",
          ]}
          loading={loading}
          empty={
            !loading &&
            filteredOrders.length === 0
              ? "No orders match your filters."
              : null
          }
        >

          {filteredOrders.map((order) => {
            const isExpanded =
              expandedOrder === order._id;

            const seatAssigned =
              Boolean(order.seatNumber);

            return (
              <React.Fragment
                key={order._id}
              >

                {/* ==========================
                    ORDER TABLE ROW
                ========================== */}

                <tr>

                  {/* ORDER NUMBER */}

                  <td>
                    <strong className="cf-strong">
                      {orderId(order)}
                    </strong>

                    <small className="cf-cell-sub">
                      {formatDate(
                        order.createdAt
                      )}
                    </small>
                  </td>

                  {/* CUSTOMER DETAILS */}

                  <td>
                    <strong>
                      {customerName(order)}
                    </strong>

                    <small className="cf-cell-sub">
                      {order.isGuestOrder
                        ? "Walk-in Kiosk"
                        : "Registered Customer"}
                    </small>
                  </td>

                  {/* FRANCHISE AND ITEMS */}

                  <td>
                    <strong>
                      {order.franchiseId?.name ||
                        "Franchise"}
                    </strong>

                    <small className="cf-cell-sub">
                      {orderItemsText(order)}
                    </small>
                  </td>

                  {/* ORDER TOTAL — NO TAX */}

                  <td>
                    <strong>
                      {portalMoney(
                        order.total
                      )}
                    </strong>
                  </td>

                  {/* PAYMENT STATUS */}

                  <td>
                    <Status
                      status={
                        order.paymentStatus
                      }
                    />
                  </td>

                  {/* ORDER STATUS */}

                  <td>
                    <Status
                      status={order.status}
                    />
                  </td>

                  {/* SEAT AND ETA */}

                  <td>
                    {seatAssigned ? (
                      <strong
                        style={{
                          display: "inline-flex",
                          gap: 5,
                          alignItems: "center",
                          color: "#ea580c",
                        }}
                      >
                        <Armchair size={17} />

                        Seat #{order.seatNumber}
                      </strong>
                    ) : (
                      <span className="cf-cell-sub">
                        Seat pending
                      </span>
                    )}

                    <small className="cf-cell-sub">
                      {order.estimatedReadyTime
                        ? `ETA: ${formatTime(
                            order.estimatedReadyTime
                          )}`
                        : "ETA pending"}
                    </small>
                  </td>

                  {/* VIEW DETAILS */}

                  <td>
                    <button
                      type="button"
                      className="cf-outlined cf-expand"
                      aria-expanded={isExpanded}
                      onClick={() =>
                        toggleDetails(
                          order._id
                        )
                      }
                    >
                      Details

                      <ChevronDown
                        size={15}
                      />
                    </button>
                  </td>

                </tr>

                {/* ==========================
                    EXPANDED ORDER DETAILS
                ========================== */}

                {isExpanded && (
                  <tr className="cf-expanded-row">
                    <td colSpan={8}>

                      <div className="cf-order-details">

                        {/* ORDER INFORMATION */}

                        <div>
                          <h3>
                            <Receipt
                              size={19}
                              style={{
                                verticalAlign:
                                  "middle",
                              }}
                            />{" "}
                            {orderId(order)}
                          </h3>

                          <p>
                            <strong>
                              Customer:
                            </strong>{" "}
                            {customerName(order)}
                          </p>

                          <p>
                            <strong>
                              Franchise:
                            </strong>{" "}
                            {order.franchiseId?.name ||
                              "—"}
                          </p>

                          <p>
                            <strong>
                              Order Type:
                            </strong>{" "}
                            {order.isGuestOrder
                              ? "Self-Service Kiosk"
                              : "Customer Order"}
                          </p>

                          {order.isGuestOrder &&
                            order.trackingCode && (
                              <p>
                                <strong>
                                  Tracking Code:
                                </strong>{" "}
                                <code>
                                  {
                                    order.trackingCode
                                  }
                                </code>
                              </p>
                            )}

                          <p>
                            <strong>
                              Payment Method:
                            </strong>{" "}
                            {order.paymentMethod}
                          </p>

                          <p>
                            <strong>
                              Payment Status:
                            </strong>{" "}
                            {order.paymentStatus}
                          </p>

                          <p>
                            <strong>
                              Order Status:
                            </strong>{" "}
                            {order.status}
                          </p>

                          <p>
                            <strong>
                              Items:
                            </strong>{" "}
                            {orderItemsText(order)}
                          </p>

                          <p>
                            <strong>
                              Special Instructions:
                            </strong>{" "}
                            {order.notes ||
                              "No special instructions"}
                          </p>

                          <p>
                            <strong>
                              Total:
                            </strong>{" "}
                            {portalMoney(
                              order.total
                            )}
                          </p>
                        </div>

                        {/* ======================
                            SEAT AND STATUS PANEL
                        ====================== */}

                        <div
                          className="cf-order-actions"
                        >

                          {/* SEAT CARD */}

                          <div
                            style={{
                              background:
                                "#fff2e5",
                              border:
                                "1px solid #ffdfbd",
                              borderRadius: 15,
                              padding: 18,
                              textAlign: "center",
                              width: "100%",
                            }}
                          >
                            <Armchair
                              size={28}
                              color="#ea580c"
                            />

                            <h4
                              style={{
                                margin:
                                  "8px 0",
                              }}
                            >
                              Assigned Seat
                            </h4>

                            {seatAssigned ? (
                              <strong
                                style={{
                                  fontSize:
                                    "2.5rem",
                                  color:
                                    "#ea580c",
                                }}
                              >
                                {order.seatNumber}
                              </strong>
                            ) : (
                              <p
                                style={{
                                  color:
                                    "#9a5d30",
                                }}
                              >
                                Awaiting payment
                                and Admin confirmation
                              </p>
                            )}
                          </div>

                          {/* PREPARATION ETA */}

                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              gap: 10,
                            }}
                          >
                            <Timer size={18} />

                            <span>
                              <strong>
                                Preparation ETA:
                              </strong>{" "}
                              {order.estimatedReadyTime
                                ? formatDate(
                                    order.estimatedReadyTime
                                  )
                                : "Not assigned"}
                            </span>
                          </div>

                          {/* STATUS MESSAGE */}

                          {order.status ===
                            "Pending" && (
                              <p>
                                <Clock3
                                  size={16}
                                  style={{
                                    verticalAlign:
                                      "middle",
                                  }}
                                />{" "}
                                Awaiting payment
                                and order confirmation.
                              </p>
                            )}

                          {order.status ===
                            "Confirmed" && (
                              <p
                                style={{
                                  color:
                                    "#15803d",
                                }}
                              >
                                <CheckCircle2
                                  size={17}
                                />{" "}
                                Order confirmed.
                                Seat assigned.
                              </p>
                            )}

                          {order.status ===
                            "Preparing" && (
                              <p>
                                <ChefHat
                                  size={17}
                                />{" "}
                                Food is being
                                prepared.
                              </p>
                            )}

                          {order.status ===
                            "Ready" && (
                              <p
                                style={{
                                  color:
                                    "#15803d",
                                }}
                              >
                                <CheckCircle2
                                  size={17}
                                />{" "}
                                Order is ready
                                for collection.
                              </p>
                            )}

                          {order.status ===
                            "Picked Up" && (
                              <p
                                style={{
                                  color:
                                    "#15803d",
                                }}
                              >
                                <CheckCircle2
                                  size={17}
                                />{" "}
                                Order completed.
                                Seat released.
                              </p>
                            )}

                          {order.status ===
                            "Cancelled" && (
                              <p
                                style={{
                                  color:
                                    "#dc2626",
                                }}
                              >
                                Order cancelled.
                              </p>
                            )}

                          {/* PAYMENT NOTICE */}

                          {order.paymentStatus !==
                            "Paid" &&
                            order.status !==
                              "Cancelled" && (
                              <p
                                style={{
                                  background:
                                    "#fff8ed",
                                  borderRadius:
                                    10,
                                  padding: 12,
                                  fontSize:
                                    "0.85rem",
                                }}
                              >
                                <CreditCard
                                  size={16}
                                />{" "}
                                Payment pending.
                                The Service Admin
                                must verify payment
                                before confirming
                                this order.
                              </p>
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

export default FranchiseOrdersPage;
