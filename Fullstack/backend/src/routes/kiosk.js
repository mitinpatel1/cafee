
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

router.use((_req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ============================================
// HELPERS
// ============================================

const configured = () =>
  Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );

const hash = (value) =>
  crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

const money = (amount) =>
  Math.round(Number(amount) * 100) / 100;

const paise = (rupees) =>
  Math.round(Number(rupees) * 100);

function fail(res, status, message) {
  return res.status(status).json({
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
    orderNumber: order.orderNumber,
    trackingCode: order.trackingCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    seatNumber: order.seatNumber || null,

    seatPending:
      order.paymentStatus === "Paid" &&
      !order.seatNumber &&
      !["Cancelled", "Picked Up"].includes(
        order.status
      ),

    pickupTime: order.pickupTime,
    estimatedReadyTime:
      order.estimatedReadyTime,
  };
}

// ============================================
// BASIC REQUEST LIMITING
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
    const old = requestWindows.get(key);

    const record =
      !old || now - old.start > periodMs
        ? {
            start: now,
            count: 0,
          }
        : old;

    record.count++;

    requestWindows.set(key, record);

    if (record.count > limit) {
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
  ).emit(
    "franchise_order_updated",
    order
  );
}

// ============================================
// RAZORPAY REQUEST
// ============================================

async function razorpay(
  path,
  method = "GET",
  body
) {
  const credentials = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/${path}`,
    {
      method,

      headers: {
        Authorization:
          `Basic ${credentials}`,

        "Content-Type":
          "application/json",
      },

      ...(body
        ? {
            body: JSON.stringify(body),
          }
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

async function ownedGuestOrder(
  req,
  res,
  next
) {
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
// NO LOGIN REQUIRED
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
        paymentMethod ===
          "Online (Razorpay)" &&
        !configured()
      ) {
        return fail(
          res,
          503,
          "Online payment is not configured."
        );
      }

      const franchise =
        await Franchise.findOne({
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

        const menuItem =
          await MenuItem.findById(
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
        !Number.isSafeInteger(
          paise(subtotal)
        ) ||
        subtotal <= 0
      ) {
        return fail(
          res,
          400,
          "Invalid order total."
        );
      }

      // Unique key for this guest order.
      const orderKey = crypto
        .randomBytes(32)
        .toString("hex");

      const order = await Order.create({
        userId: null,

        isGuestOrder: true,

        guestTokenHash:
          hash(orderKey),

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

        // Customer will select after payment.
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
// KIOSK CONFIGURATION
// ============================================

router.get("/config", (_req, res) => {
  res.json({
    success: true,
    onlineEnabled: configured(),
  });
});

// ============================================
// GET ORDER TRACKING STATUS
// USED FOR ADMIN CONFIRM AUTO RESET
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
// GET AVAILABLE SEATS
// ONLY AFTER VERIFIED PAYMENT
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

      if (
        order.paymentStatus !== "Paid"
      ) {
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
        selectedSeat:
          order.seatNumber || null,
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
// CUSTOMER CHOOSES OWN SEAT
// ============================================

router.post(
  "/orders/:id/seat",
  throttle(90, 5 * 60 * 1000),
  ownedGuestOrder,
  async (req, res) => {
    try {
      const order =
        await assignSeatByCustomer(
          req.guestOrder._id,
          req.body?.seatNumber
        );

      notify(req, order);

      return res.json({
        success: true,

        order: publicOrder(order),

        message:
          `Seat ${order.seatNumber} confirmed.`,
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
// INITIATE ONLINE PAYMENT
// ============================================

router.post(
  "/orders/:id/pay",
  ownedGuestOrder,
  async (req, res) => {
    try {
      const order = req.guestOrder;

      if (!configured()) {
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
        order.paymentStatus === "Paid"
      ) {
        return fail(
          res,
          409,
          "Order is not eligible for online payment."
        );
      }

      let payment =
        await Payment.findOne({
          orderId: order._id,

          status: {
            $in: [
              "Initiated",
              "Processing",
            ],
          },
        }).sort({
          createdAt: -1,
        });

      if (!payment) {
        const gatewayOrder =
          await razorpay(
            "orders",
            "POST",
            {
              amount: paise(order.total),
              currency: "INR",

              receipt:
                order.orderNumber.slice(
                  0,
                  40
                ),

              notes: {
                officebiteOrderId:
                  String(order._id),
              },
            }
          );

        payment = await Payment.create({
          orderId: order._id,
          userId: null,

          amount: order.total,

          paymentMethod:
            order.paymentMethod,

          status: "Initiated",

          paymentId:
            `KIOSK-${crypto
              .randomBytes(10)
              .toString("hex")}`,

          gatewayOrderId:
            gatewayOrder.id,
        });
      }

      return res.json({
        success: true,

        keyId:
          process.env.RAZORPAY_KEY_ID,

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
// VERIFY RAZORPAY PAYMENT
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

      const order = req.guestOrder;

      const payment =
        await Payment.findOne({
          orderId: order._id,

          gatewayOrderId:
            razorpay_order_id,
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

      // Verify captured payment against Razorpay.
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
        payment.transactionId !==
          captured.id
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

          status: {
            $ne: "Completed",
          },
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

          paymentStatus: {
            $ne: "Paid",
          },
        },
        {
          $set: {
            paymentStatus: "Paid",
          },
        }
      );

      const updated =
        await Order.findById(order._id);

      // Customer may now select their seat.
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

// IMPORTANT:
// Mount this route with express.raw() before
// express.json() in the main Express application.

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
          req.get(
            "x-razorpay-signature"
          )
        )
      ) {
        return res.status(401).json({
          success: false,
        });
      }

      const event = JSON.parse(
        req.body.toString("utf8")
      );

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

      const payment =
        await Payment.findOne({
          gatewayOrderId:
            captured.order_id,
        });

      if (!payment) {
        return res.json({
          success: true,
          ignored: true,
        });
      }

      const order =
        await Order.findById(
          payment.orderId
        );

      if (
        !order ||
        order.paymentMethod !==
          "Online (Razorpay)" ||
        payment.amount !== order.total ||
        captured.amount !==
          paise(order.total)
      ) {
        return res.status(409).json({
          success: false,
        });
      }

      if (
        payment.transactionId &&
        payment.transactionId !==
          captured.id
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

          status: {
            $ne: "Completed",
          },
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

          paymentStatus: {
            $ne: "Paid",
          },
        },
        {
          $set: {
            paymentStatus: "Paid",
          },
        }
      );

      const updated =
        await Order.findById(order._id);

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
