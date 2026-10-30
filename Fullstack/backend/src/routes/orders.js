
"use strict";

const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Franchise = require("../models/Franchise");
const { protect, authorize } = require("../middleware/auth");
const { releaseSeat } = require("../services/seatService");

const router = express.Router();

// ============================================
// CONSTANTS
// ============================================

const PAYMENT_METHODS = [
  "Online (Razorpay)",
  "Counter Cash",
  "Counter UPI",
];

const COUNTER_METHODS = [
  "Counter Cash",
  "Counter UPI",
  "Cash on Pickup",
];

const NEXT_STATUS = {
  Pending: ["Confirmed", "Cancelled"],
  Confirmed: ["Preparing", "Cancelled"],
  Preparing: ["Ready"],
  Ready: ["Picked Up"],
};

// ============================================
// HELPERS
// ============================================

const money = (value) =>
  Math.round(Number(value) * 100) / 100;

const validId = (id) =>
  mongoose.isValidObjectId(id);

const hasSeat = (order) =>
  Number.isInteger(Number(order?.seatNumber)) &&
  Number(order?.seatNumber) > 0;

function fail(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

// ============================================
// ORDER SOCKET NOTIFICATIONS
// ============================================

function notifyOrder(req, order) {
  const io = req.app.get("io");

  if (!io || !order) return;

  const userId =
    order.userId?._id || order.userId;

  const franchiseId =
    order.franchiseId?._id || order.franchiseId;

  const payload = {
    orderId: order._id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    seatNumber: order.seatNumber || null,
    estimatedReadyTime:
      order.estimatedReadyTime || null,
    order,
  };

  io.to("kitchen").emit(
    "order_status_updated",
    payload
  );

  io.to(`order_${order._id}`).emit(
    "order_status_updated",
    payload
  );

  io.to(`order_${order._id}`).emit(
    "order_tracking_update",
    payload
  );

  if (userId) {
    io.to(`user_${userId}`).emit(
      "order_status_updated",
      payload
    );
  }

  if (franchiseId) {
    io.to(`franchise_${franchiseId}`).emit(
      "franchise_order_updated",
      order
    );
  }
}

// ============================================
// PAYMENT NOTIFICATIONS
// ============================================

function notifyPayment(req, order) {
  const io = req.app.get("io");

  if (!io || !order) return;

  const userId =
    order.userId?._id || order.userId;

  const payload = {
    orderId: order._id,
    paymentStatus: order.paymentStatus,
    seatNumber: order.seatNumber || null,
    order,
  };

  io.to("kitchen").emit(
    "payment_confirmed",
    payload
  );

  io.to(`order_${order._id}`).emit(
    "payment_confirmed",
    payload
  );

  if (userId) {
    io.to(`user_${userId}`).emit(
      "payment_confirmed",
      payload
    );
  }
}

// ============================================
// CREATE REGISTERED CUSTOMER ORDER
// KIOSK USES /api/kiosk/orders
// ============================================

router.post(
  "/",
  protect,
  authorize("user", "employee"),
  async (req, res) => {
    try {
      const {
        franchiseId,
        items,
        paymentMethod,
        pickupCounter,
        notes,
      } = req.body || {};

      if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return fail(
          res,
          400,
          "Choose a valid payment method."
        );
      }

      if (
        paymentMethod === "Online (Razorpay)" &&
        (
          !process.env.RAZORPAY_KEY_ID ||
          !process.env.RAZORPAY_KEY_SECRET
        )
      ) {
        return fail(
          res,
          503,
          "Online payment is not configured."
        );
      }

      if (!validId(franchiseId)) {
        return fail(res, 400, "Invalid franchise.");
      }

      const franchise = await Franchise.findOne({
        _id: franchiseId,
        status: "Active",
      });

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
          "Order must contain between 1 and 30 items."
        );
      }

      let subtotal = 0;
      const orderItems = [];

      for (const cartItem of items) {
        if (
          !cartItem ||
          !validId(cartItem.menuItemId) ||
          !Number.isInteger(cartItem.quantity) ||
          cartItem.quantity < 1 ||
          cartItem.quantity > 50
        ) {
          return fail(
            res,
            400,
            "Invalid menu item or quantity."
          );
        }

        const item = await MenuItem.findById(
          cartItem.menuItemId
        );

        if (
          !item ||
          !item.isAvailable ||
          String(item.franchiseId) !==
            String(franchise._id)
        ) {
          return fail(
            res,
            400,
            "One or more menu items are unavailable."
          );
        }

        const price = Number(item.price);

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          return fail(
            res,
            400,
            "Invalid menu price."
          );
        }

        subtotal += price * cartItem.quantity;

        orderItems.push({
          menuItemId: item._id,
          name: item.name,
          price,
          quantity: cartItem.quantity,
          instructions: String(
            cartItem.instructions || ""
          ).slice(0, 200),
        });
      }

      subtotal = money(subtotal);

      if (
        subtotal <= 0 ||
        !Number.isSafeInteger(
          Math.round(subtotal * 100)
        )
      ) {
        return fail(
          res,
          400,
          "Invalid order total."
        );
      }

      // Seat is NOT assigned during order creation.
      const order = await Order.create({
        userId: req.user._id,
        isGuestOrder: false,
        franchiseId: franchise._id,
        items: orderItems,
        subtotal,
        tax: 0,
        total: subtotal,
        paymentMethod,
        paymentStatus: "Pending",
        status: "Pending",
        seatNumber: null,
        notes: String(notes || "").slice(0, 500),
        pickupCounter:
          pickupCounter || "Franchise pickup counter",
        pickupTime: "Awaiting payment",
        estimatedReadyTime: null,
      });

      await order.populate(
        "userId",
        "name email department"
      );

      const io = req.app.get("io");

      if (io) {
        io.to("kitchen").emit(
          "new_order",
          order
        );

        io.to(`franchise_${franchise._id}`).emit(
          "franchise_order_updated",
          order
        );
      }

      return res.status(201).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error("Create order:", error);

      return fail(
        res,
        500,
        "Unable to create order."
      );
    }
  }
);

