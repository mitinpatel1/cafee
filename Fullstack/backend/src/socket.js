const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Order = require('./models/Order');
const Franchise = require('./models/Franchise');

function setupSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.id).select('role');
      if (!user) return next(new Error('Unauthorized'));
      socket.user = user;
      next();
    } catch { next(new Error('Unauthorized')); }
  });

  io.on('connection', async (socket) => {
    socket.join(`user_${socket.user._id}`);
    if (socket.user.role === 'admin') socket.join('kitchen');
    if (socket.user.role === 'franchise') {
      const myFranchises = await Franchise.find({ownerId:socket.user._id}).select('_id');
      for (const f of myFranchises) socket.join(`franchise_${f._id}`);
    }
    socket.on('join_user_room', () => {}); // Server assigns identity; ignore user supplied IDs
    socket.on('join_kitchen_room', () => {}); // Admin membership assigned above
    socket.on('join_order_room', async (orderId) => {
      try {
        const order = await Order.findById(orderId);
        if (!order) return;
        const owner = order.userId.toString() === socket.user._id.toString();
        const admin = socket.user.role === 'admin';
        const ownsFranchise = socket.user.role === 'franchise' && order.franchiseId &&
          await Franchise.exists({ _id: order.franchiseId, ownerId: socket.user._id });
        if (owner || admin || ownsFranchise) socket.join(`order_${order._id}`);
      } catch { /* Ignore invalid IDs */ }
    });
    socket.on('leave_order_room', (orderId) => {
      socket.leave(`order_${orderId}`);
    });
  });
}

module.exports = setupSocket;
