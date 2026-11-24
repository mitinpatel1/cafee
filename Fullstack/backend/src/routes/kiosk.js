
"use strict";

const express = require("express");
const crypto = require("crypto");

const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Franchise = require("../models/Franchise");
const MenuItem = require("../models/MenuItem");

const {
  listSeats,
  assignSeatByCustomer,
} = require("../services/seatService");

const router = express.Router();

const QR_PAYMENT_TIMEOUT_MS = 2 * 60 * 1000;

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ============================================
// CASHFREE CONFIGURATION
// ============================================

const cashfreeConfigured = () =>
  Boolean(
    process.env.CASHFREE_APP_ID &&
    process.env.CASHFREE_SECRET_KEY
  );

const cashfreeEnvironment = () =>
  String(process.env.CASHFREE_ENV || "SANDBOX").toUpperCase();

const cashfreeBaseUrl = () =>
  cashfreeEnvironment() === "PRODUCTION"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";

const cashfreeApiVersion =
  process.env.CASHFREE_API_VERSION || "2025-01-01";

const hash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const money = (value) =>
  Math.round(Number(value) * 100) / 100;

const paise = (value) =>
  Math.round(Number(value) * 100);

function fail(res, code, message) {
  return res.status(code).json({
    success: false,
    message,
  });
}

function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") {
    return false;
  }

  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
}

function publicOrder(order) {
  return {
    _id: order._id,
    orderNumber: order.orderNumber,
    trackingCode: order.trackingCode,
    paymentMethod: order.paymentMethod,
    status: order.status,
    paymentStatus: order.paymentStatus,
    seatNumber: order.seatNumber || null,

    upiReferenceSubmitted: Boolean(
      order.counterPaymentReference
    ),

    seatPending:
      order.paymentStatus === "Paid" &&
      !order.seatNumber &&
      !["Cancelled", "Picked Up"].includes(order.status),

    pickupTime: order.pickupTime,
    estimatedReadyTime: order.estimatedReadyTime,
  };
}

function getCustomerPhone(req, order) {
  const candidates = [
    req.body?.customerPhone,
    req.body?.phone,
    order?.guestPhone,
    order?.customerPhone,
    order?.phone,
    process.env.CASHFREE_DEFAULT_CUSTOMER_PHONE,
  ];

  for (const candidate of candidates) {
    const phone = String(candidate || "").replace(/\D/g, "");

    if (/^[0-9]{10,15}$/.test(phone)) {
      return phone;
    }
  }

  return null;
}

function cashfreeHeaders(idempotencyKey) {
  const headers = {
    "Content-Type": "application/json",
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
    "x-api-version": cashfreeApiVersion,
  };

  if (idempotencyKey) {
    headers["x-idempotency-key"] = idempotencyKey;
  }

  return headers;
}

async function cashfreeRequest(
  path,
  method = "GET",
  body,
  idempotencyKey
) {
  if (!cashfreeConfigured()) {
    throw new Error("Cashfree is not configured.");
  }

  const response = await fetch(
    `${cashfreeBaseUrl()}${path}`,
    {
      method,
      headers: cashfreeHeaders(idempotencyKey),
      ...(body ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    }
  );

  const raw = await response.text();

  let data = {};

  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error("Invalid response received from Cashfree.");
  }

  if (!response.ok) {
    console.error("Cashfree API error:", response.status, data);

    throw new Error(
      data.message ||
      data.error_description ||
      data.type ||
      "Cashfree payment request failed."
    );
  }

  return data;
}

function createCashfreeOrderId(order) {
  // Cashfree order_id should be unique and contain safe characters.
  return `OB_${String(order._id)}_${crypto.randomBytes(5).toString("hex")}`;
}

function cashfreeReturnUrl() {
  return process.env.CASHFREE_RETURN_URL || undefined;
}

function cashfreeNotifyUrl() {
  return process.env.CASHFREE_NOTIFY_URL || undefined;
}

function cashfreeWebhookSignature(rawBody, timestamp, received) {
  if (
    !Buffer.isBuffer(rawBody) ||
    !timestamp ||
    !received ||
    !process.env.CASHFREE_SECRET_KEY
  ) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
    .update(String(timestamp) + rawBody.toString("utf8"))
    .digest("base64");

  return safeEqual(expected, received);
}

