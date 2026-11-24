
"use strict";

const express = require("express");
const crypto = require("crypto");

const Order = require("../models/Order");
const Payment = require("../models/Payment");

const {
  protect,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

// ============================================
// CASHFREE CONFIGURATION
// ============================================

const CASHFREE_API_VERSION =
  process.env.CASHFREE_API_VERSION || "2025-01-01";

const configured = () =>
  Boolean(
    process.env.CASHFREE_APP_ID &&
    process.env.CASHFREE_SECRET_KEY
  );

const cashfreeBaseUrl = () => {
  const environment = (
    process.env.CASHFREE_ENV || "SANDBOX"
  ).toUpperCase();

  return environment === "PRODUCTION" ||
    environment === "PROD"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
};

// ============================================
// CASHFREE API HELPER
// ============================================

async function cashfree(
  endpoint,
  method = "GET",
  body,
  idempotencyKey
) {
  if (!configured()) {
    throw new Error(
      "Cashfree payment gateway is not configured."
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-client-id": process.env.CASHFREE_APP_ID,
    "x-client-secret": process.env.CASHFREE_SECRET_KEY,
    "x-api-version": CASHFREE_API_VERSION,
  };

  if (idempotencyKey) {
    headers["x-idempotency-key"] = idempotencyKey;
  }

  const response = await fetch(
    `${cashfreeBaseUrl()}${endpoint}`,
    {
      method,
      headers,
      ...(body
        ? { body: JSON.stringify(body) }
        : {}),
    }
  );

  const responseText = await response.text();

  let data = {};

  try {
    data = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    throw new Error(
      "Invalid response received from Cashfree."
    );
  }

  if (!response.ok) {
    console.error(
      "Cashfree API error:",
      response.status,
      data
    );

    throw new Error(
      data.message ||
      data.type ||
      "Cashfree API request failed."
    );
  }

  return data;
}

// ============================================
// HELPERS
// ============================================

function amountInPaise(amount) {
  return Math.round(Number(amount) * 100);
}

function safeEqual(a, b) {
  if (
    typeof a !== "string" ||
    typeof b !== "string"
  ) {
    return false;
  }

  const first = Buffer.from(a);
  const second = Buffer.from(b);

  return (
    first.length === second.length &&
    crypto.timingSafeEqual(first, second)
  );
}

function getCustomerPhone(user) {
  const possiblePhones = [
    user.phone,
    user.mobile,
    user.phoneNumber,
    user.mobileNumber,
  ];

  for (const value of possiblePhones) {
    if (!value) continue;

    const phone = String(value).replace(/\D/g, "");

    if (phone.length >= 10 && phone.length <= 15) {
      return phone;
    }
  }

  return null;
}

function emitPaymentConfirmed(req, order) {
  const io = req.app.get("io");

  if (!io) return;

  const payload = {
    orderId: order._id,
    paymentStatus: "Paid",
    order,
  };

  io.to("kitchen")
    .to(`user_${order.userId}`)
    .to(`order_${order._id}`)
    .emit("payment_confirmed", payload);

  io.to("kitchen").emit(
    "order_status_updated",
    {
      orderId: order._id,
      status: order.status,
      order,
    }
  );

  io.to(`franchise_${order.franchiseId}`).emit(
    "franchise_order_updated",
    order
  );
}

// ============================================
// FIND AND VERIFY CASHFREE PAYMENT
// ============================================

async function getSuccessfulPayment(payment, order) {
  const payments = await cashfree(
    `/orders/${encodeURIComponent(
      payment.gatewayOrderId
    )}/payments`
  );

  if (!Array.isArray(payments)) {
    throw new Error(
      "Unable to verify Cashfree payment."
    );
  }

  const successfulPayment = payments.find(
    (item) =>
      String(item.payment_status).toUpperCase() ===
      "SUCCESS"
  );

  if (!successfulPayment) {
    return null;
  }

  const expectedAmount = Number(order.total);
  const receivedAmount = Number(
    successfulPayment.payment_amount
  );

  if (
    String(successfulPayment.order_id) !==
      String(payment.gatewayOrderId) ||
    String(successfulPayment.payment_currency).toUpperCase() !==
      "INR" ||
    !Number.isFinite(receivedAmount) ||
    Math.round(receivedAmount * 100) !==
      amountInPaise(expectedAmount)
  ) {
    throw new Error(
      "Cashfree payment amount or order details do not match."
    );
  }

  return successfulPayment;
}

// ============================================
// MARK ORDER AS PAID
// ============================================

async function markOrderPaid(
  req,
  payment,
  order,
  gatewayPayment
) {
  if (
    !payment ||
    !order ||
    !gatewayPayment
  ) {
    throw new Error(
      "Payment details are incomplete."
    );
  }

  if (order.paymentStatus === "Paid") {
    return order;
  }

  if (order.status === "Cancelled") {
    throw new Error(
      "Cancelled orders cannot be marked as paid."
    );
  }

  const transactionId = String(
    gatewayPayment.cf_payment_id
  );

  if (!transactionId || transactionId === "undefined") {
    throw new Error(
      "Cashfree transaction ID is missing."
    );
  }

  const existingTransaction = await Payment.findOne({
    transactionId,
    _id: { $ne: payment._id },
  });

  if (existingTransaction) {
    throw new Error(
      "This transaction has already been processed."
    );
  }

  payment.status = "Completed";
  payment.gatewayName = "Cashfree";
  payment.gatewayPaymentId = transactionId;
  payment.gatewayPaymentStatus = "SUCCESS";
  payment.transactionId = transactionId;
  payment.paidAt = new Date();

  await payment.save();

  order.paymentStatus = "Paid";
  await order.save();

  emitPaymentConfirmed(req, order);

  return order;
}

// ============================================
// SYNC PAYMENT FROM CASHFREE
// ============================================

async function syncPayment(req, payment, order) {
  if (
    payment.status === "Completed" ||
    order.paymentStatus === "Paid"
  ) {
    return order;
  }

  const successfulPayment =
    await getSuccessfulPayment(payment, order);

  if (!successfulPayment) {
    return null;
  }

  return markOrderPaid(
    req,
    payment,
    order,
    successfulPayment
  );
}

// ============================================
// CASHFREE WEBHOOK SIGNATURE VERIFICATION
// ============================================

function verifyCashfreeWebhook(req) {
  const signature =
    req.headers["x-webhook-signature"];

  const timestamp =
    req.headers["x-webhook-timestamp"];

  if (
    !signature ||
    !timestamp ||
    !Buffer.isBuffer(req.body)
  ) {
    return false;
  }

  const rawBody = req.body.toString("utf8");

  const expectedSignature = crypto
    .createHmac(
      "sha256",
      process.env.CASHFREE_SECRET_KEY
    )
    .update(timestamp + rawBody)
    .digest("base64");

  return safeEqual(
    expectedSignature,
    signature
  );
}

// ============================================
// PAYMENT CONFIG
// ============================================

router.get("/config", (_req, res) => {
  return res.json({
    success: true,
    onlineEnabled: configured(),
    gateway: configured()
      ? "Cashfree"
      : null,
    environment:
      (process.env.CASHFREE_ENV || "SANDBOX")
        .toUpperCase(),
  });
});

// ============================================
// INITIATE CASHFREE PAYMENT
// ============================================

router.post(
  "/initiate",
  protect,
  authorize("user", "employee"),
  async (req, res) => {
    let payment;

    try {
      if (!configured()) {
        return res.status(503).json({
          success: false,
          message:
            "Cashfree online payment is not configured.",
        });
      }

      const order = await Order.findOne({
        _id: req.body.orderId,
        userId: req.user._id,
      });

      if (
        !order ||
        order.paymentMethod !== "Online (Cashfree)" ||
        order.status === "Cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Order is not eligible for Cashfree payment.",
        });
      }

      if (order.paymentStatus === "Paid") {
        return res.status(409).json({
          success: false,
          message: "Order already paid.",
        });
      }

      const phone = getCustomerPhone(req.user);

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "A valid phone number is required in your profile for Cashfree payment.",
        });
      }

      // Reuse an active Cashfree payment session.
      payment = await Payment.findOne({
        orderId: order._id,
        userId: req.user._id,
        gatewayName: "Cashfree",
        status: {
          $in: ["Initiated", "Processing"],
        },
        expiresAt: {
          $gt: new Date(),
        },
      }).sort({ createdAt: -1 });

      if (
        payment &&
        payment.paymentSessionId
      ) {
        return res.json({
          success: true,
          gateway: "Cashfree",
          gatewayOrderId: payment.gatewayOrderId,
          paymentSessionId: payment.paymentSessionId,
          amount: amountInPaise(order.total),
          orderAmount: Number(order.total),
          currency: "INR",
          environment:
            (process.env.CASHFREE_ENV || "SANDBOX")
              .toLowerCase(),
        });
      }

      const gatewayOrderId =
        `OB_${Date.now()}_${crypto
          .randomBytes(5)
          .toString("hex")}`;

      // Save local payment record before contacting gateway.
      payment = await Payment.create({
        orderId: order._id,
        userId: req.user._id,
        amount: order.total,
        paymentMethod: order.paymentMethod,
        paymentId:
          `OBP-${crypto.randomBytes(9).toString("hex")}`,
        gatewayName: "Cashfree",
        gatewayOrderId,
        status: "Processing",
      });

      const customerDetails = {
        customer_id: String(req.user._id),
        customer_name:
          req.user.name || "OfficeBite Customer",
        customer_email:
          req.user.email || "customer@example.com",
        customer_phone: phone,
      };

      const orderMeta = {};

      if (process.env.CASHFREE_RETURN_URL) {
        orderMeta.return_url =
          process.env.CASHFREE_RETURN_URL;
      }

      if (process.env.CASHFREE_NOTIFY_URL) {
        orderMeta.notify_url =
          process.env.CASHFREE_NOTIFY_URL;
      }

      const requestBody = {
        order_id: gatewayOrderId,
        order_amount: Number(order.total),
        order_currency: "INR",
        customer_details: customerDetails,
        order_note: `OfficeBite ${order.orderNumber}`,
        ...(Object.keys(orderMeta).length
          ? { order_meta: orderMeta }
          : {}),
      };

      const gatewayOrder = await cashfree(
        "/orders",
        "POST",
        requestBody,
        crypto.randomUUID()
      );

      if (!gatewayOrder.payment_session_id) {
        throw new Error(
          "Cashfree did not return a payment session."
        );
      }

      payment.paymentSessionId =
        gatewayOrder.payment_session_id;

      payment.gatewayResponse = {
        cfOrderId: gatewayOrder.cf_order_id,
        orderStatus: gatewayOrder.order_status,
      };

      payment.expiresAt = gatewayOrder.order_expiry_time
        ? new Date(gatewayOrder.order_expiry_time)
        : new Date(Date.now() + 15 * 60 * 1000);

      await payment.save();

      return res.json({
        success: true,
        gateway: "Cashfree",
        gatewayOrderId,
        paymentSessionId:
          gatewayOrder.payment_session_id,
        amount: amountInPaise(order.total),
        orderAmount: Number(order.total),
        currency: "INR",
        environment:
          (process.env.CASHFREE_ENV || "SANDBOX")
            .toLowerCase(),
      });
    } catch (error) {
      console.error(
        "Cashfree initiation error:",
        error.message
      );

      if (payment) {
        payment.status = "Failed";
        await payment.save().catch(() => {});
      }

      return res.status(502).json({
        success: false,
        message: error.message ||
          "Unable to initiate Cashfree payment.",
      });
    }
  }
);

