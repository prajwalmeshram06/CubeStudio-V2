/**
 * CubeStudio V2 - Timer Controller
 * Authoritative, testable WCA-style speedcubing timer state machine.
 *
 * State Machine:
 * IDLE -> INSPECTION -> READY -> RUNNING -> STOPPED -> SAVED
 *
 * Accuracy Guarantees:
 * - Uses monotonic high-resolution timing (performance.now by default).
 * - Clock source is injectable via options.now for 100% deterministic unit testing.
 * - Time is derived strictly from (now - startTimestamp), never from tick counts or render frames.
 * - Raw timeMs is permanently preserved; penalties (+2, DNF) are tracked as separate attributes.
 */

import { generateScrambleString } from '../../cube/engine/scramble.js';
import { saveSolve, updateSolve } from '../../services/solveStorage.js';

export const TIMER_STATUS = Object.freeze({
  IDLE: 'IDLE',
  INSPECTION: 'INSPECTION',
  READY: 'READY',
  RUNNING: 'RUNNING',
  STOPPED: 'STOPPED',
  SAVED: 'SAVED'
});

export class TimerController {
  /**
   * @param {object} [options]
   * @param {() => number} [options.now] - Monotonic time source (defaults to performance.now)
   * @param {boolean} [options.inspectionEnabled=true] - Whether 15s WCA inspection is active
   * @param {string} [options.initialScramble] - Optional preset scramble
   * @param {object} [options.storage] - Optional storage adapter
   */
  constructor(options = {}) {
    this._now = options.now || (() => (typeof performance !== 'undefined' ? performance.now() : Date.now()));
    this._storage = options.storage !== undefined ? options.storage : (typeof window !== 'undefined' ? window.localStorage : null);

    this.inspectionEnabled = options.inspectionEnabled !== undefined ? options.inspectionEnabled : true;
    this.status = TIMER_STATUS.IDLE;

    this.scramble = options.initialScramble || generateScrambleString(20);
    this.timeMs = 0;
    this.penalty = null; // null | '+2' | 'DNF'
    this.moveCount = 0;
    this.solution = null;
    this.solveId = null;

    // High-resolution timestamps
    this._startTime = null;
    this._stopTime = null;
    this._inspectionStartTime = null;

    // Display update timer
    this._displayTimer = null;
    this._listeners = new Set();
  }

  // ── Subscription ─────────────────────────────────────────────

  /**
   * Subscribes to controller state changes.
   * @param {(state: object) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.add(listener);
    listener(this.getState());
    return () => {
      this._listeners.delete(listener);
    };
  }

  _notifyListeners() {
    const state = this.getState();
    for (const listener of this._listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[TimerController] Subscriber error:', err);
      }
    }
  }

  // ── State Snapshot ───────────────────────────────────────────

  /**
   * Computes the current high-resolution elapsed time.
   * @returns {number}
   */
  getElapsedMs() {
    if (this.status === TIMER_STATUS.RUNNING && this._startTime !== null) {
      return Math.max(0, Math.round(this._now() - this._startTime));
    }
    return this.timeMs;
  }

  /**
   * Computes current inspection countdown values.
   * @returns {{ remainingSec: number, warning: string|null }}
   */
  getInspectionInfo() {
    if (this.status !== TIMER_STATUS.INSPECTION && this.status !== TIMER_STATUS.READY) {
      return { remainingSec: 15, warning: null };
    }

    if (this._inspectionStartTime === null) {
      return { remainingSec: 15, warning: null };
    }

    const elapsedMs = this._now() - this._inspectionStartTime;
    const elapsedSec = elapsedMs / 1000;
    const remainingSec = Math.max(0, Math.ceil(15 - elapsedSec));

    let warning = null;
    if (elapsedSec >= 17) {
      warning = 'DNF';
    } else if (elapsedSec >= 15) {
      warning = '+2';
    } else if (elapsedSec >= 12) {
      warning = '12s';
    } else if (elapsedSec >= 8) {
      warning = '8s';
    }

    return { remainingSec, warning };
  }

  /**
   * Returns a complete state snapshot.
   * @returns {object}
   */
  getState() {
    const { remainingSec, warning } = this.getInspectionInfo();

    return {
      status: this.status,
      timeMs: this.timeMs,
      elapsedMs: this.getElapsedMs(),
      inspectionRemainingSec: remainingSec,
      inspectionWarning: warning,
      penalty: this.penalty,
      scramble: this.scramble,
      moveCount: this.moveCount,
      solution: this.solution,
      solveId: this.solveId,
      inspectionEnabled: this.inspectionEnabled,
      isReady: this.status === TIMER_STATUS.READY
    };
  }

  // ── State Transitions ────────────────────────────────────────

  /**
   * Begins 15-second WCA inspection from IDLE state.
   */
  startInspection() {
    if (this.status !== TIMER_STATUS.IDLE) return;

    this.status = TIMER_STATUS.INSPECTION;
    this._inspectionStartTime = this._now();
    this.penalty = null;
    this._startDisplayLoop();
    this._notifyListeners();
  }

  /**
   * Prepares the timer to start solving (user is holding spacebar or clicked ready).
   */
  setReady() {
    if (this.status !== TIMER_STATUS.INSPECTION && this.status !== TIMER_STATUS.IDLE) return;

    this.status = TIMER_STATUS.READY;
    this._notifyListeners();
  }

  /**
   * Un-sets ready state back to inspection (or idle).
   */
  cancelReady() {
    if (this.status !== TIMER_STATUS.READY) return;

    if (this.inspectionEnabled && this._inspectionStartTime !== null) {
      this.status = TIMER_STATUS.INSPECTION;
    } else {
      this.status = TIMER_STATUS.IDLE;
    }
    this._notifyListeners();
  }