// ============================================
// CASHFREE ORDER CREATION
// ============================================

async function createCashfreePayment(req, order, paymentMethod) {
  if (!cashfreeConfigured()) {
    throw new Error("Cashfree is not configured.");
  }

  const customerPhone = getCustomerPhone(req, order);

  if (!customerPhone) {
    throw new Error(
      "Customer phone number is required for Cashfree. Add a phone number or configure CASHFREE_DEFAULT_CUSTOMER_PHONE."
    );
  }

  let payment = await Payment.findOne({
    orderId: order._id,
    paymentMethod,
    status: { $in: ["Initiated", "Processing"] },
    paymentSessionId: { $exists: true, $nin: [null, ""] },
  }).sort({ createdAt: -1 });

  if (payment) {
    return payment;
  }

  const gatewayOrderId = createCashfreeOrderId(order);

  payment = await Payment.create({
    orderId: order._id,
    userId: null,
    amount: order.total,
    paymentMethod,
    status: "Initiated",
    gatewayName: "Cashfree",
    gatewayOrderId,
    paymentId: `KIOSK-${crypto.randomBytes(12).toString("hex")}`,
  });

  const orderMeta = {};

  const returnUrl = cashfreeReturnUrl();
  const notifyUrl = cashfreeNotifyUrl();

  if (returnUrl) orderMeta.return_url = returnUrl;
  if (notifyUrl) orderMeta.notify_url = notifyUrl;

  try {
    const payload = {
      order_id: gatewayOrderId,
      order_amount: money(order.total),
      order_currency: "INR",

      customer_details: {
        customer_id: `OB_${String(order._id).slice(-20)}`,
        customer_phone: customerPhone,
      },

      order_note: `OfficeBite order ${order.orderNumber}`.slice(0, 250),

      order_tags: {
        officebite_order_id: String(order._id),
        order_number: String(order.orderNumber || ""),
      },

      ...(Object.keys(orderMeta).length
        ? { order_meta: orderMeta }
        : {}),
    };

    const result = await cashfreeRequest(
      "/orders",
      "POST",
      payload,
      crypto
        .createHash("sha256")
        .update(gatewayOrderId)
        .digest("hex")
    );

    if (!result.payment_session_id) {
      throw new Error("Cashfree did not return a payment session.");
    }

    payment.paymentSessionId = result.payment_session_id;
    payment.gatewayResponse = result;
    payment.gatewayName = "Cashfree";
    payment.status = "Initiated";

    await payment.save();

    return payment;
  } catch (error) {
    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          status: "Failed",
          gatewayName: "Cashfree",
        },
      }
    );

    throw error;
  }
}

// ============================================
// CASHFREE PAYMENT VERIFICATION
// ============================================

async function getCashfreePayments(gatewayOrderId) {
  return cashfreeRequest(
    `/orders/${encodeURIComponent(gatewayOrderId)}/payments`,
    "GET"
  );
}

function findSuccessfulPayment(payments, expectedAmount) {
  const list = Array.isArray(payments) ? payments : [];

  return list.find((item) =>
    item &&
    item.payment_status === "SUCCESS" &&
    item.payment_amount !== undefined &&
    Math.round(Number(item.payment_amount) * 100) ===
      Math.round(Number(expectedAmount) * 100) &&
    item.cf_payment_id
  );
}

