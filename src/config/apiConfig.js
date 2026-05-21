export const PRODUCTOS_API_CONFIG = {
  modo: import.meta.env.VITE_PRODUCTOS_API_MODO || "local",
  appsScriptUrl: import.meta.env.VITE_APPS_SCRIPT_URL || "",
};

export const ADMIN_API_TOKEN = import.meta.env.VITE_ADMIN_API_TOKEN || "";

export const ADMIN_LOGIN_CONFIG = {
  user: import.meta.env.VITE_ADMIN_USER || "",
  password: import.meta.env.VITE_ADMIN_PASSWORD || "",
};
