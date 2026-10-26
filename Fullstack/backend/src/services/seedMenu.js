const Franchise = require('../models/Franchise');
const MenuItem = require('../models/MenuItem');
const DailyMenuCatalogItem = require('../models/DailyMenuCatalogItem');
const { dailyMenu } = require('../data/dailyMenu');

const keyFor = item => `${item.category}:${item.name.toLocaleLowerCase('en-IN').trim()}`;
const catalogKeyFor = item => `${item.category.toLowerCase()}-${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

// Seed the canonical DAILY menu in MongoDB before any franchise exists.
// $setOnInsert preserves already-published template records; no fake frontend fallback.
async function seedDailyCatalog() {
  const operations = dailyMenu.map(item => ({
    updateOne: {
      filter: { catalogKey: catalogKeyFor(item) },
      update: { $setOnInsert: { ...item, catalogKey: catalogKeyFor(item) } },
      upsert: true,
    },
  }));
  const result = await DailyMenuCatalogItem.bulkWrite(operations, { ordered: false });
  return result.upsertedCount || 0;
}

// One-time merge per franchise. Includes legacy branches with a partial/empty menu.
// Never re-adds deleted dishes after starterMenuInitialized has been set.
async function seedFranchiseMenu(franchiseId) {
  const franchise = await Franchise.findById(franchiseId).select('starterMenuInitialized');
  if (!franchise || franchise.starterMenuInitialized) return 0;
  const existing = await MenuItem.find({ franchiseId }).select('name category').lean();
  const existingNames = new Set(existing.map(keyFor));
  const missing = dailyMenu.filter(item => !existingNames.has(keyFor(item)));
  // Keep any custom existing prices, edited dishes, and added owner items unchanged.
  if (missing.length) await MenuItem.insertMany(missing.map(item => ({ ...item, franchiseId })));
  await Franchise.updateOne({ _id: franchiseId }, {
    $set: { menuSeeded: true, starterMenuInitialized: true },
  });
  return missing.length;
}

async function seedAllFranchises() {
  const franchises = await Franchise.find({ starterMenuInitialized: { $ne: true } }).select('_id');
  for (const franchise of franchises) {
    const count = await seedFranchiseMenu(franchise._id);
    console.log(`Daily menu initialized for franchise ${franchise._id}: ${count} missing starter dishes added`);
  }
}

module.exports = { seedDailyCatalog, seedFranchiseMenu, seedAllFranchises };
