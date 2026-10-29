
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useSearchParams } from "react-router-dom";

import { api } from "../../api/api";

import {
  useSocket,
} from "../../context/SocketContext";

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
// ORDER STATUS CONFIGURATION
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

// ============================================
// HELPERS
// ============================================

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

const getFranchiseId = (order) =>
  order.franchiseId?._id ||
  order.franchiseId ||
  "";

// ============================================
// ADMIN AUTHENTICATED REQUEST
// ============================================

// Uses the same token as frontend/src/api/api.js.

async function adminRequest(path, options = {}) {
  const token = localStorage.getItem(
    "officebite_token"
  );

  if (!token) {
    throw new Error(
      "Admin login required."
    );
  }

  const response = await fetch(
    `/api/orders${path}`,
    {
      cache: "no-store",
      ...options,

      headers: {
        "Content-Type": "application/json",

        Authorization:
          `Bearer ${token}`,

        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (
    !response.ok ||
    data.success === false
  ) {
    throw new Error(
      data.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

// ============================================
// ADMIN ORDERS PAGE
// ============================================

export const AdminOrdersPage = () => {

  // ========================================
  // STATES
  // ========================================

  const [orders, setOrders] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [filter, setFilter] =
    useState("All");

  const [search, setSearch] =
    useState("");

  const [expanded, setExpanded] =
    useState(null);

  const [busy, setBusy] =
    useState(null);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [eta, setEta] =
    useState({});

  const [refs, setRefs] =
    useState({});

  // Selected seat for each order independently.
  const [
    selectedSeats,
    setSelectedSeats,
  ] = useState({});

  // Seat availability per franchise.
  const [
    seatsByFranchise,
    setSeatsByFranchise,
  ] = useState({});

  const [
    seatsLoading,
    setSeatsLoading,
  ] = useState({});

  const [searchParams] =
    useSearchParams();

  const query = (
    searchParams.get("q") || ""
  )
    .trim()
    .toLowerCase();

  const { socket } = useSocket();

  // ========================================
  // FETCH ALL CUSTOMER ORDERS
  // ========================================

  const refresh = useCallback(
    async () => {
      try {
        const result =
          await api.getAllOrders();

        setOrders(
          Array.isArray(
            result.orders
          )
            ? result.orders
            : []
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to load orders."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // ========================================
  // INITIAL LOAD
  // ========================================

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ========================================
  // REAL-TIME SOCKET UPDATES
  // ========================================

  useEffect(() => {
    if (!socket) return;

    const update = () => {
      refresh();
    };

    const events = [
      "new_order",
      "order_status_updated",
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
  }, [
    socket,
    refresh,
  ]);

  // ========================================
  // AUTOMATIC ORDERS REFRESH
  // ========================================

  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        refresh();
      }
    }, 15000);

    return () =>
      clearInterval(interval);
  }, [refresh]);

  // ========================================
  // FETCH AVAILABLE / OCCUPIED SEATS
  // ========================================

  const getSeats = useCallback(
    async (franchiseId) => {
      if (!franchiseId) return;

      setSeatsLoading(
        (previous) => ({
          ...previous,
          [franchiseId]: true,
        })
      );

      try {
        const result =
          await adminRequest(
            `/admin/seats?franchiseId=${encodeURIComponent(
              franchiseId
            )}`
          );

        setSeatsByFranchise(
          (previous) => ({
            ...previous,
            [franchiseId]:
              result,
          })
        );

        return result;
      } catch (err) {
        setError(
          err.message ||
            "Unable to load available seats."
        );

        return null;
      } finally {
        setSeatsLoading(
          (previous) => ({
            ...previous,
            [franchiseId]: false,
          })
        );
      }
    },
    []
  );

  // ========================================
  // EXPAND CUSTOMER ORDER
  // ========================================

  const openOrder = async (order) => {
    if (
      expanded === order._id
    ) {
      setExpanded(null);
      return;
    }

    setExpanded(
      order._id
    );

    setError("");

    await getSeats(
      getFranchiseId(order)
    );
  };

  // ========================================
  // ADMIN ASSIGN CUSTOM SEAT
  // ========================================

  const assignCustomSeat =
    async (order) => {
      if (busy) return;

      const seatNumber = Number(
        selectedSeats[order._id]
      );

      // Validate manually chosen seat.
      if (
        !Number.isInteger(
          seatNumber
        ) ||
        seatNumber < 1
      ) {
        setError(
          "Select an available seat before assigning."
        );

        return;
      }

      // Payment should already be verified.
      if (
        order.paymentStatus !==
        "Paid"
      ) {
        setError(
          "Verify payment before assigning a seat."
        );

        return;
      }

      if (
        order.seatNumber != null
      ) {
        setError(
          `This order already has Seat ${order.seatNumber}.`
        );

        return;
      }

      const franchiseId =
        getFranchiseId(order);

      // Verify current availability.
      const latestSeats =
        await getSeats(franchiseId);

      if (!latestSeats) return;

      if (
        !latestSeats.available?.includes(
          seatNumber
        )
      ) {
        setError(
          `Seat ${seatNumber} is no longer available. Choose another seat.`
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Assign Seat ${seatNumber} to ${orderId(
            order
          )}?`
        );

      if (!confirmed) return;

      setBusy(
        order._id
      );

      setError("");
      setNotice("");

      try {
        // ====================================
        // ADMIN-ONLY SEAT ASSIGNMENT API
        // ====================================

        const result =
          await adminRequest(
            `/admin/${order._id}/seat`,
            {
              method: "PATCH",

              body:
                JSON.stringify({
                  seatNumber,
                }),
            }
          );

        setNotice(
          `Seat ${result.seatNumber} assigned to ${orderId(
            order
          )}. Customer tracking screen will update automatically.`
        );

        setSelectedSeats(
          (previous) => ({
            ...previous,
            [order._id]: "",
          })
        );

        await refresh();

        await getSeats(
          franchiseId
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to assign seat."
        );

        await getSeats(
          franchiseId
        );
      } finally {
        setBusy(null);
      }
    };

  // ========================================
  // CONFIRM COUNTER PAYMENT
  // ========================================

  const confirmCounterPayment =
    async (order) => {
      if (busy) return;

      const reference = String(
        refs[order._id] || ""
      ).trim();

      // Counter UPI reference.
      if (
        order.paymentMethod ===
          "Counter UPI" &&
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

      const confirmed =
        window.confirm(
          `Have you actually received ${portalMoney(
            order.total
          )} via ${order.paymentMethod}?`
        );

      if (!confirmed) return;

      setBusy(
        order._id
      );

      setError("");
      setNotice("");

      try {
        // Admin manually verifies cash/UPI.
        await api.collectCounterPayment(
          order._id,
          reference
        );

        setNotice(
          `Payment verified for ${orderId(
            order
          )}. Now assign a seat manually.`
        );

        await refresh();

        await getSeats(
          getFranchiseId(order)
        );
      } catch (err) {
        setError(
          err.message ||
            "Payment verification failed."
        );
      } finally {
        setBusy(null);
      }
    };

  // ========================================
  // UPDATE ORDER STATUS / ETA
  // ========================================

  const updateStatus =
    async (order, status) => {
      if (busy) return;

      // Payment first.
      if (
        status !==
          "Cancelled" &&
        order.paymentStatus !==
          "Paid"
      ) {
        setError(
          "Payment must be verified first."
        );

        return;
      }

      // Manual seat before confirmation.
      if (
        status ===
          "Confirmed" &&
        order.seatNumber == null
      ) {
        setError(
          "Assign a custom seat before confirming this order."
        );

        return;
      }

      // Paid orders need refund handling.
      if (
        status ===
          "Cancelled" &&
        order.paymentStatus ===
          "Paid"
      ) {
        setError(
          "Paid orders require a refund before cancellation."
        );

        return;
      }

      let minutes;

      if (
        [
          "Confirmed",
          "Preparing",
        ].includes(status)
      ) {
        minutes = Number(
          eta[order._id] ??
            order.readyInMinutes ??
            15
        );

        if (
          !Number.isInteger(
            minutes
          ) ||
          minutes < 1 ||
          minutes > 180
        ) {
          setError(
            "ETA must be between 1 and 180 minutes."
          );

          return;
        }
      }

      const confirmed =
        window.confirm(
          `Move ${orderId(
            order
          )} to ${status}?`
        );

      if (!confirmed) return;

      setBusy(
        order._id
      );

      setError("");
      setNotice("");

      try {
        await api.updateOrderStatus(
          order._id,
          status,
          minutes
        );

        setNotice(
          `${orderId(
            order
          )}: ${status}${
            status === "Picked Up"
              ? " — seat released."
              : "."
          }`
        );

        await refresh();

        await getSeats(
          getFranchiseId(order)
        );
      } catch (err) {
        setError(
          err.message ||
            "Unable to update order status."
        );
      } finally {
        setBusy(null);
      }
    };

  // ========================================
  // DASHBOARD METRICS
  // ========================================

  const metrics = useMemo(
    () => ({
      total: orders.length,

      pending:
        orders.filter(
          (order) =>
            order.status ===
            "Pending"
        ).length,

      preparing:
        orders.filter(
          (order) =>
            order.status ===
            "Preparing"
        ).length,

      paidWaiting:
        orders.filter(
          (order) =>
            order.paymentStatus ===
              "Paid" &&
            order.seatNumber == null &&
            ![
              "Cancelled",
              "Picked Up",
            ].includes(
              order.status
            )
        ).length,
    }),
    [orders]
  );

  // ========================================
  // FILTER MULTIPLE CUSTOMER ORDERS
  // ========================================

  const filtered = useMemo(
    () =>
      orders.filter(
        (order) => {
          const text = [
            order.orderNumber,
            order.trackingCode,
            order.userId?.name,
            order.franchiseId?.name,
            order.seatNumber,
            orderItemsText(order),
          ]
            .filter(
              (item) =>
                item !== null &&
                item !== undefined
            )
            .join(" ")
            .toLowerCase();

          const matchesStatus =
            filter === "All" ||
            order.status === filter;

          const matchesSearch =
            text.includes(
              search
                .trim()
                .toLowerCase()
            );

          const matchesQuery =
            text.includes(query);

          return (
            matchesStatus &&
            matchesSearch &&
            matchesQuery
          );
        }
      ),
    [
      orders,
      search,
      filter,
      query,
    ]
  );

  // ========================================
  // RENDER ADMIN DASHBOARD
  // ========================================

  return (
    <div className="ob-portal-page cf-page">

      {/* ====================================
          PAGE HEADING
      ==================================== */}

      <PageHead
        title="Order Management"
        subtitle="Verify payments, assign custom seats and manage multiple customer orders."
      >
        <button
          className="cf-outlined"
          type="button"
          disabled={Boolean(busy)}
          onClick={refresh}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageHead>

      {/* ====================================
          DASHBOARD METRICS
      ==================================== */}

      <div className="cf-stat-grid">

        <Metric
          icon={ShoppingBag}
          label="Total Orders"
          value={metrics.total}
          sub="All customers"
        />

        <Metric
          icon={Clock3}
          label="Pending"
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
          label="Paid / Seat Pending"
          value={metrics.paidWaiting}
          sub="Assign manually"
          tint="green"
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
            onClick={() =>
              setError("")
            }
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ====================================
          SUCCESS MESSAGE
      ==================================== */}

      {notice && (
        <div
          className="cf-notice"
          role="status"
        >
          <CheckCircle2 size={16} />

          {notice}
        </div>
      )}

      {/* ====================================
          ALL CUSTOMER ORDERS
      ==================================== */}

      <section className="cf-panel">

        <div className="cf-panel-head">

          <div>
            <h2>
              All Customer Orders
            </h2>

            <p>
              Multiple customers can place
              orders simultaneously. Assign
              an available seat to each
              paid order.
            </p>
          </div>

          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search order, customer or seat..."
          />

        </div>

        {/* STATUS FILTER */}

        <Tabs
          items={statuses}
          value={filter}
          onChange={setFilter}
        />

        {/* =================================
            ORDERS TABLE
        ================================= */}

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
            !loading &&
            filtered.length === 0
              ? "No matching orders."
              : null
          }
        >

          {filtered.map(
            (order) => {
              const franchiseId =
                getFranchiseId(
                  order
                );

              const seats =
                seatsByFranchise[
                  franchiseId
                ];

              const expandedHere =
                expanded ===
                order._id;

              const next =
                nextStatus[
                  order.status
                ];

              const canPay =
                counterMethods.includes(
                  order.paymentMethod
                ) &&
                order.paymentStatus ===
                  "Pending" &&
                ![
                  "Cancelled",
                  "Picked Up",
                ].includes(
                  order.status
                );

              const canAssign =
                order.paymentStatus ===
                  "Paid" &&
                order.seatNumber == null &&
                ![
                  "Cancelled",
                  "Picked Up",
                ].includes(
                  order.status
                );

              const assigning =
                busy ===
                order._id;

              return (
                <React.Fragment
                  key={order._id}
                >

                  {/* =======================
                      ORDER TABLE ROW
                  ======================= */}

                  <tr>

                    {/* ORDER NUMBER */}

                    <td>
                      <b>
                        {orderId(
                          order
                        )}
                      </b>

                      <small className="cf-cell-sub">
                        {formatDate(
                          order.createdAt
                        )}
                      </small>
                    </td>

                    {/* CUSTOMER */}

                    <td>
                      {order.isGuestOrder
                        ? "Walk-in Guest"
                        : order.userId?.name ||
                          "Customer"}
                    </td>

                    {/* FRANCHISE / ITEMS */}

                    <td>
                      {order.franchiseId?.name ||
                        "Franchise"}

                      <small className="cf-cell-sub">
                        {orderItemsText(
                          order
                        )}
                      </small>
                    </td>

                    {/* TOTAL */}

                    <td>
                      {portalMoney(
                        order.total
                      )}
                    </td>

                    {/* PAYMENT */}

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
                        status={
                          order.status
                        }
                      />
                    </td>

                    {/* SEAT NUMBER */}

                    <td>
                      {order.seatNumber != null ? (
                        <b>
                          <Armchair
                            size={14}
                            style={{
                              verticalAlign:
                                "middle",
                            }}
                          />{" "}
                          {order.seatNumber}
                        </b>
                      ) : (
                        <span
                          style={{
                            color:
                              "#b45309",
                          }}
                        >
                          Pending
                        </span>
                      )}
                    </td>

                    {/* DETAILS BUTTON */}

                    <td>
                      <button
                        type="button"
                        className="cf-outlined cf-expand"
                        aria-expanded={
                          expandedHere
                        }
                        onClick={() =>
                          openOrder(
                            order
                          )
                        }
                      >
                        Details

                        <ChevronDown
                          size={14}
                        />
                      </button>
                    </td>

                  </tr>

                  {/* =======================
                      EXPANDED ORDER DETAILS
                  ======================= */}

                  {expandedHere && (
                    <tr className="cf-expanded-row">

                      <td colSpan={8}>

                        <div className="cf-order-details">

                          {/* =================
                              ORDER INFO
                          ================= */}

                          <div>

                            <h3>
                              {orderId(
                                order
                              )}{" "}
                              · Customer & Payment
                            </h3>

                            <p>
                              <strong>
                                Customer:
                              </strong>{" "}
                              {order.isGuestOrder
                                ? "Walk-in Guest"
                                : order.userId?.name ||
                                  "Customer"}
                            </p>

                            <p>
                              <strong>
                                Tracking:
                              </strong>{" "}
                              {order.trackingCode ||
                                "—"}
                            </p>

                            <p>
                              <strong>
                                Method:
                              </strong>{" "}
                              {order.paymentMethod}
                            </p>

                            <p>
                              <strong>
                                Payment:
                              </strong>{" "}
                              {order.paymentStatus}
                            </p>

                            <p>
                              <strong>
                                Order:
                              </strong>{" "}
                              {order.status}
                            </p>

                            <p>
                              <strong>
                                Seat:
                              </strong>{" "}
                              {order.seatNumber != null
                                ? `Seat ${order.seatNumber}`
                                : "Not assigned"}
                            </p>

                            <p>
                              <strong>
                                ETA:
                              </strong>{" "}
                              {formatDate(
                                order.estimatedReadyTime
                              )}
                            </p>

                            <p>
                              <strong>
                                Items:
                              </strong>{" "}
                              {orderItemsText(
                                order
                              )}
                            </p>

                            {order.notes && (
                              <p>
                                <strong>
                                  Notes:
                                </strong>{" "}
                                {order.notes}
                              </p>
                            )}

                          </div>

                          {/* =================
                              ADMIN ACTIONS
                          ================= */}

                          <div className="cf-order-actions">

                            {/* =================
                                COUNTER PAYMENT
                            ================= */}

                            {canPay && (
                              <>

                                {order.paymentMethod ===
                                  "Counter UPI" && (
                                  <input
                                    type="text"
                                    className="cf-upi-input"
                                    maxLength={120}
                                    placeholder="UPI reference"
                                    aria-label="UPI reference"
                                    value={
                                      refs[
                                        order._id
                                      ] || ""
                                    }
                                    onChange={(
                                      event
                                    ) =>
                                      setRefs(
                                        (previous) => ({
                                          ...previous,

                                          [order._id]:
                                            event.target.value,
                                        })
                                      )
                                    }
                                  />
                                )}

                                <button
                                  className="cf-primary"
                                  type="button"
                                  disabled={
                                    Boolean(
                                      busy
                                    )
                                  }
                                  onClick={() =>
                                    confirmCounterPayment(
                                      order
                                    )
                                  }
                                >
                                  <Wallet
                                    size={16}
                                  />

                                  {assigning
                                    ? "Processing..."
                                    : "Confirm Counter Payment"}
                                </button>

                              </>
                            )}

                            {/* =================
                                CUSTOM SEAT
                            ================= */}

                            {canAssign && (
                              <div
                                style={{
                                  display:
                                    "grid",

                                  gap: 10,

                                  width:
                                    "100%",

                                  padding:
                                    14,

                                  border:
                                    "1px solid #f1d8c0",

                                  borderRadius:
                                    12,

                                  background:
                                    "#fffaf5",
                                }}
                              >

                                <label
                                  htmlFor={`seat-${order._id}`}
                                  style={{
                                    fontWeight:
                                      700,
                                  }}
                                >
                                  Choose Custom Seat
                                </label>

                                {/* AVAILABLE SEATS */}

                                <select
                                  id={`seat-${order._id}`}
                                  value={
                                    selectedSeats[
                                      order._id
                                    ] || ""
                                  }
                                  onChange={(
                                    event
                                  ) =>
                                    setSelectedSeats(
                                      (previous) => ({
                                        ...previous,

                                        [order._id]:
                                          event.target.value,
                                      })
                                    )
                                  }
                                  disabled={
                                    Boolean(
                                      busy
                                    ) ||
                                    Boolean(
                                      seatsLoading[
                                        franchiseId
                                      ]
                                    )
                                  }
                                  style={{
                                    width:
                                      "100%",

                                    padding:
                                      "11px 12px",

                                    border:
                                      "1px solid #ead8c8",

                                    borderRadius:
                                      8,

                                    background:
                                      "#ffffff",
                                  }}
                                >

                                  <option value="">
                                    Select available seat
                                  </option>

                                  {(
                                    seats?.available ||
                                    []
                                  ).map(
                                    (number) => (
                                      <option
                                        key={
                                          number
                                        }
                                        value={
                                          number
                                        }
                                      >
                                        Seat{" "}
                                        {number}
                                      </option>
                                    )
                                  )}

                                </select>

                                {/* AVAILABILITY INFO */}

                                <small
                                  style={{
                                    color:
                                      "#786658",
                                  }}
                                >
                                  Occupied:{" "}
                                  {seats?.occupied
                                    ?.length ||
                                    0}{" "}
                                  /{" "}
                                  {seats?.capacity ||
                                    "—"}

                                  {" | "}

                                  Available:{" "}
                                  {seats?.available
                                    ?.length ??
                                    "—"}
                                </small>

                                {/* ASSIGN SEAT */}

                                <button
                                  className="cf-primary"
                                  type="button"
                                  disabled={
                                    Boolean(
                                      busy
                                    ) ||
                                    !selectedSeats[
                                      order._id
                                    ] ||
                                    Boolean(
                                      seatsLoading[
                                        franchiseId
                                      ]
                                    )
                                  }
                                  onClick={() =>
                                    assignCustomSeat(
                                      order
                                    )
                                  }
                                >
                                  <Armchair
                                    size={16}
                                  />

                                  {assigning
                                    ? "Assigning..."
                                    : "Assign Seat to Customer"}
                                </button>

                                {/* REFRESH AVAILABLE SEATS */}

                                <button
                                  className="cf-outlined"
                                  type="button"
                                  disabled={
                                    Boolean(
                                      busy
                                    )
                                  }
                                  onClick={() =>
                                    getSeats(
                                      franchiseId
                                    )
                                  }
                                >
                                  <RefreshCw
                                    size={14}
                                  />

                                  Refresh Available Seats
                                </button>

                              </div>
                            )}

                            {/* =================
                                ASSIGNED SEAT
                            ================= */}

                            {order.seatNumber != null && (
                              <p
                                style={{
                                  color:
                                    "#15803d",

                                  fontWeight:
                                    700,
                                }}
                              >
                                <CheckCircle2
                                  size={16}
                                  style={{
                                    verticalAlign:
                                      "middle",
                                  }}
                                />{" "}
                                Seat{" "}
                                {order.seatNumber}{" "}
                                assigned by Admin
                              </p>
                            )}

                            {/* =================
                                NEXT ORDER STATUS
                            ================= */}

                            {next && (
                              <>

                                {/* ETA INPUT */}

                                {[
                                  "Pending",
                                  "Confirmed",
                                ].includes(
                                  order.status
                                ) && (
                                  <label className="cf-eta-label">

                                    ETA (minutes)

                                    <input
                                      type="number"
                                      min={1}
                                      max={180}
                                      value={
                                        eta[
                                          order._id
                                        ] ??
                                        order.readyInMinutes ??
                                        15
                                      }
                                      onChange={(
                                        event
                                      ) =>
                                        setEta(
                                          (previous) => ({
                                            ...previous,

                                            [order._id]:
                                              event.target.value,
                                          })
                                        )
                                      }
                                    />

                                  </label>
                                )}

                                {/* STATUS BUTTON */}

                                <button
                                  className="cf-primary"
                                  type="button"
                                  disabled={
                                    Boolean(
                                      busy
                                    ) ||
                                    order.paymentStatus !==
                                      "Paid" ||
                                    (
                                      next ===
                                        "Confirmed" &&
                                      order.seatNumber ==
                                        null
                                    )
                                  }
                                  onClick={() =>
                                    updateStatus(
                                      order,
                                      next
                                    )
                                  }
                                >
                                  <CheckCircle2
                                    size={16}
                                  />

                                  {nextLabel[
                                    next
                                  ]}
                                </button>

                              </>
                            )}

                            {/* =================
                                CANCEL UNPAID
                            ================= */}

                            {[
                              "Pending",
                              "Confirmed",
                            ].includes(
                              order.status
                            ) &&
                              order.paymentStatus !==
                                "Paid" && (
                                <button
                                  type="button"
                                  className="cf-outlined"
                                  disabled={
                                    Boolean(
                                      busy
                                    )
                                  }
                                  onClick={() =>
                                    updateStatus(
                                      order,
                                      "Cancelled"
                                    )
                                  }
                                >
                                  <Trash2
                                    size={15}
                                  />

                                  Cancel Unpaid Order
                                </button>
                              )}

                            {/* =================
                                WAITING FOR SEAT
                            ================= */}

                            {order.paymentStatus ===
                              "Paid" &&
                              order.seatNumber ==
                                null &&
                              ![
                                "Picked Up",
                                "Cancelled",
                              ].includes(
                                order.status
                              ) && (
                                <p
                                  style={{
                                    color:
                                      "#b45309",
                                  }}
                                >
                                  <CreditCard
                                    size={14}
                                    style={{
                                      verticalAlign:
                                        "middle",
                                    }}
                                  />{" "}
                                  Payment received.
                                  Admin must select
                                  a seat manually.
                                </p>
                              )}

                          </div>

                        </div>

                      </td>

                    </tr>
                  )}

                </React.Fragment>
              );
            }
          )}

        </DataTable>

      </section>

    </div>
  );
};



