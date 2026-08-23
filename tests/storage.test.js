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
  it('stores database changes and restores saved query history', () => {
    const database = storage.loadDatabase();
    database.STUDENT.rows.push({ StudentID: 99, Name: 'Test', Age: 20, Department: 'CSE', CourseID: 'CS101' });
    storage.saveDatabase(database);
    expect(storage.loadDatabase().STUDENT.rows).toHaveLength(6);
    storage.saveHistory([{ id: '1', query: 'STUDENT', status: 'success' }]);
    expect(storage.loadHistory()).toEqual([{ id: '1', query: 'STUDENT', status: 'success' }]);
  });
});
