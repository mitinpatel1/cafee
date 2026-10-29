
"use strict";

const express = require("express");
const crypto = require("crypto");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const Payment = require("../models/Payment");
const Franchise = require("../models/Franchise");
const MenuItem = require("../models/MenuItem");

const router = express.Router();

// ============================================
// PUBLIC KIOSK CONFIGURATION
// ============================================

// Customer login / signup required nahi.
// Seat sirf Admin dashboard se assign hogi.

router.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

// ============================================
// HELPERS
// ============================================

const onlineEnabled = () =>
  Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );

const hash = (value) =>
  crypto
    .createHash("sha256")
    .update(value)
    .digest("hex");

const roundAmount = (value) =>
  Math.round(Number(value) * 100) / 100;

const toPaise = (value) =>
  Math.round(Number(value) * 100);

// ============================================
// SECURE SIGNATURE COMPARISON
// ============================================

function secureEqual(expected, received) {
  return (
    typeof received === "string" &&
    /^[0-9a-f]{64}$/i.test(received) &&
    crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(received, "hex")
    )
  );
}

// ============================================
// BASIC REQUEST RATE LIMITING
// ============================================

// Allows multiple customers on shared kiosks.
// For production use Redis-based limiting.

const requestWindows = new Map();

function throttle(group, limit, periodMs) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${group}`;
    const previous = requestWindows.get(key);

    const current =
      !previous ||
      now - previous.start >= periodMs
        ? { start: now, count: 0 }
        : previous;

    current.count += 1;
    requestWindows.set(key, current);

    if (requestWindows.size > 10000) {
      for (const [entryKey, entry] of requestWindows) {
        if (now - entry.start >= periodMs) {
          requestWindows.delete(entryKey);
        }
      }
    }

    if (current.count > limit) {
      return res.status(429).json({
        success: false,
        message:
          "Too many requests. Please try again shortly.",
      });
    }

    next();
  };
}

// ============================================
// PUBLIC ORDER RESPONSE
// ============================================

// Never expose guestTokenHash or private key.

function publicOrder(order) {
  return {
    orderNumber: order.orderNumber,

    trackingCode: order.trackingCode,

    status: order.status,

    paymentStatus: order.paymentStatus,

    seatNumber: order.seatNumber ?? null,

    seatPending:
      order.paymentStatus === "Paid" &&
      order.seatNumber == null &&
      !["Cancelled", "Picked Up"].includes(
        order.status
      ),

    pickupTime: order.pickupTime,

    estimatedReadyTime:
      order.estimatedReadyTime,
  };
}

// ============================================
// SOCKET.IO NOTIFICATIONS
// ============================================

function notifyOrder(req, order) {
  const io = req.app.get("io");

  if (!io || !order) return;

  const payload = {
    orderId: order._id,

    orderNumber: order.orderNumber,

    status: order.status,

    paymentStatus: order.paymentStatus,

    seatNumber: order.seatNumber ?? null,

    order,
  };

  // Admin / Kitchen
  io.to("kitchen").emit(
    "order_status_updated",
    payload
  );

  // Individual order tracking
  io.to(`order_${order._id}`).emit(
    "order_tracking_update",
    payload
  );

  // Franchise dashboard
  io.to(
    `franchise_${order.franchiseId}`
  ).emit(
    "franchise_order_updated",
    order
  );

  if (order.paymentStatus === "Paid") {
    io.to("kitchen").emit(
      "payment_confirmed",
      payload
    );
  }
}

// ============================================
// RAZORPAY REQUEST HELPER
// ============================================

async function razorpayRequest(
  endpoint,
  method = "GET",
  body
) {
  const authorization = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/${endpoint}`,
    {
      method,

      headers: {
        Authorization:
          `Basic ${authorization}`,

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
      data?.error?.description ||
        "Razorpay request failed."
    );
  }

  return data;
}

// ============================================
// GUEST ORDER SECURITY
// ============================================

