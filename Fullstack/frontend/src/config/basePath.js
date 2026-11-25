const rawBase = import.meta.env.BASE_URL || "/";

export const APP_BASE = rawBase.replace(/\/+$/, "");

export const stripBase = (pathname) => {
  if (APP_BASE && (pathname === APP_BASE || pathname.startsWith(`${APP_BASE}/`))) {
    return pathname.slice(APP_BASE.length) || "/";
  }
  return pathname;
};

export const currentAppPath = () => stripBase(window.location.pathname);

export const publicUrl = (file) => `${rawBase}${String(file).replace(/^\/+/, "")}`;

export const uploadUrl = (url) =>
  typeof url === "string" && url.startsWith("/uploads/") ? `${APP_BASE}${url}` : url;
