/**
 * Unit tests for TimerController.js
 * Verifies the WCA speedcubing timer state machine, monotonic clock accuracy, inspection penalties, and solve lifecycle.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TimerController, TIMER_STATUS } from '../../src/features/timer/TimerController.js';

describe('TimerController', () => {
  let simulatedTime = 1000;
  const mockNow = () => simulatedTime;

  beforeEach(() => {
    simulatedTime = 1000;
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Initialization
  // ─────────────────────────────────────────────────────────────
  describe('Initialization', () => {
    it('initializes in IDLE state with default scramble and 15s inspection enabled', () => {
      const timer = new TimerController({ now: mockNow });
      const state = timer.getState();

      expect(state.status).toBe(TIMER_STATUS.IDLE);
      expect(state.timeMs).toBe(0);
      expect(state.penalty).toBeNull();
      expect(state.inspectionEnabled).toBe(true);
      expect(typeof state.scramble).toBe('string');
      expect(state.scramble.split(' ').length).toBeGreaterThanOrEqual(15);
      expect(state.isReady).toBe(false);
    });

    it('accepts initialScramble and inspectionEnabled options', () => {
      const timer = new TimerController({
        now: mockNow,
        initialScramble: "R U R' U'",
        inspectionEnabled: false
      });

      expect(timer.scramble).toBe("R U R' U'");
      expect(timer.inspectionEnabled).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. State Machine Transitions
  // ─────────────────────────────────────────────────────────────
  describe('State Machine Transitions', () => {
    it('follows valid sequence: IDLE -> INSPECTION -> READY -> RUNNING -> STOPPED -> SAVED', () => {
      const mockStorage = {
        getItem: vi.fn(() => '[]'),
        setItem: vi.fn()
      };
      const timer = new TimerController({ now: mockNow, storage: mockStorage });

      // IDLE -> INSPECTION
      timer.startInspection();
      expect(timer.status).toBe(TIMER_STATUS.INSPECTION);

      // INSPECTION -> READY
      timer.setReady();
      expect(timer.status).toBe(TIMER_STATUS.READY);
      expect(timer.getState().isReady).toBe(true);

      // READY -> RUNNING
      simulatedTime = 2000;
      timer.startSolve();
      expect(timer.status).toBe(TIMER_STATUS.RUNNING);

      // RUNNING -> STOPPED
      simulatedTime = 14580; // solve took 12580ms
      const recorded = timer.stopSolve();
      expect(timer.status).toBe(TIMER_STATUS.STOPPED);
      expect(recorded).toBe(12580);
      expect(timer.timeMs).toBe(12580);

      // STOPPED -> SAVED
      const saved = timer.save();
      expect(timer.status).toBe(TIMER_STATUS.SAVED);
      expect(saved).not.toBeNull();
      expect(saved.timeMs).toBe(12580);
      expect(mockStorage.setItem).toHaveBeenCalled();
    });

    it('allows starting solve directly from IDLE when inspection is disabled', () => {
      const timer = new TimerController({ now: mockNow, inspectionEnabled: false });

      timer.setReady();
      expect(timer.status).toBe(TIMER_STATUS.READY);

      simulatedTime = 1500;
      timer.startSolve();
      expect(timer.status).toBe(TIMER_STATUS.RUNNING);

      simulatedTime = 6500;
      timer.stopSolve();
      expect(timer.status).toBe(TIMER_STATUS.STOPPED);
      expect(timer.timeMs).toBe(5000);
    });

    it('ignores invalid transitions', () => {
      const timer = new TimerController({ now: mockNow });

      // Cannot start solve while IDLE if not ready or inspecting
      timer.stopSolve(); // cannot stop if not running
      expect(timer.status).toBe(TIMER_STATUS.IDLE);

      // Cannot start inspection while RUNNING
      timer.startSolve();
      expect(timer.status).toBe(TIMER_STATUS.RUNNING);
      timer.startInspection();
      expect(timer.status).toBe(TIMER_STATUS.RUNNING);

      // Cannot save while RUNNING
      const saved = timer.save();
      expect(saved).toBeNull();
      expect(timer.status).toBe(TIMER_STATUS.RUNNING);
    });

    it('reset returns to IDLE and generates a fresh scramble by default', () => {
      const timer = new TimerController({ now: mockNow, initialScramble: "R U R' U'" });
      timer.startSolve();
      simulatedTime = 5000;
      timer.stopSolve();

      expect(timer.status).toBe(TIMER_STATUS.STOPPED);
      expect(timer.timeMs).toBe(4000);

      timer.reset(true);
      expect(timer.status).toBe(TIMER_STATUS.IDLE);
      expect(timer.timeMs).toBe(0);
      expect(timer.scramble).not.toBe("R U R' U'");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Monotonic Timing Accuracy
  // ─────────────────────────────────────────────────────────────
  describe('Timing Accuracy', () => {
    it('uses injected high-resolution clock without render frame drift', () => {
      const timer = new TimerController({ now: mockNow });
      timer.startSolve();

      simulatedTime = 1000 + 7432;
      expect(timer.getElapsedMs()).toBe(7432);

      simulatedTime = 1000 + 15891;
      expect(timer.getElapsedMs()).toBe(15891);

      timer.stopSolve();
      expect(timer.timeMs).toBe(15891);

      // Clock advances after stop: timeMs remains frozen
      simulatedTime = 1000 + 25000;
      expect(timer.getElapsedMs()).toBe(15891);
      expect(timer.timeMs).toBe(15891);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. WCA Inspection Countdown & Penalties
  // ─────────────────────────────────────────────────────────────
  describe('WCA Inspection & Penalties', () => {
    it('counts down inspection from 15 seconds', () => {
      const timer = new TimerController({ now: mockNow });
      timer.startInspection();

      expect(timer.getInspectionInfo().remainingSec).toBe(15);
      expect(timer.getInspectionInfo().warning).toBeNull();

      // 8 seconds in -> warning '8s'
      simulatedTime = 1000 + 8200;
      expect(timer.getInspectionInfo().remainingSec).toBe(7);
      expect(timer.getInspectionInfo().warning).toBe('8s');

      // 12 seconds in -> warning '12s'
      simulatedTime = 1000 + 12500;
      expect(timer.getInspectionInfo().remainingSec).toBe(3);
      expect(timer.getInspectionInfo().warning).toBe('12s');
    });

    it('automatically applies +2 penalty if inspection exceeds 15 seconds but under 17 seconds', () => {
      const timer = new TimerController({ now: mockNow });
      timer.startInspection();

      // 15.5 seconds of inspection
      simulatedTime = 1000 + 15500;
      expect(timer.getInspectionInfo().warning).toBe('+2');

      timer.startSolve();
      expect(timer.penalty).toBe('+2');

      // Solve takes 10 seconds
      simulatedTime = 1000 + 15500 + 10000;
      timer.stopSolve();

      // Raw timeMs is 10000; penalty is '+2'
      expect(timer.timeMs).toBe(10000);
      expect(timer.penalty).toBe('+2');
    });

    it('automatically applies DNF penalty if inspection exceeds 17 seconds', () => {
      const timer = new TimerController({ now: mockNow });
      timer.startInspection();

      // 17.5 seconds of inspection
      simulatedTime = 1000 + 17500;
      expect(timer.getInspectionInfo().warning).toBe('DNF');

      timer.startSolve();
      expect(timer.penalty).toBe('DNF');

      simulatedTime = 1000 + 17500 + 8000;
      timer.stopSolve();

      expect(timer.timeMs).toBe(8000);
      expect(timer.penalty).toBe('DNF');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Penalties and Post-Solve Metadata
  // ─────────────────────────────────────────────────────────────
  describe('Penalties and Solve Metadata', () => {
    it('allows toggling +2 and DNF penalties in STOPPED and SAVED states', () => {
      const timer = new TimerController({ now: mockNow });
      timer.startSolve();
      simulatedTime = 11000;
      timer.stopSolve();

      expect(timer.penalty).toBeNull();

      timer.setPenalty('+2');
      expect(timer.penalty).toBe('+2');

      timer.setPenalty('DNF');
      expect(timer.penalty).toBe('DNF');

      timer.setPenalty(null);
      expect(timer.penalty).toBeNull();
    });

    it('records moveCount and solution algorithm when provided', () => {
      const timer = new TimerController({ now: mockNow });
      timer.startSolve();
      simulatedTime = 15000;
      timer.stopSolve();

      timer.setMoveCount(52);
      timer.setSolution("R U R' U' R' F R2 U' R' U' R U R' F'");

      const state = timer.getState();
      expect(state.moveCount).toBe(52);
      expect(state.solution).toContain('R U R');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Subscription & Scramble Management
  // ─────────────────────────────────────────────────────────────
  describe('Subscription and Scramble Management', () => {
    it('notifies subscribers on state changes', () => {
      const timer = new TimerController({ now: mockNow });
      const subscriber = vi.fn();
      const unsub = timer.subscribe(subscriber);

      expect(subscriber).toHaveBeenCalledTimes(1); // called immediately with initial state

      timer.startInspection();
      expect(subscriber).toHaveBeenCalledTimes(2);

      timer.setReady();
      expect(subscriber).toHaveBeenCalledTimes(3);

      unsub();
      timer.startSolve();
      expect(subscriber).toHaveBeenCalledTimes(3); // no new calls after unsub
    });

    it('newScramble generates a new valid scramble string', () => {
      const timer = new TimerController({ now: mockNow });
      const oldScramble = timer.scramble;

      timer.newScramble();
      expect(timer.scramble).not.toBe(oldScramble);
      expect(timer.scramble.length).toBeGreaterThan(10);
    });

    it('setScramble allows manually setting a specific scramble', () => {
      const timer = new TimerController({ now: mockNow });
      timer.setScramble("F2 D2 L2 B2");
      expect(timer.scramble).toBe("F2 D2 L2 B2");
    });
  });
});
