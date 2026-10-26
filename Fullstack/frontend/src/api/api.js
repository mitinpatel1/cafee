const API_BASE = '/api';

const getAuthHeaders = () => {
  const token = localStorage.getItem('officebite_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  return data;
};

export const api = {
  // Auth
  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    return handleResponse(res);
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  updateProfile: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });
    return handleResponse(res);
  },

  rechargeWallet: async (amount) => {
    const res = await fetch(`${API_BASE}/auth/wallet/recharge`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ amount }),
    });
    return handleResponse(res);
  },

  // Menu
  getMenu: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.category && params.category !== 'All') searchParams.append('category', params.category);
    if (params.search) searchParams.append('search', params.search);
    if (params.vegOnly) searchParams.append('vegOnly', 'true');
    if (params.isAvailable !== undefined) searchParams.append('isAvailable', params.isAvailable);

    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/menu${queryStr}`);
    return handleResponse(res);
  },

  getMenuItem: async (id) => {
    const res = await fetch(`${API_BASE}/menu/${id}`);
    return handleResponse(res);
  },

  createMenuItem: async (itemData) => {
    const res = await fetch(`${API_BASE}/menu`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    return handleResponse(res);
  },

  updateMenuItem: async (id, itemData) => {
    const res = await fetch(`${API_BASE}/menu/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });
    return handleResponse(res);
  },

  toggleAvailability: async (id) => {
    const res = await fetch(`${API_BASE}/menu/${id}/toggle`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  deleteMenuItem: async (id) => {
    const res = await fetch(`${API_BASE}/menu/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Orders
  createOrder: async (orderData) => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(orderData),
    });
    return handleResponse(res);
  },

  getMyOrders: async () => {
    const res = await fetch(`${API_BASE}/orders/my`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  getOrderById: async (id) => {
    const res = await fetch(`${API_BASE}/orders/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  cancelOrder: async (id, reason) => {
    const res = await fetch(`${API_BASE}/orders/${id}/cancel`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ reason }),
    });
    return handleResponse(res);
  },

  // Admin Order Management
  getAllOrders: async (params = {}) => {
    const searchParams = new URLSearchParams();
    if (params.status && params.status !== 'All') searchParams.append('status', params.status);
    if (params.date) searchParams.append('date', params.date);

    const queryStr = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const res = await fetch(`${API_BASE}/orders/admin/all${queryStr}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  updateOrderStatus: async (id, status) => {
    const res = await fetch(`${API_BASE}/orders/admin/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return handleResponse(res);
  },

  // Inventory
  getInventory: async () => {
    const res = await fetch(`${API_BASE}/admin/inventory`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  updateStock: async (id, payload) => {
    const res = await fetch(`${API_BASE}/admin/inventory/${id}/stock`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  createIngredient: async (payload) => {
    const res = await fetch(`${API_BASE}/admin/inventory`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return handleResponse(res);
  },

  deleteIngredient: async (id) => {
    const res = await fetch(`${API_BASE}/admin/inventory/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Reports
  getReports: async () => {
    const res = await fetch(`${API_BASE}/admin/reports`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Payments
  initiatePayment: async (orderId, paymentMethod) => {
    const res = await fetch(`${API_BASE}/payments/initiate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderId, paymentMethod }),
    });
    return handleResponse(res);
  },

  verifyPayment: async (orderId, paymentId, gatewayOrderId, paymentMethod) => {
    const res = await fetch(`${API_BASE}/payments/verify`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ orderId, paymentId, gatewayOrderId, paymentMethod }),
    });
    return handleResponse(res);
  },

  getPaymentStatus: async (orderId) => {
    const res = await fetch(`${API_BASE}/payments/status/${orderId}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },
};