async function markCashfreeOrderPaid(req, payment, captured) {
  if (!payment || !captured) return null;

  const order = await Order.findById(payment.orderId);
  if (!order) return null;

  if (
    payment.gatewayName !== "Cashfree" ||
    !payment.gatewayOrderId ||
    !captured.cf_payment_id ||
    captured.payment_status !== "SUCCESS" ||
    Math.round(Number(captured.payment_amount) * 100) !==
      paise(order.total) ||
    paise(payment.amount) !== paise(order.total) ||
    captured.payment_currency &&
      captured.payment_currency !== "INR"
  ) {
    return order;
  }

  const transactionId = String(captured.cf_payment_id);

  if (
    payment.transactionId &&
    String(payment.transactionId) !== transactionId
  ) {
    throw new Error("Conflicting Cashfree payment transaction.");
  }

  const duplicate = await Payment.findOne({
    transactionId,
    _id: { $ne: payment._id },
  });

  if (duplicate) {
    throw new Error(
      "Cashfree transaction is already linked to another payment."
    );
  }

  await Payment.updateOne(
    {
      _id: payment._id,
      status: { $ne: "Refunded" },
      $or: [
        { transactionId },
        { transactionId: "" },
        { transactionId: null },
        { transactionId: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "Completed",
        transactionId,
        gatewayPaymentId: transactionId,
        gatewayPaymentStatus: "SUCCESS",
        gatewayName: "Cashfree",
        paidAt: new Date(),
      },
    }
  );

  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: "Pending",
      paymentStatus: "Pending",
    },
    {
      $set: {
        paymentStatus: "Paid",
        counterPaymentReference: transactionId,
        pickupTime: "Choose your seat",
      },
    },
    { new: true }
  );

  if (updated) {
    notify(req, updated);
    return updated;
  }

  const latest = await Order.findById(order._id);

  if (latest?.status === "Cancelled") {
    console.error(
      "LATE CASHFREE PAYMENT: cancelled order requires refund review:",
      latest.orderNumber,
      transactionId
    );
  }

  return latest;
}

async function syncCashfreePayment(req, payment) {
  if (
    !payment?.gatewayOrderId ||
    payment.status === "Failed" ||
    !payment.paymentSessionId
  ) {
    return payment
      ? Order.findById(payment.orderId)
      : null;
  }

  try {
    const response = await getCashfreePayments(
      payment.gatewayOrderId
    );

    const captured = findSuccessfulPayment(
      response,
      payment.amount
    );

    if (!captured) {
      return Order.findById(payment.orderId);
    }

    return markCashfreeOrderPaid(req, payment, captured);
  } catch (error) {
    console.warn("Cashfree sync check warning:", error.message);
    return Order.findById(payment.orderId);
  }
}

// ============================================
// REQUEST LIMITING
// ============================================

const requestWindows = new Map();

