/**
 * Unit tests for solveStorage.js
 * Verifies client-side persistence, safe JSON parsing, data normalization, and JSON/CSV export.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isValidSolveRecord,
  normalizeSolveRecord,
  getSolves,
  saveSolve,
  updateSolve,
  deleteSolve,
  clearSolves,
  exportSolvesToJSON,
  exportSolvesToCSV
} from '../../src/services/solveStorage.js';

describe('SolveStorage Service', () => {
  let mockStorage;
  let storageMap;

  beforeEach(() => {
    storageMap = new Map();
    mockStorage = {
      getItem: vi.fn((key) => storageMap.get(key) || null),
      setItem: vi.fn((key, value) => storageMap.set(key, String(value))),
      removeItem: vi.fn((key) => storageMap.delete(key)),
      clear: vi.fn(() => storageMap.clear())
    };
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Validation & Normalization
  // ─────────────────────────────────────────────────────────────
  describe('Validation & Normalization', () => {
    it('identifies valid solve records correctly', () => {
      expect(isValidSolveRecord({ id: 's1', timeMs: 12500, scramble: 'R U R' })).toBe(true);
      expect(isValidSolveRecord({ id: '', timeMs: 12500, scramble: 'R U R' })).toBe(false);
      expect(isValidSolveRecord({ id: 's1', timeMs: -10, scramble: 'R U R' })).toBe(false);
      expect(isValidSolveRecord({ id: 's1', timeMs: '12500', scramble: 'R U R' })).toBe(false);
      expect(isValidSolveRecord(null)).toBe(false);
    });

    it('normalizes solve records with safe default values', () => {
      const raw = { id: 's1', timeMs: 12500.8, scramble: 'R U' };
      const normalized = normalizeSolveRecord(raw);

      expect(normalized.id).toBe('s1');
      expect(normalized.timeMs).toBe(12501); // rounded
      expect(normalized.penalty).toBeNull();
      expect(normalized.moveCount).toBe(0);
      expect(typeof normalized.date).toBe('string');
      expect(normalized.solution).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Storage CRUD Operations
  // ─────────────────────────────────────────────────────────────
  describe('CRUD Operations', () => {
    it('returns empty array when storage is empty or null', () => {
      expect(getSolves(mockStorage)).toEqual([]);
      expect(getSolves(null)).toEqual([]);
    });

    it('saves a valid solve record and persists to storage', () => {
      const solve = { id: 's1', timeMs: 11200, scramble: "R U R' U'" };
      const updated = saveSolve(solve, mockStorage);

      expect(updated.length).toBe(1);
      expect(updated[0].id).toBe('s1');
      expect(mockStorage.setItem).toHaveBeenCalled();

      // Read back
      const readBack = getSolves(mockStorage);
      expect(readBack.length).toBe(1);
      expect(readBack[0].timeMs).toBe(11200);
    });

    it('throws error when attempting to save an invalid solve record', () => {
      expect(() => saveSolve({ timeMs: 1000 }, mockStorage)).toThrow();
    });

    it('updates an existing solve record (e.g. toggling penalty)', () => {
      saveSolve({ id: 's1', timeMs: 10000, scramble: 'R U' }, mockStorage);
      const updated = updateSolve('s1', { penalty: '+2', moveCount: 45 }, mockStorage);

      expect(updated[0].penalty).toBe('+2');
      expect(updated[0].moveCount).toBe(45);

      const readBack = getSolves(mockStorage);
      expect(readBack[0].penalty).toBe('+2');
    });

    it('deletes a solve record by ID', () => {
      saveSolve({ id: 's1', timeMs: 10000, scramble: 'R U' }, mockStorage);
      saveSolve({ id: 's2', timeMs: 12000, scramble: "F R'" }, mockStorage);

      expect(getSolves(mockStorage).length).toBe(2);

      const remaining = deleteSolve('s1', mockStorage);
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('s2');
    });

    it('clears all solve records from storage', () => {
      saveSolve({ id: 's1', timeMs: 10000, scramble: 'R U' }, mockStorage);
      clearSolves(mockStorage);

      expect(getSolves(mockStorage)).toEqual([]);
      expect(mockStorage.removeItem).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Corrupted & Malformed Storage Handling
  // ─────────────────────────────────────────────────────────────
  describe('Resilience & Corrupted Storage', () => {
    it('safely handles non-JSON corrupted data in storage', () => {
      storageMap.set('cubestudio_solves_v1', '{malformed json!@#');
      const result = getSolves(mockStorage);
      expect(result).toEqual([]);
    });

    it('filters out corrupted items while keeping valid ones', () => {
      const mixed = [
        { id: 's1', timeMs: 10000, scramble: 'R U' }, // valid
        { corrupted: true },                          // invalid
        { id: 's2', timeMs: 'not a number' },         // invalid
        { id: 's3', timeMs: 12000, scramble: "F2 D2" } // valid
      ];
      storageMap.set('cubestudio_solves_v1', JSON.stringify(mixed));

      const result = getSolves(mockStorage);
      expect(result.length).toBe(2);
      expect(result[0].id).toBe('s1');
      expect(result[1].id).toBe('s3');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Export to JSON & CSV
  // ─────────────────────────────────────────────────────────────
  describe('Export to JSON & CSV', () => {
    const sampleSolves = [
      {
        id: 's1',
        timeMs: 12340,
        penalty: null,
        scramble: "R U R' U'",
        moveCount: 45,
        date: '2026-09-19T10:00:00.000Z',
        solution: "U R U' R'"
      },
      {
        id: 's2',
        timeMs: 15200,
        penalty: '+2',
        scramble: 'F2, D2, L2', // includes commas
        moveCount: 50,
        date: '2026-09-19T10:05:00.000Z',
        solution: null
      }
    ];

    it('exports solves to valid JSON format with all fields', () => {
      const json = exportSolvesToJSON(sampleSolves);
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(2);
      expect(parsed[0].id).toBe('s1');
      expect(parsed[0].scramble).toBe("R U R' U'");
    });

    it('exports solves to CSV format with RFC-compliant header and escaping', () => {
      const csv = exportSolvesToCSV(sampleSolves);
      const lines = csv.trim().split('\n');

      expect(lines[0]).toBe('id,date,timeMs,effectiveTimeMs,penalty,formattedTime,moveCount,scramble,solution');
      expect(lines.length).toBe(3);

      // Verify row 1
      expect(lines[1]).toContain('s1');
      expect(lines[1]).toContain('12340');

      // Verify row 2 (+2 penalty and comma-escaped scramble)
      expect(lines[2]).toContain('s2');
      expect(lines[2]).toContain('17200'); // effective time
      expect(lines[2]).toContain('"F2, D2, L2"'); // properly quoted comma
    });
  });
});
