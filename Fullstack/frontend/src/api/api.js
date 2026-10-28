
const API_BASE = "/api";

// =====================================================
// AUTHENTICATION HELPERS
// =====================================================

const getToken = () => {
  return localStorage.getItem("officebite_token");
};

const getAuthHeaders = () => {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const getUploadHeaders = () => {
  const token = getToken();

  return token
    ? { Authorization: `Bearer ${token}` }
    : {};
};

// =====================================================
// RESPONSE HANDLER
// =====================================================

const handleResponse = async (response) => {
  let data;

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    try {
      data = await response.json();
    } catch {
      throw new Error("Invalid JSON response from server.");
    }
  } else {
    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        response.status === 502 || response.status === 503
          ? "Backend server is unavailable."
          : `Request failed (${response.status}).`
      );
    }

    data = text ? { message: text } : {};
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        `Request failed (${response.status}).`
    );
  }

  return data;
};

// =====================================================
// QUERY STRING HELPER
// =====================================================

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      value !== "All"
    ) {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();

  return query ? `?${query}` : "";
};

// =====================================================
// OFFICEBITE API SERVICES
// =====================================================

export const api = {

  // ===================================================
  // 1. AUTHENTICATION
  // ===================================================

  login: async (credentials) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });

    return handleResponse(res);
  },

  register: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    });

    return handleResponse(res);
  },

  getProfile: async () => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: "GET",
      headers: getAuthHeaders(),
    });

    return handleResponse(res);
  },

  updateProfile: async (userData) => {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(userData),
    });

    return handleResponse(res);
  },

  // ===================================================
  // 2. PROFILE PICTURE UPLOAD
  // ===================================================

  uploadProfileAvatar: async (file) => {
    if (!file) {
      throw new Error("Please select a profile picture.");
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "Only JPG, PNG and WebP images are allowed."
      );
    }

    const maxFileSize = 2 * 1024 * 1024;

    if (file.size > maxFileSize) {
      throw new Error(
        "Profile picture must be 2 MB or smaller."
      );
    }

    const formData = new FormData();

    formData.append("avatar", file);

    const res = await fetch(
      `${API_BASE}/auth/profile/avatar`,
      {
        method: "POST",
        headers: getUploadHeaders(),
        body: formData,
      }
    );

    return handleResponse(res);
  },

  // ===================================================
  // 3. REMOVE PROFILE PICTURE
  // ===================================================

  removeProfileAvatar: async () => {
    const res = await fetch(
      `${API_BASE}/auth/profile/avatar`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  // ===================================================
  // 4. MENU MANAGEMENT
  // ===================================================

  getMenu: async (params = {}) => {
    const queryStr = buildQuery({
      franchiseId: params.franchiseId,
      category: params.category,
      search: params.search,
      vegOnly: params.vegOnly ? "true" : undefined,
      isAvailable: params.isAvailable,
    });

    const res = await fetch(
      `${API_BASE}/menu${queryStr}`
    );

    return handleResponse(res);
  },

  getMenuItem: async (id) => {
    const res = await fetch(`${API_BASE}/menu/${id}`);

    return handleResponse(res);
  },

  createMenuItem: async (itemData) => {
    const res = await fetch(`${API_BASE}/menu`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });

    return handleResponse(res);
  },

  updateMenuItem: async (id, itemData) => {
    const res = await fetch(`${API_BASE}/menu/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(itemData),
    });

    return handleResponse(res);
  },

  toggleAvailability: async (id) => {
    const res = await fetch(
      `${API_BASE}/menu/${id}/toggle`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  deleteMenuItem: async (id) => {
    const res = await fetch(`${API_BASE}/menu/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    return handleResponse(res);
  },

  // ===================================================
  // 5. CUSTOMER ORDERS
  // ===================================================

  createOrder: async (orderData) => {
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
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
    const res = await fetch(
      `${API_BASE}/orders/${id}`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  cancelOrder: async (id, reason) => {
    const res = await fetch(
      `${API_BASE}/orders/${id}/cancel`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason }),
      }
    );

    return handleResponse(res);
  },

  // ===================================================
  // 6. SERVICE ADMIN - ORDER MANAGEMENT
  // ===================================================

  getAllOrders: async (params = {}) => {
    const queryStr = buildQuery({
      status: params.status,
      date: params.date,
    });

    const res = await fetch(
      `${API_BASE}/orders/admin/all${queryStr}`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  updateOrderStatus: async (
    id,
    status,
    readyInMinutes
  ) => {
    const res = await fetch(
      `${API_BASE}/orders/admin/${id}/status`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          status,
          readyInMinutes,
        }),
      }
    );

    return handleResponse(res);
  },

 
