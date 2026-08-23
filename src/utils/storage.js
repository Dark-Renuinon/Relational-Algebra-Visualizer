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

export function loadDatabase() { return read(DATABASE_KEY, cloneDatabase(DEFAULT_DATABASE)); }
export function saveDatabase(database) { localStorage.setItem(DATABASE_KEY, JSON.stringify(database)); }
export function resetDatabase() { const database = cloneDatabase(DEFAULT_DATABASE); saveDatabase(database); return database; }
export function loadHistory() { return read(HISTORY_KEY, []); }
export function saveHistory(history) { localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 25))); }
export function loadTheme() { return localStorage.getItem(THEME_KEY) || 'dark'; }
export function saveTheme(theme) { localStorage.setItem(THEME_KEY, theme); }
