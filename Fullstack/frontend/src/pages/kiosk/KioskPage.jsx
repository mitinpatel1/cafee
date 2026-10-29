
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";


import {
  Armchair,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Minus,
  Plus,
  X,
  Printer,
  RefreshCw,
  Search,
  ShoppingCart,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";


// ============================================
// API CONFIGURATION
// ============================================

const API_BASE = "/api";

const money = (amount) =>
  `₹${Number(amount || 0).toFixed(2)}`;

async function request(path, options = {}) {
  const response = await fetch(
    `${API_BASE}${path}`,
    {
      cache: "no-store",
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    }
  );

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
        `Request failed (${response.status})`
    );
  }

  return data;
}

// ============================================
// RAZORPAY SCRIPT LOADER
// ============================================

let razorpayLoader = null;

function loadRazorpay() {
  if (window.Razorpay) {
    return Promise.resolve();
  }

  if (!razorpayLoader) {
    razorpayLoader = new Promise(
      (resolve, reject) => {
        const script =
          document.createElement("script");

        script.src =
          "https://checkout.razorpay.com/v1/checkout.js";

        script.async = true;
        script.onload = resolve;

        script.onerror = () =>
          reject(
            new Error(
              "Razorpay checkout could not load."
            )
          );

        document.head.appendChild(script);
      }
    ).catch((error) => {
      razorpayLoader = null;
      throw error;
    });
  }

  return razorpayLoader;
}

// ============================================
// SEAT STATUS HELPERS
// ============================================

const isAssigned = (order) =>
  order?.seatNumber !== undefined &&
  order?.seatNumber !== null &&
  order?.seatNumber !== "";

// Avoid replacing newer payment/seat details
// with an older polling response.

function preferLatestOrder(previous, incoming) {
  if (!previous) {
    return incoming;
  }

  if (
    previous.paymentStatus === "Paid" &&
    incoming.paymentStatus === "Pending"
  ) {
    return {
      ...incoming,
      paymentStatus: "Paid",
      seatNumber:
        previous.seatNumber ??
        incoming.seatNumber,
    };
  }

  if (
    isAssigned(previous) &&
    !isAssigned(incoming)
  ) {
    return {
      ...incoming,
      seatNumber: previous.seatNumber,
    };
  }

  return incoming;
}

// ============================================
// MAIN KIOSK PAGE
// ============================================

