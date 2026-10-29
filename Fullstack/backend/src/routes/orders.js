
"use strict";

const express = require("express");
const mongoose = require("mongoose");

const Order = require("../models/Order");
const MenuItem = require("../models/MenuItem");
const Franchise = require("../models/Franchise");

const {
  protect,
  authorize,
} = require("../middleware/auth");

const {
  releaseSeat,
  assignSeatByAdmin,
  listSeats,
} = require("../services/seatService");

const router = express.Router();

// ============================================
// PAYMENT METHODS
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

// ============================================
// ORDER STATUS TRANSITIONS
// ============================================

const NEXT_STATUS = {
  Pending: [
    "Confirmed",
    "Cancelled",
  ],

  Confirmed: [
    "Preparing",
    "Cancelled",
  ],

  Preparing: [
    "Ready",
  ],

  Ready: [
    "Picked Up",
  ],
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const roundMoney = (value) =>
  Math.round(Number(value) * 100) / 100;

function errorResponse(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
  });
}

function isValidId(id) {
  return mongoose.isValidObjectId(id);
}

// ============================================
// SOCKET.IO ORDER NOTIFICATIONS
// ============================================

function notifyOrder(req, order) {
  const io = req.app.get("io");

  if (!io || !order) return;

  const userId =
    order.userId?._id ||
    order.userId;

  const franchiseId =
    order.franchiseId?._id ||
    order.franchiseId;

  const payload = {
    orderId: order._id,

    orderNumber: order.orderNumber,

    status: order.status,

    paymentStatus:
      order.paymentStatus,

    // Admin-selected seat number
    seatNumber:
      order.seatNumber ?? null,

    estimatedReadyTime:
      order.estimatedReadyTime || null,

    order,
  };

  // ========================================
  // SERVICE ADMIN NOTIFICATION
  // ========================================

  io.to("kitchen").emit(
    "order_status_updated",
    payload
  );

  // ========================================
  // INDIVIDUAL CUSTOMER TRACKING
  // ========================================

  io.to(
    `order_${order._id}`
  ).emit(
    "order_status_updated",
    payload
  );

  io.to(
    `order_${order._id}`
  ).emit(
    "order_tracking_update",
    payload
  );

  // ========================================
  // REGISTERED CUSTOMER
  // ========================================

  if (userId) {
    io.to(
      `user_${userId}`
    ).emit(
      "order_status_updated",
      payload
    );
  }

  // ========================================
  // FRANCHISE DASHBOARD
  // ========================================

  if (franchiseId) {
    io.to(
      `franchise_${franchiseId}`
    ).emit(
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
    order.userId?._id ||
    order.userId;

  const payload = {
    orderId: order._id,

    paymentStatus:
      order.paymentStatus,

    seatNumber:
      order.seatNumber ?? null,

    order,
  };

  // Admin
  io.to("kitchen").emit(
    "payment_confirmed",
    payload
  );

  // Individual order
  io.to(
    `order_${order._id}`
  ).emit(
    "payment_confirmed",
    payload
  );

  // Registered customer
  if (userId) {
    io.to(
      `user_${userId}`
    ).emit(
      "payment_confirmed",
      payload
    );
  }
}

// ============================================
// CREATE REGISTERED CUSTOMER ORDER
// ============================================

// Guest customers use:
// POST /api/kiosk/orders

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

      // ======================================
      // VALIDATE PAYMENT METHOD
      // ======================================

      if (
        !PAYMENT_METHODS.includes(
          paymentMethod
        )
      ) {
        return errorResponse(
          res,
          400,
          "Choose a valid payment method."
        );
      }

      if (
        paymentMethod ===
          "Online (Razorpay)" &&
        (!process.env.RAZORPAY_KEY_ID ||
          !process.env.RAZORPAY_KEY_SECRET)
      ) {
        return errorResponse(
          res,
          503,
          "Online payment is not configured."
        );
      }

      // ======================================
      // VALIDATE FRANCHISE
      // ======================================

      if (!isValidId(franchiseId)) {
        return errorResponse(
          res,
          400,
          "Invalid franchise."
        );
      }

      const franchise =
        await Franchise.findOne({
          _id: franchiseId,
          status: "Active",
        });

      if (!franchise) {
        return errorResponse(
          res,
          400,
          "Select an active franchise."
        );
      }

      // ======================================
      // VALIDATE CART ITEMS
      // ======================================

      if (
        !Array.isArray(items) ||
        items.length < 1 ||
        items.length > 30
      ) {
        return errorResponse(
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
          !isValidId(
            cartItem.menuItemId
          ) ||
          !Number.isInteger(
            cartItem.quantity
          ) ||
          cartItem.quantity < 1 ||
          cartItem.quantity > 50
        ) {
          return errorResponse(
            res,
            400,
            "Invalid menu item or quantity."
          );
        }

        const item =
          await MenuItem.findById(
            cartItem.menuItemId
          );

        if (
          !item ||
          !item.isAvailable ||
          String(item.franchiseId) !==
            String(franchise._id)
        ) {
          return errorResponse(
            res,
            400,
            "One or more menu items are unavailable."
          );
        }

        const price =
          Number(item.price);

        if (
          !Number.isFinite(price) ||
          price < 0
        ) {
          return errorResponse(
            res,
            400,
            "Invalid menu price."
          );
        }

        // Database price is authoritative
        subtotal +=
          price * cartItem.quantity;

        orderItems.push({
          menuItemId: item._id,

          name: item.name,

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

      subtotal =
        roundMoney(subtotal);

      if (
        subtotal <= 0 ||
        !Number.isSafeInteger(
          Math.round(
            subtotal * 100
          )
        )
      ) {
        return errorResponse(
          res,
          400,
          "Invalid order total."
        );
      }

      // ======================================
      // CREATE ORDER
      // ======================================

      const order =
        await Order.create({
          userId:
            req.user._id,

          isGuestOrder: false,

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

          // Admin manually assigns seat
          seatNumber: null,

          notes: String(
            notes || ""
          ).slice(0, 500),

          pickupCounter:
            pickupCounter ||
            "Franchise pickup counter",

          pickupTime:
            "Awaiting payment",

          estimatedReadyTime:
            null,
        });

      await order.populate(
        "userId",
        "name email department"
      );

      // ======================================
      // REAL-TIME NEW ORDER
      // ======================================

      const io =
        req.app.get("io");

      if (io) {
        io.to("kitchen").emit(
          "new_order",
          order
        );

        io.to(
          `franchise_${franchise._id}`
        ).emit(
          "franchise_order_updated",
          order
        );
      }

      return res.status(201).json({
        success: true,

        message:
          "Order created successfully.",

        order,
      });
    } catch (error) {
      console.error(
        "Create order:",
        error
      );

      return errorResponse(
        res,
        500,
        "Unable to create order."
      );
    }
  }
);

// ============================================
// REGISTERED CUSTOMER ORDER HISTORY
// ============================================

router.get(
  "/my",
  protect,
  async (req, res) => {
    try {
      const orders =
        await Order.find({
          userId:
            req.user._id,
        })
          .sort({
            createdAt: -1,
          })
          .populate(
            "items.menuItemId",
            "name image emoji"
          );

      return res.json({
        success: true,
        orders,
      });
    } catch (error) {
      console.error(
        "My orders:",
        error
      );

      return errorResponse(
        res,
        500,
        "Unable to load orders."
      );
    }
  }
);

// ============================================
// ADMIN — GET ALL CUSTOMER ORDERS
// ============================================

// Includes:
// - Guest/Kiosk customers
// - Registered customers
// - All franchise orders

router.get(
  "/admin/all",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const {
        status,
        date,
      } = req.query;

      const filter = {};

      if (
        status &&
        status !== "All"
      ) {
        filter.status = status;
      }

      // ======================================
      // DATE FILTER
      // ======================================

      if (date) {
        const start = new Date(
          `${date}T00:00:00`
        );

        const end = new Date(
          `${date}T23:59:59.999`
        );

        if (
          Number.isNaN(
            start.getTime()
          ) ||
          Number.isNaN(
            end.getTime()
          )
        ) {
          return errorResponse(
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

      const orders =
        await Order.find(
          filter
        )
          .sort({
            createdAt: -1,
          })
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
      console.error(
        "Admin orders:",
        error
      );

      return errorResponse(
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
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return errorResponse(
          res,
          400,
          "Invalid order ID."
        );
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return errorResponse(
          res,
          404,
          "Order not found."
        );
      }

      // ======================================
      // AUTHORIZATION
      // ======================================

      const isOwner =
        order.userId &&
        String(order.userId) ===
          String(req.user._id);

      const isAdmin =
        req.user.role === "admin";

      if (
        !isOwner &&
        !isAdmin
      ) {
        return errorResponse(
          res,
          403,
          "Not authorized."
        );
      }

      // ======================================
      // PAID ORDERS REQUIRE REFUND
      // ======================================

      if (
        order.paymentStatus ===
        "Paid"
      ) {
        return errorResponse(
          res,
          409,
          "Paid orders require a refund process."
        );
      }

      if (
        ![
          "Pending",
          "Confirmed",
        ].includes(
          order.status
        )
      ) {
        return errorResponse(
          res,
          409,
          "Order cannot be cancelled."
        );
      }

      // ======================================
      // ATOMIC CANCELLATION
      // ======================================

      const updated =
        await Order.findOneAndUpdate(
          {
            _id:
              order._id,

            status:
              order.status,

            paymentStatus: {
              $ne: "Paid",
            },
          },
          {
            $set: {
              status:
                "Cancelled",

              cancelReason: String(
                req.body?.reason ||
                  "Cancelled by user"
              ).slice(0, 500),

              pickupTime:
                "Cancelled",
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updated) {
        return errorResponse(
          res,
          409,
          "Order changed. Refresh and retry."
        );
      }

      // ======================================
      // RELEASE SEAT IF RESERVED
      // ======================================

      try {
        await releaseSeat(
          updated._id
        );
      } catch (error) {
        console.error(
          "Seat release after cancel:",
          error
        );
      }

      notifyOrder(
        req,
        updated
      );

      return res.json({
        success: true,
        order: updated,
      });
    } catch (error) {
      console.error(
        "Cancel order:",
        error
      );

      return errorResponse(
        res,
        500,
        "Unable to cancel order."
      );
    }
  }
);

// ============================================
// ADMIN — UPDATE ORDER STATUS
// ============================================

router.patch(
  "/admin/:id/status",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return errorResponse(
          res,
          400,
          "Invalid order ID."
        );
      }

      const {
        status,
        readyInMinutes,
      } = req.body || {};

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return errorResponse(
          res,
          404,
          "Order not found."
        );
      }

      // ======================================
      // VALIDATE STATUS TRANSITION
      // ======================================

      if (
        !NEXT_STATUS[
          order.status
        ]?.includes(
          status
        )
      ) {
        return errorResponse(
          res,
          400,
          `Cannot change ${order.status} to ${status}.`
        );
      }

      // ======================================
      // PAYMENT FIRST VALIDATION
      // ======================================

      if (
        status ===
          "Cancelled" &&
        order.paymentStatus ===
          "Paid"
      ) {
        return errorResponse(
          res,
          409,
          "Refund a paid order before cancelling."
        );
      }

      if (
        status !==
          "Cancelled" &&
        order.paymentStatus !==
          "Paid"
      ) {
        return errorResponse(
          res,
          409,
          "Verify payment before accepting the order."
        );
      }

      // ======================================
      // PREPARATION TIME VALIDATION
      // ======================================

      let minutes = null;

      if (
        [
          "Confirmed",
          "Preparing",
        ].includes(status)
      ) {
        minutes =
          Number(
            readyInMinutes
          );

        if (
          !Number.isInteger(
            minutes
          ) ||
          minutes < 1 ||
          minutes > 180
        ) {
          return errorResponse(
            res,
            400,
            "Preparation time must be between 1 and 180 minutes."
          );
        }
      }

      // ======================================
      // MANUAL SEAT MUST EXIST BEFORE
      // ADMIN CONFIRMS THE ORDER
      // ======================================

      if (
        status ===
          "Confirmed" &&
        order.seatNumber == null
      ) {
        return errorResponse(
          res,
          409,
          "Assign a seat manually before confirming the order."
        );
      }

      // ======================================
      // BUILD STATUS UPDATE
      // ======================================

      const update = {
        status,
      };

      if (
        status ===
          "Confirmed" ||
        status ===
          "Preparing"
      ) {
        update.readyInMinutes =
          minutes;

        update.estimatedReadyTime =
          new Date(
            Date.now() +
              minutes * 60000
          );

        update.pickupTime =
          `Ready in about ${minutes} minutes`;
      }

      if (
        status === "Ready"
      ) {
        update.readyInMinutes =
          0;

        update.estimatedReadyTime =
          new Date();

        update.pickupTime =
          "Ready for pickup";
      }

      if (
        status ===
        "Picked Up"
      ) {
        update.pickupTime =
          "Collected";
      }

      if (
        status ===
        "Cancelled"
      ) {
        update.cancelReason =
          "Cancelled by Admin";

        update.pickupTime =
          "Cancelled";
      }

      // ======================================
      // SAVE STATUS ATOMICALLY
      // ======================================

      const updated =
        await Order.findOneAndUpdate(
          {
            _id:
              order._id,

            status:
              order.status,

            paymentStatus:
              status ===
              "Cancelled"
                ? {
                    $ne: "Paid",
                  }
                : "Paid",
          },
          {
            $set: update,
          },
          {
            new: true,
            runValidators: true,
          }
        ).populate(
          "userId",
          "name email department"
        );

      if (!updated) {
        return errorResponse(
          res,
          409,
          "Order state changed. Refresh and retry."
        );
      }

      // ======================================
      // RELEASE SEAT AFTER PICKUP / CANCEL
      // ======================================

      if (
        [
          "Picked Up",
          "Cancelled",
        ].includes(
          status
        )
      ) {
        try {
          await releaseSeat(
            updated._id
          );
        } catch (error) {
          console.error(
            "Seat release failed:",
            error
          );
        }
      }

      // ======================================
      // NOTIFY ADMIN / CUSTOMER
      // ======================================

      notifyOrder(
        req,
        updated
      );

      return res.json({
        success: true,

        message:
          status === "Confirmed"
            ? `Order confirmed. Admin-selected seat ${updated.seatNumber}.`
            : `Order status updated to ${status}.`,

        seatNumber:
          updated.seatNumber ?? null,

        order: updated,
      });
    } catch (error) {
      console.error(
        "Update order status:",
        error
      );

      return errorResponse(
        res,
        500,
        "Unable to update order status."
      );
    }
  }
);

// ============================================
// ADMIN — COUNTER PAYMENT CONFIRMATION
// ============================================

// No automatic seat allocation here.
// Admin assigns the seat separately.

router.patch(
  "/admin/:id/counter-payment",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return errorResponse(
          res,
          400,
          "Invalid order ID."
        );
      }

      const order =
        await Order.findById(
          req.params.id
        );

      if (!order) {
        return errorResponse(
          res,
          404,
          "Order not found."
        );
      }

      // ======================================
      // CHECK PAYMENT METHOD
      // ======================================

      if (
        !COUNTER_METHODS.includes(
          order.paymentMethod
        ) ||
        [
          "Cancelled",
          "Picked Up",
        ].includes(
          order.status
        )
      ) {
        return errorResponse(
          res,
          409,
          "Order is not eligible for counter payment."
        );
      }

      // ======================================
      // ALREADY PAID
      // ======================================

      if (
        order.paymentStatus ===
        "Paid"
      ) {
        return res.json({
          success: true,

          message:
            order.seatNumber != null
              ? `Payment already received. Seat ${order.seatNumber} assigned.`
              : "Payment already received. Waiting for Admin to choose a seat.",

          order,
        });
      }

      if (
        order.paymentStatus !==
        "Pending"
      ) {
        return errorResponse(
          res,
          409,
          "Payment cannot be confirmed in this state."
        );
      }

      // ======================================
      // COUNTER UPI REFERENCE
      // ======================================

      const reference =
        String(
          req.body?.reference ||
            ""
        ).trim();

      if (
        order.paymentMethod ===
          "Counter UPI" &&
        (
          reference.length < 4 ||
          reference.length > 120
        )
      ) {
        return errorResponse(
          res,
          400,
          "Enter a valid UPI transaction reference."
        );
      }

      // Admin must verify actual receipt of
      // Cash/UPI before confirming payment.

      // ======================================
      // MARK PAYMENT AS PAID
      // ======================================

      const updated =
        await Order.findOneAndUpdate(
          {
            _id:
              order._id,

            paymentStatus:
              "Pending",

            status: {
              $ne: "Cancelled",
            },
          },
          {
            $set: {
              paymentStatus:
                "Paid",

              counterPaymentReference:
                reference.slice(
                  0,
                  120
                ),

              pickupTime:
                "Waiting for Admin to assign a seat",
            },
          },
          {
            new: true,
            runValidators: true,
          }
        );

      if (!updated) {
        return errorResponse(
          res,
          409,
          "Payment state changed. Refresh and retry."
        );
      }

      // ======================================
      // SEND PAYMENT CONFIRMATION
      // ======================================

      notifyOrder(
        req,
        updated
      );

      notifyPayment(
        req,
        updated
      );

      return res.json({
        success: true,

        message:
          "Payment confirmed. Admin can now select a seat manually.",

        seatNumber:
          updated.seatNumber ?? null,

        order: updated,
      });
    } catch (error) {
      console.error(
        "Counter payment:",
        error
      );

      return errorResponse(
        res,
        500,
        "Unable to confirm counter payment."
      );
    }
  }
);