// ============================================
// VERIFY CASHFREE PAYMENT
// ============================================

router.post(
  "/verify",
  protect,
  authorize("user", "employee"),
  async (req, res) => {
    try {
      if (!configured()) {
        return res.status(503).json({
          success: false,
          message: "Cashfree is not configured.",
        });
      }

      const { orderId, gatewayOrderId } = req.body;

      if (
        typeof orderId !== "string" ||
        typeof gatewayOrderId !== "string" ||
        !orderId ||
        !gatewayOrderId
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing payment details.",
        });
      }

      const order = await Order.findOne({
        _id: orderId,
        userId: req.user._id,
      });

      const payment = await Payment.findOne({
        orderId,
        userId: req.user._id,
        gatewayOrderId,
        gatewayName: "Cashfree",
      });

      if (
        !order ||
        !payment ||
        order.paymentMethod !== "Online (Cashfree)" ||
        order.status === "Cancelled"
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Payment does not belong to this order.",
        });
      }

      if (order.paymentStatus === "Paid") {
        return res.json({
          success: true,
          paymentStatus: "Paid",
          order,
        });
      }

      const updatedOrder = await syncPayment(
        req,
        payment,
        order
      );

      if (!updatedOrder) {
        return res.status(202).json({
          success: true,
          paymentStatus: "Pending",
          message:
            "Payment has not been confirmed yet. Please check again.",
        });
      }

      return res.json({
        success: true,
        paymentStatus: "Paid",
        order: updatedOrder,
      });
    } catch (error) {
      console.error(
        "Cashfree verification error:",
        error.message
      );

      return res.status(502).json({
        success: false,
        message:
          "Payment verification failed. Please check payment status again.",
      });
    }
  }
);