// Each customer/order has a unique private key.
// No JWT required for the kiosk.

async function verifyGuestOrder(
  req,
  res,
  next
) {
  try {
    const key =
      req.get("x-kiosk-order-key") || "";

    if (!/^[a-f0-9]{64}$/i.test(key)) {
      return res.status(403).json({
        success: false,
        message: "Invalid guest order key.",
      });
    }

    if (
      !mongoose.isValidObjectId(
        req.params.id
      )
    ) {
      return res.status(404).json({
        success: false,
        message: "Order not found.",
      });
    }

    const order = await Order.findById(
      req.params.id
    ).select("+guestTokenHash");

    if (
      !order ||
      !order.isGuestOrder ||
      !order.guestTokenHash ||
      !secureEqual(
        order.guestTokenHash,
        hash(key)
      )
    ) {
      return res.status(404).json({
        success: false,
        message: "Guest order not found.",
      });
    }

    req.guestOrder = order;
    next();
  } catch (error) {
    next(error);
  }
}

// ============================================
// GET KIOSK CONFIGURATION
// ============================================

router.get("/config", (req, res) => {
  return res.json({
    success: true,

    onlineEnabled: onlineEnabled(),

    manualSeatAssignment: true,

    customerLoginRequired: false,
  });
});

// ============================================
// CREATE MULTIPLE GUEST ORDERS
// ============================================

router.post(
  "/orders",
  throttle(
    "create",
    120,
    5 * 60 * 1000
  ),
  async (req, res) => {
    try {
      const {
        franchiseId,
        items,
        paymentMethod,
        notes,
      } = req.body || {};

      // ======================================
      // VALIDATE PAYMENT METHOD
      // ======================================

      const methods = [
        "Online (Razorpay)",
        "Counter Cash",
        "Counter UPI",
      ];

      if (!methods.includes(paymentMethod)) {
        return res.status(400).json({
          success: false,
          message:
            "Choose a payment method.",
        });
      }

      if (
        paymentMethod === "Online (Razorpay)" &&
        !onlineEnabled()
      ) {
        return res.status(503).json({
          success: false,
          message:
            "Online payment is not configured.",
        });
      }

      // ======================================
      // VALIDATE FRANCHISE
      // ======================================

      if (
        !mongoose.isValidObjectId(
          franchiseId
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid franchise.",
        });
      }

      const franchise =
        await Franchise.findOne({
          _id: franchiseId,
          status: "Active",
        });

      if (!franchise) {
        return res.status(400).json({
          success: false,
          message:
            "Select an active franchise.",
        });
      }

      // ======================================
      // VALIDATE ITEMS
      // ======================================

      if (
        !Array.isArray(items) ||
        items.length === 0 ||
        items.length > 30
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Cart must contain between 1 and 30 items.",
        });
      }

      let subtotal = 0;
      const orderItems = [];

      for (const cartItem of items) {
        if (
          !cartItem ||
          !mongoose.isValidObjectId(
            cartItem.menuItemId
          ) ||
          !Number.isInteger(
            cartItem.quantity
          ) ||
          cartItem.quantity < 1 ||
          cartItem.quantity > 50
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid cart item.",
          });
        }

        const menuItem =
          await MenuItem.findById(
            cartItem.menuItemId
          );

        if (
          !menuItem ||
          !menuItem.isAvailable ||
          String(menuItem.franchiseId) !==
            String(franchise._id)
        ) {
          return res.status(400).json({
            success: false,
            message:
              "One or more menu items are unavailable.",
          });
        }

        const price = Number(
          menuItem.price
        );

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          return res.status(400).json({
            success: false,
            message: "Invalid menu price.",
          });
        }

        subtotal +=
          price * cartItem.quantity;

        orderItems.push({
          menuItemId: menuItem._id,
          name: menuItem.name,
          price,

          quantity:
            cartItem.quantity,

          instructions: String(
            cartItem.instructions || ""
          ).slice(0, 200),
        });
      }

      // ======================================
      // NO TAX
      // ======================================

      subtotal = roundAmount(
        subtotal
      );

      if (
        !Number.isSafeInteger(
          toPaise(subtotal)
        ) ||
        subtotal <= 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid order total.",
        });
      }

      // ======================================
      // UNIQUE CUSTOMER IDENTIFIERS
      // ======================================

      // Every order gets a different private key.
      const orderKey = crypto
        .randomBytes(32)
        .toString("hex");

      // Every customer gets a tracking code.
      const trackingCode = crypto
        .randomBytes(8)
        .toString("hex")
        .toUpperCase();

      // ======================================
      // CREATE ORDER IN MONGODB
      // ======================================

      const order = await Order.create({
        userId: null,

        isGuestOrder: true,

        guestTokenHash:
          hash(orderKey),

        trackingCode,

        franchiseId:
          franchise._id,

        items: orderItems,

        subtotal,

        tax: 0,

        total: subtotal,

        paymentMethod,

        paymentStatus:
          "Pending",

        status: "Pending",

        // Seat assigned later by Admin.
        seatNumber: null,

        pickupCounter:
          "Main counter",

        pickupTime:
          "Awaiting payment",

        notes: String(
          notes || ""
        ).slice(0, 500),
      });

      // ======================================
      // NOTIFY ADMIN / FRANCHISE
      // ======================================

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

      // ======================================
      // RETURN CUSTOMER RECEIPT
      // ======================================

      return res.status(201).json({
        success: true,

        message:
          "Guest order created.",

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

      return res.status(500).json({
        success: false,
        message:
          "Unable to create order.",
      });
    }
  }
);

