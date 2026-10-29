
const express = require("express");
const crypto = require("crypto");

const Order = require("../models/Order");
const Payment = require("../models/Payment");

const {
  protect,
  authorize,
} = require("../middleware/auth");

const router = express.Router();

const configured = () =>
  Boolean(
    process.env.RAZORPAY_KEY_ID &&
    process.env.RAZORPAY_KEY_SECRET
  );

// ============================================
// RAZORPAY API HELPER
// ============================================

async function razorpay(
  endpoint,
  method = "GET",
  body
) {
  const auth = Buffer.from(
    `${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `https://api.razorpay.com/v1/${endpoint}`,
    {
      method,
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      ...(body
        ? { body: JSON.stringify(body) }
        : {}),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.description ||
        "Razorpay API request failed."
    );
  }

  return data;
}

// ============================================
// PAYMENT CONFIG
// ============================================

router.get("/config", (_req, res) => {
  res.json({
    success: true,
    onlineEnabled: configured(),
    keyId: configured()
      ? process.env.RAZORPAY_KEY_ID
      : null,
  });
});

// ============================================
// INITIATE PAYMENT
// ============================================

router.post(
  "/initiate",
  protect,
  authorize("user", "employee"),
  async (req, res) => {
    try {
      if (!configured()) {
        return res.status(503).json({
          success: false,
          message: "Online payment is not configured.",
        });
      }

      const order = await Order.findOne({
        _id: req.body.orderId,
        userId: req.user._id,
      });

      if (
        !order ||
        order.paymentMethod !== "Online (Razorpay)" ||
        order.status === "Cancelled"
      ) {
        return res.status(400).json({
          success: false,
          message: "Order is not eligible for payment.",
        });
      }

      if (order.paymentStatus === "Paid") {
        return res.status(409).json({
          success: false,
          message: "Order already paid.",
        });
      }

      let payment = await Payment.findOne({
        orderId: order._id,
        status: {
          $in: ["Initiated", "Processing"],
        },
      }).sort({ createdAt: -1 });

      if (!payment) {
        const gatewayOrder = await razorpay(
          "orders",
          "POST",
          {
            amount: Math.round(order.total * 100),
            currency: "INR",
            receipt: order.orderNumber,
            notes: {
              officebiteOrderId: String(order._id),
            },
          }
        );

        payment = await Payment.create({
          orderId: order._id,
          userId: req.user._id,
          amount: order.total,
          paymentMethod: order.paymentMethod,
          paymentId:
            `OBP-${crypto.randomBytes(9).toString("hex")}`,
          gatewayOrderId: gatewayOrder.id,
          status: "Initiated",
        });
      }

      return res.json({
        success: true,
        gatewayOrderId: payment.gatewayOrderId,
        keyId: process.env.RAZORPAY_KEY_ID,
        amount: Math.round(order.total * 100),
        currency: "INR",
        name: req.user.name,
      });
    } catch (error) {
      return res.status(502).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ============================================
// VERIFY PAYMENT
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
          message: "Payment gateway not configured.",
        });
      }

      const {
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      } = req.body;

      const values = [
        orderId,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      ];

      if (
        !values.every(
          (value) =>
            typeof value === "string" &&
            value.length > 0
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing payment details.",
        });
      }

      const payment = await Payment.findOne({
        orderId,
        userId: req.user._id,
        gatewayOrderId: razorpay_order_id,
      });

      const order = await Order.findOne({
        _id: orderId,
        userId: req.user._id,
      });

      if (
        !payment ||
        !order ||
        order.paymentMethod !== "Online (Razorpay)" ||
        order.status === "Cancelled"
      ) {
        return res.status(403).json({
          success: false,
          message: "Payment does not belong to this order.",
        });
      }

      if (order.paymentStatus === "Paid") {
        return res.json({
          success: true,
          order,
        });
      }

      // Verify Razorpay signature
      const expectedSignature = crypto
        .createHmac(
          "sha256",
          process.env.RAZORPAY_KEY_SECRET
        )
        .update(
          `${payment.gatewayOrderId}|${razorpay_payment_id}`
        )
        .digest("hex");

      const validSignature =
        /^[a-f\d]{64}$/i.test(razorpay_signature) &&
        crypto.timingSafeEqual(
          Buffer.from(expectedSignature, "hex"),
          Buffer.from(razorpay_signature, "hex")
        );

      if (!validSignature) {
        return res.status(403).json({
          success: false,
          message: "Invalid payment signature.",
        });
      }

      // Check actual captured payment with Razorpay
      const captured = await razorpay(
        `payments/${encodeURIComponent(
          razorpay_payment_id
        )}`
      );

      if (
        captured.status !== "captured" ||
        captured.order_id !== payment.gatewayOrderId ||
        captured.amount !==
          Math.round(order.total * 100)
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Payment not captured yet. Try verification again.",
        });
      }

      payment.status = "Completed";
      payment.transactionId = captured.id;

      await payment.save();

      order.paymentStatus = "Paid";
      await order.save();

      // Update service/customer dashboard
      const io = req.app.get("io");

      if (io) {
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

      return res.json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "Razorpay verification error:",
        error.message
      );

      return res.status(502).json({
        success: false,
        message:
          "Payment verification failed. Please check payment status.",
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
        (req.user.role !== "admin" &&
          String(order.userId) !==
            String(req.user._id))
      ) {
        return res.status(404).json({
          success: false,
          message: "Payment not found.",
        });
      }

      return res.json({
        success: true,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Unable to fetch payment status.",
      });
    }
  }
);

module.exports = router;
