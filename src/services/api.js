const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'The database request failed.');
  return payload;
}

export const getDatabase = () => request('/database');
export const getHistory = () => request('/history');
export const createRow = (relation, row) => request(`/relations/${relation}`, { method: 'POST', body: JSON.stringify({ row }) });
export const updateRow = (relation, originalKey, row) => request(`/relations/${relation}`, { method: 'PATCH', body: JSON.stringify({ originalKey, row }) });
export const deleteRow = (relation, key) => request(`/relations/${relation}`, { method: 'DELETE', body: JSON.stringify({ key }) });
export const createTable = (name, columns) => request('/tables', { method: 'POST', body: JSON.stringify({ name, columns }) });
export const deleteTable = (table) => request(`/tables/${encodeURIComponent(table)}`, { method: 'DELETE' });
export const addColumn = (table, column) => request(`/tables/${encodeURIComponent(table)}/columns`, { method: 'POST', body: JSON.stringify({ column }) });
export const deleteColumn = (table, column) => request(`/tables/${encodeURIComponent(table)}/columns/${encodeURIComponent(column)}`, { method: 'DELETE' });
export const executeSql = (sql) => request('/sql', { method: 'POST', body: JSON.stringify({ sql }) });
export const saveHistoryEntry = (entry) => request('/history', { method: 'POST', body: JSON.stringify(entry) });
export const deleteHistoryEntry = (id) => request(`/history?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
export const clearHistory = () => request('/history', { method: 'DELETE' });