// ============================================
// CUSTOMER ORDER HISTORY
// ============================================

router.get("/my", protect, async (req, res) => {
  try {
    const orders = await Order.find({
      userId: req.user._id,
    })
      .sort({ createdAt: -1 })
      .populate(
        "items.menuItemId",
        "name image emoji"
      );

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error("My orders:", error);

    return fail(
      res,
      500,
      "Unable to load orders."
    );
  }
});

// ============================================
// ADMIN GET ALL ORDERS
// CUSTOMER SEAT IS DISPLAYED ONLY
// ============================================

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const { status, date } = req.query;
      const filter = {};

      if (status && status !== "All") {
        filter.status = status;
      }

      if (date) {
        const start = new Date(
          `${date}T00:00:00`
        );

        const end = new Date(
          `${date}T23:59:59.999`
        );

        if (
          Number.isNaN(start.getTime()) ||
          Number.isNaN(end.getTime())
        ) {
          return fail(
            res,
            400,
            "Invalid date filter."
          );
        }

        filter.createdAt = {
          $gte: start,
          $lte: end,
        };
      }

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .populate(
          "userId",
          "name email department"
        )
        .populate(
          "franchiseId",
          "name city"
        );

      return res.json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error("Admin orders:", error);

      return fail(
        res,
        500,
        "Unable to load admin orders."
      );
    }
  }
);

// ============================================
// CANCEL UNPAID ORDER
// ============================================

