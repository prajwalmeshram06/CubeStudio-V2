/**
 * CubeStudio V2 - Solve Storage & Export Service
 * Provides client-side persistence for speedcubing solve records, with graceful error handling and multi-format export.
 */

import { formatTime, getEffectiveTime } from '../features/timer/statistics.js';

const STORAGE_KEY = 'cubestudio_solves_v1';

/**
 * Validates whether an object has the essential structure of a solve record.
 * @param {any} item
 * @returns {boolean}
 */
export function isValidSolveRecord(item) {
  if (!item || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.trim() === '') return false;
  if (typeof item.timeMs !== 'number' || !Number.isFinite(item.timeMs) || item.timeMs < 0) return false;
  if (typeof item.scramble !== 'string') return false;
  return true;
}

/**
 * Normalizes a solve record, supplying defaults for optional or missing fields.
 * @param {object} item
 * @returns {object}
 */
export function normalizeSolveRecord(item) {
  return {
    id: String(item.id),
    timeMs: Math.round(item.timeMs),
    penalty: item.penalty === '+2' ? '+2' : item.penalty === 'DNF' ? 'DNF' : null,
    scramble: item.scramble || '',
    moveCount: typeof item.moveCount === 'number' ? item.moveCount : 0,
    date: item.date || new Date().toISOString(),
    solution: typeof item.solution === 'string' ? item.solution : null
  };
}

/**
 * Retrieves all stored solve records from localStorage.
 * Malformed or corrupted entries are filtered out safely.
 * @param {Storage} [storage=localStorage]
 * @returns {Array<object>}
 */
export function getSolves(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!storage) return [];

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidSolveRecord)
      .map(normalizeSolveRecord);
  } catch (err) {
    console.warn('[SolveStorage] Failed to read or parse stored solves:', err);
    return [];
  }
}

/**
 * Saves a new solve record to persistent storage.
 * @param {object} solve
 * @param {Storage} [storage=localStorage]
 * @returns {Array<object>} Updated solves list
 */
export function saveSolve(solve, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (!isValidSolveRecord(solve)) {
    throw new Error('Cannot save invalid solve record: missing id, timeMs, or scramble');
  }

  const normalized = normalizeSolveRecord(solve);
  const current = getSolves(storage);
  const updated = [...current, normalized];

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('[SolveStorage] Failed to save solve to storage:', err);
    }
  }

  return updated;
}

/**
 * Updates an existing solve record (e.g. toggling penalty or editing move count).
 * @param {string} id
 * @param {Partial<object>} updates
 * @param {Storage} [storage=localStorage]
 * @returns {Array<object>}
 */
export function updateSolve(id, updates, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  const current = getSolves(storage);
  const updated = current.map(s => {
    if (s.id === id) {
      return normalizeSolveRecord({ ...s, ...updates });
    }
    return s;
  });

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('[SolveStorage] Failed to update solve:', err);
    }
  }

  return updated;
}

/**
 * Deletes a solve record by ID.
 * @param {string} id
 * @param {Storage} [storage=localStorage]
 * @returns {Array<object>} Updated solves list
 */
export function deleteSolve(id, storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  const current = getSolves(storage);
  const updated = current.filter(s => s.id !== id);

  if (storage) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (err) {
      console.error('[SolveStorage] Failed to delete solve:', err);
    }
  }

  return updated;
}

/**
 * Clears all solve records from storage.
 * @param {Storage} [storage=localStorage]
 */
export function clearSolves(storage = (typeof window !== 'undefined' ? window.localStorage : null)) {
  if (storage) {
    try {
      storage.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[SolveStorage] Failed to clear storage:', err);
    }
  }
}

/**
 * Serializes solves array into JSON string.
 * @param {Array<object>} solves
 * @returns {string}
 */
export function exportSolvesToJSON(solves) {
  return JSON.stringify(solves || [], null, 2);
}

/**
 * Serializes solves array into RFC-compliant CSV string.
 * @param {Array<object>} solves
 * @returns {string}
 */
export function exportSolvesToCSV(solves) {
  const headers = [
    'id',
    'date',
    'timeMs',
    'effectiveTimeMs',
    'penalty',
    'formattedTime',
    'moveCount',
    'scramble',
    'solution'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = (solves || []).map(s => {
    const eff = getEffectiveTime(s);
    return [
      escapeCSV(s.id),
      escapeCSV(s.date),
      s.timeMs,
      Number.isFinite(eff) ? eff : 'DNF',
      escapeCSV(s.penalty || ''),
      escapeCSV(formatTime(s.timeMs, s.penalty)),
      s.moveCount || 0,
      escapeCSV(s.scramble),
      escapeCSV(s.solution || '')
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers a client-side file download for exported solves.
 * @param {Array<object>} solves
 * @param {'json'|'csv'} [format='json']
 */
export function downloadSolvesExport(solves, format = 'json') {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const isCSV = format.toLowerCase() === 'csv';
  const content = isCSV ? exportSolvesToCSV(solves) : exportSolvesToJSON(solves);
  const mime = isCSV ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
  const ext = isCSV ? 'csv' : 'json';

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cubestudio-solves-${new Date().toISOString().slice(0, 10)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
