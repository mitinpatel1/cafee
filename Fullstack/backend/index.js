
"use strict";

// =====================================================
// ENVIRONMENT CONFIGURATION
// =====================================================

const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});

// =====================================================
// IMPORTS
// =====================================================

const http = require("http");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const { app, corsOptions } = require("./src/app");
const { connectDB } = require("./src/config/db");
const setupSocket = require("./src/socket");

const {
  seedDailyCatalog,
  seedAllFranchises,
} = require("./src/services/seedMenu");

// =====================================================
// SERVER CONFIGURATION
// =====================================================

const PORT = Number(process.env.PORT || 5600);
const HOST = "0.0.0.0";

const SOCKET_PATH = "/socket.io";

const allowedOrigins = (
  process.env.FRONTEND_ORIGIN ||
  "http://localhost:5173,http://127.0.0.1:5173"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// =====================================================
// HTTP SERVER
// =====================================================

const server = http.createServer(app);

// =====================================================
// SOCKET.IO CONFIGURATION
// =====================================================

const io = new Server(server, {
  path: SOCKET_PATH,

  cors: {
    ...corsOptions,
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },

  // Allow polling and websocket
  transports: ["polling", "websocket"],

  // Connection heartbeat
  pingTimeout: 20000,
  pingInterval: 25000,

  // Maximum individual socket message size
  maxHttpBufferSize: 1e6,

  // Serve client from frontend dependencies
  serveClient: false,
});

// Make Socket.IO available inside Express routes
app.set("io", io);

// Register existing Socket.IO authentication,
// room permissions and event handlers.
setupSocket(io);

// =====================================================
// VALIDATE ENVIRONMENT
// =====================================================

function validateEnvironment() {
  if (
    !Number.isInteger(PORT) ||
    PORT <= 0 ||
    PORT > 65535
  ) {
    throw new Error(
      "Invalid PORT value in backend/.env"
    );
  }

  const jwtSecret = process.env.JWT_SECRET;

  if (
    !jwtSecret ||
    jwtSecret.length < 32 ||
    /^(replace|change|example)/i.test(jwtSecret)
  ) {
    throw new Error(
      "Provide a strong JWT_SECRET (32+ characters) in backend/.env"
    );
  }

  if (
    !process.env.MONGODB_URI &&
    !process.env.MONGO_URI
  ) {
    throw new Error(
      "MongoDB URI is missing in backend/.env"
    );
  }

  console.log("Environment configuration validated.");
}

// =====================================================
// SERVER ERROR HANDLER
// =====================================================

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use.`
    );
  } else if (error.code === "EACCES") {
    console.error(
      `Permission denied for port ${PORT}.`
    );
  } else {
    console.error(
      "HTTP server error:",
      error
    );
  }
});

// =====================================================
// DATABASE CONNECTION
// =====================================================

async function initializeDatabase() {
  console.log("Connecting to MongoDB...");

  await connectDB();

  console.log("MongoDB connected successfully.");
  console.log(
    "Database:",
    mongoose.connection.name
  );
}

// =====================================================
// INITIALIZE DAILY MENU
// =====================================================

async function initializeMenu() {
  console.log("Initializing daily menu...");

  await seedDailyCatalog();

  await seedAllFranchises();

  console.log("Daily menu initialization completed.");

  console.log(
    "Breakfast: 10 | Lunch: 15 | Snacks: 15 | Beverages: 10"
  );
}

// =====================================================
// START SERVER
// =====================================================

let started = false;
let starting = false;

async function start() {
  if (started || starting) {
    return;
  }

  starting = true;

  try {
    console.log("");
    console.log("====================================");
    console.log("       OFFICEBITE BACKEND");
    console.log("====================================");

    // Step 1: Validate environment
    validateEnvironment();

    // Step 2: MongoDB connection
    await initializeDatabase();

    // Step 3: Default menu
    await initializeMenu();

    // Step 4: Start HTTP and Socket.IO
    await new Promise((resolve, reject) => {
      const onError = (error) => {
        server.off("listening", onListening);
        reject(error);
      };

      const onListening = () => {
        server.off("error", onError);
        resolve();
      };

      server.once("error", onError);
      server.once("listening", onListening);

      server.listen(PORT, HOST);
    });

    started = true;

    console.log("");
    console.log("====================================");
    console.log(" OFFICEBITE SERVER RUNNING");
    console.log("====================================");
    console.log(`Backend: http://localhost:${PORT}`);
    console.log(`Health:  http://localhost:${PORT}/api/health`);
    console.log(`Socket:  /socket.io`);
    console.log(`Frontend: ${allowedOrigins.join(", ")}`);
    console.log(`Database: ${mongoose.connection.name}`);
    console.log("====================================");
    console.log("");

  } finally {
    starting = false;
  }
}

// =====================================================
// GRACEFUL SHUTDOWN
// =====================================================

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;

  shuttingDown = true;

  console.log(`Received ${signal}. Shutting down...`);

  try {
    await new Promise((resolve) => {
      io.close(() => resolve());
    });

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    console.log("Server stopped successfully.");
    process.exit(0);
  } catch (error) {
    console.error(
      "Shutdown failed:",
      error.message
    );
    process.exit(1);
  }
}

// =====================================================
// PROCESS EVENTS
// =====================================================

if (require.main === module) {
  process.on("SIGINT", () => {
    shutdown("SIGINT");
  });

  process.on("SIGTERM", () => {
    shutdown("SIGTERM");
  });

  start().catch(async (error) => {
    console.error(
      "Startup failed:",
      error.message
    );

    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
    } catch (disconnectError) {
      console.error(
        "Database cleanup failed:",
        disconnectError.message
      );
    }

    process.exit(1);
  });
}

// =====================================================
// EXPORTS
// =====================================================

module.exports = {
  app,
  server,
  io,
  start,
};