export const KioskPage = () => {
  // ========================================
  // STATES
  // ========================================

  const [franchises, setFranchises] =
    useState([]);

  const [franchiseId, setFranchiseId] =
    useState("");

  const [menu, setMenu] =
    useState([]);

  const [menuLoading, setMenuLoading] =
    useState(true);

  const [cart, setCart] =
    useState([]);

  // Cart hidden by default
  const [cartOpen, setCartOpen] =
    useState(false);

  const [category, setCategory] =
    useState("All");

  const [search, setSearch] =
    useState("");

  const [onlineEnabled, setOnlineEnabled] =
    useState(false);

  const [paymentMethod, setPaymentMethod] =
    useState("Counter Cash");

  // menu | checkout | receipt | lookup | tracking
  const [screen, setScreen] =
    useState("menu");

  const [receipt, setReceipt] =
    useState(null);

  const [trackingInput, setTrackingInput] =
    useState("");

  const [trackedOrder, setTrackedOrder] =
    useState(null);

  const [busy, setBusy] =
    useState(false);

  const [error, setError] =
    useState("");

  const busyLock = useRef(false);

  // ========================================
  // LOAD FRANCHISES
  // ========================================

  useEffect(() => {
    localStorage.removeItem(
      "officebite_cart"
    );

    let active = true;

    request("/franchise/public")
      .then((data) => {
        if (!active) return;

        const available =
          data.franchises || [];

        setFranchises(available);

        setFranchiseId(
          available[0]?._id || ""
        );
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      });

    request("/kiosk/config")
      .then((data) => {
        if (!active) return;

        const enabled =
          Boolean(data.onlineEnabled);

        setOnlineEnabled(enabled);

        setPaymentMethod(
          enabled
            ? "Online (Razorpay)"
            : "Counter Cash"
        );
      })
      .catch(() => {
        if (active) {
          setOnlineEnabled(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  // ========================================
  // LOAD MENU
  // ========================================

  useEffect(() => {
    let active = true;

    if (!franchiseId) {
      setMenu([]);
      setMenuLoading(false);

      return () => {
        active = false;
      };
    }

    setMenu([]);
    setMenuLoading(true);

    request(
      `/menu?franchiseId=${encodeURIComponent(
        franchiseId
      )}&isAvailable=true`
    )
      .then((data) => {
        if (!active) return;

        setMenu(
          (data.items || []).filter(
            (item) =>
              !item.catalogPreview &&
              item.isAvailable !== false
          )
        );
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setMenuLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [franchiseId]);

  // ========================================
  // REFRESH CUSTOMER ORDER STATUS
  // ========================================

  const refreshStatus = useCallback(
    async (code) => {
      const normalized = String(
        code || ""
      )
        .trim()
        .toUpperCase();

      const { order } = await request(
        `/kiosk/track/${encodeURIComponent(
          normalized
        )}`
      );

      setReceipt((current) =>
        current?.order?.trackingCode ===
        normalized
          ? {
              ...current,
              status: preferLatestOrder(
                current.status,
                order
              ),
            }
          : current
      );

      setTrackedOrder((current) =>
        current?.trackingCode ===
        normalized
          ? preferLatestOrder(
              current,
              order
            )
          : current
      );

      return order;
    },
    []
  );

  // ========================================
  // AUTOMATIC TRACKING REFRESH
  // ========================================

  useEffect(() => {
    const code =
      screen === "receipt"
        ? receipt?.order?.trackingCode
        : screen === "tracking"
        ? trackedOrder?.trackingCode
        : null;

    if (!code) return;

    let active = true;

    const poll = () => {
      if (!active) return;

      refreshStatus(code).catch(() => {});
    };

    poll();

    const interval = setInterval(
      poll,
      6000
    );

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [
    screen,
    receipt?.order?.trackingCode,
    trackedOrder?.trackingCode,
    refreshStatus,
  ]);

  // ========================================
  // RESET FOR NEXT CUSTOMER
  // ========================================

  const resetForNextCustomer = useCallback(
    () => {
      setCart([]);
      setCartOpen(false);

      setCategory("All");
      setSearch("");

      setReceipt(null);
      setTrackedOrder(null);

      setTrackingInput("");
      setError("");

      setPaymentMethod(
        onlineEnabled
          ? "Online (Razorpay)"
          : "Counter Cash"
      );

      setScreen("menu");

      localStorage.removeItem(
        "officebite_cart"
      );
    },
    [onlineEnabled]
  );

  // ========================================
  // NEXT CUSTOMER
  // ========================================

  const nextCustomer = useCallback(
    () => {
      if (
        busyLock.current ||
        busy
      ) {
        return;
      }

      if (
        screen === "receipt" &&
        receipt
      ) {
        const paid =
          receipt.status?.paymentStatus ===
          "Paid";

        const seat =
          isAssigned(receipt.status);

        const message = !paid
          ? "Payment is still pending. Save or print the tracking code before starting another order. Continue?"
          : !seat
          ? "Payment received, but Admin has not assigned a seat yet. Save or print the tracking code to check the seat later. Continue?"
          : null;

        if (
          message &&
          !window.confirm(message)
        ) {
          return;
        }
      }

      // Only clear current kiosk screen.
      // Existing order stays in MongoDB.
      resetForNextCustomer();
    },
    [
      busy,
      screen,
      receipt,
      resetForNextCustomer,
    ]
  );

  // ========================================
  // AUTOMATIC RESET AFTER 120 SECONDS
  // ========================================

  useEffect(() => {
    const readyToClear =
      screen === "receipt" &&
      receipt?.status?.paymentStatus ===
        "Paid";

    if (
      !readyToClear &&
      screen !== "tracking"
    ) {
      return;
    }

    const timer = setTimeout(() => {
      if (!busyLock.current) {
        resetForNextCustomer();
      }
    }, 120000);

    return () => {
      clearTimeout(timer);
    };
  }, [
    screen,
    receipt?.status?.paymentStatus,
    trackedOrder?.trackingCode,
    resetForNextCustomer,
  ]);

  // ========================================
  // CLOSE CART ON ESCAPE
  // ========================================

  useEffect(() => {
    if (!cartOpen) return;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setCartOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      closeOnEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        closeOnEscape
      );
    };
  }, [cartOpen]);

  // ========================================
  // CART QUANTITY +1 / -1
  // ========================================

  const changeQuantity = (
    item,
    delta
  ) => {
    setCart((current) => {
      const existing = current.find(
        (entry) =>
          entry.menuItemId === item._id
      );

      if (!existing) {
        if (delta <= 0) {
          return current;
        }

        return [
          ...current,
          {
            menuItemId: item._id,
            name: item.name,
            price: Number(item.price),
            quantity: 1,
          },
        ];
      }

      return current
        .map((entry) =>
          entry.menuItemId === item._id
            ? {
                ...entry,
                quantity: Math.max(
                  0,
                  Math.min(
                    50,
                    entry.quantity + delta
                  )
                ),
              }
            : entry
        )
        .filter(
          (entry) =>
            entry.quantity > 0
        );
    });
  };

  // ========================================
  // CART CALCULATIONS
  // ========================================

  const count = cart.reduce(
    (sum, item) =>
      sum + item.quantity,
    0
  );

  const total =
    Math.round(
      cart.reduce(
        (sum, item) =>
          sum +
          item.quantity * item.price,
        0
      ) * 100
    ) / 100;

  // ========================================
  // MENU CATEGORIES
  // ========================================

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        menu
          .map((item) => item.category)
          .filter(Boolean)
      ),
    ],
    [menu]
  );

  const filteredMenu = useMemo(
    () =>
      menu.filter(
        (item) =>
          (category === "All" ||
            item.category === category) &&
          String(item.name)
            .toLowerCase()
            .includes(
              search
                .trim()
                .toLowerCase()
            )
      ),
    [
      menu,
      category,
      search,
    ]
  );

  // ========================================
  // RAZORPAY ONLINE PAYMENT
  // ========================================

  const payOnline = async (
    order,
    orderKey
  ) => {
    await loadRazorpay();

    const payment = await request(
      `/kiosk/orders/${order._id}/pay`,
      {
        method: "POST",

        headers: {
          "x-kiosk-order-key":
            orderKey,
        },
      }
    );

    return new Promise(
      (resolve, reject) => {
        let finished = false;

        const fail = (message) => {
          if (finished) return;

          finished = true;

          reject(
            new Error(message)
          );
        };

        const checkout =
          new window.Razorpay({
            key: payment.keyId,

            amount: payment.amount,

            currency:
              payment.currency,

            name:
              "OfficeBite Cafeteria",

            description:
              `Order ${order.orderNumber}`,

            order_id:
              payment.gatewayOrderId,

            theme: {
              color: "#f97316",
            },

            handler: async (
              details
            ) => {
              if (finished) return;

              finished = true;

              try {
                const verified =
                  await request(
                    `/kiosk/orders/${order._id}/verify`,
                    {
                      method: "POST",

                      headers: {
                        "x-kiosk-order-key":
                          orderKey,
                      },

                      body:
                        JSON.stringify(
                          details
                        ),
                    }
                  );

                // Payment verified.
                // Admin will assign seat later.

                setReceipt(
                  (current) =>
                    current?.order?._id ===
                    order._id
                      ? {
                          ...current,
                          status:
                            preferLatestOrder(
                              current.status,
                              verified.order
                            ),
                        }
                      : current
                );

                resolve(
                  verified.order
                );
              } catch (err) {
                reject(err);
              }
            },

            modal: {
              ondismiss: () =>
                fail(
                  "Payment window closed. Check payment status before retrying."
                ),
            },
          });

        checkout.on(
          "payment.failed",
          (event) => {
            fail(
              event.error?.description ||
                "Payment could not be completed."
            );
          }
        );

        checkout.open();
      }
    );
  };

  // ========================================
  // PLACE CUSTOMER ORDER
  // ========================================

  const placeOrder = async () => {
    if (
      busyLock.current ||
      !cart.length ||
      !franchiseId
    ) {
      return;
    }

    busyLock.current = true;

    setBusy(true);
    setError("");

    try {
      const result = await request(
        "/kiosk/orders",
        {
          method: "POST",

          body: JSON.stringify({
            franchiseId,

            paymentMethod,

            items: cart.map(
              (item) => ({
                menuItemId:
                  item.menuItemId,

                quantity:
                  item.quantity,
              })
            ),
          }),
        }
      );

      // Save receipt for current customer
      setReceipt({
        order: result.order,

        status: result.order,

        orderKey:
          result.orderKey,

        paymentMethod,
      });

      setCart([]);
      setCartOpen(false);

      setScreen("receipt");

      if (
        paymentMethod ===
        "Online (Razorpay)"
      ) {
        try {
          await payOnline(
            result.order,
            result.orderKey
          );

          await refreshStatus(
            result.order.trackingCode
          );
        } catch (err) {
          setError(
            `${err.message} If money was deducted, check tracking before retrying.`
          );

          await refreshStatus(
            result.order.trackingCode
          ).catch(() => {});
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      busyLock.current = false;

      setBusy(false);
    }
  };

  // ========================================
  // RETRY ONLINE PAYMENT
  // ========================================

  const retryPayment = async () => {
    if (
      busyLock.current ||
      !receipt ||
      receipt.status?.paymentStatus ===
        "Paid"
    ) {
      return;
    }

    busyLock.current = true;

    setBusy(true);
    setError("");

    try {
      const latest =
        await refreshStatus(
          receipt.order.trackingCode
        );

      if (
        latest.paymentStatus !==
        "Paid"
      ) {
        await payOnline(
          receipt.order,
          receipt.orderKey
        );

        await refreshStatus(
          receipt.order.trackingCode
        );
      }
    } catch (err) {
      setError(
        `${err.message} Check tracking status before retrying.`
      );
    } finally {
      busyLock.current = false;

      setBusy(false);
    }
  };

  // ========================================
  // TRACK EXISTING ORDER
  // ========================================

  const checkTracking = async (
    event
  ) => {
    event.preventDefault();

    if (busyLock.current) {
      return;
    }

    const code =
      trackingInput
        .trim()
        .toUpperCase();

    if (
      !/^[0-9A-F]{16}$/.test(code)
    ) {
      setError(
        "Enter a valid 16-character tracking code."
      );

      return;
    }

    busyLock.current = true;

    setBusy(true);
    setError("");

    try {
      const order =
        await refreshStatus(
          code
        );

      setTrackedOrder(
        order
      );

      setScreen(
        "tracking"
      );
    } catch (err) {
      setError(err.message);
    } finally {
      busyLock.current = false;

      setBusy(false);
    }
  };

  // ========================================
  // DISPLAY HELPERS
  // ========================================

  const receiptPaid =
    receipt?.status?.paymentStatus ===
    "Paid";

  const receiptSeatAssigned =
    isAssigned(
      receipt?.status
    );

  const receiptMethod =
    receipt?.paymentMethod ||
    paymentMethod;

  const seatMessage = (order) => {
    if (isAssigned(order)) {
      return `Seat ${order.seatNumber} assigned by Admin.`;
    }

    if (
      order?.paymentStatus ===
      "Paid"
    ) {
      return "Payment verified. Waiting for Admin to assign your seat.";
    }

    return "Payment pending. Admin will assign your seat after payment verification.";
  };

  // ========================================
  // KIOSK UI
  // ========================================

  return (
    <div className="ob-kiosk">

      {/* ====================================
          CSS STYLING
      ==================================== */}

      <style>
        {`
          .ob-kiosk {
            min-height: 100vh;
            background: #fff9f1;
            color: #39291f;
            padding: 20px;
            font-family:
              Inter, system-ui, sans-serif;
          }

          .ob-kiosk * {
            box-sizing: border-box;
          }

          .ob-kiosk .shell {
            max-width: 1300px;
            margin: 0 auto;
          }

          .ob-kiosk header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 16px;
            margin-bottom: 22px;
          }

          .ob-kiosk h1 {
            font-size:
              clamp(1.7rem, 4vw, 2.5rem);
            color: #873b10;
            margin: 0;
          }

          .ob-kiosk h2 {
            margin: 0 0 14px;
          }

          .ob-kiosk h3 {
            margin-bottom: 12px;
          }

          .ob-kiosk .muted {
            color: #79695e;
            font-size: 0.95rem;
          }

          .ob-kiosk .panel {
            background: #fff;
            border: 1px solid #f3ddc9;
            border-radius: 20px;
            padding: 22px;
            box-shadow:
              0 9px 32px #8c460b0d;
          }

          /* ====================================
             FULL WIDTH MENU
          ==================================== */

          .ob-kiosk .menu-only {
            width: 100%;
            min-width: 0;
          }

          .ob-kiosk .menu-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 14px;
          }

          .ob-kiosk .menu-head h2 {
            margin: 0;
          }

          /* ====================================
             TOP RIGHT HEADER ACTIONS
          ==================================== */

          .ob-kiosk .header-actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
            flex-wrap: wrap;
          }

          .ob-kiosk .cart-toggle {
            position: relative;
          }

          .ob-kiosk .cart-count {
            min-width: 23px;
            height: 23px;
            padding: 0 5px;
            position: absolute;
            right: -8px;
            top: -9px;

            background: #9a3412;
            color: white;

            display: grid;
            place-items: center;

            font-size: 12px;
            border: 2px solid #fff9f1;
            border-radius: 999px;
            font-weight: 800;
          }

          /* ====================================
             CART DRAWER BACKDROP
          ==================================== */

          .ob-kiosk .cart-backdrop {
            position: fixed;
            inset: 0;

            background:
              rgba(25, 17, 10, 0.46);

            z-index: 1000;

            border: 0;
            cursor: default;
          }

          /* ====================================
             TOP RIGHT CART DRAWER
          ==================================== */

          .ob-kiosk .cart-drawer {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;

            z-index: 1001;

            width:
              min(420px, 100vw);

            background: #fff;
            padding: 22px;

            box-shadow:
              -10px 0 38px
              rgba(25, 17, 10, 0.2);

            display: flex;
            flex-direction: column;
            gap: 14px;
          }

          .ob-kiosk .cart-drawer-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .ob-kiosk .cart-drawer-head h2 {
            margin: 0;
          }

          .ob-kiosk .cart-drawer-body {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
          }

          .ob-kiosk .cart-line {
            padding: 10px 0;
            border-bottom:
              1px solid #f3e2d0;
          }

          .ob-kiosk .cart-line-title {
            font-weight: 750;
          }

          .ob-kiosk .cart-line-controls {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            margin-top: 9px;
          }

          .ob-kiosk .cart-drawer-footer {
            border-top:
              1px solid #f3e2d0;

            padding-top: 12px;
          }

          /* ====================================
             BUTTONS
          ==================================== */

          .ob-kiosk button {
            touch-action: manipulation;
          }

          .ob-kiosk .btn {
            display: inline-flex;
            gap: 8px;

            justify-content: center;
            align-items: center;

            border: 0;
            padding: 13px 17px;
            border-radius: 12px;

            background: #f97316;
            color: #fff;

            cursor: pointer;
            font: inherit;
            font-weight: 750;
          }

          .ob-kiosk .btn.secondary {
            background: #fff0e2;
            color: #8b3c10;
          }

          .ob-kiosk .btn:disabled {
            opacity: 0.55;
            cursor: not-allowed;
          }

          /* ====================================
             INPUTS
          ==================================== */

          .ob-kiosk input,
          .ob-kiosk select {
            width: 100%;
            padding: 13px 14px;

            border:
              1px solid #edd2ba;

            border-radius: 11px;
            background: #fff;
            font: inherit;
          }

          .ob-kiosk input:focus,
          .ob-kiosk select:focus {
            border-color: #f97316;
            outline: none;

            box-shadow:
              0 0 0 3px #ffedd5;
          }

          /* ====================================
             CAFETERIA & SEARCH SPACING
          ==================================== */

          .ob-kiosk .toolbar {
            display: grid;

            grid-template-columns:
              1fr 1.2fr;

            gap: 18px 16px;
            margin-bottom: 18px;
          }

          .ob-kiosk .toolbar > label {
            display: flex;
            flex-direction: column;

            gap: 12px;
            min-width: 0;
          }

          .ob-kiosk
          .toolbar > label > .muted {
            display: inline-flex;
            align-items: center;

            gap: 7px;
            font-weight: 600;
            line-height: 1.3;

            position: relative;
            top: -4px;
          }

          .ob-kiosk .toolbar input,
          .ob-kiosk .toolbar select {
            display: block;
            min-height: 48px;
            margin: 0;
          }

          /* ====================================
             CATEGORY FILTERS
          ==================================== */

          .ob-kiosk .categories {
            display: flex;
            gap: 9px;
            flex-wrap: wrap;
            margin: 0 0 18px;
          }

          .ob-kiosk .chip {
            border:
              1px solid #f3dcc6;

            background: #fff9f3;
            border-radius: 99px;

            padding: 10px 16px;
            cursor: pointer;
            color: #75451f;
          }

          .ob-kiosk .chip.active {
            background: #f97316;
            border-color: #f97316;
            color: #fff;
          }

          /* ====================================
             FOOD MENU CARDS
          ==================================== */

          .ob-kiosk .foods {
            display: grid;

            grid-template-columns:
              repeat(
                auto-fill,
                minmax(190px, 1fr)
              );

            gap: 15px;
          }

          .ob-kiosk .food {
            overflow: hidden;
            border:
              1px solid #f2dcc6;
            border-radius: 16px;
          }

          .ob-kiosk .food img {
            width: 100%;
            height: 135px;
            display: block;
            object-fit: cover;
          }

          .ob-kiosk .food-body {
            padding: 14px;
          }

          .ob-kiosk .food-name {
            min-height: 44px;
            font-weight: 750;
          }

          .ob-kiosk .row {
            display: flex;
            gap: 10px;

            justify-content:
              space-between;

            align-items: center;
            margin: 12px 0;
          }

          /* ====================================
             QUANTITY BUTTONS
          ==================================== */

          .ob-kiosk .qty {
            display: flex;
            gap: 11px;
            align-items: center;
          }

          .ob-kiosk .qty button {
            width: 36px;
            height: 36px;

            border: 0;
            border-radius: 10px;

            display: grid;
            place-items: center;

            background: #ffecda;
            color: #a04a11;
            cursor: pointer;
          }

          .ob-kiosk .qty button:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }

          /* ====================================
             ERROR / CENTER CARD
          ==================================== */

          .ob-kiosk .error {
            color: #a12222;
            background: #fff0f0;

            border-radius: 12px;
            padding: 13px 16px;
            margin-bottom: 18px;
          }

          .ob-kiosk .card-center {
            max-width: 650px;
            margin: 30px auto;
            text-align: center;
          }

          /* ====================================
             PAYMENT METHOD
          ==================================== */

          .ob-kiosk .method {
            display: flex;
            gap: 12px;
            align-items: center;

            border:
              1px solid #f3dcc6;

            padding: 14px;
            border-radius: 12px;

            margin: 10px 0;
            text-align: left;
            cursor: pointer;
          }

          .ob-kiosk .method input {
            width: auto;
          }

          /* ====================================
             SEAT DISPLAY
          ==================================== */

          .ob-kiosk .seat-card {
            background: #fff2e6;

            border:
              1px solid #ffdfbf;

            border-radius: 20px;
            padding: 22px;
            margin: 20px 0;
          }

          .ob-kiosk .seat {
            font-size:
              clamp(3rem, 9vw, 5.5rem);

            color: #f97316;
            font-weight: 900;
          }

          .ob-kiosk .success {
            color: #15803d;
            font-weight: 700;
          }

          .ob-kiosk .code {
            font-family: monospace;
            font-size: 1.28rem;

            font-weight: 800;
            letter-spacing: 0.07em;

            overflow-wrap: anywhere;
            user-select: text;
          }

          /* ====================================
             ACTION BUTTONS
          ==================================== */

          .ob-kiosk .actions {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;

            justify-content: center;
            margin-top: 18px;
          }

          .ob-kiosk .divider {
            border: 0;
            border-top:
              1px solid #f3e2d0;

            margin: 18px 0;
          }

          .ob-kiosk .tracking-description {
            position: relative;
            top: -8px;

            margin-top: 0;
            margin-bottom: 20px;
            line-height: 1.5;
          }

          .ob-kiosk .note {
            padding: 12px;

            background: #fff9f3;
            border-radius: 12px;

            color: #79695e;
            font-size: 0.9rem;
          }

          /* ====================================
             RESPONSIVE
          ==================================== */

          @media (max-width: 560px) {
            .ob-kiosk {
              padding: 12px;
            }

            .ob-kiosk .panel {
              padding: 15px;
            }

            .ob-kiosk .toolbar {
              grid-template-columns: 1fr;
            }

            .ob-kiosk .cart-drawer {
              padding: 16px;
            }

            .ob-kiosk .header-actions .btn {
              padding: 12px;
            }
          }

          /* ====================================
             PRINT
          ==================================== */

          @media print {
            .ob-kiosk {
              background: #fff;
            }

            .ob-kiosk header,
            .ob-kiosk .no-print,
            .ob-kiosk .error,
            .ob-kiosk .cart-backdrop,
            .ob-kiosk .cart-drawer {
              display: none !important;
            }

            .ob-kiosk .panel {
              box-shadow: none;
              border: 0;
            }
          }
        `}
      </style>

      <div className="shell">

        
{/* ========================================
    HEADER — LOGO ONLY
======================================== */}

<header className="no-print">
  <div>
    <h1>
      <UtensilsCrossed
        size={30}
        style={{ verticalAlign: "middle" }}
      />{" "}
      OfficeBite
    </h1>

    <div className="muted">
      Self-Service Food Ordering 
    </div>
  </div>
</header>


        {/* ====================================
            ERROR MESSAGE
        ==================================== */}

        {error && (
          <div
            className="error no-print"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ====================================
            FULL WIDTH MENU
        ==================================== */}

        {screen === "menu" && (
          <div className="menu-only no-print">

            <main className="panel">

              {/* MENU HEADING */}

              
<div className="menu-head">
  <h2>Choose Your Meal</h2>

  <div className="menu-actions">
    {/* YOUR ORDER ICON */}
    <button
      className="btn secondary icon-action"
      type="button"
      title="Your Order"
      aria-label={`Your Order: ${count} items`}
      aria-expanded={cartOpen}
      onClick={() => setCartOpen(true)}
    >
      <ShoppingCart size={22} />

      {count > 0 && (
        <span className="cart-count">
          {count}
        </span>
      )}
    </button>

    {/* NEXT CUSTOMER ICON */}
    <button
      className="btn secondary icon-action"
      type="button"
      title="Next Customer"
      aria-label="Next Customer"
      disabled={busy}
      onClick={nextCustomer}
    >
      <RefreshCw size={21} />
    </button>
  </div>
</div>


              {/* CAFETERIA & SEARCH */}

              <div className="toolbar">

                {/* <label>

                  <span className="muted">
                    <Store size={15} />
                    Select Cafeteria
                  </span>

                  <select
                    value={franchiseId}
                    onChange={(event) => {
                      setFranchiseId(
                        event.target.value
                      );

                      setCart([]);

                      setCategory("All");
                      setSearch("");
                    }}
                  >
                    {!franchises.length && (
                      <option value="">
                        No active franchise
                      </option>
                    )}

                    {franchises.map(
                      (franchise) => (
                        <option
                          key={franchise._id}
                          value={franchise._id}
                        >
                          {franchise.name}
                          {" — "}
                          {franchise.city}
                        </option>
                      )
                    )}
                  </select>

                </label> */}

                <label>

                  <span className="muted">
                    Search Menu
                  </span>

                  <input
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value
                      )
                    }
                    placeholder="Search food or drinks..."
                  />

                </label>

              </div>

              {/* CATEGORY FILTER */}

              <div className="categories">

                {categories.map(
                  (item) => (
                    <button
                      key={item}
                      type="button"
                      className={`chip ${
                        category === item
                          ? "active"
                          : ""
                      }`}
                      onClick={() =>
                        setCategory(item)
                      }
                    >
                      {item}
                    </button>
                  )
                )}

              </div>

              {/* MENU LOADING */}

              {menuLoading && (
                <p className="muted">
                  Loading fresh menu...
                </p>
              )}

              {!menuLoading &&
                filteredMenu.length === 0 && (
                  <p className="muted">
                    No available dishes found.
                  </p>
                )}

              {/* FOOD CARDS */}

              <div className="foods">

                {filteredMenu.map(
                  (item) => {
                    const qty =
                      cart.find(
                        (entry) =>
                          entry.menuItemId ===
                          item._id
                      )?.quantity || 0;

                    return (
                      <article
                        className="food"
                        key={item._id}
                      >

                        {/* FOOD IMAGE */}

                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                          />
                        ) : (
                          <div
                            style={{
                              height: 135,
                              background:
                                "#fff0df",
                              fontSize: 45,
                              display: "grid",
                              placeItems:
                                "center",
                            }}
                          >
                            {item.emoji ||
                              "🍽️"}
                          </div>
                        )}

                        {/* FOOD INFORMATION */}

                        <div className="food-body">

                          <div className="food-name">
                            {item.name}
                          </div>

                          <div className="row">

                            <strong>
                              {money(
                                item.price
                              )}
                            </strong>

                            {/* QUANTITY CONTROLS */}

                            <div className="qty">

                              <button
                                type="button"
                                aria-label={`Remove one ${item.name}`}
                                disabled={
                                  qty === 0
                                }
                                onClick={() =>
                                  changeQuantity(
                                    item,
                                    -1
                                  )
                                }
                              >
                                <Minus size={16} />
                              </button>

                              <strong>
                                {qty}
                              </strong>

                              <button
                                type="button"
                                aria-label={`Add one ${item.name}`}
                                disabled={
                                  qty >= 50
                                }
                                onClick={() =>
                                  changeQuantity(
                                    item,
                                    1
                                  )
                                }
                              >
                                <Plus size={16} />
                              </button>

                            </div>

                          </div>
                        </div>

                      </article>
                    );
                  }
                )}

              </div>

            </main>

          </div>
        )}
        
{/* BOTTOM ORDER SUMMARY */}

{screen === "menu" &&
  count > 0 &&
  !cartOpen && (
    <button
      className="order-summary-bar no-print"
      type="button"
      onClick={() => setCartOpen(true)}
      aria-label={`Open order: ${count} items, total ${money(total)}`}
    >
      <span className="order-summary-icon">
        <ShoppingCart size={20} />
      </span>

      <span className="order-summary-copy">
        <span className="order-summary-count">
          {count} {count === 1 ? "item" : "items"} added
        </span>

        <span className="order-summary-items">
          {cart
            .map(
              (item) =>
                `${item.quantity}× ${item.name} · ${money(
                  item.quantity * item.price
                )}`
            )
            .join("  |  ")}
        </span>
      </span>

      <span className="order-summary-total">
        {money(total)}
      </span>

      <ChevronRight size={21} />
    </button>
  )}


        {/* ====================================
            CART DRAWER
            HIDDEN BY DEFAULT
        ==================================== */}

        {screen === "menu" &&
          cartOpen && (
            <div className="no-print">

              {/* BACKDROP */}

              <button
                type="button"
                className="cart-backdrop"
                aria-label="Close cart"
                onClick={() =>
                  setCartOpen(false)
                }
              />

              {/* CART CONTENT */}

              <aside
                id="ob-cart-drawer"
                className="cart-drawer"
                role="dialog"
                aria-modal="true"
                aria-label="Your Cart"
              >

                {/* CART HEADER */}

                <div className="cart-drawer-head">

                  <h2>
                    <ShoppingCart
                      size={21}
                      style={{
                        verticalAlign:
                          "middle",
                      }}
                    />{" "}
                    Your Cart ({count})
                  </h2>

                  <button
                    className="btn secondary"
                    type="button"
                    aria-label="Close cart"
                    onClick={() =>
                      setCartOpen(false)
                    }
                  >
                    <X size={19} />
                  </button>

                </div>

                {/* CART ITEMS */}

                <div className="cart-drawer-body">

                  {!cart.length && (
                    <p className="muted">
                      Your cart is empty.
                      Add food from the menu.
                    </p>
                  )}

                  {cart.map((item) => (
                    <div
                      className="cart-line"
                      key={item.menuItemId}
                    >

                      <div className="cart-line-title">
                        {item.name}
                      </div>

                      <div className="cart-line-controls">

                        <div className="qty">

                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() =>
                              changeQuantity(
                                {
                                  _id:
                                    item.menuItemId,
                                },
                                -1
                              )
                            }
                          >
                            <Minus size={16} />
                          </button>

                          <strong>
                            {item.quantity}
                          </strong>

                          <button
                            type="button"
                            disabled={
                              item.quantity >= 50
                            }
                            aria-label={`Add one ${item.name}`}
                            onClick={() =>
                              changeQuantity(
                                {
                                  _id:
                                    item.menuItemId,
                                },
                                1
                              )
                            }
                          >
                            <Plus size={16} />
                          </button>

                        </div>

                        <strong>
                          {money(
                            item.quantity *
                              item.price
                          )}
                        </strong>

                      </div>

                    </div>
                  ))}

                </div>

                {/* CART TOTAL & CHECKOUT */}

                <div className="cart-drawer-footer">

                  <div className="row">
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {money(total)}
                    </strong>
                  </div>

                  <div className="row">
                    <span>
                      Tax
                    </span>

                    <strong>
                      ₹0.00
                    </strong>
                  </div>

                  <div className="row">
                    <strong>
                      Total
                    </strong>

                    <strong>
                      {money(total)}
                    </strong>
                  </div>

                  <button
                    className="btn"
                    type="button"
                    style={{
                      width: "100%",
                    }}
                    disabled={
                      !cart.length ||
                      !franchiseId
                    }
                    onClick={() => {
                      setCartOpen(false);

                      setScreen(
                        "checkout"
                      );
                    }}
                  >
                    Continue to Payment
                  </button>

                </div>

              </aside>

            </div>
          )}

        {/* ====================================
            CHECKOUT SCREEN
        ==================================== */}

        {screen === "checkout" && (
          <section className="panel card-center no-print">

            <h2>
              Complete Your Order
            </h2>

            <p className="muted">
              No signup, no login and no additional tax.
            </p>

            {/* ORDER ITEMS */}

            {cart.map((item) => (
              <div
                className="row"
                key={item.menuItemId}
              >
                <span>
                  {item.quantity}
                  {" × "}
                  {item.name}
                </span>

                <strong>
                  {money(
                    item.quantity *
                      item.price
                  )}
                </strong>
              </div>
            ))}

            <hr className="divider" />

            <div className="row">
              <strong>
                Final Total
              </strong>

              <strong>
                {money(total)}
              </strong>
            </div>

            <h3
              style={{
                textAlign: "left",
              }}
            >
              Payment Method
            </h3>

            {/* ONLINE RAZORPAY */}

            {onlineEnabled && (
              <label className="method">

                <input
                  type="radio"
                  name="payment"
                  checked={
                    paymentMethod ===
                    "Online (Razorpay)"
                  }
                  onChange={() =>
                    setPaymentMethod(
                      "Online (Razorpay)"
                    )
                  }
                />

                <CreditCard size={20} />

                UPI / Cards / Net Banking (Razorpay)

              </label>
            )}

            {/* CASH AT COUNTER */}

            <label className="method">

              <input
                type="radio"
                name="payment"
                checked={
                  paymentMethod ===
                  "Counter Cash"
                }
                onChange={() =>
                  setPaymentMethod(
                    "Counter Cash"
                  )
                }
              />

              <Wallet size={20} />

              Cash at Counter

            </label>

            {/* UPI AT COUNTER */}

            <label className="method">

              <input
                type="radio"
                name="payment"
                checked={
                  paymentMethod ===
                  "Counter UPI"
                }
                onChange={() =>
                  setPaymentMethod(
                    "Counter UPI"
                  )
                }
              />

              <CreditCard size={20} />

              UPI at Counter

            </label>

            {/* CHECKOUT ACTIONS */}

            <div className="actions">

              <button
                className="btn secondary"
                type="button"
                disabled={busy}
                onClick={() =>
                  setScreen("menu")
                }
              >
                <ArrowLeft size={17} />
                Back
              </button>

              <button
                className="btn"
                type="button"
                disabled={
                  busy ||
                  !cart.length
                }
                onClick={placeOrder}
              >
                {busy
                  ? "Processing..."
                  : `Place Order · ${money(
                      total
                    )}`}
              </button>

            </div>

          </section>
        )}

        {/* ====================================
            RECEIPT SCREEN
        ==================================== */}

        {screen === "receipt" &&
          receipt && (
            <section className="panel card-center">

              <CheckCircle2
                size={50}
                color={
                  receiptPaid
                    ? "#16a34a"
                    : "#f97316"
                }
              />

              <h2>
                {receiptSeatAssigned
                  ? "Seat Assigned by Admin!"
                  : receiptPaid
                  ? "Payment Successful — Waiting for Admin Seat"
                  : "Order Received — Payment Pending"}
              </h2>

              {/* ORDER NUMBER */}

              <p>
                Order{" "}
                <strong>
                  {receipt.order.orderNumber}
                </strong>
              </p>

              <p className="muted">
                Payment:{" "}
                <strong>
                  {receipt.status
                    ?.paymentStatus ||
                    "Pending"}
                </strong>

                {" · "}

                Order:{" "}
                <strong>
                  {receipt.status
                    ?.status ||
                    "Pending"}
                </strong>
              </p>

              {/* TRACKING CODE */}

              <div className="muted">
                Your 16-character Tracking Code
              </div>

              <p className="code">
                {receipt.order.trackingCode}
              </p>

              {/* ADMIN SEAT ASSIGNMENT */}

              <div className="seat-card">

                <Armchair
                  size={36}
                  color="#f97316"
                />

                <h3>
                  Your Seat Number
                </h3>

                {receiptSeatAssigned ? (
                  <>

                    <div className="seat">
                      {receipt.status.seatNumber}
                    </div>

                    <p className="success">
                      <CheckCircle2
                        size={18}
                        style={{
                          verticalAlign:
                            "middle",
                        }}
                      />{" "}
                      Seat confirmed by Admin
                    </p>

                  </>
                ) : (
                  <p className="muted">
                    {seatMessage(
                      receipt.status
                    )}
                  </p>
                )}

              </div>

              {/* COUNTER PAYMENT INFO */}

              {receiptMethod !==
                "Online (Razorpay)" &&
                !receiptPaid && (
                  <p className="note">
                    Pay at the counter first.
                    Admin will verify your
                    Cash/UPI payment and
                    manually assign your seat.
                  </p>
                )}

              <p className="muted">
                {receiptSeatAssigned
                  ? "Note your seat number and tracking code. You can now start the next customer order."
                  : "Save or print your tracking code. You can check your seat later using Check Order."}
              </p>

              {/* RECEIPT ACTIONS */}

              <div className="actions no-print">

                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    window.print()
                  }
                >
                  <Printer size={17} />
                  Print Receipt
                </button>

                {/* RETRY ONLINE PAYMENT */}

                {!receiptPaid &&
                  receiptMethod ===
                    "Online (Razorpay)" && (
                    <button
                      className="btn secondary"
                      type="button"
                      disabled={busy}
                      onClick={retryPayment}
                    >
                      <CreditCard size={17} />
                      Retry Payment
                    </button>
                  )}

                {/* NEXT CUSTOMER */}

                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={nextCustomer}
                >
                  <RefreshCw size={17} />
                  Next Customer
                </button>

              </div>

            </section>
          )}

        {/* ====================================
            TRACK ORDER INPUT
        ==================================== */}

        {screen === "lookup" && (
          <section className="panel card-center no-print">

            <h2>
              Track Your Order
            </h2>

            <p className="muted tracking-description">
              Enter the 16-character tracking code
              from your receipt.
            </p>

            <form onSubmit={checkTracking}>

              <input
                aria-label="Tracking code"
                maxLength={16}
                placeholder="Tracking Code"
                autoComplete="off"
                value={trackingInput}
                onChange={(event) =>
                  setTrackingInput(
                    event.target.value
                      .toUpperCase()
                      .replace(
                        /[^A-F0-9]/g,
                        ""
                      )
                  )
                }
              />

              <div className="actions">

                <button
                  className="btn"
                  type="submit"
                  disabled={
                    busy ||
                    !/^[A-F0-9]{16}$/.test(
                      trackingInput
                    )
                  }
                >
                  {busy
                    ? "Checking..."
                    : "Check Status"}
                </button>

                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy}
                  onClick={nextCustomer}
                >
                  Back to Menu
                </button>

              </div>

            </form>

          </section>
        )}

        {/* ====================================
            ORDER TRACKING RESULT
        ==================================== */}

        {screen === "tracking" &&
          trackedOrder && (
            <section className="panel card-center">

              <h2>
                Order Status
              </h2>

              <h3>
                {trackedOrder.orderNumber}
              </h3>

              <p>
                Payment:{" "}
                <strong>
                  {trackedOrder.paymentStatus}
                </strong>

                {" · "}

                Status:{" "}
                <strong>
                  {trackedOrder.status}
                </strong>
              </p>

              {/* ADMIN ASSIGNED SEAT */}

              <div className="seat-card">

                <Armchair
                  size={34}
                  color="#f97316"
                />

                <h3>
                  Seat Number
                </h3>

                {isAssigned(
                  trackedOrder
                ) ? (
                  <>

                    <div className="seat">
                      {trackedOrder.seatNumber}
                    </div>

                    <p className="success">
                      Seat assigned by Admin
                    </p>

                  </>
                ) : (
                  <p className="muted">
                    {seatMessage(
                      trackedOrder
                    )}
                  </p>
                )}

              </div>

              <p className="muted">
                {trackedOrder.pickupTime ||
                  "Updates will appear here automatically."}
              </p>

              <div className="actions no-print">

                {/* MANUAL REFRESH */}

                <button
                  className="btn secondary"
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    refreshStatus(
                      trackedOrder.trackingCode
                    ).catch((err) =>
                      setError(err.message)
                    )
                  }
                >
                  <RefreshCw size={17} />
                  Refresh
                </button>

                {/* NEXT CUSTOMER */}

                <button
                  className="btn"
                  type="button"
                  disabled={busy}
                  onClick={nextCustomer}
                >
                  Next Customer
                </button>

              </div>

            </section>
          )}

      </div>
    </div>
  );
};

export default KioskPage;
