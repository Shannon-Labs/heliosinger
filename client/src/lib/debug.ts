const isBrowser = typeof window !== "undefined";
const isDev = import.meta.env.DEV;

export const isDebugEnabled = () => {
  if (!isDev || !isBrowser) return false;
  try {
    return window.localStorage.getItem("heliosinger:debug") === "true";
  } catch {
    return false;
  }
};

export const debugLog = (...args: unknown[]) => {
  if (isDebugEnabled()) {
    console.log(...args);
  }
};

export const debugWarn = (...args: unknown[]) => {
  if (isDebugEnabled()) {
    console.warn(...args);
  }
};