router.patch(
  "/:id/cancel",
  protect,
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(
          res,
          400,
          "Invalid order ID."
        );
      }

      const order = await Order.findById(
        req.params.id
      );

      if (!order) {
        return fail(
          res,
          404,
          "Order not found."
        );
      }

      const isOwner =
        order.userId &&
        String(order.userId) ===
          String(req.user._id);

      if (
        !isOwner &&
        req.user.role !== "admin"
      ) {
        return fail(
          res,
          403,
          "Not authorized."
        );
      }

      if (order.paymentStatus === "Paid") {
        return fail(
          res,
          409,
          "Paid orders require a refund process."
        );
      }

      if (
        !["Pending", "Confirmed"].includes(
          order.status
        )
      ) {
        return fail(
          res,
          409,
          "Order cannot be cancelled."
        );
      }

      const updated = await Order.findOneAndUpdate(
        {
          _id: order._id,
          status: order.status,
          paymentStatus: { $ne: "Paid" },
        },
        {
          $set: {
            status: "Cancelled",
            cancelReason: String(
              req.body?.reason || "Cancelled by user"
            ).slice(0, 500),
            pickupTime: "Cancelled",
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!updated) {
        return fail(
          res,
          409,
          "Order changed. Refresh and retry."
        );
      }

      try {
        await releaseSeat(updated._id);
      } catch (error) {
        console.error(
          "Seat release after cancel:",
          error
        );
      }

      notifyOrder(req, updated);

      return res.json({
        success: true,
        order: updated,
      });
    } catch (error) {
      console.error("Cancel order:", error);

      return fail(
        res,
        500,
        "Unable to cancel order."
      );
    }
  }
);

// ============================================
// ADMIN UPDATE ORDER STATUS
// PAYMENT + CUSTOMER SEAT REQUIRED
// ============================================

router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(
          res,
          400,
          "Invalid order ID."
        );
      }

      const {
        status,
        readyInMinutes,
      } = req.body || {};

      const order = await Order.findById(
        req.params.id
      );

      if (!order) {
        return fail(
          res,
          404,
          "Order not found."
        );
      }

      // Check valid status transition.
      if (
        !NEXT_STATUS[order.status]?.includes(
          status
        )
      ) {
        return fail(
          res,
          400,
          `Cannot change ${order.status} to ${status}.`
        );
      }

      // Paid orders need refund before cancellation.
      if (
        status === "Cancelled" &&
        order.paymentStatus === "Paid"
      ) {
        return fail(
          res,
          409,
          "Refund a paid order before cancelling."
        );
      }

      // Admin cannot confirm without payment.
      if (
        status !== "Cancelled" &&
        order.paymentStatus !== "Paid"
      ) {
        return fail(
          res,
          409,
          "Verify payment before accepting the order."
        );
      }

      // Seat is selected ONLY through kiosk.
      if (
        status === "Confirmed" &&
        !hasSeat(order)
      ) {
        return fail(
          res,
          409,
          "Customer must choose a seat before admin confirmation."
        );
      }

      let minutes = null;

      if (
        status === "Confirmed" ||
        status === "Preparing"
      ) {
        minutes = Number(readyInMinutes);

        if (
          !Number.isInteger(minutes) ||
          minutes < 1 ||
          minutes > 180
        ) {
          return fail(
            res,
            400,
            "Preparation time must be 1–180 minutes."
          );
        }
      }

      const update = { status };

      if (
        status === "Confirmed" ||
        status === "Preparing"
      ) {
        update.readyInMinutes = minutes;

        update.estimatedReadyTime = new Date(
          Date.now() + minutes * 60_000
        );

        update.pickupTime =
          `Ready in about ${minutes} minutes`;
      } else if (status === "Ready") {
        update.readyInMinutes = 0;

        update.estimatedReadyTime = new Date();

        update.pickupTime =
          "Ready for pickup";
      } else if (status === "Picked Up") {
        update.pickupTime = "Collected";
      } else if (status === "Cancelled") {
        update.cancelReason = "Cancelled by Admin";
        update.pickupTime = "Cancelled";
      }

      // Atomic check before confirming.
      const condition = {
        _id: order._id,
        status: order.status,
        paymentStatus:
          status === "Cancelled"
            ? { $ne: "Paid" }
            : "Paid",

        // Seat must still exist at update time.
        ...(status === "Confirmed"
          ? {
              seatNumber: {
                $type: "number",
                $gte: 1,
              },
            }
          : {}),
      };

      const updated = await Order.findOneAndUpdate(
        condition,
        { $set: update },
        {
          new: true,
          runValidators: true,
        }
      ).populate(
        "userId",
        "name email department"
      );

      if (!updated) {
        return fail(
          res,
          409,
          "Order changed or customer seat is still pending. Refresh and retry."
        );
      }

      // Release seat when completed or cancelled.
      if (
        status === "Picked Up" ||
        status === "Cancelled"
      ) {
        try {
          await releaseSeat(updated._id);
        } catch (error) {
          console.error(
            "Seat release failed:",
            error
          );
        }
      }

      // Kiosk detects this confirmation.
      notifyOrder(req, updated);

      return res.json({
        success: true,

        message:
          status === "Confirmed"
            ? `Order confirmed. Customer-selected seat ${updated.seatNumber}.`
            : `Order status updated to ${status}.`,

        seatNumber:
          updated.seatNumber || null,

        order: updated,
      });
    } catch (error) {
      console.error(
        "Update order status:",
        error
      );

      return fail(
        res,
        500,
        "Unable to update order status."
      );
    }
  }
);