collectCounterPayment: async (id, reference = "") => {
  const token = localStorage.getItem("officebite_token");

  const response = await fetch(
    `${API_BASE}/orders/admin/${id}/counter-payment`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : {}),
      },
      body: JSON.stringify({
        reference: String(reference).trim(),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Counter payment failed:", data);

    throw new Error(
      data.message || "Unable to confirm counter payment."
    );
  }

  return data;
},


  // ===================================================
  // 7. INVENTORY MANAGEMENT
  // ===================================================

  getInventory: async () => {
    const res = await fetch(
      `${API_BASE}/admin/inventory`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  updateStock: async (id, payload) => {
    const res = await fetch(
      `${API_BASE}/admin/inventory/${id}/stock`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    return handleResponse(res);
  },

  createIngredient: async (payload) => {
    const res = await fetch(
      `${API_BASE}/admin/inventory`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      }
    );

    return handleResponse(res);
  },

  deleteIngredient: async (id) => {
    const res = await fetch(
      `${API_BASE}/admin/inventory/${id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  // ===================================================
  // 8. REPORTS & ANALYTICS
  // ===================================================

  getReports: async () => {
    const res = await fetch(
      `${API_BASE}/admin/reports`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  // ===================================================
  // 9. PAYMENT MANAGEMENT
  // ===================================================

  getPaymentConfig: async () => {
    const res = await fetch(
      `${API_BASE}/payments/config`
    );

    return handleResponse(res);
  },

  initiatePayment: async (
    orderId,
    paymentMethod
  ) => {
    const res = await fetch(
      `${API_BASE}/payments/initiate`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId,
          paymentMethod,
        }),
      }
    );

    return handleResponse(res);
  },

  verifyPayment: async (
    orderId,
    razorpay_payment_id,
    razorpay_order_id,
    razorpay_signature
  ) => {
    const res = await fetch(
      `${API_BASE}/payments/verify`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          orderId,
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
        }),
      }
    );

    return handleResponse(res);
  },

  getPaymentStatus: async (orderId) => {
    const res = await fetch(
      `${API_BASE}/payments/status/${orderId}`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  // ===================================================
  // 10. FRANCHISE - PUBLIC
  // ===================================================

  getActiveFranchises: async () => {
    const res = await fetch(
      `${API_BASE}/franchise/public`
    );

    return handleResponse(res);
  },

  // ===================================================
  // 11. FRANCHISE OWNER
  // ===================================================

  getMyFranchises: async () => {
    const res = await fetch(
      `${API_BASE}/franchise/me`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  getFranchiseOrders: async () => {
    const res = await fetch(
      `${API_BASE}/franchise/orders`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  updateFranchiseOrderStatus: async (
    id,
    status
  ) => {
    const res = await fetch(
      `${API_BASE}/franchise/orders/${id}/status`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    return handleResponse(res);
  },

  collectFranchiseCash: async (id) => {
    const res = await fetch(
      `${API_BASE}/franchise/orders/${id}/collect-cash`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  getFranchiseDashboard: async () => {
    const res = await fetch(
      `${API_BASE}/franchise/dashboard/stats`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  // Franchise-only scoped stock and outlet settings. Existing admin APIs stay unchanged.
  getMyFranchiseMenu: async (franchiseId) => handleResponse(await fetch(`${API_BASE}/franchise/menu${buildQuery({franchiseId})}`, {headers:getAuthHeaders()})),
  getFranchiseInventory: async (franchiseId) => handleResponse(await fetch(`${API_BASE}/franchise/inventory${buildQuery({franchiseId})}`, {headers: getAuthHeaders()})),
  createFranchiseIngredient: async (payload) => handleResponse(await fetch(`${API_BASE}/franchise/inventory`, {method:'POST', headers:getAuthHeaders(),body:JSON.stringify(payload)})),
  updateFranchiseIngredient: async (id, payload) => handleResponse(await fetch(`${API_BASE}/franchise/inventory/${id}`, {method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify(payload)})),
  deleteFranchiseIngredient: async (id) => handleResponse(await fetch(`${API_BASE}/franchise/inventory/${id}`, {method:'DELETE',headers:getAuthHeaders()})),
  updateMyFranchise: async (id, payload) => handleResponse(await fetch(`${API_BASE}/franchise/me/${id}`, {method:'PATCH',headers:getAuthHeaders(),body:JSON.stringify(payload)})),

  // ===================================================
  // 12. FRANCHISE ADMIN MANAGEMENT
  // ===================================================

  getAllFranchises: async () => {
    const res = await fetch(
      `${API_BASE}/franchise/all`,
      {
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  registerFranchise: async (data) => {
    const res = await fetch(
      `${API_BASE}/franchise/register`,
      {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    return handleResponse(res);
  },

  updateFranchise: async (id, data) => {
    const res = await fetch(
      `${API_BASE}/franchise/${id}`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      }
    );

    return handleResponse(res);
  },

  deleteFranchise: async (id) => {
    const res = await fetch(
      `${API_BASE}/franchise/${id}`,
      {
        method: "DELETE",
        headers: getAuthHeaders(),
      }
    );

    return handleResponse(res);
  },

  updateFranchiseStatus: async (
    id,
    status
  ) => {
    const res = await fetch(
      `${API_BASE}/franchise/${id}/status`,
      {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status }),
      }
    );

    return handleResponse(res);
  },
};

// Optional named exports
export {
  API_BASE,
  getAuthHeaders,
  handleResponse,
};
