/**
 * Unit tests for statistics.js
 * Verifies WCA speedcubing statistics, effective time, trimming rules, DNF handling, and formatting.
 */

import { describe, it, expect } from 'vitest';
import {
  getEffectiveTime,
  formatTime,
  calculateAoN,
  calculateBestAoN,
  calculateSessionAverage,
  calculateBestSingle,
  calculateImprovement,
  calculateStatistics
} from '../../src/features/timer/statistics.js';

describe('Timer Statistics Functions', () => {
  // ─────────────────────────────────────────────────────────────
  // 1. getEffectiveTime
  // ─────────────────────────────────────────────────────────────
  describe('getEffectiveTime', () => {
    it('returns raw timeMs for clean solve', () => {
      expect(getEffectiveTime({ timeMs: 12450, penalty: null })).toBe(12450);
    });

    it('adds 2000ms for +2 penalty without mutating timeMs', () => {
      const solve = { timeMs: 12450, penalty: '+2' };
      expect(getEffectiveTime(solve)).toBe(14450);
      expect(solve.timeMs).toBe(12450);
    });

    it('evaluates DNF to Infinity', () => {
      expect(getEffectiveTime({ timeMs: 12450, penalty: 'DNF' })).toBe(Infinity);
    });

    it('handles invalid inputs safely', () => {
      expect(getEffectiveTime(null)).toBe(Infinity);
      expect(getEffectiveTime({})).toBe(Infinity);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. formatTime
  // ─────────────────────────────────────────────────────────────
  describe('formatTime', () => {
    it('formats sub-minute times as ss.xxx', () => {
      expect(formatTime(9850)).toBe('9.850');
      expect(formatTime(14235)).toBe('14.235');
    });

    it('formats times over a minute as m:ss.xxx with zero padding', () => {
      expect(formatTime(65420)).toBe('1:05.420');
      expect(formatTime(125100)).toBe('2:05.100');
    });

    it('appends (+2) when +2 penalty is specified', () => {
      expect(formatTime(10000, '+2')).toBe('12.000 (+2)');
    });

    it('formats DNF as "DNF"', () => {
      expect(formatTime(10000, 'DNF')).toBe('DNF');
    });

    it('returns "—" for missing, negative, or infinite values', () => {
      expect(formatTime(null)).toBe('—');
      expect(formatTime(undefined)).toBe('—');
      expect(formatTime(Infinity)).toBe('—');
      expect(formatTime(-500)).toBe('—');
    });

    it('supports 2 decimals when requested', () => {
      expect(formatTime(12345, null, { showDecimals3: false })).toBe('12.35');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. calculateAoN (WCA Trimmed Averages)
  // ─────────────────────────────────────────────────────────────
  describe('calculateAoN', () => {
    it('returns null if fewer than n solves are available', () => {
      const solves = [
        { timeMs: 10000, penalty: null },
        { timeMs: 11000, penalty: null }
      ];
      expect(calculateAoN(solves, 5)).toBeNull();
      expect(calculateAoN(solves, 12)).toBeNull();
    });

    it('calculates Ao5 by trimming fastest and slowest, averaging middle 3', () => {
      const solves = [
        { timeMs: 10000, penalty: null }, // best (trimmed)
        { timeMs: 12000, penalty: null }, // kept
        { timeMs: 14000, penalty: null }, // kept
        { timeMs: 16000, penalty: null }, // kept
        { timeMs: 20000, penalty: null }  // worst (trimmed)
      ];
      // Middle: 12000 + 14000 + 16000 = 42000 / 3 = 14000
      expect(calculateAoN(solves, 5)).toBe(14000);
    });

    it('trims single DNF as worst solve in Ao5', () => {
      const solves = [
        { timeMs: 10000, penalty: null }, // best (trimmed)
        { timeMs: 12000, penalty: null }, // kept
        { timeMs: 14000, penalty: null }, // kept
        { timeMs: 16000, penalty: null }, // kept
        { timeMs: 99999, penalty: 'DNF' } // DNF trimmed as worst
      ];
      // Middle: 12000 + 14000 + 16000 = 42000 / 3 = 14000
      expect(calculateAoN(solves, 5)).toBe(14000);
    });

    it('evaluates Ao5 to DNF (Infinity) if there are 2 or more DNFs', () => {
      const solves = [
        { timeMs: 10000, penalty: null },
        { timeMs: 12000, penalty: null },
        { timeMs: 14000, penalty: null },
        { timeMs: 99999, penalty: 'DNF' },
        { timeMs: 99999, penalty: 'DNF' }
      ];
      expect(calculateAoN(solves, 5)).toBe(Infinity);
    });

    it('calculates Ao12 by trimming 1 fastest and 1 slowest, averaging middle 10', () => {
      const times = [8000, 9000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 11000, 15000];
      const solves = times.map(t => ({ timeMs: t, penalty: null }));

      // 8000 and 15000 are trimmed. Middle 10 sum to 100000 / 10 = 10000.
      expect(calculateAoN(solves, 12)).toBe(10000);
    });

    it('evaluates Ao12 to DNF if there are more than 1 DNF', () => {
      const solves = Array(10).fill({ timeMs: 10000, penalty: null });
      solves.push({ timeMs: 99999, penalty: 'DNF' });
      solves.push({ timeMs: 99999, penalty: 'DNF' });

      expect(calculateAoN(solves, 12)).toBe(Infinity);
    });

    it('calculates Ao50 and Ao100 trimming 5% from both ends', () => {
      // 50 solves with 10000ms each
      const solves50 = Array(50).fill({ timeMs: 10000, penalty: null });
      expect(calculateAoN(solves50, 50)).toBe(10000);

      // 100 solves with 10000ms each
      const solves100 = Array(100).fill({ timeMs: 10000, penalty: null });
      expect(calculateAoN(solves100, 100)).toBe(10000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Session Average & Best Single
  // ─────────────────────────────────────────────────────────────
  describe('Session Average and Best Single', () => {
    it('returns null for empty solve array', () => {
      expect(calculateSessionAverage([])).toBeNull();
      expect(calculateBestSingle([])).toEqual({ solve: null, timeMs: null });
    });

    it('finds best valid single solve', () => {
      const solves = [
        { id: '1', timeMs: 15000, penalty: null },
        { id: '2', timeMs: 8500, penalty: null },
        { id: '3', timeMs: 7000, penalty: 'DNF' }, // DNF is not valid
        { id: '4', timeMs: 8000, penalty: '+2' }   // 10000ms effective
      ];

      const best = calculateBestSingle(solves);
      expect(best.solve.id).toBe('2');
      expect(best.timeMs).toBe(8500);
    });

    it('calculates session average for fewer than 5 solves using arithmetic mean', () => {
      const solves = [
        { timeMs: 10000, penalty: null },
        { timeMs: 14000, penalty: null }
      ];
      expect(calculateSessionAverage(solves)).toBe(12000);
    });

    it('calculates session average for >= 5 solves using trimmed mean', () => {
      const solves = [
        { timeMs: 5000, penalty: null },
        { timeMs: 10000, penalty: null },
        { timeMs: 10000, penalty: null },
        { timeMs: 10000, penalty: null },
        { timeMs: 30000, penalty: null }
      ];
      // Trims 1 from each end -> 10000, 10000, 10000 -> 10000
      expect(calculateSessionAverage(solves)).toBe(10000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. calculateImprovement
  // ─────────────────────────────────────────────────────────────
  describe('calculateImprovement', () => {
    it('returns improvement metrics between start of session and current', () => {
      const solves = [
        { timeMs: 20000, penalty: null },
        { timeMs: 15000, penalty: null }
      ];

      const imp = calculateImprovement(solves);
      expect(imp.improved).toBe(true);
      expect(imp.diffMs).toBe(5000);
      expect(imp.percentage).toBe(25);
    });

    it('returns improved: false if times became slower', () => {
      const solves = [
        { timeMs: 10000, penalty: null },
        { timeMs: 15000, penalty: null }
      ];

      const imp = calculateImprovement(solves);
      expect(imp.improved).toBe(false);
      expect(imp.diffMs).toBe(-5000);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. calculateStatistics (Aggregate)
  // ─────────────────────────────────────────────────────────────
  describe('calculateStatistics', () => {
    it('aggregates all metrics into a clean report object', () => {
      const solves = [
        { id: '1', timeMs: 12000, penalty: null },
        { id: '2', timeMs: 11000, penalty: null },
        { id: '3', timeMs: 13000, penalty: null },
        { id: '4', timeMs: 10000, penalty: null },
        { id: '5', timeMs: 14000, penalty: null }
      ];

      const stats = calculateStatistics(solves);
      expect(stats.count).toBe(5);
      expect(stats.bestSingleTime).toBe(10000);
      expect(stats.ao5).toBe(12000); // 10k & 14k trimmed; 11k, 12k, 13k averaged
      expect(stats.ao12).toBeNull(); // insufficient solves
      expect(stats.dnfCount).toBe(0);
      expect(stats.plusTwoCount).toBe(0);
    });
  });
});