// ============================================
// ADMIN VERIFY COUNTER CASH / UPI PAYMENT
// NO SEAT ASSIGNMENT
// ============================================

router.patch(
  "/admin/:id/counter-payment",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      if (!validId(req.params.id)) {
        return fail(
          res,
          400,
          "Invalid order ID."
        );
      }

      const order = await Order.findById(
        req.params.id
      );

      if (!order) {
        return fail(
          res,
          404,
          "Order not found."
        );
      }

      if (
        !COUNTER_METHODS.includes(
          order.paymentMethod
        ) ||
        order.status !== "Pending"
      ) {
        return fail(
          res,
          409,
          "Order is not eligible for counter payment."
        );
      }

      if (order.paymentStatus === "Paid") {
        return res.json({
          success: true,

          message: hasSeat(order)
            ? `Payment already received. Customer chose seat ${order.seatNumber}.`
            : "Payment already received. Waiting for customer seat selection.",

          order,
        });
      }

      if (order.paymentStatus !== "Pending") {
        return fail(
          res,
          409,
          "Payment cannot be confirmed in this state."
        );
      }

      const reference = String(
        req.body?.reference || ""
      ).trim();

      if (
        order.paymentMethod === "Counter UPI" &&
        (
          reference.length < 4 ||
          reference.length > 120
        )
      ) {
        return fail(
          res,
          400,
          "Enter a valid UPI transaction reference."
        );
      }

      // Cashier confirms actual payment received.
      const paidOrder = await Order.findOneAndUpdate(
        {
          _id: order._id,
          paymentStatus: "Pending",
          status: "Pending",
        },
        {
          $set: {
            paymentStatus: "Paid",
            counterPaymentReference:
              reference.slice(0, 120),
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

      if (!paidOrder) {
        return fail(
          res,
          409,
          "Payment state changed. Refresh and retry."
        );
      }

      notifyOrder(req, paidOrder);
      notifyPayment(req, paidOrder);

      return res.json({
        success: true,

        message:
          "Payment confirmed. Customer can now select an available seat.",

        seatNumber:
          paidOrder.seatNumber || null,

        order: paidOrder,
      });
    } catch (error) {
      console.error(
        "Counter payment:",
        error
      );

      return fail(
        res,
        500,
        "Unable to confirm counter payment."
      );
    }
  }
);

// ============================================
// GET SINGLE ORDER
// ============================================

router.get("/:id", protect, async (req, res) => {
  try {
    if (!validId(req.params.id)) {
      return fail(
        res,
        400,
        "Invalid order ID."
      );
    }

    const order = await Order.findById(
      req.params.id
    )
      .populate(
        "userId",
        "name email department"
      )
      .populate(
        "items.menuItemId",
        "name image emoji"
      );

    if (!order) {
      return fail(
        res,
        404,
        "Order not found."
      );
    }

    const ownerId =
      order.userId?._id || order.userId;

    const isOwner =
      ownerId &&
      String(ownerId) ===
        String(req.user._id);

    if (
      !isOwner &&
      req.user.role !== "admin"
    ) {
      return fail(
        res,
        403,
        "Not authorized to view this order."
      );
    }

    return res.json({
      success: true,
      order,
    });
  } catch (error) {
    console.error("Get order:", error);

    return fail(
      res,
      500,
      "Unable to load order."
    );
  }
});

// ============================================
// ADMIN SEAT ASSIGNMENT REMOVED
// ============================================

// No PATCH /admin/:id/seat endpoint.
// Seat selection is handled ONLY by:
// POST /api/kiosk/orders/:id/seat

module.exports = router;
