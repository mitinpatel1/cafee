
"use strict";

require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");

// ============================================
// CONFIGURATION
// ============================================

const DATABASE_NAME = "cafeteria";

// --check  = Only check database
// --create = Create admin if none exists
const createMode = process.argv.includes("--create");

// ============================================
// ADMIN SEED FUNCTION
// ============================================

async function seedAdmin() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "MONGODB_URI is missing."
    );
  }

  if (!/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      "Invalid MongoDB URI format."
    );
  }

  // ============================================
  // CONNECT TO MONGODB ATLAS
  // ============================================

  console.log("\nConnecting to MongoDB Atlas...");

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  console.log("\n========== DATABASE INFO ==========");

  console.log(
    "Connected Host:",
    mongoose.connection.host
  );

  console.log(
    "Connected Database:",
    mongoose.connection.name
  );

  console.log(
    "User Collection:",
    User.collection.name
  );

  // ============================================
  // VERIFY DATABASE
  // ============================================

  if (mongoose.connection.name !== DATABASE_NAME) {
    throw new Error(
      `Wrong database! Expected: ${DATABASE_NAME}`
    );
  }

  // ============================================
  // CHECK EXISTING USERS AND ADMINS
  // ============================================

  const totalUsers = await User.countDocuments();

  const totalAdmins = await User.countDocuments({
    role: "admin",
  });

  console.log("Total Users:", totalUsers);
  console.log("Total Admins:", totalAdmins);

  console.log("===================================\n");

  // ============================================
  // CHECK MODE (NO DATABASE CHANGES)
  // ============================================

  if (!createMode) {
    console.log("Database verification completed.");

    if (totalAdmins > 0) {
      console.log(
        "An Admin already exists in this database."
      );
    } else {
      console.log(
        "No Admin account found in this database."
      );
    }

    console.log(
      "No database changes were made."
    );

    return;
  }

  // ============================================
  // CREATE MODE
  // ============================================

  if (totalAdmins > 0) {
    throw new Error(
      "An Admin already exists. No changes made."
    );
  }

  // Confirm this is the expected Atlas cluster.
  const clusterHost = new URL(uri).hostname;

  if (clusterHost !== "cafeteria.kylt9pf.mongodb.net") {
    throw new Error(
      "Unexpected Atlas cluster. Admin not created."
    );
  }

  const email = String(
    process.env.ADMIN_EMAIL || ""
  ).trim().toLowerCase();

  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD are required."
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid Admin email.");
  }

  if (password.length < 12) {
    throw new Error(
      "Admin password must be at least 12 characters."
    );
  }

  if (!User.schema.path("password")) {
    throw new Error(
      "User model does not have a password field."
    );
  }

  // ============================================
  // CHECK DUPLICATE EMAIL
  // ============================================

  const existingEmail = await User.exists({
    email,
  });

  if (existingEmail) {
    throw new Error(
      "This email is already registered."
    );
  }

  // ============================================
  // CREATE NEW ADMIN
  // ============================================

  // User.js must hash passwords on save.
  const admin = await User.create({
    name: "OfficeBite Admin",
    email,
    password,
    role: "admin",
  });

  // ============================================
  // VERIFY PASSWORD HASH
  // ============================================

  const savedAdmin = await User.findById(
    admin._id
  ).select("+password");

  const storedPassword = savedAdmin?.password;

  const isHashed =
    typeof storedPassword === "string" &&
    /^\$2[aby]\$\d{2}\$/.test(storedPassword);

  if (!isHashed) {
    // Roll back only the newly created admin.
    await User.deleteOne({
      _id: admin._id,
    });

    throw new Error(
      "Password was not bcrypt-hashed. " +
      "Admin creation rolled back. Check User.js."
    );
  }

  // ============================================
  // SUCCESS
  // ============================================

  console.log("\n================================");

  console.log("Admin Created Successfully!");

  console.log("Email:", email);

  console.log("Role: admin");

  console.log("Password: Stored as bcrypt hash");

  console.log("================================\n");
}

// ============================================
// EXECUTE
// ============================================

seedAdmin()
  .catch((error) => {
    console.error(
      "\nAdmin seed failed:",
      error.message
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
