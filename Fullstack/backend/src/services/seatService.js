
"use strict";

const mongoose = require("mongoose");
const Order = require("../models/Order");

// ============================================
// SEAT RESERVATION SCHEMA
// ============================================

const reservationSchema = new mongoose.Schema(
  {
    franchiseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Franchise",
      required: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    seatNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// PREVENT DUPLICATE SEAT BOOKING
// ============================================

// Only one active order can occupy a seat
// within the same franchise.

reservationSchema.index(
  {
    franchiseId: 1,
    seatNumber: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      active: true,
    },
  }
);

// One order cannot reserve multiple active seats.

reservationSchema.index(
  {
    orderId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      active: true,
    },
  }
);

// ============================================
// SEAT RESERVATION MODEL
// ============================================

const SeatReservation =
  mongoose.models.SeatReservation ||
  mongoose.model(
    "SeatReservation",
    reservationSchema
  );

// ============================================
// TOTAL SEATS PER FRANCHISE
// ============================================

function seatCapacity() {
  const value = Number(
    process.env.SEATS_PER_FRANCHISE || 20
  );

  return Number.isInteger(value) &&
    value >= 1 &&
    value <= 500
    ? value
    : 20;
}

// ============================================
// CUSTOM ERROR HELPER
// ============================================

function seatError(message, status = 409) {
  const error = new Error(message);

  error.status = status;

  return error;
}

// ============================================
// GET AVAILABLE AND OCCUPIED SEATS
// ============================================

async function listSeats(franchiseId) {
  if (!mongoose.isValidObjectId(franchiseId)) {
    throw seatError(
      "Invalid franchise ID.",
      400
    );
  }

  const capacity = seatCapacity();

  // Find all active seat reservations
  const reservations =
    await SeatReservation.find({
      franchiseId,
      active: true,
    })
      .select("seatNumber orderId -_id")
      .lean();

  const occupied = reservations.map(
    (item) => item.seatNumber
  );

  // Available seat numbers
  const available = Array.from(
    {
      length: capacity,
    },
    (_, index) => index + 1
  ).filter(
    (number) => !occupied.includes(number)
  );

  return {
    capacity,
    occupied,
    available,
  };
}

// ============================================
// ADMIN — MANUALLY ASSIGN SEAT
// ============================================

// IMPORTANT:
// Only call this function from an authenticated
// and Admin-authorized backend route.
//
// Do NOT call automatically from:
// - Customer kiosk
// - Razorpay payment verification
// - Razorpay webhook

async function assignSeatByAdmin(
  orderId,
  selectedSeat
) {
  const seatNumber = Number(selectedSeat);

  // ========================================
  // VALIDATE SELECTED SEAT NUMBER
  // ========================================

  if (
    !Number.isInteger(seatNumber) ||
    seatNumber < 1 ||
    seatNumber > seatCapacity()
  ) {
    throw seatError(
      `Choose a seat between 1 and ${seatCapacity()}.`,
      400
    );
  }

  if (!mongoose.isValidObjectId(orderId)) {
    throw seatError(
      "Invalid order ID.",
      400
    );
  }

  // Ensure MongoDB unique indexes are ready
  await SeatReservation.init();

  // ========================================
  // FIND CUSTOMER ORDER
  // ========================================

  const order = await Order.findById(
    orderId
  );

  if (!order) {
    throw seatError(
      "Order not found.",
      404
    );
  }

  // ========================================
  // PAYMENT MUST BE VERIFIED FIRST
  // ========================================

  if (order.paymentStatus !== "Paid") {
    throw seatError(
      "Payment must be verified before assigning a seat."
    );
  }

  // ========================================
  // CHECK ORDER STATUS
  // ========================================

  if (
    ["Picked Up", "Cancelled"].includes(
      order.status
    )
  ) {
    throw seatError(
      "Cannot assign a seat to a completed or cancelled order."
    );
  }

  // ========================================
  // CHECK EXISTING SEAT NUMBER
  // ========================================

  if (order.seatNumber != null) {
    if (order.seatNumber === seatNumber) {
      return order;
    }

    throw seatError(
      `This order already has seat ${order.seatNumber}.`
    );
  }

  // ========================================
  // CHECK EXISTING ACTIVE RESERVATION
  // ========================================

  const existing =
    await SeatReservation.findOne({
      orderId: order._id,
      active: true,
    });

  if (existing) {
    if (existing.seatNumber !== seatNumber) {
      throw seatError(
        `This order already reserves seat ${existing.seatNumber}.`
      );
    }

    // Recover an interrupted update
    const recovered =
      await Order.findOneAndUpdate(
        {
          _id: order._id,

          seatNumber: null,

          paymentStatus: "Paid",

          status: {
            $nin: [
              "Picked Up",
              "Cancelled",
            ],
          },
        },
        {
          $set: {
            seatNumber,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (recovered) {
      return recovered;
    }

    const latest = await Order.findById(
      orderId
    );

    if (latest?.seatNumber === seatNumber) {
      return latest;
    }

    throw seatError(
      "Order changed. Refresh and retry."
    );
  }

  // ========================================
  // CREATE MANUAL SEAT RESERVATION
  // ========================================

  let reservation;

  try {
    reservation =
      await SeatReservation.create({
        franchiseId: order.franchiseId,

        orderId: order._id,

        seatNumber,

        active: true,
      });
  } catch (error) {
    // Duplicate active reservation
    if (error.code !== 11000) {
      throw error;
    }

    const alreadyAssigned =
      await Order.findById(orderId);

    if (
      alreadyAssigned?.seatNumber ===
      seatNumber
    ) {
      return alreadyAssigned;
    }

    throw seatError(
      "That seat is occupied, or this order already has a seat. Choose another."
    );
  }

  // ========================================
  // SAVE SEAT NUMBER IN ORDER
  // ========================================

  try {
    const assigned =
      await Order.findOneAndUpdate(
        {
          _id: order._id,

          paymentStatus: "Paid",

          seatNumber: null,

          status: {
            $nin: [
              "Picked Up",
              "Cancelled",
            ],
          },
        },
        {
          $set: {
            seatNumber,
          },
        },
        {
          new: true,
          runValidators: true,
        }
      );

    if (assigned) {
      return assigned;
    }

    // Order changed after reservation
    await SeatReservation.updateOne(
      {
        _id: reservation._id,
      },
      {
        $set: {
          active: false,
        },
      }
    );

    throw seatError(
      "Order changed. Refresh and retry."
    );
  } catch (error) {
    // Release reservation created by this attempt
    await SeatReservation.updateOne(
      {
        _id: reservation._id,
      },
      {
        $set: {
          active: false,
        },
      }
    ).catch((rollbackError) => {
      console.error(
        "Seat rollback failed:",
        rollbackError
      );
    });

    throw error;
  }
}

// ============================================
// RELEASE SEAT AFTER ORDER COMPLETION
// ============================================

async function releaseSeat(orderId) {
  await SeatReservation.updateMany(
    {
      orderId,
      active: true,
    },
    {
      $set: {
        active: false,
      },
    }
  );
}

// ============================================
// EXPORT SERVICE FUNCTIONS
// ============================================

module.exports = {
  SeatReservation,

  seatCapacity,

  listSeats,

  assignSeatByAdmin,

  releaseSeat,
};
