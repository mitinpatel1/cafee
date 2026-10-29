
require("dotenv").config({
  path: require("path").join(__dirname, "../.env"),
});

const mongoose = require("mongoose");

async function main() {
  const args = process.argv.slice(2);

  const name = args[0];
  const imageUrl = args[1];
  const apply = args.includes("--apply");

  const idArg = args.find((arg) =>
    arg.startsWith("--id=")
  );

  const selectedId = idArg
    ? idArg.substring(5)
    : null;

  if (!name || !imageUrl) {
    throw new Error(
      'Usage: node scripts/setMenuImage.js ' +
      '"Food Name" "Image URL" [--id=ITEM_ID] [--apply]'
    );
  }

  const url = new URL(imageUrl);

  if (
    url.protocol !== "https:" ||
    url.hostname !== "images.unsplash.com" ||
    !url.pathname.startsWith("/photo-")
  ) {
    throw new Error(
      "Use a direct HTTPS images.unsplash.com/photo-... URL"
    );
  }

  if (
    selectedId &&
    !mongoose.isValidObjectId(selectedId)
  ) {
    throw new Error("Invalid menu item ID");
  }

  const mongoURI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

  if (!mongoURI) {
    throw new Error("MongoDB URI not found in .env");
  }

  await mongoose.connect(mongoURI);

  const db = mongoose.connection.db;

  console.log("\nConnected Database:", db.databaseName);

  const collections = await db
    .listCollections({}, { nameOnly: true })
    .toArray();

  const collectionNames = collections
    .map((item) => item.name)
    .filter((name) => /menu|food/i.test(name));

  const matches = [];

  for (const collectionName of collectionNames) {
    const collection = db.collection(collectionName);

    const query = selectedId
      ? {
          _id: new mongoose.Types.ObjectId(selectedId),
          name,
        }
      : { name };

    const documents = await collection
      .find(query)
      .toArray();

    for (const document of documents) {
      // Only consider actual menu item records.
      if (
        !Object.prototype.hasOwnProperty.call(
          document,
          "image"
        )
      ) {
        continue;
      }

      matches.push({
        collectionName,
        document,
      });
    }
  }

  console.log("\nMatching menu records:", matches.length);

  if (matches.length === 0) {
    console.log("Checked collections:", collectionNames);

    throw new Error(
      "Food item not found. Check database, " +
      "collection name and exact food name."
    );
  }

  for (const match of matches) {
    console.log("\n------------------------------");
    console.log("Collection:", match.collectionName);
    console.log("Item ID:", String(match.document._id));
    console.log("Name:", match.document.name);

    console.log(
      "Franchise:",
      String(
        match.document.franchiseId ||
        match.document.franchise ||
        "Not specified"
      )
    );

    console.log("Old Image:", match.document.image);
    console.log("New Image:", imageUrl);
  }

  if (matches.length > 1) {
    throw new Error(
      "Multiple records found. Use --id=ITEM_ID " +
      "to update the correct franchise item."
    );
  }

  if (!apply) {
    console.log("\nDRY RUN - no changes made.");
    console.log("Add --apply to save the new image.");
    return;
  }

  const { collectionName, document } = matches[0];

  const collection = db.collection(collectionName);

  const result = await collection.updateOne(
    {
      _id: document._id,
      name: document.name,
      image: document.image,
    },
    {
      $set: {
        image: imageUrl,
      },
    }
  );

  if (result.matchedCount !== 1) {
    throw new Error(
      "Item was modified while updating. Run again."
    );
  }

  const updated = await collection.findOne({
    _id: document._id,
  });

  console.log("\n==============================");
  console.log("IMAGE UPDATE SUCCESSFUL");
  console.log("==============================");
  console.log("Updated item:", updated.name);
  console.log("Modified:", result.modifiedCount);
  console.log("Saved Image:", updated.image);
}

main()
  .catch((error) => {
    console.error("\nERROR:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
