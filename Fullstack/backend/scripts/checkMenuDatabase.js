require('dotenv').config();
const { connectDB } = require('../src/config/db');
const mongoose = require('mongoose');
const MenuItem = require('../src/models/MenuItem');
const Franchise = require('../src/models/Franchise');
const DailyMenuCatalogItem = require('../src/models/DailyMenuCatalogItem');
(async () => {
  try {
    await connectDB();
    const counts = await DailyMenuCatalogItem.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
    console.log('Daily menu catalogue:', Object.fromEntries(counts.map(x => [x._id, x.count])));
    const branches = await Franchise.find().select('name starterMenuInitialized').lean();
    for (const branch of branches) {
      const count = await MenuItem.countDocuments({ franchiseId: branch._id });
      console.log(`Franchise ${branch.name}: ${count} items, initialized=${Boolean(branch.starterMenuInitialized)}`);
    }
    if (!branches.length) console.log('No franchise registered yet. The public 50-item daily catalogue remains browsable; ordering is disabled until registration.');
  } catch (e) { console.error('Menu verification failed:', e.message); process.exitCode = 1; }
  finally { await mongoose.disconnect(); }
})();
