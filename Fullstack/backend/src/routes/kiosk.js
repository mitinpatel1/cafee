
"use strict";

const express = require("express");
const crypto = require("crypto");

const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Franchise = require("../models/Franchise");
const MenuItem = require("../models/MenuItem");


const QR_PAYMENT_TIMEOUT_MS = 2 * 60 * 1000;
// Minimum QR expiry is 120 seconds after QR creation.
// The kiosk deadline still starts when the order is created.


const {
  listSeats,
  assignSeatByCustomer,
} = require("../services/seatService");

const router = express.Router();

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ============================================
// HELPERS
// ============================================

const onlineConfigured = () =>
  Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );

const hash = (value) =>
  crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

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

function matchingSignature(expected, received) {
  return (
    typeof received === "string" &&
    /^[0-9a-f]{64}$/i.test(received) &&
    crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex")
    )
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
      !["Cancelled", "Picked Up"].includes(
        order.status
      ),

    pickupTime: order.pickupTime,
    estimatedReadyTime: order.estimatedReadyTime,
  };
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

  io.to("kitchen").emit(
    "order_status_updated",
    payload
  );

  io.to(`order_${order._id}`).emit(
    "order_tracking_update",
    payload
  );

  io.to(
    `franchise_${order.franchiseId}`
  ).emit("franchise_order_updated", order);
}

// ============================================
// RAZORPAY API HELPER
// ============================================

