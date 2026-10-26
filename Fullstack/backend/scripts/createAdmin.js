require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const { connectDB } = require('../src/config/db');

async function run() {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, MONGODB_URI, JWT_SECRET } = process.env;
  if (!ADMIN_NAME || !ADMIN_EMAIL || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12 || !MONGODB_URI || !JWT_SECRET) {
    throw new Error('Set ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD (min 12 characters), MONGODB_URI and JWT_SECRET in the backend environment.');
  }
  await connectDB();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  if (await User.exists({ email })) throw new Error('Account already exists: admin creation aborted.');
  const admin = await User.create({ name: ADMIN_NAME, email, password: ADMIN_PASSWORD, role: 'admin' });
  console.log('Administrator created:', admin.email);
}
run().catch(e => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
