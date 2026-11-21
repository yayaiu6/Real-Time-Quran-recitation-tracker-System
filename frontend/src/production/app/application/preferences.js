// Existing JSON storage contract. Storage denial/corruption is non-fatal.
export function createPreferences(namespace, storage) {
  return {
    get(name, fallback) {
      try {
        const value = storage().getItem(`${namespace}.${name}`);
        return value === null ? fallback : JSON.parse(value);
      } catch { return fallback; }
    },
    set(name, value) {
      try { storage().setItem(`${namespace}.${name}`, JSON.stringify(value)); } catch {}
    },
  };
}

// Preserve the existing numeric coercion and pager-owned rounding/clamping.
export function initialPage(search, preferences) {
  const requested = Number(new URLSearchParams(search).get("page"));
  if (requested >= 1 && requested <= 604) {
    preferences.set("page", requested);
    return requested;
  }
  const saved = preferences.get("page", 1);
  if (saved >= 1 && saved <= 604) return saved;
  preferences.set("page", 1);
  return 1;
}