// ============================================
// ADMIN — GET AVAILABLE SEATS
// ============================================

// Endpoint:
// GET /api/orders/admin/seats?franchiseId=...

router.get(
  "/admin/seats",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const {
        franchiseId,
      } = req.query;

      if (
        !isValidId(
          franchiseId
        )
      ) {
        return errorResponse(
          res,
          400,
          "Invalid franchise ID."
        );
      }

      const seats =
        await listSeats(
          franchiseId
        );

      return res.json({
        success: true,

        capacity:
          seats.capacity,

        available:
          seats.available,

        occupied:
          seats.occupied,
      });
    } catch (error) {
      console.error(
        "Get available seats:",
        error
      );

      return errorResponse(
        res,
        error.status || 500,
        error.status
          ? error.message
          : "Unable to load seats."
      );
    }
  }
);

// ============================================
// ADMIN — MANUALLY ASSIGN CUSTOM SEAT
// ============================================

// Endpoint:
// PATCH /api/orders/admin/:id/seat
//
// Request body:
// { "seatNumber": 4 }
//
// Only Admin can assign a seat.
// Guest cannot call this endpoint.

router.patch(
  "/admin/:id/seat",
  protect,
  authorize("admin"),
  async (req, res) => {
    try {
      const {
        seatNumber,
      } = req.body || {};

      // ======================================
      // VALIDATE ORDER ID
      // ======================================

      if (
        !isValidId(
          req.params.id
        )
      ) {
        return errorResponse(
          res,
          400,
          "Invalid order ID."
        );
      }

      // ======================================
      // CALL MANUAL SEAT SERVICE
      // ======================================

      const order =
        await assignSeatByAdmin(
          req.params.id,
          seatNumber
        );

      // ======================================
      // NOTIFY CUSTOMER / ADMIN / FRANCHISE
      // ======================================

      notifyOrder(
        req,
        order
      );

      const io =
        req.app.get("io");

      if (io) {
        io.to(
          `order_${order._id}`
        ).emit(
          "seat_assigned",
          {
            orderId:
              order._id,

            orderNumber:
              order.orderNumber,

            seatNumber:
              order.seatNumber,

            message:
              `Admin assigned seat ${order.seatNumber}.`,
          }
        );
      }

      // ======================================
      // RETURN ASSIGNED SEAT
      // ======================================

      return res.json({
        success: true,

        message:
          `Seat ${order.seatNumber} assigned by Admin.`,

        seatNumber:
          order.seatNumber,

        order,
      });
    } catch (error) {
      console.error(
        "Admin seat assignment:",
        error
      );

      return errorResponse(
        res,
        error.status || 500,
        error.status
          ? error.message
          : "Unable to assign a seat."
      );
    }
  }
);

// ============================================
// GET SINGLE ORDER
// ============================================

// Registered customer/Admin only.
//
// Guest customer uses:
// GET /api/kiosk/track/:code

router.get(
  "/:id",
  protect,
  async (req, res) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return errorResponse(
          res,
          400,
          "Invalid order ID."
        );
      }

      const order =
        await Order.findById(
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
        return errorResponse(
          res,
          404,
          "Order not found."
        );
      }

      // ======================================
      // CHECK ORDER OWNERSHIP
      // ======================================

      const ownerId =
        order.userId?._id ||
        order.userId;

      const isOwner =
        ownerId &&
        String(ownerId) ===
          String(req.user._id);

      const isAdmin =
        req.user.role === "admin";

      if (
        !isOwner &&
        !isAdmin
      ) {
        return errorResponse(
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
      console.error(
        "Get order:",
        error
      );

      return errorResponse(
        res,
        500,
        "Unable to load order."
      );
    }
  }
);

// ============================================
// EXPORT ROUTER
// ============================================

module.exports = router;