// ============================================
// CASHFREE WEBHOOK
// POST /api/payments/cashfree/webhook
// ============================================

router.post(
  "/cashfree/webhook",
  async (req, res) => {
    try {
      if (!configured()) {
        return res.status(503).send(
          "Cashfree is not configured."
        );
      }

      if (!verifyCashfreeWebhook(req)) {
        return res.status(401).send(
          "Invalid Cashfree webhook signature."
        );
      }

      const rawBody = req.body.toString("utf8");

      let event;

      try {
        event = JSON.parse(rawBody);
      } catch {
        return res.status(400).send(
          "Invalid webhook payload."
        );
      }

      const eventType = String(
        event.type || ""
      ).toUpperCase();

      const gatewayOrderId =
        event.data?.order?.order_id;

      const gatewayPaymentId =
        event.data?.payment?.cf_payment_id;

      if (!gatewayOrderId) {
        return res.status(200).json({
          success: true,
          message: "Webhook received.",
        });
      }

      const payment = await Payment.findOne({
        gatewayOrderId,
        gatewayName: "Cashfree",
      });

      if (!payment) {
        return res.status(200).json({
          success: true,
          message:
            "No matching local payment found.",
        });
      }

      const order = await Order.findById(
        payment.orderId
      );

      if (!order) {
        return res.status(200).json({
          success: true,
          message: "Order not found.",
        });
      }

      if (
        eventType === "PAYMENT_SUCCESS_WEBHOOK" &&
        gatewayPaymentId
      ) {
        // Never trust webhook payload alone.
        // Verify the transaction directly with Cashfree.
        const successfulPayment =
          await getSuccessfulPayment(
            payment,
            order
          );

        if (successfulPayment) {
          await markOrderPaid(
            req,
            payment,
            order,
            successfulPayment
          );

          payment.webhookReceived = true;
          payment.webhookReceivedAt = new Date();

          await payment.save();
        }
      }

      if (
        eventType === "PAYMENT_FAILED_WEBHOOK" &&
        order.paymentStatus !== "Paid"
      ) {
        payment.gatewayPaymentStatus =
          event.data?.payment?.payment_status ||
          "FAILED";

        payment.webhookReceived = true;
        payment.webhookReceivedAt = new Date();

        await payment.save();
      }

      return res.status(200).json({
        success: true,
        message: "Webhook processed.",
      });
    } catch (error) {
      console.error(
        "Cashfree webhook error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message: "Webhook processing failed.",
      });
    }
  }
);

// ============================================
// PAYMENT STATUS
// ============================================

router.get(
  "/status/:orderId",
  protect,
  async (req, res) => {
    try {
      const order = await Order.findById(
        req.params.orderId
      );

      if (
        !order ||
        (
          req.user.role !== "admin" &&
          String(order.userId) !==
            String(req.user._id)
        )
      ) {
        return res.status(404).json({
          success: false,
          message: "Payment not found.",
        });
      }

      // Sync pending Cashfree payments with gateway.
      if (
        configured() &&
        order.paymentMethod === "Online (Cashfree)" &&
        order.paymentStatus !== "Paid"
      ) {
        const payment = await Payment.findOne({
          orderId: order._id,
          gatewayName: "Cashfree",
        }).sort({ createdAt: -1 });

        if (payment) {
          await syncPayment(
            req,
            payment,
            order
          );
        }
      }

      const refreshedOrder =
        await Order.findById(order._id);

      return res.json({
        success: true,
        paymentStatus:
          refreshedOrder.paymentStatus,
        paymentMethod:
          refreshedOrder.paymentMethod,
        gateway: "Cashfree",
      });
    } catch (error) {
      console.error(
        "Payment status error:",
        error.message
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch payment status.",
      });
    }
  }
);

module.exports = router;
