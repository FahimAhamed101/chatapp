export const getLocalStorageItem = (key: string): string | null => {
  if (typeof window === "undefined") return null;
  const storage = window.localStorage;
  if (!storage || typeof storage.getItem !== "function") return null;

  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

export const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window === "undefined") return;
  const storage = window.localStorage;
  if (!storage || typeof storage.setItem !== "function") return;

  try {
    storage.setItem(key, value);
  } catch {
    // Ignore write failures (e.g., storage disabled).
  }
};

export const removeLocalStorageItem = (key: string): void => {
  if (typeof window === "undefined") return;
  const storage = window.localStorage;
  if (!storage || typeof storage.removeItem !== "function") return;

  try {
    storage.removeItem(key);
  } catch {
    // Ignore remove failures (e.g., storage disabled).
  }
};
