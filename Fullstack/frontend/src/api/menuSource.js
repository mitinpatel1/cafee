import { api } from './api';

// Always show real database content. Never present sample dishes as live inventory.
export const loadMenu = async (params = {}) => {
  const response = await api.getMenu(params);
  return response.items || [];
};