async function razorpay(
  path,
  method = "GET",
  body
) {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/${path}`,
    {
      method,

      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },

      ...(body
        ? { body: JSON.stringify(body) }
        : {}),

      signal: AbortSignal.timeout(15000),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.description ||
        "Razorpay request failed."
    );
  }

  return data;
}

// ============================================
// GUEST ORDER AUTHORIZATION
// ============================================

async function ownedGuestOrder(req, res, next) {
  try {
    const token =
      req.get("x-kiosk-order-key") || "";

    if (!/^[a-f0-9]{64}$/i.test(token)) {
      return fail(
        res,
        403,
        "Invalid order key."
      );
    }

    const order = await Order.findById(
      req.params.id
    )
      .select("+guestTokenHash")
      .catch(() => null);

    if (
      !order ||
      !order.isGuestOrder ||
      !order.guestTokenHash ||
      !matchingSignature(
        order.guestTokenHash,
        hash(token)
      )
    ) {
      return fail(
        res,
        404,
        "Order not found."
      );
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
        "Online (Razorpay)",
        "Counter Cash",
        "Counter UPI",
      ];

      if (!methods.includes(paymentMethod)) {
        return fail(
          res,
          400,
          "Choose a valid payment method."
        );
      }

      if (
        paymentMethod === "Online (Razorpay)" &&
        !onlineConfigured()
      ) {
        return fail(
          res,
          503,
          "Online payment is not configured."
        );
      }

      if (
        paymentMethod === "Counter UPI" &&
        !onlineConfigured()
      ) {
        return fail(
          res,
          503,
          "Automatic UPI QR payment requires Razorpay configuration."
        );
      }


      const franchise = await Franchise.findOne({
        _id: franchiseId,
        status: "Active",
      }).catch(() => null);

      if (!franchise) {
        return fail(
          res,
          400,
          "Select an active franchise."
        );
      }

      if (
        !Array.isArray(items) ||
        items.length < 1 ||
        items.length > 30
      ) {
        return fail(
          res,
          400,
          "Cart must contain 1–30 items."
        );
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
          return fail(
            res,
            400,
            "Invalid item quantity."
          );
        }

        const menuItem = await MenuItem.findById(
          item.menuItemId
        ).catch(() => null);

        if (
          !menuItem ||
          !menuItem.isAvailable ||
          String(menuItem.franchiseId) !==
            String(franchise._id)
        ) {
          return fail(
            res,
            400,
            "One or more menu items are unavailable."
          );
        }

        subtotal +=
          menuItem.price * item.quantity;

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

      if (
        !Number.isSafeInteger(paise(subtotal)) ||
        subtotal <= 0
      ) {
        return fail(
          res,
          400,
          "Invalid order total."
        );
      }

      const orderKey = crypto
        .randomBytes(32)
        .toString("hex");

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

        notes: String(
          notes || ""
        ).slice(0, 500),

        pickupCounter: "Main counter",
        pickupTime: "Awaiting payment",

        seatNumber: null,
      });

      const io = req.app.get("io");

      if (io) {
        io.to("kitchen").emit(
          "new_order",
          order
        );

        io.to(
          `franchise_${order.franchiseId}`
        ).emit(
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
      console.error(
        "Kiosk order creation:",
        error
      );

      return fail(
        res,
        500,
        "Unable to place order."
      );
    }
  }
);

// ============================================
// CONFIGURATION
// ============================================


router.get("/config", (_req, res) => {
  res.json({
    success: true,
    onlineEnabled: onlineConfigured(),
    // Both names are kept for older and newer versions of the kiosk UI.
    upiEnabled: onlineConfigured(),
    qrEnabled: onlineConfigured(),
    paymentTimeoutSeconds: QR_PAYMENT_TIMEOUT_MS / 1000,
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
      const code = String(
        req.params.code || ""
      )
        .trim()
        .toUpperCase();

      if (!/^[0-9A-F]{16}$/.test(code)) {
        return fail(
          res,
          400,
          "Invalid tracking code."
        );
      }

      const order = await Order.findOne({
        trackingCode: code,
        isGuestOrder: true,
      });

      if (!order) {
        return fail(
          res,
          404,
          "Tracking code not found."
        );
      }

      return res.json({
        success: true,
        order: publicOrder(order),
      });
    } catch (error) {
      console.error(
        "Track kiosk order:",
        error
      );

      return fail(
        res,
        500,
        "Could not track order."
      );
    }
  }
);

// ============================================
// CAPTURED QR PAYMENT RECONCILIATION
// ============================================

async function applyCapturedQrPayment(req, payment, captured) {
  if (!payment || !captured) return null;

  const order = await Order.findById(payment.orderId);
  if (!order) return null;

  if (
    order.paymentMethod !== "Counter UPI" ||
    payment.paymentMethod !== "Counter UPI" ||
    !captured.id ||
    captured.status !== "captured" ||
    captured.currency !== "INR" ||
    captured.amount !== paise(order.total) ||
    paise(payment.amount) !== paise(order.total) ||
    (captured.method && captured.method !== "upi")
  ) {
    return order;
  }

  const alreadyUsed = await Payment.findOne({
    transactionId: captured.id,
    _id: { $ne: payment._id },
  });
  if (alreadyUsed) {
    throw new Error("Gateway transaction was already assigned to another order.");
  }

  if (payment.transactionId && payment.transactionId !== captured.id) {
    throw new Error("Conflicting QR payment transaction.");
  }

  // Idempotent: polling and webhook may arrive at the same time.
  await Payment.updateOne(
    {
      _id: payment._id,
      transactionId: { $in: ["", captured.id] },
      status: { $ne: "Refunded" },
    },
    {
      $set: {
        status: "Completed",
        transactionId: captured.id,
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
        counterPaymentReference: captured.id,
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
      "LATE CAPTURE: cancelled QR order requires refund reconciliation:",
      order.orderNumber,
      captured.id
    );
  }
  return latest;
}

async function syncQrPayment(req, payment) {
  if (!payment?.gatewayQrId) {
    return Order.findById(payment.orderId);
  }

  const response = await razorpay(
    `payments/qr_codes/${encodeURIComponent(payment.gatewayQrId)}/payments?count=100`
  );
  const captured = (response.items || []).find(
    (item) =>
      item.status === "captured" &&
      item.currency === "INR" &&
      item.amount === paise(payment.amount)
  );

  if (!captured) return Order.findById(payment.orderId);
  return applyCapturedQrPayment(req, payment, captured);
}

async function closeUnpaidQr(payment) {
  if (!payment?.gatewayQrId) return;
  try {
    await razorpay(
      `payments/qr_codes/${encodeURIComponent(payment.gatewayQrId)}/close`,
      "POST"
    );
  } catch (error) {
    // Closing an already-closed QR is safe to retry, but a gateway error
    // must NOT be treated as successful cancellation.
    const qr = await razorpay(
      `payments/qr_codes/${encodeURIComponent(payment.gatewayQrId)}`
    );
    if (qr.status !== "closed") throw error;
  }
}

// ============================================
// RECOVER ORDER: required by KioskPage.jsx
// Only the customer holding the guest order key can access this endpoint.
// QR is verified directly with Razorpay; a scan alone does not mean paid.
// ============================================

// Recover an online order if its payment captured but the webhook or
// checkout callback did not reach this server. Never trust the client here.
async function syncOnlinePayment(req, payment) {
  const order = await Order.findById(payment.orderId);
  if (!order || !payment.gatewayOrderId) return order;

  const response = await razorpay(
    `orders/${encodeURIComponent(payment.gatewayOrderId)}/payments`
  );
  const captured = (response.items || []).find((item) =>
    item?.status === "captured" &&
    item.order_id === payment.gatewayOrderId &&
    item.currency === "INR" &&
    item.amount === paise(order.total)
  );

  if (!captured) return order;

  if (payment.transactionId && payment.transactionId !== captured.id) {
    throw new Error("Conflicting online payment transaction.");
  }

  const duplicate = await Payment.findOne({
    transactionId: captured.id,
    _id: { $ne: payment._id },
  });
  if (duplicate) {
    throw new Error("Payment transaction is linked to another order.");
  }

  await Payment.updateOne(
    {
      _id: payment._id,
      status: { $ne: "Refunded" },
      $or: [
        { transactionId: captured.id },
        { transactionId: "" },
        { transactionId: null },
        { transactionId: { $exists: false } },
      ],
    },
    { $set: { status: "Completed", transactionId: captured.id } }
  );

  const updated = await Order.findOneAndUpdate(
    {
      _id: order._id,
      status: "Pending",
      paymentStatus: "Pending",
    },
    { $set: { paymentStatus: "Paid", pickupTime: "Choose your seat" } },
    { new: true }
  );

  if (updated) {
    notify(req, updated);
    return updated;
  }

  const latest = await Order.findById(order._id);
  if (latest?.status === "Cancelled") {
    console.error(
      "LATE ONLINE CAPTURE: cancelled order requires refund review:",
      latest.orderNumber,
      captured.id
    );
  }
  return latest;
}

router.get(
  "/orders/:id/recover",
  throttle(180, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      let order = await Order.findById(req.guestOrder._id);
      if (!order) return fail(res, 404, "Order not found.");

      if (order.paymentStatus === "Pending" && order.status === "Pending") {
        if (order.paymentMethod === "Counter UPI" && onlineConfigured()) {
          const payment = await Payment.findOne({
            orderId: order._id,
            paymentMethod: "Counter UPI",
            gatewayQrId: { $exists: true, $nin: [null, ""] },
          }).sort({ createdAt: -1 });
          if (payment) order = await syncQrPayment(req, payment);
        } else if (
          order.paymentMethod === "Online (Razorpay)" && onlineConfigured()
        ) {
          const payment = await Payment.findOne({
            orderId: order._id,
            gatewayOrderId: { $exists: true, $nin: [null, ""] },
          }).sort({ createdAt: -1 });
          if (payment) order = await syncOnlinePayment(req, payment);
        }
      }

      return res.json({
        success: true,
        paid: order.paymentStatus === "Paid",
        order: publicOrder(order),
      });
    } catch (error) {
      console.error("Kiosk order recovery:", error);
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
      const order = await Order.findById(
        req.guestOrder._id
      );

      if (!order) {
        return fail(
          res,
          404,
          "Order not found."
        );
      }

      if (order.paymentStatus !== "Paid") {
        return fail(
          res,
          403,
          "Complete payment before choosing a seat."
        );
      }

      if (
        ["Cancelled", "Picked Up"].includes(
          order.status
        )
      ) {
        return fail(
          res,
          409,
          "This order is already closed."
        );
      }

      const seats = await listSeats(
        order.franchiseId
      );

      return res.json({
        success: true,
        ...seats,
        selectedSeat: order.seatNumber || null,
      });
    } catch (error) {
      console.error(
        "Kiosk available seats:",
        error
      );

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

      // Only verified QR orders are automatically accepted after
      // the CUSTOMER selects a seat. Cash still follows admin review.
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
                estimatedReadyTime: new Date(Date.now() + 15 * 60 * 1000),
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
      console.error(
        "Customer seat selection:",
        error
      );

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
// DYNAMIC RAZORPAY UPI QR (AUTO-VERIFIED)
// ============================================

async function createUpiQr(req, res) {
  try {
    const order = await Order.findById(req.guestOrder._id);
    if (
      !order ||
      order.paymentMethod !== "Counter UPI" ||
      order.status !== "Pending" ||
      order.paymentStatus !== "Pending"
    ) {
      return fail(res, 409, "This order is not eligible for a QR payment.");
    }
    if (!onlineConfigured()) {
      return fail(res, 503, "Razorpay is not configured.");
    }

    const deadline = new Date(order.createdAt).getTime() + QR_PAYMENT_TIMEOUT_MS;
    if (Date.now() >= deadline) {
      return fail(res, 409, "The two-minute payment window has expired.");
    }

    let payment = await Payment.findOne({
      orderId: order._id,
      paymentMethod: "Counter UPI",
      gatewayQrId: { $exists: true, $nin: [null, ""] },
    }).sort({ createdAt: -1 });

    if (!payment) {
      // Razorpay requires close_by to be at least 120s from QR creation.
      // Kiosk still enforces the order's two-minute checkout deadline.
      const closeBy = Math.ceil(Date.now() / 1000) + 125;
      const qr = await razorpay("payments/qr_codes", "POST", {
        type: "upi_qr",
        name: `OfficeBite ${order.orderNumber}`.slice(0, 40),
        usage: "single_use",
        fixed_amount: true,
        payment_amount: paise(order.total),
        close_by: closeBy,
        description: `OfficeBite order ${order.orderNumber}`.slice(0, 255),
        notes: { officebiteOrderId: String(order._id) },
      });

      if (!qr?.id || !qr?.image_url || qr.status !== "active") {
        return fail(res, 502, "Razorpay did not provide an active QR code.");
      }

      // If the customer cancelled while the gateway request was in flight,
      // close the new QR instead of presenting it as payable.
      const latest = await Order.findById(order._id);
      if (
        latest.status !== "Pending" ||
        latest.paymentStatus !== "Pending" ||
        Date.now() >= deadline
      ) {
        await closeUnpaidQr({ gatewayQrId: qr.id });
        return fail(res, 409, "Order expired or was cancelled.");
      }

      payment = await Payment.create({
        orderId: order._id,
        userId: null,
        amount: order.total,
        paymentMethod: "Counter UPI",
        status: "Initiated",
        paymentId: `QR-${crypto.randomBytes(12).toString("hex")}`,
        gatewayQrId: qr.id,
        gatewayQrImageUrl: qr.image_url,
        expiresAt: new Date(Number(qr.close_by || closeBy) * 1000),
      });
    }

    return res.json({
      success: true,
      // Current React kiosk reads imageUrl and closeBy.
      // Keep previous names for backwards compatibility.
      imageUrl: payment.gatewayQrImageUrl,
      closeBy: payment.expiresAt,
      qrDataUrl: payment.gatewayQrImageUrl,
      qrId: payment.gatewayQrId,
      amount: payment.amount,
      currency: "INR",
      payeeName: "OfficeBite",
      orderNumber: order.orderNumber,
      verification: "Automatic Razorpay verification",
      paymentDeadlineAt: new Date(deadline).toISOString(),
      expiresAt: payment.expiresAt,
    });
  } catch (error) {
    console.error("Kiosk dynamic QR:", error);
    return fail(res, 502, error.message || "Unable to generate payment QR.");
  }
}

// GET is kept for compatibility with the current KioskPage.jsx.
// Prefer POST for new frontend integrations because QR creation has side effects.
router.get(
  "/orders/:id/upi-qr",
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  createUpiQr
);
router.post(
  "/orders/:id/upi-qr",
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  createUpiQr
);

// Frontend polling: never infer payment from a scanned QR or typed UTR.
router.get(
  "/orders/:id/upi-status",
  throttle(180, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      const order = await Order.findById(req.guestOrder._id);
      if (!order || order.paymentMethod !== "Counter UPI") {
        return fail(res, 404, "UPI order not found.");
      }

      if (order.paymentStatus === "Paid" || order.status === "Cancelled") {
        return res.json({
          success: true,
          paid: order.paymentStatus === "Paid",
          order: publicOrder(order),
        });
      }

      const payment = await Payment.findOne({
        orderId: order._id,
        gatewayQrId: { $exists: true, $nin: [null, ""] },
      }).sort({ createdAt: -1 });
      const updated = payment ? await syncQrPayment(req, payment) : order;
      return res.json({
        success: true,
        paid: updated.paymentStatus === "Paid",
        order: publicOrder(updated),
      });
    } catch (error) {
      console.error("QR status check:", error);
      return fail(res, 502, "Unable to verify QR payment right now.");
    }
  }
);

// Manual UTR submission is intentionally disabled: it cannot prove payment.
router.post("/orders/:id/upi-reference", ownedGuestOrder, (_req, res) =>
  fail(res, 410, "UPI reference entry was replaced with automatic QR verification.")
);

// Cancel or time out an UNPAID kiosk order.
// This route does not refund captured payments.
// Both URLs are recognized by Express; KioskPage.jsx calls /cancel.
router.post(
  ["/orders/:id/cancel", "/orders/:id/cancel-payment"],
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      let order = await Order.findById(req.guestOrder._id);
      if (!order) return fail(res, 404, "Order not found.");
      if (order.status === "Cancelled") {
        return res.json({ success: true, cancelled: true, order: publicOrder(order) });
      }
      if (order.paymentStatus !== "Pending" || order.status !== "Pending") {
        return fail(res, 409, "Order already paid or being prepared. Recheck status.");
      }

      if (order.paymentMethod === "Counter UPI") {
        const payment = await Payment.findOne({
          orderId: order._id,
          paymentMethod: "Counter UPI",
          gatewayQrId: { $exists: true, $nin: [null, ""] },
        }).sort({ createdAt: -1 });

        if (payment) {
          order = await syncQrPayment(req, payment);
          if (order.paymentStatus === "Paid") {
            return fail(res, 409, "Payment received. Please choose a seat.");
          }

          await closeUnpaidQr(payment);
          order = await syncQrPayment(req, payment);
          if (order.paymentStatus === "Paid") {
            return fail(res, 409, "Payment completed during cancellation. Choose a seat.");
          }
        }
      }

      if (order.paymentMethod === "Online (Razorpay)") {
        const payment = await Payment.findOne({
          orderId: order._id,
          gatewayOrderId: { $exists: true, $nin: [null, ""] },
        }).sort({ createdAt: -1 });
        if (payment) {
          const info = await razorpay(
            `orders/${encodeURIComponent(payment.gatewayOrderId)}/payments`
          );
          if (
            (info.items || []).some(
              (item) => item.status === "captured" || item.status === "authorized"
            )
          ) {
            return fail(res, 409, "Online payment may have succeeded. Verify before cancelling.");
          }
        }
      }

      const cancelled = await Order.findOneAndUpdate(
        { _id: order._id, status: "Pending", paymentStatus: "Pending" },
        {
          $set: {
            status: "Cancelled",
            cancelReason: String(req.body?.reason || "Cancelled by customer").slice(0, 200),
            pickupTime: "Cancelled",
          },
        },
        { new: true }
      );

      if (!cancelled) {
        return fail(res, 409, "Order status changed. Check payment before retrying.");
      }

      notify(req, cancelled);
      return res.json({
        success: true,
        cancelled: true,
        order: publicOrder(cancelled),
      });
    } catch (error) {
      console.error("Cancel kiosk payment:", error);
      return fail(res, 502, "Cancellation could not be verified. Keep the order open and retry.");
    }
  }
);

// ============================================
// RAZORPAY PAYMENT INITIATION
// ============================================

router.post(
  "/orders/:id/pay",
  ownedGuestOrder,
  async (req, res) => {
    try {
      const order = await Order.findById(req.guestOrder._id);

      if (!onlineConfigured()) {
        return fail(
          res,
          503,
          "Razorpay is not configured."
        );
      }

      if (
        order.paymentMethod !==
          "Online (Razorpay)" ||
        order.status === "Cancelled" ||
        order.paymentStatus !== "Pending" ||
        order.status !== "Pending" ||
        Date.now() >= new Date(order.createdAt).getTime() + QR_PAYMENT_TIMEOUT_MS
      ) {
        return fail(
          res,
          409,
          "Order is not eligible for online payment."
        );
      }

      let payment = await Payment.findOne({
        orderId: order._id,

        status: {
          $in: ["Initiated", "Processing"],
        },
      }).sort({
        createdAt: -1,
      });

      if (!payment) {
        const gatewayOrder = await razorpay(
          "orders",
          "POST",
          {
            amount: paise(order.total),
            currency: "INR",

            receipt: order.orderNumber.slice(
              0,
              40
            ),

            notes: {
              officebiteOrderId: String(
                order._id
              ),
            },
          }
        );

        payment = await Payment.create({
          orderId: order._id,
          userId: null,

          amount: order.total,
          paymentMethod: order.paymentMethod,

          status: "Initiated",

          paymentId: `KIOSK-${crypto
            .randomBytes(10)
            .toString("hex")}`,

          gatewayOrderId: gatewayOrder.id,
        });
      }

      return res.json({
        success: true,

        keyId: process.env.RAZORPAY_KEY_ID,

        gatewayOrderId:
          payment.gatewayOrderId,

        amount: paise(order.total),
        currency: "INR",
      });
    } catch (error) {
      console.error(
        "Kiosk payment initiate:",
        error
      );

      return fail(
        res,
        502,
        "Could not initiate payment."
      );
    }
  }
);

// ============================================
// RAZORPAY PAYMENT VERIFICATION
// ============================================

router.post(
  "/orders/:id/verify",
  ownedGuestOrder,
  async (req, res) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body || {};

      if (
        ![
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        ].every(
          (value) =>
            typeof value === "string"
        )
      ) {
        return fail(
          res,
          400,
          "Missing payment data."
        );
      }

      const order = await Order.findById(req.guestOrder._id);
      if (!order || order.status === "Cancelled") {
        return fail(res, 409, "This order was cancelled. Any received funds require refund review.");
      }

      const payment = await Payment.findOne({
        orderId: order._id,
        gatewayOrderId: razorpay_order_id,
      });

      if (
        !payment ||
        order.paymentMethod !==
          "Online (Razorpay)"
      ) {
        return fail(
          res,
          403,
          "Payment mismatch."
        );
      }

      const expected = crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${payment.gatewayOrderId}|${razorpay_payment_id}`
        )
        .digest("hex");

      if (
        !matchingSignature(
          expected,
          razorpay_signature
        )
      ) {
        return fail(
          res,
          403,
          "Invalid payment signature."
        );
      }

      // Confirm payment is captured by Razorpay.

      const captured = await razorpay(
        `payments/${encodeURIComponent(
          razorpay_payment_id
        )}`
      );

      if (
        captured.status !== "captured" ||
        captured.order_id !==
          payment.gatewayOrderId ||
        captured.currency !== "INR" ||
        captured.amount !== paise(order.total)
      ) {
        return fail(
          res,
          409,
          "Payment capture is pending. Check status before retrying."
        );
      }

      if (
        payment.transactionId &&
        payment.transactionId !== captured.id
      ) {
        return fail(
          res,
          409,
          "Payment transaction mismatch."
        );
      }

      await Payment.updateOne(
        {
          _id: payment._id,
          status: { $ne: "Completed" },
        },
        {
          $set: {
            status: "Completed",
            transactionId: captured.id,
          },
        }
      );

      await Order.updateOne(
        {
          _id: order._id,
          paymentStatus: "Pending",
          status: { $ne: "Cancelled" },
        },
        {
          $set: {
            paymentStatus: "Paid",
          },
        }
      );

      const updated = await Order.findById(
        order._id
      );

      if (updated.status === "Cancelled") {
        console.error("Late captured online payment requires refund review", updated.orderNumber);
        return fail(res, 409, "Order cancelled while payment completed. Contact support for refund.");
      }
      notify(req, updated);

      return res.json({
        success: true,

        order: publicOrder(updated),

        message:
          "Payment successful. Please choose an available seat.",
      });
    } catch (error) {
      console.error(
        "Kiosk payment verify:",
        error
      );

      return fail(
        res,
        502,
        "Unable to confirm payment. Please check the tracking code."
      );
    }
  }
);

