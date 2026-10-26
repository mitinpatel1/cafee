require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const { app, corsOptions } = require('./src/app');
const { connectDB } = require('./src/config/db');
const setupSocket = require('./src/socket');
const server = http.createServer(app);
const io = new Server(server, { cors: { ...corsOptions, methods: ['GET','POST'] } });
app.set('io', io);
setupSocket(io);

async function start() {
  const port = Number(process.env.PORT || 5600);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) throw new Error('Invalid PORT value');
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32 || /^(replace|change|example)/i.test(process.env.JWT_SECRET))
    throw new Error('Provide a strong JWT_SECRET (32+ characters) in backend/.env');
  await connectDB();
  const { seedDailyCatalog, seedAllFranchises } = require('./src/services/seedMenu');
  await seedDailyCatalog();
  await seedAllFranchises();
  console.log('Daily menu catalogue ready (Breakfast 10, Lunch 15, Snacks 15, Beverages 10)');
  server.listen(port, '0.0.0.0', () => console.log(`OfficeBite API running on http://localhost:${port} | health: /api/health`));
}

if (require.main === module) {
  start().catch(err => { console.error('Startup failed:', err.message); process.exitCode = 1; });
}
module.exports = { app, server, start };