// ============================================
// TRACK CUSTOMER ORDER
// ============================================

// No login required.
// Customer can track using a 16-character code.

router.get(
  "/track/:code",
  throttle(
    "track",
    240,
    5 * 60 * 1000
  ),
  async (req, res) => {
    try {
      const code = String(
        req.params.code || ""
      )
        .trim()
        .toUpperCase();

      if (
        !/^[0-9A-F]{16}$/.test(code)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid tracking code.",
        });
      }

      const order =
        await Order.findOne({
          trackingCode: code,

          isGuestOrder: true,
        });

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Tracking code not found.",
        });
      }

      return res.json({
        success: true,

        order: publicOrder(order),
      });
    } catch (error) {
      console.error(
        "Kiosk order tracking:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to track order.",
      });
    }
  }
);

// ============================================
// READ-ONLY CUSTOMER SEAT STATUS
// ============================================

// IMPORTANT:
// This endpoint DOES NOT assign seats.
// It only checks the seat chosen by Admin.
//
// Compatible with older kiosk frontends
// using POST /orders/:id/seat.

router.post(
  "/orders/:id/seat",

  throttle(
    "seat-status",
    240,
    5 * 60 * 1000
  ),

  verifyGuestOrder,

  async (req, res) => {
    try {
      const order =
        await Order.findById(
          req.guestOrder._id
        );

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      return res.json({
        success: true,

        order: publicOrder(order),

        message:
          order.seatNumber != null
            ? `Admin assigned seat ${order.seatNumber}.`
            : order.paymentStatus === "Paid"
            ? "Payment verified. Waiting for Admin to assign your seat."
            : "Payment pending.",
      });
    } catch (error) {
      console.error(
        "Kiosk seat lookup:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Could not check seat.",
      });
    }
  }
);

// ============================================
// INITIATE ONLINE PAYMENT
// ============================================

