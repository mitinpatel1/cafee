
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";

import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

// ================================================
// CONFIGURATION
// ================================================

const SocketContext = createContext(null);

const SOCKET_URL = window.location.origin;
const SOCKET_PATH = "/socket.io";

const MAX_NOTIFICATIONS = 20;
const ALERT_DURATION = 8000;

// ================================================
// NOTIFICATION SOUND
// ================================================

const playNotificationSound = async (type = "default") => {
  let audioContext;

  try {
    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) return;

    audioContext = new AudioContextClass();

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sine";
    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    const now = audioContext.currentTime;

    const sounds = {
      new_order: {
        notes: [660, 880],
        volume: 0.2,
        duration: 0.4,
      },
      order_ready: {
        notes: [880, 1100],
        volume: 0.25,
        duration: 0.5,
      },
      payment: {
        notes: [523, 659, 784],
        volume: 0.18,
        duration: 0.5,
      },
      default: {
        notes: [700],
        volume: 0.12,
        duration: 0.3,
      },
    };

    const sound = sounds[type] || sounds.default;

    sound.notes.forEach((frequency, index) => {
      oscillator.frequency.setValueAtTime(
        frequency,
        now + index * 0.12
      );
    });

    gain.gain.setValueAtTime(sound.volume, now);
    gain.gain.exponentialRampToValueAtTime(
      0.01,
      now + sound.duration
    );

    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      audioContext.close().catch(() => {});
    };

    oscillator.start(now);
    oscillator.stop(now + sound.duration);
  } catch {
    if (audioContext) {
      audioContext.close().catch(() => {});
    }
  }
};

// ================================================
// SOCKET PROVIDER
// ================================================

