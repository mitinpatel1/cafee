import { api } from './api';
import { filterLocal } from '../data/menuItems';

// Backend first; if it is down or has no items yet, use the built-in cafeteria menu.
export const loadMenu = async (params = {}) => {
  try {
    const res = await api.getMenu(params);
    if (res.success && res.items && res.items.length > 0) return res.items;
  } catch {
    /* fall through to local menu */
  }
  return filterLocal(params);
};
