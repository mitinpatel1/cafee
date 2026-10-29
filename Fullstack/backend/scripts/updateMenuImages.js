
/**
 * OfficeBite - One-time Menu Image Migration
 *
 * Commands:
 *   node scripts/updateMenuImages.js
 *   node scripts/updateMenuImages.js --apply
 *
 * Only updates the "image" field.
 * Does not create or delete menu items.
 */

require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env"),
});

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

// ============================================
// 1. IMPORT EXISTING MENU DATA
// ============================================

// Change this path if your dailyMenu.js is elsewhere.
const { dailyMenu } = require("../src/data/dailyMenu");

// ============================================
// 2. CONFIGURATION
// ============================================

const APPLY = process.argv.includes("--apply");

// Optional: Specify a collection manually if
// automatic collection detection cannot find it.
// Examples: "menuitems", "menus"
const COLLECTION_NAME = process.env.MENU_COLLECTION || "";

const COLLECTION_CANDIDATES = [
  "menuitems",
  "menus",
  "menu",
  "fooditems",
  "franchisemenus",
  "franchisemenuitems",
];

// ============================================
// 3. VALIDATE IMAGE MAPPINGS
// ============================================

function validateMenu() {
  if (!Array.isArray(dailyMenu) || !dailyMenu.length) {
    throw new Error("dailyMenu is empty or invalid.");
  }

  const names = new Set();
  const photoPaths = new Set();

  for (const item of dailyMenu) {
    if (!item.name || !item.category || !item.image) {
      throw new Error("A menu item is missing required data.");
    }

    const itemKey = `${item.category}::${item.name}`;

    if (names.has(itemKey)) {
      throw new Error(`Duplicate menu item: ${itemKey}`);
    }

    names.add(itemKey);

    let url;

    try {
      url = new URL(item.image);
    } catch {
      throw new Error(`Invalid image URL: ${item.name}`);
    }

    if (
      url.protocol !== "https:" ||
      url.hostname !== "images.unsplash.com"
    ) {
      throw new Error(
        `Expected Unsplash HTTPS image URL for ${item.name}`
      );
    }

    if (photoPaths.has(url.pathname)) {
      throw new Error(
        `Repeated Unsplash photo found for ${item.name}`
      );
    }

    photoPaths.add(url.pathname);
  }

  if (dailyMenu.length !== 50) {
    throw new Error(
      `Expected 50 menu items, received ${dailyMenu.length}.`
    );
  }

  console.log("\nMenu validation successful.");
  console.log("Total items:", dailyMenu.length);
  console.log("Unique images:", photoPaths.size);
}

// ============================================
// 4. FIND MENU COLLECTION
// ============================================

async function findMenuCollection(db, menuFilter) {
  const collections = await db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const existingNames = collections.map(
    (collection) => collection.name
  );

  console.log(
    "\nDatabase collections:",
    existingNames.join(", ")
  );

  if (COLLECTION_NAME) {
    if (!existingNames.includes(COLLECTION_NAME)) {
      throw new Error(
        `Collection "${COLLECTION_NAME}" does not exist.`
      );
    }

    return db.collection(COLLECTION_NAME);
  }

  const matches = [];

  for (const name of COLLECTION_CANDIDATES) {
    if (!existingNames.includes(name)) continue;

    const collection = db.collection(name);

    const count = await collection.countDocuments(
      menuFilter
    );

    if (count > 0) {
      matches.push({
        name,
        count,
      });
    }
  }

  if (matches.length === 0) {
    throw new Error(
      "Menu collection not found. Check collection name " +
      "and the database connected in .env."
    );
  }

  if (matches.length > 1) {
    throw new Error(
      "Multiple matching collections found: " +
      matches.map((item) => item.name).join(", ") +
      ". Set MENU_COLLECTION in backend/.env."
    );
  }

  console.log(
    "Detected menu collection:",
    matches[0].name
  );

  return db.collection(matches[0].name);
}

// ============================================
// 5. CREATE BACKUP
// ============================================