router.post(
  "/orders/:id/pay",

  throttle(
    "payment",
    120,
    5 * 60 * 1000
  ),

  verifyGuestOrder,

  async (req, res) => {
    try {
      const order = req.guestOrder;

      if (!onlineEnabled()) {
        return res.status(503).json({
          success: false,
          message:
            "Razorpay is not configured.",
        });
      }

      if (
        order.paymentMethod !==
          "Online (Razorpay)" ||
        order.status === "Cancelled" ||
        order.paymentStatus === "Paid"
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Order is not eligible for online payment.",
        });
      }

      // ======================================
      // CHECK EXISTING PAYMENT
      // ======================================

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
        // Avoid another gateway charge for
        // an already completed transaction.
        const completed =
          await Payment.findOne({
            orderId: order._id,

            status: "Completed",
          });

        if (completed) {
          return res.status(409).json({
            success: false,
            message:
              "Payment was captured. Check order status before retrying.",
          });
        }

        // ====================================
        // CREATE RAZORPAY ORDER
        // ====================================

        const gatewayOrder =
          await razorpayRequest(
            "orders",
            "POST",
            {
              amount:
                toPaise(order.total),

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

        // ====================================
        // SAVE PAYMENT RECORD
        // ====================================

        payment =
          await Payment.create({
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

      // ======================================
      // SEND PAYMENT DETAILS TO FRONTEND
      // ======================================

      return res.json({
        success: true,

        keyId:
          process.env.RAZORPAY_KEY_ID,

        gatewayOrderId:
          payment.gatewayOrderId,

        amount:
          toPaise(order.total),

        currency: "INR",
      });
    } catch (error) {
      console.error(
        "Kiosk payment initiation:",
        error
      );

      return res.status(502).json({
        success: false,
        message:
          "Could not initiate payment.",
      });
    }
  }
);

// ============================================
// VERIFY RAZORPAY PAYMENT
// ============================================

// After payment:
// paymentStatus = Paid
// seatNumber remains null
// Admin assigns seat separately.

router.post(
  "/orders/:id/verify",
  verifyGuestOrder,
  async (req, res) => {
    try {
      if (!onlineEnabled()) {
        return res.status(503).json({
          success: false,
          message:
            "Razorpay is not configured.",
        });
      }

      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body || {};

      // ======================================
      // VALIDATE PAYMENT DETAILS
      // ======================================

      if (
        ![
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
        ].every(
          (value) =>
            typeof value === "string" &&
            value.length > 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Missing payment details.",
        });
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
          "Online (Razorpay)" ||
        toPaise(payment.amount) !==
          toPaise(order.total)
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Payment/order mismatch.",
        });
      }

      if (payment.status === "Refunded") {
        return res.status(409).json({
          success: false,
          message:
            "This payment was refunded.",
        });
      }

      if (
        payment.transactionId &&
        payment.transactionId !==
          razorpay_payment_id
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Payment transaction mismatch.",
        });
      }

      // ======================================
      // VERIFY RAZORPAY SIGNATURE
      // ======================================

      const expectedSignature =
        crypto
          .createHmac(
            "sha256",
            process.env.RAZORPAY_KEY_SECRET
          )
          .update(
            `${payment.gatewayOrderId}|${razorpay_payment_id}`
          )
          .digest("hex");

      if (
        !secureEqual(
          expectedSignature,
          razorpay_signature
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Invalid payment signature.",
        });
      }

      // ======================================
      // VERIFY ACTUAL CAPTURED PAYMENT
      // ======================================

      const captured =
        await razorpayRequest(
          `payments/${encodeURIComponent(
            razorpay_payment_id
          )}`
        );

      if (
        captured.status !== "captured" ||
        captured.id !==
          razorpay_payment_id ||
        captured.order_id !==
          payment.gatewayOrderId ||
        captured.currency !== "INR" ||
        captured.amount !==
          toPaise(order.total)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Payment capture is pending. Check status before retrying.",
        });
      }

      // ======================================
      // UPDATE PAYMENT RECORD
      // ======================================

      await Payment.updateOne(
        {
          _id: payment._id,

          status: {
            $ne: "Refunded",
          },
        },
        {
          $set: {
            status: "Completed",

            transactionId:
              captured.id,
          },
        }
      );

      // ======================================
      // MARK ORDER AS PAID
      // ======================================

      await Order.updateOne(
        {
          _id: order._id,

          paymentStatus: "Pending",
        },
        {
          $set: {
            paymentStatus: "Paid",
          },
        }
      );

      await Order.updateOne(
        {
          _id: order._id,

          status: {
            $ne: "Cancelled",
          },

          seatNumber: null,
        },
        {
          $set: {
            pickupTime:
              "Waiting for Admin to assign a seat",
          },
        }
      );

      // ======================================
      // SEAT IS NOT AUTO-ASSIGNED
      // ======================================

      const updated =
        await Order.findById(
          order._id
        );

      notifyOrder(req, updated);

      return res.json({
        success: true,

        order: publicOrder(updated),

        message:
          "Payment successful. Waiting for Admin to assign your seat.",
      });
    } catch (error) {
      console.error(
        "Kiosk payment verification:",
        error
      );

      return res.status(502).json({
        success: false,
        message:
          "Unable to confirm payment. Check tracking before retrying.",
      });
    }
  }
);