// ============================================
// RAZORPAY WEBHOOK
// ============================================

// Important:
// The webhook must receive the RAW request body.
// Configure express.raw() before express.json()
// for this endpoint in the application.

router.post(
  "/razorpay/webhook",
  async (req, res) => {
    try {
      const secret =
        process.env.RAZORPAY_WEBHOOK_SECRET;

      if (
        !secret ||
        !Buffer.isBuffer(req.body)
      ) {
        return res.status(503).json({
          success: false,
        });
      }

      const expected = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      if (
        !matchingSignature(
          expected,
          req.get("x-razorpay-signature")
        )
      ) {
        return res.status(401).json({
          success: false,
        });
      }

      const event = JSON.parse(
        req.body.toString("utf8")
      );

      if (event.event === "qr_code.credited") {
        const qrId = event.payload?.qr_code?.entity?.id;
        const captured = event.payload?.payment?.entity;

        if (!qrId || !captured) {
          return res.status(400).json({ success: false });
        }
        const payment = await Payment.findOne({
          gatewayQrId: qrId,
          paymentMethod: "Counter UPI",
        });
        if (!payment) {
          // May arrive before the QR record is persisted; Razorpay retries
          // non-2xx errors. Polling also acts as a reconciliation fallback.
          return res.status(503).json({ success: false });
        }
        const updated = await applyCapturedQrPayment(req, payment, captured);
        return res.json({
          success: true,
          paid: updated?.paymentStatus === "Paid",
        });
      }

      if (
        event.event !==
        "payment.captured"
      ) {
        return res.json({
          success: true,
        });
      }

      const captured =
        event.payload?.payment?.entity;

      if (
        !captured ||
        captured.currency !== "INR" ||
        captured.status !== "captured"
      ) {
        return res.status(400).json({
          success: false,
        });
      }

      const payment = await Payment.findOne({
        gatewayOrderId: captured.order_id,
      });

      if (!payment) {
        return res.json({
          success: true,
          ignored: true,
        });
      }

      const order = await Order.findById(
        payment.orderId
      );

      if (
        !order ||
        order.paymentMethod !==
          "Online (Razorpay)" ||
        payment.amount !== order.total ||
        captured.amount !== paise(order.total)
      ) {
        return res.status(409).json({
          success: false,
        });
      }

      if (
        payment.transactionId &&
        payment.transactionId !== captured.id
      ) {
        return fail(
          res,
          409,
          "Payment transaction mismatch."
        );
      }

      await Payment.updateOne(
        {
          _id: payment._id,
          status: { $ne: "Completed" },
        },
        {
          $set: {
            status: "Completed",
            transactionId: captured.id,
          },
        }
      );

      await Order.updateOne(
        {
          _id: order._id,
          paymentStatus: "Pending",
          status: { $ne: "Cancelled" },
        },
        {
          $set: {
            paymentStatus: "Paid",
          },
        }
      );

      const updated = await Order.findById(
        order._id
      );

      if (updated.status === "Cancelled") {
        console.error("Late online capture requires refund review", updated.orderNumber);
        return res.json({ success: true, refundReviewRequired: true });
      }
      notify(req, updated);

      return res.json({
        success: true,
        paymentStatus: "Paid",

        seatAssigned: Boolean(
          updated?.seatNumber
        ),
      });
    } catch (error) {
      console.error(
        "Razorpay webhook:",
        error
      );

      return res.status(500).json({
        success: false,
      });
    }
  }
);

module.exports = router;
