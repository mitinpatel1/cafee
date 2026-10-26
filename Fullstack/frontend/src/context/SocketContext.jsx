import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

// Simple sound notification using Web Audio API
const playNotificationSound = (type = 'default') => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    if (type === 'order_ready') {
      // Two-tone chime for "Ready"
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.15);
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } else if (type === 'new_order') {
      // Bell ding for kitchen new order
      oscillator.frequency.setValueAtTime(660, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.25, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.4);
    } else if (type === 'payment') {
      // Soft success tone
      oscillator.frequency.setValueAtTime(523, audioCtx.currentTime);
      oscillator.frequency.setValueAtTime(659, audioCtx.currentTime + 0.12);
      oscillator.frequency.setValueAtTime(784, audioCtx.currentTime + 0.24);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } else {
      // Default notification blip
      oscillator.frequency.setValueAtTime(700, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
    }
  } catch (e) {
    // AudioContext not available, ignore
  }
};

export const SocketProvider = ({ children }) => {
  const { user, isStaffOrAdmin } = useAuth();
  const [socket, setSocket] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [orderTrackingData, setOrderTrackingData] = useState({});
  const alertTimeoutRef = useRef(null);

  useEffect(() => {
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('[Socket] Connected to server');
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // Join rooms based on auth state
  useEffect(() => {
    if (!socket || !user) return;

    // Join individual employee room
    socket.emit('join_user_room', user._id);

    // If staff/admin, join kitchen room
    if (isStaffOrAdmin) {
      socket.emit('join_kitchen_room');
    }

    // Listen for order status updates
    socket.on('order_status_updated', (data) => {
      console.log('[Socket] Order status updated:', data);

      let soundType = 'default';
      if (data.status === 'Ready') soundType = 'order_ready';
      playNotificationSound(soundType);

      const notification = {
        id: Date.now(),
        type: 'status_update',
        title: `Order #${data.order?.orderNumber || 'OB'} Updated!`,
        message: `Status is now: ${data.status}`,
        status: data.status,
        orderId: data.orderId,
        timestamp: new Date().toISOString(),
      };

      setActiveAlert(notification);
      setNotifications((prev) => [notification, ...prev].slice(0, 20));

      // Auto clear alert
      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => setActiveAlert(null), 8000);
    });

    // Listen for order tracking updates (for dedicated tracking page)
    socket.on('order_tracking_update', (data) => {
      console.log('[Socket] Order tracking update:', data);
      setOrderTrackingData((prev) => ({
        ...prev,
        [data.orderId]: {
          ...prev[data.orderId],
          status: data.status,
          eta: data.eta,
          message: data.message,
          timestamp: data.timestamp,
          orderNumber: data.orderNumber,
        },
      }));
    });

    // Listen for ETA updates
    socket.on('order_eta_updated', (data) => {
      console.log('[Socket] ETA updated:', data);
      setOrderTrackingData((prev) => ({
        ...prev,
        [data.orderId]: {
          ...prev[data.orderId],
          eta: data.eta,
          message: data.message,
        },
      }));
    });

    // Listen for payment confirmation
    socket.on('payment_confirmed', (data) => {
      console.log('[Socket] Payment confirmed:', data);
      playNotificationSound('payment');

      const notification = {
        id: Date.now(),
        type: 'payment',
        title: `Payment Confirmed! #${data.orderNumber}`,
        message: `₹${data.amount} paid via ${data.method || 'Gateway'}`,
        orderId: data.orderId,
        timestamp: new Date().toISOString(),
      };

      setActiveAlert(notification);
      setNotifications((prev) => [notification, ...prev].slice(0, 20));

      if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = setTimeout(() => setActiveAlert(null), 8000);
    });

    // Listen for new orders (staff/admin)
    if (isStaffOrAdmin) {
      socket.on('new_order', (order) => {
        console.log('[Socket] New kitchen order received:', order);
        playNotificationSound('new_order');

        const notification = {
          id: Date.now(),
          type: 'new_order',
          title: `New Order Received! #${order.orderNumber}`,
          message: `${order.items?.length || 1} items for ${order.userId?.name || 'Employee'}`,
          status: 'Pending',
          orderId: order._id,
          timestamp: new Date().toISOString(),
        };

        setActiveAlert(notification);
        setNotifications((prev) => [notification, ...prev].slice(0, 20));

        if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = setTimeout(() => setActiveAlert(null), 8000);
      });
    }

    return () => {
      socket.off('order_status_updated');
      socket.off('order_tracking_update');
      socket.off('order_eta_updated');
      socket.off('payment_confirmed');
      socket.off('new_order');
    };
  }, [socket, user, isStaffOrAdmin]);

  const dismissAlert = () => {
    setActiveAlert(null);
    if (alertTimeoutRef.current) clearTimeout(alertTimeoutRef.current);
  };

  const clearNotifications = () => setNotifications([]);

  // Join/leave order-specific tracking rooms
  const joinOrderRoom = useCallback(
    (orderId) => {
      if (socket && orderId) {
        socket.emit('join_order_room', orderId);
      }
    },
    [socket]
  );

  const leaveOrderRoom = useCallback(
    (orderId) => {
      if (socket && orderId) {
        socket.emit('leave_order_room', orderId);
      }
    },
    [socket]
  );

  return (
    <SocketContext.Provider
      value={{
        socket,
        activeAlert,
        dismissAlert,
        notifications,
        clearNotifications,
        orderTrackingData,
        joinOrderRoom,
        leaveOrderRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
