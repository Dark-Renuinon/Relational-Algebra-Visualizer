import { cloneDatabase, DEFAULT_DATABASE } from '../data/sampleDatabase';

const DATABASE_KEY = 'ra-visualizer-database-v1';
const HISTORY_KEY = 'ra-visualizer-history-v1';
const THEME_KEY = 'ra-visualizer-theme-v1';

function read(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function isDatabase(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value).every((relation) => relation && Array.isArray(relation.columns) && Array.isArray(relation.rows));
}

export function loadDatabase() {
  const database = read(DATABASE_KEY, null);
  return isDatabase(database) ? database : cloneDatabase(DEFAULT_DATABASE);
}
export function saveDatabase(database) { localStorage.setItem(DATABASE_KEY, JSON.stringify(database)); }
export function resetDatabase() { const database = cloneDatabase(DEFAULT_DATABASE); saveDatabase(database); return database; }
export function loadHistory() {
  const history = read(HISTORY_KEY, []);
  return Array.isArray(history) ? history : [];
}
export function saveHistory(history) { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 25))); }
export function loadTheme() {
  const saved = read(THEME_KEY, null);
  if (saved === 'light' || saved === 'dark') return saved;
  return globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
export function saveTheme(theme) { localStorage.setItem(THEME_KEY, theme); }
