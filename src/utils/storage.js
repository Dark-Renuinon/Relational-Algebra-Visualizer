const THEME_KEY = 'ra-visualizer-theme-v1';

function read(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export function loadTheme() {
  const saved = read(THEME_KEY, null);
  if (saved === 'light' || saved === 'dark') return saved;
  // Versions before the JSON-backed storage helper saved this value as raw text.
  // Keep that preference rather than silently falling back to the OS setting.
  try {
    const legacyTheme = localStorage.getItem(THEME_KEY);
    if (legacyTheme === 'light' || legacyTheme === 'dark') return legacyTheme;
  } catch {
    // Storage is optional; use the system preference below when unavailable.
  }
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function saveTheme(theme) { localStorage.setItem(THEME_KEY, JSON.stringify(theme)); }