  /**
   * Starts timing the solve.
   * Automatically evaluates WCA inspection penalties:
   * - 15s to 17s: +2 penalty
   * - > 17s: DNF
   */
  startSolve() {
    if (
      this.status !== TIMER_STATUS.READY &&
      this.status !== TIMER_STATUS.INSPECTION &&
      this.status !== TIMER_STATUS.IDLE
    ) {
      return;
    }

    // Evaluate WCA inspection penalty if inspection was used
    if (this._inspectionStartTime !== null) {
      const inspectionElapsed = this._now() - this._inspectionStartTime;
      if (inspectionElapsed > 17000) {
        this.penalty = 'DNF';
      } else if (inspectionElapsed > 15000) {
        this.penalty = '+2';
      }
      this._inspectionStartTime = null;
    }

    this.status = TIMER_STATUS.RUNNING;
    this._startTime = this._now();
    this._stopTime = null;
    this.timeMs = 0;

    this._startDisplayLoop();
    this._notifyListeners();
  }

  /**
   * Stops the active solve. Freezes raw timeMs.
   * @returns {number} The recorded raw time in milliseconds
   */
  stopSolve() {
    if (this.status !== TIMER_STATUS.RUNNING) return this.timeMs;

    this._stopTime = this._now();
    this._stopDisplayLoop();

    this.status = TIMER_STATUS.STOPPED;
    this.timeMs = Math.max(0, Math.round(this._stopTime - this._startTime));
    this.solveId = `solve_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    this._notifyListeners();
    return this.timeMs;
  }

  /**
   * Sets or toggles a penalty on the stopped solve ('+2', 'DNF', or null).
   * @param {string|null} penalty
   */
  setPenalty(penalty) {
    if (this.status !== TIMER_STATUS.STOPPED && this.status !== TIMER_STATUS.SAVED) return;

    if (penalty === '+2' || penalty === 'DNF' || penalty === null) {
      this.penalty = penalty;

      if (this.status === TIMER_STATUS.SAVED && this.solveId) {
        updateSolve(this.solveId, { penalty: this.penalty }, this._storage);
      }

      this._notifyListeners();
    }
  }

  /**
   * Sets the recorded move count for this solve.
   * @param {number} count
   */
  setMoveCount(count) {
    if (typeof count === 'number' && count >= 0) {
      this.moveCount = count;

      if (this.status === TIMER_STATUS.SAVED && this.solveId) {
        updateSolve(this.solveId, { moveCount: this.moveCount }, this._storage);
      }

      this._notifyListeners();
    }
  }

  /**
   * Associates an optional solution algorithm with this solve.
   * @param {string|null} solution
   */
  setSolution(solution) {
    this.solution = solution;

    if (this.status === TIMER_STATUS.SAVED && this.solveId) {
      updateSolve(this.solveId, { solution: this.solution }, this._storage);
    }

    this._notifyListeners();
  }

  /**
   * Persists the stopped solve to storage and moves to SAVED status.
   * @returns {object|null} The saved solve record
   */
  save() {
    if (this.status !== TIMER_STATUS.STOPPED && this.status !== TIMER_STATUS.SAVED) return null;

    const record = {
      id: this.solveId || `solve_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      timeMs: this.timeMs,
      penalty: this.penalty,
      scramble: this.scramble,
      moveCount: this.moveCount,
      date: new Date().toISOString(),
      solution: this.solution
    };

    saveSolve(record, this._storage);

    this.status = TIMER_STATUS.SAVED;
    this._notifyListeners();
    return record;
  }

  /**
   * Resets the timer back to IDLE with a fresh scramble.
   * If a completed solve has not been saved yet, saves it automatically to prevent data loss.
   * @param {boolean} [generateNewScramble=true]
   */
  reset(generateNewScramble = true) {
    if (this.status === TIMER_STATUS.STOPPED) {
      this.save();
    }

    this._stopDisplayLoop();

    this.status = TIMER_STATUS.IDLE;
    this._startTime = null;
    this._stopTime = null;
    this._inspectionStartTime = null;
    this.timeMs = 0;
    this.penalty = null;
    this.moveCount = 0;
    this.solution = null;
    this.solveId = null;

    if (generateNewScramble) {
      this.scramble = generateScrambleString(20);
    }

    this._notifyListeners();
  }

  /**
   * Generates a new random scramble while keeping current settings.
   */
  newScramble() {
    this.scramble = generateScrambleString(20);
    this._notifyListeners();
  }

  /**
   * Explicitly sets the scramble string.
   * @param {string} scramble
   */
  setScramble(scramble) {
    if (typeof scramble === 'string') {
      this.scramble = scramble;
      this._notifyListeners();
    }
  }

  /**
   * Toggles 15-second WCA inspection on or off.
   * @param {boolean} enabled
   */
  setInspectionEnabled(enabled) {
    this.inspectionEnabled = Boolean(enabled);
    this._notifyListeners();
  }

  // ── Display Interval Loop ────────────────────────────────────

  _startDisplayLoop() {
    this._stopDisplayLoop();

    const interval = 25; // ~40 FPS for smooth numerical UI display
    this._displayTimer = setInterval(() => {
      if (this.status === TIMER_STATUS.RUNNING || this.status === TIMER_STATUS.INSPECTION) {
        this._notifyListeners();
      } else {
        this._stopDisplayLoop();
      }
    }, interval);
  }

  _stopDisplayLoop() {
    if (this._displayTimer) {
      clearInterval(this._displayTimer);
      this._displayTimer = null;
    }
  }

  /**
   * Cleans up all intervals and listener subscriptions.
   */
  dispose() {
    this._stopDisplayLoop();
    this._listeners.clear();
  }
}
