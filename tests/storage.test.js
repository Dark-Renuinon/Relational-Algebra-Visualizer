import { beforeEach, describe, expect, it } from 'vitest';

const memory = new Map();
globalThis.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: (key) => memory.delete(key)
};

const storage = await import('../src/utils/storage.js');

describe('localStorage persistence helpers', () => {
  beforeEach(() => memory.clear());
  it('recovers safely from malformed saved data', () => {
    memory.set('ra-visualizer-theme-v1', '"unknown"');
    expect(['light', 'dark']).toContain(storage.loadTheme());
  });

  it('persists the selected theme and reads legacy raw theme values', () => {
    storage.saveTheme('light');
    expect(storage.loadTheme()).toBe('light');
    memory.set('ra-visualizer-theme-v1', 'dark');
    expect(storage.loadTheme()).toBe('dark');
  });
});