function saveBackup(databaseName, collectionName, changes) {
  const backupFolder = path.resolve(
    __dirname,
    "../backups"
  );

  fs.mkdirSync(backupFolder, {
    recursive: true,
  });

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

  const backupPath = path.join(
    backupFolder,
    `menu-images-${timestamp}.json`
  );

  const backupData = {
    database: databaseName,
    collection: collectionName,
    createdAt: new Date().toISOString(),

    items: changes.map(({ document }) => ({
      _id: String(document._id),
      name: document.name,
      category: document.category,
      franchiseId: document.franchiseId
        ? String(document.franchiseId)
        : null,
      previousImage: document.image ?? null,
      imageFieldExisted:
        Object.prototype.hasOwnProperty.call(
          document,
          "image"
        ),
    })),
  };

  fs.writeFileSync(
    backupPath,
    JSON.stringify(backupData, null, 2),
    "utf8"
  );

  return backupPath;
}

// ============================================
// 6. MAIN MIGRATION
// ============================================

async function updateMenuImages() {
  validateMenu();

  const mongoURI =
    process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error(
      "MONGODB_URI or MONGO_URI missing in backend/.env"
    );
  }

  console.log("\nConnecting to MongoDB...");

  await mongoose.connect(mongoURI, {
    serverSelectionTimeoutMS: 10000,
  });

  const db = mongoose.connection.db;

  console.log("MongoDB Connected.");
  console.log("Database:", db.databaseName);

  // Build lookup of new image URLs.
  const imageMap = new Map(
    dailyMenu.map((item) => [
      `${item.category}::${item.name}`,
      item.image,
    ])
  );

  const menuFilter = {
    $or: dailyMenu.map((item) => ({
      name: item.name,
      category: item.category,
    })),
  };

  const collection = await findMenuCollection(
    db,
    menuFilter
  );

  // Fetch existing items only.
  const existingItems = await collection
    .find(menuFilter, {
      projection: {
        name: 1,
        category: 1,
        image: 1,
        franchiseId: 1,
      },
    })
    .toArray();

  console.log(
    "\nExisting menu records:",
    existingItems.length
  );

  const changes = [];

  for (const document of existingItems) {
    const key = `${document.category}::${document.name}`;

    const newImage = imageMap.get(key);

    if (!newImage) continue;

    if (document.image === newImage) continue;

    changes.push({
      document,
      newImage,
    });
  }

  console.log("Images needing update:", changes.length);

  // Preview changes.
  console.log("\nImage update preview:\n");

  changes.slice(0, 10).forEach(({ document, newImage }) => {
    console.log("Food:", document.name);
    console.log("Franchise:", String(document.franchiseId || "N/A"));
    console.log("Old:", document.image || "(empty)");
    console.log("New:", newImage);
    console.log("---------------------------------");
  });

  if (changes.length > 10) {
    console.log(
      `...and ${changes.length - 10} more records.`
    );
  }

  if (changes.length === 0) {
    console.log("\nAll menu images are already updated.");
    return;
  }

  // Dry-run: do not modify database.
  if (!APPLY) {
    console.log("\nDRY RUN ONLY. No database changes made.");

    console.log(
      "\nTo apply updates, execute:"
    );

    console.log(
      "node scripts/updateMenuImages.js --apply"
    );

    return;
  }

  // Backup old image references.
  const backupPath = saveBackup(
    db.databaseName,
    collection.collectionName,
    changes
  );

  console.log("\nBackup saved:", backupPath);

  // Update exact existing records.
  // Only the image field is modified.
  const operations = changes.map(
    ({ document, newImage }) => ({
      updateOne: {
        filter: {
          _id: document._id,
        },

        update: {
          $set: {
            image: newImage,
          },
        },

        upsert: false,
      },
    })
  );

  const result = await collection.bulkWrite(
    operations,
    { ordered: true }
  );

  console.log("\n================================");
  console.log("IMAGE MIGRATION COMPLETED");
  console.log("================================");
  console.log("Matched:", result.matchedCount);
  console.log("Modified:", result.modifiedCount);
  console.log("Backup:", backupPath);
  console.log("================================");

  console.log(
    "\nRefresh the Customer and Franchise dashboards."
  );
}

// ============================================
// 7. EXECUTE
// ============================================

updateMenuImages()
  .catch((error) => {
    console.error("\nMigration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
