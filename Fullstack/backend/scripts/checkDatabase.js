require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../src/config/db');
(async () => {
  try {
    const connection = await connectDB();
    await connection.db.admin().ping();
    console.log('Database ping OK. Connected to:', connection.name);
  } catch (error) {
    console.error('Database check failed:', error.message);
    process.exitCode = 1;
  } finally { await mongoose.disconnect(); }
})();
