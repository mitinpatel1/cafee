
"use strict";

const mongoose = require("mongoose");
const Order = require("../models/Order");

// ============================================
// SEAT RESERVATION SCHEMA
// ============================================

const reservationSchema =
  new mongoose.Schema(
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
// PREVENT DOUBLE BOOKING
// ============================================

// Only one active reservation per seat.
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

// One active seat per order.
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

const SeatReservation =
  mongoose.models.SeatReservation ||
  mongoose.model(
    "SeatReservation",
    reservationSchema
  );

// ============================================
// SEAT CAPACITY
// ============================================

function seatCapacity() {
  const value = Number(
    process.env.SEATS_PER_FRANCHISE || 20
  );

  if (
    Number.isInteger(value) &&
    value >= 1 &&
    value <= 500
  ) {
    return value;
  }

  return 20;
}

// ============================================
// ERROR HELPER
// ============================================

function seatError(
  message,
  status = 409
) {
  const error = new Error(message);

  error.status = status;

  return error;
}

// ============================================
// GET AVAILABLE SEATS
// ============================================

async function listSeats(franchiseId) {
  if (
    !mongoose.isValidObjectId(
      franchiseId
    )
  ) {
    throw seatError(
      "Invalid franchise ID.",
      400
    );
  }

  const capacity = seatCapacity();

  const reservations =
    await SeatReservation.find({
      franchiseId,
      active: true,
    })
      .select(
        "seatNumber orderId -_id"
      )
      .lean();

  const occupied = reservations.map(
    (item) => item.seatNumber
  );

  const occupiedSet = new Set(
    occupied
  );

  const available = Array.from(
    {
      length: capacity,
    },
    (_, index) => index + 1
  ).filter(
    (number) =>
      !occupiedSet.has(number)
  );

  return {
    capacity,
    occupied,
    available,
  };
}

// ============================================
// CUSTOMER SELECTS SEAT
// ============================================

async function assignSeatByCustomer(
  orderId,
  selectedSeat
) {
  const seatNumber = Number(
    selectedSeat
  );

  // ==========================================
  // VALIDATE SEAT NUMBER
  // ==========================================

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

  if (
    !mongoose.isValidObjectId(orderId)
  ) {
    throw seatError(
      "Invalid order ID.",
      400
    );
  }

  // Ensure unique indexes are ready.
  await SeatReservation.init();

  const order = await Order.findById(
    orderId
  );

  if (!order) {
    throw seatError(
      "Order not found.",
      404
    );
  }

  // ==========================================
  // CHECK PAYMENT
  // ==========================================

  if (
    order.paymentStatus !== "Paid"
  ) {
    throw seatError(
      "Payment must be verified before choosing a seat."
    );
  }

  // ==========================================
  // CHECK ORDER STATUS
  // ==========================================

  if (
    [
      "Picked Up",
      "Cancelled",
    ].includes(order.status)
  ) {
    throw seatError(
      "Cannot assign a seat to a completed or cancelled order."
    );
  }

  // ==========================================
  // ORDER ALREADY HAS A SEAT
  // ==========================================

  if (order.seatNumber != null) {
    if (
      Number(order.seatNumber) ===
      seatNumber
    ) {
      return order;
    }

    throw seatError(
      `This order already has seat ${order.seatNumber}.`
    );
  }

  // ==========================================
  // CHECK EXISTING RESERVATION
  // ==========================================

  const existing =
    await SeatReservation.findOne({
      orderId: order._id,
      active: true,
    });

  if (existing) {
    if (
      existing.seatNumber !==
      seatNumber
    ) {
      throw seatError(
        `This order already reserves seat ${existing.seatNumber}.`
      );
    }

    // Recover a reservation if the
    // reservation record was saved
    // but the Order document wasn't.
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

    const latest =
      await Order.findById(
        orderId
      );

    if (
      latest?.seatNumber ===
      seatNumber
    ) {
      return latest;
    }

    throw seatError(
      "Order changed. Refresh and retry."
    );
  }

  // ==========================================
  // CREATE RESERVATION
  // ==========================================

  let reservation;

  try {
    reservation =
      await SeatReservation.create({
        franchiseId:
          order.franchiseId,

        orderId: order._id,

        seatNumber,

        active: true,
      });
  } catch (error) {
    // MongoDB unique index prevents
    // two customers from taking same seat.
    if (error.code !== 11000) {
      throw error;
    }

    const alreadyAssigned =
      await Order.findById(
        orderId
      );

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

  // ==========================================
  // SAVE SELECTED SEAT IN ORDER
  // ==========================================

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

    // Order changed during seat booking.
    // Release reservation.
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
    // Roll back only this attempt's
    // reservation, never another order's.
    await SeatReservation.updateOne(
      {
        _id: reservation._id,
      },
      {
        $set: {
          active: false,
        },
      }
    ).catch(
      (rollbackError) => {
        console.error(
          "Seat rollback failed:",
          rollbackError
        );
      }
    );

    throw error;
  }
}

// ============================================
// RELEASE SEAT
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
// EXPORTS
// ============================================

module.exports = {
  SeatReservation,
  seatCapacity,
  listSeats,
  assignSeatByCustomer,
  releaseSeat,
};