function throttle(limit, periodMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${
      req.path.startsWith("/orders")
        ? "order"
        : "tracking"
    }`;

    const now = Date.now();
    const previous = requestWindows.get(key);

    const current =
      !previous || now - previous.start > periodMs
        ? { start: now, count: 0 }
        : previous;

    current.count += 1;
    requestWindows.set(key, current);

    if (current.count > limit) {
      return fail(
        res,
        429,
        "Too many requests. Please try shortly."
      );
    }

    next();
  };
}

// ============================================
// SOCKET NOTIFICATIONS
// ============================================

function notify(req, order) {
  const io = req.app.get("io");

  if (!io || !order) return;

  const payload = {
    orderId: order._id,
    status: order.status,
    paymentStatus: order.paymentStatus,
    seatNumber: order.seatNumber,
    order,
  };

  io.to("kitchen").emit("order_status_updated", payload);

  io.to(`order_${order._id}`).emit(
    "order_tracking_update",
    payload
  );

  io.to(`franchise_${order.franchiseId}`).emit(
    "franchise_order_updated",
    order
  );
}

// ============================================
// GUEST ORDER AUTHORIZATION
// ============================================

async function ownedGuestOrder(req, res, next) {
  try {
    const token = req.get("x-kiosk-order-key") || "";

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return fail(res, 403, "Invalid order key.");
    }

    const order = await Order.findById(req.params.id)
      .select("+guestTokenHash")
      .catch(() => null);

    if (
      !order ||
      !order.isGuestOrder ||
      !order.guestTokenHash ||
      !safeEqual(order.guestTokenHash, hash(token))
    ) {
      return fail(res, 404, "Order not found.");
    }

    req.guestOrder = order;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================
// CREATE GUEST ORDER
// ============================================

router.post(
  "/orders",
  throttle(120, 5 * 60 * 1000),
  async (req, res) => {
    try {
      const {
        franchiseId,
        items,
        paymentMethod,
        notes,
      } = req.body || {};

      const methods = [
        "Online (Cashfree)",
        "Counter Cash",
        "Counter UPI",
      ];

      if (!methods.includes(paymentMethod)) {
        return fail(res, 400, "Choose a valid payment method.");
      }

      if (
        ["Online (Cashfree)", "Counter UPI"].includes(paymentMethod) &&
        !cashfreeConfigured()
      ) {
        return fail(
          res,
          503,
          "Cashfree online payment is not configured."
        );
      }

      const franchise = await Franchise.findOne({
        _id: franchiseId,
        status: "Active",
      }).catch(() => null);

      if (!franchise) {
        return fail(res, 400, "Select an active franchise.");
      }

      if (
        !Array.isArray(items) ||
        items.length < 1 ||
        items.length > 30
      ) {
        return fail(res, 400, "Cart must contain 1–30 items.");
      }

      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        if (
          !item ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > 50
        ) {
          return fail(res, 400, "Invalid item quantity.");
        }

        const menuItem = await MenuItem.findById(
          item.menuItemId
        ).catch(() => null);

        if (
          !menuItem ||
          !menuItem.isAvailable ||
          String(menuItem.franchiseId) !== String(franchise._id)
        ) {
          return fail(
            res,
            400,
            "One or more menu items are unavailable."
          );
        }

        subtotal += menuItem.price * item.quantity;

        orderItems.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: item.quantity,
          instructions: String(
            item.instructions || ""
          ).slice(0, 200),
        });
      }

      subtotal = money(subtotal);

      if (!Number.isSafeInteger(paise(subtotal)) || subtotal <= 0) {
        return fail(res, 400, "Invalid order total.");
      }

      const orderKey = crypto.randomBytes(32).toString("hex");

      const order = await Order.create({
        userId: null,

        isGuestOrder: true,
        guestTokenHash: hash(orderKey),

        trackingCode: crypto
          .randomBytes(8)
          .toString("hex")
          .toUpperCase(),

        franchiseId: franchise._id,
        items: orderItems,

        subtotal,
        tax: 0,
        total: subtotal,

        paymentMethod,
        paymentStatus: "Pending",
        status: "Pending",

        notes: String(notes || "").slice(0, 500),

        pickupCounter: "Main counter",
        pickupTime: "Awaiting payment",

        seatNumber: null,
      });

      const io = req.app.get("io");

      if (io) {
        io.to("kitchen").emit("new_order", order);

        io.to(`franchise_${order.franchiseId}`).emit(
          "franchise_order_updated",
          order
        );
      }

      return res.status(201).json({
        success: true,
        order: {
          _id: order._id,
          ...publicOrder(order),
          total: order.total,
        },
        orderKey,
      });
    } catch (error) {
      console.error("Kiosk order creation:", error);

      return fail(res, 500, "Unable to place order.");
    }
  }
);

// ============================================
// KIOSK CONFIGURATION
// ============================================

router.get("/config", (_req, res) => {
  res.json({
    success: true,
    onlineEnabled: cashfreeConfigured(),
    upiEnabled: cashfreeConfigured(),
    qrEnabled: cashfreeConfigured(),
    paymentTimeoutSeconds: QR_PAYMENT_TIMEOUT_MS / 1000,
    gateway: "Cashfree",
    cashfreeMode:
      cashfreeEnvironment() === "PRODUCTION"
        ? "production"
        : "sandbox",
  });
});

// ============================================
// ORDER TRACKING
// ============================================

router.get(
  "/track/:code",
  throttle(90, 5 * 60 * 1000),
  async (req, res) => {
    try {
      const code = String(req.params.code || "")
        .trim()
        .toUpperCase();

      if (!/^[0-9A-F]{16}$/.test(code)) {
        return fail(res, 400, "Invalid tracking code.");
      }

      const order = await Order.findOne({
        trackingCode: code,
        isGuestOrder: true,
      });

      if (!order) {
        return fail(res, 404, "Tracking code not found.");
      }

      return res.json({
        success: true,
        order: publicOrder(order),
      });
    } catch (error) {
      console.error("Track kiosk order:", error);

      return fail(res, 500, "Could not track order.");
    }
  }
);

// ============================================
// RECOVER PAYMENT STATUS
// ============================================

async function recoverPayment(req, order) {
  if (
    !order ||
    order.paymentStatus !== "Pending" ||
    order.status !== "Pending"
  ) {
    return order;
  }

  if (
    !["Online (Cashfree)", "Counter UPI"].includes(
      order.paymentMethod
    )
  ) {
    return order;
  }

  const payment = await Payment.findOne({
    orderId: order._id,
    gatewayName: "Cashfree",
    gatewayOrderId: { $exists: true, $nin: [null, ""] },
  }).sort({ createdAt: -1 });

  if (!payment) return order;

  return syncCashfreePayment(req, payment);
}

router.get(
  "/orders/:id/recover",
  throttle(180, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      let order = await Order.findById(req.guestOrder._id);

      if (!order) {
        return fail(res, 404, "Order not found.");
      }

      order = (await recoverPayment(req, order)) || order;

      return res.json({
        success: true,
        paid: order.paymentStatus === "Paid",
        order: publicOrder(order),
      });
    } catch (error) {
      console.error("Kiosk payment recovery:", error);

      try {
        const fallbackOrder = await Order.findById(req.guestOrder._id);
        if (fallbackOrder) {
          return res.json({
            success: true,
            paid: fallbackOrder.paymentStatus === "Paid",
            order: publicOrder(fallbackOrder),
          });
        }
      } catch {
        // Continue to fail response
      }

      return fail(
        res,
        502,
        "Payment status could not be verified. Keep this order open and retry."
      );
    }
  }
);

// ============================================
// AVAILABLE SEATS
// ============================================

router.get(
  "/orders/:id/seats",
  ownedGuestOrder,
  async (req, res) => {
    try {
      const order = await Order.findById(req.guestOrder._id);

      if (!order) {
        return fail(res, 404, "Order not found.");
      }

      if (order.paymentStatus !== "Paid") {
        return fail(
          res,
          403,
          "Complete payment before choosing a seat."
        );
      }

      if (["Cancelled", "Picked Up"].includes(order.status)) {
        return fail(res, 409, "This order is already closed.");
      }

      const seats = await listSeats(order.franchiseId);

      return res.json({
        success: true,
        ...seats,
        selectedSeat: order.seatNumber || null,
      });
    } catch (error) {
      console.error("Kiosk available seats:", error);

      return fail(
        res,
        error.status || 500,
        error.status
          ? error.message
          : "Could not load available seats."
      );
    }
  }
);

// ============================================
// CUSTOMER SEAT CONFIRMATION
// ============================================

router.post(
  "/orders/:id/seat",
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      let order = await assignSeatByCustomer(
        req.guestOrder._id,
        req.body?.seatNumber
      );

      // Paid Counter UPI orders are automatically accepted
      // after the customer chooses a seat.
      // Cash orders continue through admin confirmation.
      if (
        order.paymentMethod === "Counter UPI" &&
        order.paymentStatus === "Paid" &&
        order.status === "Pending" &&
        order.seatNumber
      ) {
        order =
          (await Order.findOneAndUpdate(
            {
              _id: order._id,
              paymentMethod: "Counter UPI",
              paymentStatus: "Paid",
              status: "Pending",
              seatNumber: order.seatNumber,
            },
            {
              $set: {
                status: "Confirmed",
                readyInMinutes: 15,
                estimatedReadyTime: new Date(
                  Date.now() + 15 * 60 * 1000
                ),
                pickupTime: "Ready in about 15 minutes",
              },
            },
            { new: true }
          )) || (await Order.findById(order._id));
      }

      notify(req, order);

      return res.json({
        success: true,
        order: publicOrder(order),
        message: `Seat ${order.seatNumber} confirmed.`,
      });
    } catch (error) {
      console.error("Customer seat selection:", error);

      return fail(
        res,
        error.status || 500,
        error.status
          ? error.message
          : "Could not confirm your seat."
      );
    }
  }
);

// ============================================
// CASHFREE CHECKOUT SESSION
// ONLINE PAYMENT + COUNTER UPI
// ============================================

async function createCheckoutSession(req, res, expectedMethod) {
  try {
    const order = await Order.findById(req.guestOrder._id);

    if (
      !order ||
      order.paymentMethod !== expectedMethod ||
      order.status !== "Pending" ||
      order.paymentStatus !== "Pending"
    ) {
      return fail(
        res,
        409,
        "This order is not eligible for payment."
      );
    }

    if (!cashfreeConfigured()) {
      return fail(res, 503, "Cashfree is not configured.");
    }

    const deadline =
      new Date(order.createdAt).getTime() +
      QR_PAYMENT_TIMEOUT_MS;

    if (Date.now() >= deadline) {
      return fail(
        res,
        409,
        "The two-minute payment window has expired."
      );
    }

    const payment = await createCashfreePayment(
      req,
      order,
      expectedMethod
    );

    const latest = await Order.findById(order._id);

    if (
      !latest ||
      latest.status !== "Pending" ||
      latest.paymentStatus !== "Pending" ||
      Date.now() >= deadline
    ) {
      return fail(res, 409, "Order expired or was cancelled.");
    }

    return res.json({
      success: true,

      gateway: "Cashfree",
      environment:
        cashfreeEnvironment() === "PRODUCTION"
          ? "production"
          : "sandbox",

      orderId: payment.gatewayOrderId,
      gatewayOrderId: payment.gatewayOrderId,

      paymentSessionId: payment.paymentSessionId,
      payment_session_id: payment.paymentSessionId,

      amount: paise(order.total),
      orderAmount: order.total,
      currency: "INR",

      orderNumber: order.orderNumber,
      paymentDeadlineAt: new Date(deadline).toISOString(),

      checkoutMode:
        expectedMethod === "Counter UPI"
          ? "UPI"
          : "ALL",

      verification: "Automatic Cashfree server-side verification",
    });
  } catch (error) {
    console.error("Cashfree checkout session:", error);

    return fail(
      res,
      502,
      error.message || "Unable to create Cashfree checkout."
    );
  }
}

// Existing kiosk frontend route names are preserved.
// The response now contains paymentSessionId instead of a Razorpay QR image.

router.get(
  "/orders/:id/upi-qr",
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  (req, res) =>
    createCheckoutSession(req, res, "Counter UPI")
);

router.post(
  "/orders/:id/upi-qr",
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  (req, res) =>
    createCheckoutSession(req, res, "Counter UPI")
);

// ============================================
// COUNTER UPI PAYMENT STATUS
// ============================================

router.get(
  "/orders/:id/upi-status",
  throttle(180, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      let order = await Order.findById(req.guestOrder._id);

      if (!order || order.paymentMethod !== "Counter UPI") {
        return fail(res, 404, "UPI order not found.");
      }

      if (
        order.paymentStatus !== "Paid" &&
        order.status !== "Cancelled"
      ) {
        order = (await recoverPayment(req, order)) || order;
      }

      return res.json({
        success: true,
        paid: order.paymentStatus === "Paid",
        order: publicOrder(order),
      });
    } catch (error) {
      console.error("Cashfree UPI status check:", error);

      try {
        const fallbackOrder = await Order.findById(req.guestOrder._id);
        if (fallbackOrder) {
          return res.json({
            success: true,
            paid: fallbackOrder.paymentStatus === "Paid",
            order: publicOrder(fallbackOrder),
          });
        }
      } catch {
        // Continue to fail response
      }

      return fail(
        res,
        502,
        "Unable to verify payment right now."
      );
    }
  }
);

// Manual UTR submission is disabled.
// Payment must be confirmed by Cashfree.

router.post(
  "/orders/:id/upi-reference",
  ownedGuestOrder,
  (_req, res) =>
    fail(
      res,
      410,
      "Manual UPI reference entry is disabled. Payment is verified automatically by Cashfree."
    )
);

// ============================================
// CANCEL OR TIME OUT UNPAID ORDER
// ============================================

router.post(
  ["/orders/:id/cancel", "/orders/:id/cancel-payment"],
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      let order = await Order.findById(req.guestOrder._id);

      if (!order) {
        return fail(res, 404, "Order not found.");
      }

      if (order.status === "Cancelled") {
        return res.json({
          success: true,
          cancelled: true,
          order: publicOrder(order),
        });
      }

      if (
        order.paymentStatus !== "Pending" ||
        order.status !== "Pending"
      ) {
        return fail(
          res,
          409,
          "Order already paid or being prepared. Recheck status."
        );
      }

      if (
        ["Online (Cashfree)", "Counter UPI"].includes(
          order.paymentMethod
        )
      ) {
        const payment = await Payment.findOne({
          orderId: order._id,
          gatewayName: "Cashfree",
          gatewayOrderId: { $exists: true, $nin: [null, ""] },
        }).sort({ createdAt: -1 });

        if (payment) {
          order = await syncCashfreePayment(req, payment);

          if (order?.paymentStatus === "Paid") {
            return fail(
              res,
              409,
              "Payment received. Please continue with seat selection."
            );
          }
        }
      }

      const cancelled = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: "Pending",
          paymentStatus: "Pending",
        },
        {
          $set: {
            status: "Cancelled",
            cancelReason: String(
              req.body?.reason || "Cancelled by customer"
            ).slice(0, 200),
            pickupTime: "Cancelled",
          },
        },
        { new: true }
      );

      if (!cancelled) {
        return fail(
          res,
          409,
          "Order status changed. Check payment before retrying."
        );
      }

      notify(req, cancelled);

      return res.json({
        success: true,
        cancelled: true,
        order: publicOrder(cancelled),
      });
    } catch (error) {
      console.error("Cancel kiosk payment:", error);

      return fail(
        res,
        502,
        "Cancellation could not be verified. Keep the order open and retry."
      );
    }
  }
);

// ============================================
// ONLINE CASHFREE PAYMENT INITIATION
// ============================================

router.post(
  "/orders/:id/pay",
  ownedGuestOrder,
  async (req, res) => {
    try {
      const order = await Order.findById(req.guestOrder._id);

      if (!order) {
        return fail(res, 404, "Order not found.");
      }

      if (!cashfreeConfigured()) {
        return fail(res, 503, "Cashfree is not configured.");
      }

      if (
        order.paymentMethod !== "Online (Cashfree)" ||
        order.status !== "Pending" ||
        order.paymentStatus !== "Pending" ||
        Date.now() >=
          new Date(order.createdAt).getTime() +
            QR_PAYMENT_TIMEOUT_MS
      ) {
        return fail(
          res,
          409,
          "Order is not eligible for online payment."
        );
      }

      const payment = await createCashfreePayment(
        req,
        order,
        "Online (Cashfree)"
      );

      return res.json({
        success: true,
        gateway: "Cashfree",

        environment:
          cashfreeEnvironment() === "PRODUCTION"
            ? "production"
            : "sandbox",

        gatewayOrderId: payment.gatewayOrderId,
        orderId: payment.gatewayOrderId,

        paymentSessionId: payment.paymentSessionId,
        payment_session_id: payment.paymentSessionId,

        amount: paise(order.total),
        orderAmount: order.total,
        currency: "INR",

        orderNumber: order.orderNumber,
      });
    } catch (error) {
      console.error("Kiosk Cashfree payment initiate:", error);

      return fail(
        res,
        502,
        error.message || "Could not initiate Cashfree payment."
      );
    }
  }
);

// ============================================
// CASHFREE PAYMENT VERIFICATION
// ============================================

router.post(
  "/orders/:id/verify",
  ownedGuestOrder,
  async (req, res) => {
    try {
      const gatewayOrderId =
        req.body?.order_id ||
        req.body?.orderId ||
        req.body?.cf_order_id ||
        req.body?.gatewayOrderId;

      if (
        typeof gatewayOrderId !== "string" ||
        !gatewayOrderId.trim()
      ) {
        return fail(res, 400, "Missing Cashfree order ID.");
      }

      const order = await Order.findById(req.guestOrder._id);

      if (!order) {
        return fail(res, 404, "Order not found.");
      }

      if (
        !["Online (Cashfree)", "Counter UPI"].includes(
          order.paymentMethod
        )
      ) {
        return fail(res, 403, "Payment method mismatch.");
      }

      const payment = await Payment.findOne({
        orderId: order._id,
        gatewayOrderId,
        gatewayName: "Cashfree",
      });

      if (!payment) {
        return fail(res, 403, "Payment mismatch.");
      }

      const response = await getCashfreePayments(
        payment.gatewayOrderId
      );

      const captured = findSuccessfulPayment(
        response,
        order.total
      );

      if (!captured) {
        return fail(
          res,
          409,
          "Payment is not successful yet. Please check payment status again."
        );
      }

      const updated = await markCashfreeOrderPaid(
        req,
        payment,
        captured
      );

      if (!updated) {
        return fail(res, 404, "Order not found.");
      }

      if (updated.status === "Cancelled") {
        console.error(
          "Cancelled order received Cashfree payment:",
          updated.orderNumber
        );

        return fail(
          res,
          409,
          "Payment was received for a cancelled order. Please contact support for refund review."
        );
      }

      return res.json({
        success: true,
        paid: updated.paymentStatus === "Paid",
        order: publicOrder(updated),
        message:
          "Payment successful. Please choose an available seat.",
      });
    } catch (error) {
      console.error("Kiosk Cashfree payment verify:", error);

      return fail(
        res,
        502,
        "Unable to confirm payment. Please check the tracking code."
      );
    }
  }
);

// ============================================
// CASHFREE WEBHOOK
// ============================================

// IMPORTANT:
// app.js must register express.raw() for
// /api/kiosk/cashfree/webhook BEFORE express.json().

router.post(
  "/cashfree/webhook",
  async (req, res) => {
    try {
      const rawBody = req.body;

      const timestamp = req.get("x-webhook-timestamp");
      const signature = req.get("x-webhook-signature");

      if (!Buffer.isBuffer(rawBody)) {
        return res.status(503).json({
          success: false,
          message: "Raw webhook body is required.",
        });
      }

      const valid = cashfreeWebhookSignature(
        rawBody,
        timestamp,
        signature
      );

      if (!valid) {
        return res.status(401).json({
          success: false,
        });
      }

      let event;

      try {
        event = JSON.parse(rawBody.toString("utf8"));
      } catch {
        return res.status(400).json({
          success: false,
        });
      }

      const data = event.data || {};
      const gatewayOrderId = data.order?.order_id;
      const captured = data.payment;

      if (
        !gatewayOrderId ||
        !captured ||
        captured.payment_status !== "SUCCESS" ||
        !captured.cf_payment_id
      ) {
        // Other Cashfree webhook event types do not mark an order paid.
        return res.json({
          success: true,
          ignored: true,
        });
      }

      const payment = await Payment.findOne({
        gatewayOrderId,
        gatewayName: "Cashfree",
      });

      if (!payment) {
        // Return a retryable response if the local payment record
        // is not available yet.
        return res.status(503).json({
          success: false,
          message: "Payment record not found.",
        });
      }

      const order = await Order.findById(payment.orderId);

      if (!order) {
        return res.status(404).json({
          success: false,
        });
      }

      if (
        !["Online (Cashfree)", "Counter UPI"].includes(
          order.paymentMethod
        ) ||
        paise(payment.amount) !== paise(order.total) ||
        Math.round(Number(captured.payment_amount) * 100) !==
          paise(order.total)
      ) {
        return res.status(409).json({
          success: false,
        });
      }

      // Verify with Cashfree API as an additional server-side check.
      const payments = await getCashfreePayments(
        payment.gatewayOrderId
      );

      const verified = findSuccessfulPayment(
        payments,
        order.total
      );

      if (
        !verified ||
        String(verified.cf_payment_id) !==
          String(captured.cf_payment_id)
      ) {
        return res.status(409).json({
          success: false,
        });
      }

      const updated = await markCashfreeOrderPaid(
        req,
        payment,
        verified
      );

      return res.json({
        success: true,
        paymentStatus: updated?.paymentStatus,
        seatAssigned: Boolean(updated?.seatNumber),
      });
    } catch (error) {
      console.error("Cashfree kiosk webhook:", error);

      return res.status(500).json({
        success: false,
      });
    }
  }
);

module.exports = router;
