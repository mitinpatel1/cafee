const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is missing in backend/.env. See .env.example.');
  const options = { serverSelectionTimeoutMS: 12000 };
  if (process.env.MONGODB_DB_NAME?.trim()) options.dbName = process.env.MONGODB_DB_NAME.trim();
  await mongoose.connect(uri, options);
  console.log(`MongoDB connected — database: ${mongoose.connection.name}`);
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
  mongoose.connection.on('error', err => console.error('MongoDB connection error:', err.message));
  return mongoose.connection;
}
module.exports = { connectDB };
