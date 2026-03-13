if (typeof window === "undefined") {
  const storage = (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage;
  if (!storage || typeof storage.getItem !== "function") {
    (globalThis as typeof globalThis & { localStorage?: Storage }).localStorage = {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage;
  }
}

export {};
