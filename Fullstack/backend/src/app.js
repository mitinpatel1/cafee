
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
  "http://localhost:5173,http://127.0.0.1:5173,http://146.101.46.205:5006,http://146.101.46.205:5173"
)
  .split(",")
  .map((origin) =>
    origin.trim().replace(/\/$/, "")
  )
  .filter(Boolean);

function isOriginAllowed(origin) {
  if (!origin) return true;
  const normalized = origin.trim().replace(/\/$/, "");
  if (allowedOrigins.includes(normalized)) return true;

  try {
    const url = new URL(normalized);
    if (
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "0.0.0.0" ||
      url.hostname.startsWith("192.168.") ||
      url.hostname.startsWith("10.") ||
      url.hostname.startsWith("172.")
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
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
// CASHFREE WEBHOOK — RAW BODY
// Must be BEFORE express.json()
// ============================================

// Cashfree webhook signature verification
// requires the original, unmodified request body.

app.use(
  "/api/kiosk/cashfree/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  })
);

// Payment routes Cashfree webhook compatibility
app.use(
  "/api/payments/cashfree/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  })
);

// ============================================
// RAZORPAY WEBHOOK — RAW BODY
// Keep temporarily for old payment compatibility.
// ============================================

app.use(
  "/api/kiosk/razorpay/webhook",
  express.raw({
    type: "application/json",
    limit: "1mb",
  })
);

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
// AUTHENTICATION ROUTES
// ============================================

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
// PAYMENT ROUTES
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
// SELF-SERVICE KIOSK ROUTES
// ============================================

// Supports:
// - Guest ordering
// - Cashfree online checkout
// - Cashfree payment verification
// - Cashfree webhook
// - Order tracking
// - Seat assignment
// - Counter payment workflows

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

module.exports = {
  app,
  corsOptions,
};