export const SocketProvider = ({ children }) => {
  const { user, token, isStaffOrAdmin } = useAuth();

  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const [activeAlert, setActiveAlert] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [orderTrackingData, setOrderTrackingData] =
    useState({});

  const socketRef = useRef(null);
  const alertTimeoutRef = useRef(null);

  const trackingRoomsRef = useRef(new Set());
  const notificationCounterRef = useRef(0);

  // ==============================================
  // NOTIFICATION HELPER
  // ==============================================

  const addNotification = useCallback(
    (notification, soundType = "default") => {
      notificationCounterRef.current += 1;

      const newNotification = {
        ...notification,
        id: `${Date.now()}-${notificationCounterRef.current}`,
        timestamp: new Date().toISOString(),
      };

      setActiveAlert(newNotification);

      setNotifications((previous) =>
        [newNotification, ...previous].slice(
          0,
          MAX_NOTIFICATIONS
        )
      );

      playNotificationSound(soundType);

      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }

      alertTimeoutRef.current = setTimeout(() => {
        setActiveAlert(null);
        alertTimeoutRef.current = null;
      }, ALERT_DURATION);
    },
    []
  );

  // ==============================================
  // SOCKET CONNECTION
  // ==============================================

  useEffect(() => {
    if (!token || !user?._id) {
      socketRef.current = null;
      trackingRoomsRef.current.clear();

      setSocket(null);
      setIsConnected(false);

      return;
    }

    let disposed = false;

    const socketInstance = io(SOCKET_URL, {
      path: SOCKET_PATH,

      auth: {
        token,
      },

      transports: ["polling", "websocket"],
      upgrade: true,

      autoConnect: false,

      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,

      timeout: 10000,
      forceNew: true,
    });

    socketRef.current = socketInstance;
    setSocket(socketInstance);

    // ============================================
    // JOIN ROOMS
    // ============================================

    const joinRooms = () => {
      if (!socketInstance.connected) return;

      socketInstance.emit(
        "join_user_room",
        user._id
      );

      if (isStaffOrAdmin) {
        socketInstance.emit("join_kitchen_room");
      }

      trackingRoomsRef.current.forEach((orderId) => {
        socketInstance.emit(
          "join_order_room",
          orderId
        );
      });
    };

    // ============================================
    // CONNECTION EVENTS
    // ============================================

    const onConnect = () => {
      if (disposed) return;

      console.log(
        "[Socket] Connected:",
        socketInstance.id
      );

      setIsConnected(true);
      joinRooms();
    };

    const onDisconnect = (reason) => {
      if (disposed) return;

      console.warn("[Socket] Disconnected:", reason);
      setIsConnected(false);
    };

    const onConnectError = (error) => {
      if (disposed) return;

      console.warn(
        "[Socket] Connection error:",
        error.message
      );

      setIsConnected(false);

      // Authentication failures require a fresh login.
      if (
        /unauthorized|invalid token|jwt expired|authentication failed/i.test(
          error.message || ""
        )
      ) {
        socketInstance.disconnect();
      }
    };

    // ============================================
    // ORDER STATUS UPDATED
    // ============================================

    const onOrderStatusUpdated = (data) => {
      if (!data) return;

      const orderId =
        data.orderId || data.order?._id;

      const orderNumber =
        data.order?.orderNumber ||
        data.orderNumber ||
        "OB";

      const status = data.status || "Updated";

      if (orderId) {
        setOrderTrackingData((previous) => ({
          ...previous,
          [orderId]: {
            ...previous[orderId],
            status,
            timestamp: new Date().toISOString(),
          },
        }));
      }

      addNotification(
        {
          type: "status_update",
          title: `Order #${orderNumber} Updated!`,
          message: `Order status: ${status}`,
          status,
          orderId,
        },
        status === "Ready"
          ? "order_ready"
          : "default"
      );
    };

    // ============================================
    // ORDER TRACKING UPDATE
    // ============================================

    const onOrderTrackingUpdate = (data) => {
      if (!data?.orderId) return;

      setOrderTrackingData((previous) => ({
        ...previous,
        [data.orderId]: {
          ...previous[data.orderId],
          ...data,
          timestamp:
            data.timestamp ||
            new Date().toISOString(),
        },
      }));
    };

    // ============================================
    // ETA UPDATED
    // ============================================

    const onOrderEtaUpdated = (data) => {
      if (!data?.orderId) return;

      setOrderTrackingData((previous) => ({
        ...previous,
        [data.orderId]: {
          ...previous[data.orderId],
          eta: data.eta,
          message: data.message,
          timestamp: new Date().toISOString(),
        },
      }));
    };

    // ============================================
    // PAYMENT CONFIRMED
    // ============================================

    const onPaymentConfirmed = (data) => {
      if (!data) return;

      addNotification(
        {
          type: "payment",
          title: `Payment Confirmed! #${
            data.orderNumber || "OB"
          }`,
          message: `₹${data.amount ?? 0} paid via ${
            data.method || "Gateway"
          }`,
          orderId: data.orderId,
        },
        "payment"
      );
    };

    // ============================================
    // NEW ORDER - SERVICE DASHBOARD
    // ============================================

    const onNewOrder = (order) => {
      if (!order || !isStaffOrAdmin) return;

      addNotification(
        {
          type: "new_order",
          title: `New Order Received! #${
            order.orderNumber || "OB"
          }`,
          message: `${
            order.items?.length || 0
          } items for ${
            order.userId?.name || "Customer"
          }`,
          status: "Pending",
          orderId: order._id,
        },
        "new_order"
      );
    };

    // ============================================
    // REGISTER EVENT LISTENERS
    // ============================================

    socketInstance.on("connect", onConnect);
    socketInstance.on("disconnect", onDisconnect);

    socketInstance.on(
      "connect_error",
      onConnectError
    );

    socketInstance.on(
      "order_status_updated",
      onOrderStatusUpdated
    );

    socketInstance.on(
      "order_tracking_update",
      onOrderTrackingUpdate
    );

    socketInstance.on(
      "order_eta_updated",
      onOrderEtaUpdated
    );

    socketInstance.on(
      "payment_confirmed",
      onPaymentConfirmed
    );

    if (isStaffOrAdmin) {
      socketInstance.on("new_order", onNewOrder);
    }

    // Start connection
    socketInstance.connect();

    // ============================================
    // CLEANUP
    // ============================================

    return () => {
      disposed = true;

      socketInstance.removeAllListeners();
      socketInstance.disconnect();

      if (socketRef.current === socketInstance) {
        socketRef.current = null;
      }

      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
        alertTimeoutRef.current = null;
      }
    };
  }, [
    token,
    user?._id,
    isStaffOrAdmin,
    addNotification,
  ]);

  // ==============================================
  // JOIN TRACKING ROOM
  // ==============================================

  const joinOrderRoom = useCallback((orderId) => {
    if (!orderId) return;

    const id = String(orderId);
    trackingRoomsRef.current.add(id);

    if (socketRef.current?.connected) {
      socketRef.current.emit(
        "join_order_room",
        id
      );
    }
  }, []);

  // ==============================================
  // LEAVE TRACKING ROOM
  // ==============================================

  const leaveOrderRoom = useCallback((orderId) => {
    if (!orderId) return;

    const id = String(orderId);
    trackingRoomsRef.current.delete(id);

    if (socketRef.current?.connected) {
      socketRef.current.emit(
        "leave_order_room",
        id
      );
    }
  }, []);

  // ==============================================
  // DISMISS ALERT
  // ==============================================

  const dismissAlert = useCallback(() => {
    setActiveAlert(null);

    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current);
      alertTimeoutRef.current = null;
    }
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // ==============================================
  // PROVIDER VALUE
  // ==============================================

  const contextValue = useMemo(
    () => ({
      socket,
      isConnected,
      activeAlert,
      dismissAlert,
      notifications,
      clearNotifications,
      orderTrackingData,
      joinOrderRoom,
      leaveOrderRoom,
    }),
    [
      socket,
      isConnected,
      activeAlert,
      dismissAlert,
      notifications,
      clearNotifications,
      orderTrackingData,
      joinOrderRoom,
      leaveOrderRoom,
    ]
  );

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};

// ================================================
// CUSTOM HOOK
// ================================================

export const useSocket = () => {
  const context = useContext(SocketContext);

  if (!context) {
    throw new Error(
      "useSocket must be used inside SocketProvider"
    );
  }

  return context;
};
