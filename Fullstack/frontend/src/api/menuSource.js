
import { api } from "./api";

// Load menu items from the OfficeBite backend.
// Uses real MongoDB menu data.

export const loadMenu = async (params = {}) => {
  const response = await api.getMenu(params);

  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.items)) {
    return response.items;
  }

  throw new Error("Invalid menu response from server.");
};
