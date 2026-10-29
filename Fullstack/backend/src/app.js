
"use strict";

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const {
  AVATAR_DIR,
} = require("./utils/avatarStorage");

// ============================================
// EXPRESS APPLICATION
// ============================================

const app = express();

app.disable("x-powered-by");

// ============================================
// CORS CONFIGURATION
// ============================================

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) =>
    origin.trim().replace(/\/$/, "")
  )
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin)
    ) {
      return callback(null, true);
    }

    const error = new Error(
      "Origin is not permitted by CORS"
    );

    error.status = 403;
    return callback(error);
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PATCH",
    "PUT",
    "DELETE",
    "OPTIONS",
  ],
};

app.use(cors(corsOptions));

// ============================================
// RAZORPAY WEBHOOK — RAW BODY
// Must be BEFORE express.json()
// ============================================

app.use(
  "/api/kiosk/razorpay/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  })
);

// Existing payment webhook compatibility
app.use(
  "/api/payments/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  })
);

// ============================================
// REQUEST BODY PARSERS
// ============================================

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

// ============================================
// DEVELOPMENT REQUEST LOGGING
// ============================================

if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(
      `${req.method} ${req.originalUrl}`
    );

    next();
  });
}

// ============================================
// PROFILE IMAGE STORAGE
// ============================================

app.use(
  "/uploads/avatars",
  express.static(AVATAR_DIR, {
    index: false,
    dotfiles: "deny",
    maxAge: "7d",

    setHeaders(res) {
      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );
    },
  })
);

// ============================================
// HEALTH CHECK API
// ============================================

app.get("/api/health", (req, res) => {
  const connected =
    mongoose.connection.readyState === 1;

  return res
    .status(connected ? 200 : 503)
    .json({
      success: connected,

      service: "OfficeBite API",

      database: connected
        ? "connected"
        : "disconnected",

      ...(connected
        ? {
            databaseName:
              mongoose.connection.name,
          }
        : {}),

      timestamp:
        new Date().toISOString(),
    });
});

// ============================================
// EXISTING AUTHENTICATION ROUTES
// ============================================

// Admin and Franchise login remain secure.

app.use(
  "/api/auth",
  require("./routes/auth")
);

// ============================================
// MENU ROUTES
// ============================================

app.use(
  "/api/menu",
  require("./routes/menu")
);

// ============================================
// ORDER MANAGEMENT ROUTES
// ============================================

app.use(
  "/api/orders",
  require("./routes/orders")
);

// ============================================
// EXISTING PAYMENT ROUTES
// ============================================

app.use(
  "/api/payments",
  require("./routes/payments")
);

// ============================================
// ADMIN DASHBOARD ROUTES
// ============================================

app.use(
  "/api/admin",
  require("./routes/admin")
);

// ============================================
// FRANCHISE DASHBOARD ROUTES
// ============================================

app.use(
  "/api/franchise",
  require("./routes/franchise")
);

// ============================================
// NEW SELF-SERVICE KIOSK ROUTES
// ============================================

// Customer login is NOT required.
//
// Supports:
// - Guest ordering
// - Online payment
// - Razorpay verification
// - Order tracking
// - Seat number display

app.use(
  "/api/kiosk",
  require("./routes/kiosk")
);

// ============================================
// UNKNOWN API ROUTES
// ============================================

app.use("/api", (req, res) => {
  return res.status(404).json({
    success: false,
    message: "API endpoint not found.",
  });
});

// ============================================
// SERVE FRONTEND IN PRODUCTION
// ============================================

const frontendDist = path.resolve(
  __dirname,
  "../../frontend/dist"
);

const frontendIndex = path.join(
  frontendDist,
  "index.html"
);

if (fs.existsSync(frontendIndex)) {
  app.use(
    express.static(frontendDist)
  );

  // Supports React Router refresh
  // /kiosk
  // /admin/dashboard
  // /franchise/dashboard

  app.get("*", (req, res) => {
    return res.sendFile(frontendIndex);
  });
} else {
  // Development: React Vite runs separately.

  app.get("/", (req, res) => {
    return res.json({
      success: true,

      service: "OfficeBite API",

      message:
        "Run the Vite frontend on port 5173.",
    });
  });
}

// ============================================
// GLOBAL ERROR HANDLING
// ============================================

app.use((error, req, res, next) => {
  console.error(
    "API request failed:",
    error.message
  );

  let status = Number(
    error.status ||
    error.statusCode ||
    500
  );

  if (
    !Number.isInteger(status) ||
    status < 400 ||
    status > 599
  ) {
    status = 500;
  }

  if (
    error.type === "entity.parse.failed"
  ) {
    status = 400;
  }

  if (
    error.type === "entity.too.large"
  ) {
    status = 413;
  }

  return res.status(status).json({
    success: false,

    message:
      status >= 500
        ? "Internal server error."
        : error.message ||
          "Request failed.",
  });
});

// ============================================
// EXPORT EXPRESS APP
// ============================================

// Existing backend/index.js uses these exports.
// Socket.IO is initialized in index.js.

module.exports = {
  app,
  corsOptions,
};
