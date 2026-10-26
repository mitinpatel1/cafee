const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const { AVATAR_DIR } = require("./utils/avatarStorage");

const app = express();
const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173')
  .split(',').map(x => x.trim()).filter(Boolean);
const corsOptions = { origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin is not permitted by CORS')); }, credentials: true };
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.disable('x-powered-by');
if (process.env.NODE_ENV !== 'production') app.use((req,res,next) => { console.log(`${req.method} ${req.originalUrl}`); next(); });

app.get('/api/health', (_req,res) => res.status(mongoose.connection.readyState === 1 ? 200 : 503).json({success: mongoose.connection.readyState === 1, service: 'OfficeBite API', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected', databaseName: mongoose.connection.readyState === 1 ? mongoose.connection.name : undefined, timestamp: new Date().toISOString()}));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/menu', require('./routes/menu'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/franchise', require('./routes/franchise'));
app.use('/api', (_req, res) => res.status(404).json({success:false,message:'API endpoint not found.'}));
const dist = path.join(__dirname,'../../frontend/dist');
if (fs.existsSync(path.join(dist,'index.html'))) {
  app.use(express.static(dist));
  app.get('*', (_req,res) => res.sendFile(path.join(dist,'index.html')));
} else {
  app.get('/', (_req,res) => res.json({service:'OfficeBite API',message:'Frontend is served separately by Vite on port 5173.'}));
}
app.use((err,_req,res,_next) => {
  console.error('Request failed:', err.message);
  const status = err.status || (err.message === 'Origin is not permitted by CORS' ? 403 : 500);
  return res.status(status).json({success:false,message: status === 500 ? 'Internal server error.' : err.message});
});
// Add after creating the existing Express app:
app.use(
  "/uploads/avatars",
  express.static(AVATAR_DIR, {
    index: false,
    dotfiles: "deny",
    maxAge: "7d",
    immutable: true,
    setHeaders: (res) => {
      res.setHeader(
        "X-Content-Type-Options",
        "nosniff"
      );
    },
  })
);
module.exports = { app, corsOptions };