// ============================================
// RAZORPAY WEBHOOK
// ============================================

// app.js mein RAW BODY middleware
// express.json() se pehle register hona chahiye.

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
          message:
            "Webhook not configured.",
        });
      }

      // ======================================
      // VERIFY WEBHOOK SIGNATURE
      // ======================================

      const expected =
        crypto
          .createHmac(
            "sha256",
            secret
          )
          .update(req.body)
          .digest("hex");

      if (
        !secureEqual(
          expected,
          req.get(
            "x-razorpay-signature"
          )
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid webhook signature.",
        });
      }

      const event = JSON.parse(
        req.body.toString("utf8")
      );

      // ======================================
      // HANDLE CAPTURED PAYMENT
      // ======================================

      if (
        event.event !== "payment.captured"
      ) {
        return res.json({
          success: true,
          ignored: true,
        });
      }

      const captured =
        event.payload?.payment?.entity;

      if (
        !captured?.id ||
        !captured?.order_id ||
        captured.status !== "captured" ||
        captured.currency !== "INR"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid payment event.",
        });
      }

      // ======================================
      // FIND PAYMENT AND ORDER
      // ======================================

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
        toPaise(payment.amount) !==
          toPaise(order.total) ||
        captured.amount !==
          toPaise(order.total)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Payment/order mismatch.",
        });
      }

      if (payment.status === "Refunded") {
        return res.json({
          success: true,
          ignored: true,
        });
      }

      if (
        payment.transactionId &&
        payment.transactionId !==
          captured.id
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Transaction mismatch.",
        });
      }

      // ======================================
      // SAVE VERIFIED PAYMENT
      // ======================================

      await Payment.updateOne(
        {
          _id: payment._id,

          status: {
            $ne: "Refunded",
          },
        },
        {
          $set: {
            status: "Completed",

            transactionId:
              captured.id,
          },
        }
      );

      // ======================================
      // UPDATE ORDER PAYMENT STATUS
      // ======================================

      await Order.updateOne(
        {
          _id: order._id,

          paymentStatus: "Pending",
        },
        {
          $set: {
            paymentStatus: "Paid",
          },
        }
      );

      await Order.updateOne(
        {
          _id: order._id,

          status: {
            $ne: "Cancelled",
          },

          seatNumber: null,
        },
        {
          $set: {
            pickupTime:
              "Waiting for Admin to assign a seat",
          },
        }
      );

      // ======================================
      // NOTIFY ADMIN / CUSTOMER
      // ======================================

      const updated =
        await Order.findById(
          order._id
        );

      notifyOrder(req, updated);

      return res.json({
        success: true,

        paymentStatus:
          updated.paymentStatus,
      });
    } catch (error) {
      console.error(
        "Razorpay webhook:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Webhook processing failed.",
      });
    }
  }
);

// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;
