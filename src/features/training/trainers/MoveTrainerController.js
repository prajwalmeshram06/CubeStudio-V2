/**
 * MoveTrainerController.js — Move & Notation Drill State Machine.
 *
 * Provides structured training for single moves, move families (primes, doubles),
 * notation interpretation, and short sequence drills with instant feedback.
 */

import { parseMove, parseAlgorithm } from '../../../cube/model/notation.js';
import { detectMoveMistake, detectSequenceDivergence, MISTAKE_TYPES } from '../mistakeDetection.js';
import { recordTrainerAttempt, getTrainingData } from '../../../services/trainingStorage.js';

export const TRAINER_MODES = Object.freeze({
  MOVE_PRACTICE: 'move_practice',
  NOTATION_READING: 'notation_reading',
  SEQUENCE_DRILL: 'sequence_drill'
});

export const MOVE_GROUPS = Object.freeze({
  ALL: 'all',
  BASIC: 'basic',
  PRIMES: 'primes',
  DOUBLES: 'doubles',
  RIGHT_LEFT: 'right_left',
  UP_DOWN: 'up_down',
  FRONT_BACK: 'front_back'
});

const MOVE_POOL = {
  basic: ['U', 'D', 'R', 'L', 'F', 'B'],
  primes: ["U'", "D'", "R'", "L'", "F'", "B'"],
  doubles: ['U2', 'D2', 'R2', 'L2', 'F2', 'B2'],
  right_left: ['R', "R'", 'R2', 'L', "L'", 'L2'],
  up_down: ['U', "U'", 'U2', 'D', "D'", 'D2'],
  front_back: ['F', "F'", 'F2', 'B', "B'", 'B2']
};

const COMMON_SEQUENCES = [
  { notation: "R U R' U'", name: 'Sexy Move (Standard Trigger)' },
  { notation: "R' F R F'", name: 'Sledgehammer' },
  { notation: "U R U' R'", name: 'Basic Right Insert' },
  { notation: "U' L' U L", name: 'Basic Left Insert' },
  { notation: "R U R' U R U2 R'", name: 'Sune Trigger' },
  { notation: "F R U R' U' F'", name: 'F R U R\' U\' F\' (OLL Line)' }
];

export class MoveTrainerController {
  constructor(options = {}) {
    this.storage = options.storage || null;
    this.mode = options.mode || TRAINER_MODES.MOVE_PRACTICE;
    this.filterGroup = options.filterGroup || MOVE_GROUPS.ALL;

    this.currentPrompt = null;
    this.performedSequence = [];
    this.status = 'idle'; // 'idle' | 'waiting' | 'success' | 'mistake'
    this.lastFeedback = null;
    this.startTime = null;

    this.listeners = new Set();

    // Initialize local stats cache from storage
    this._syncStats();

    // Generate initial prompt
    this.nextPrompt();
  }

  _syncStats() {
    const data = getTrainingData(this.storage);
    const trainerKey = this.mode === TRAINER_MODES.NOTATION_READING ? 'notationTrainer' : 'moveTrainer';
    const stats = data.trainerStats[trainerKey] || {};
    this.stats = {
      totalAttempts: stats.totalAttempts || 0,
      successfulAttempts: stats.successfulAttempts || 0,
      currentStreak: stats.currentStreak || 0,
      bestStreak: stats.bestStreak || 0
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  getState() {
    return {
      mode: this.mode,
      filterGroup: this.filterGroup,
      currentPrompt: this.currentPrompt,
      performedSequence: [...this.performedSequence],
      status: this.status,
      lastFeedback: this.lastFeedback,
      stats: { ...this.stats },
      accuracy: this.stats.totalAttempts > 0
        ? Math.round((this.stats.successfulAttempts / this.stats.totalAttempts) * 100)
        : 100
    };
  }

  setMode(mode) {
    if (!Object.values(TRAINER_MODES).includes(mode)) return;
    this.mode = mode;
    this._syncStats();
    this.nextPrompt();
  }

  setFilterGroup(group) {
    this.filterGroup = group;
    this.nextPrompt();
  }

  _getMovesForGroup(group) {
    switch (group) {
      case MOVE_GROUPS.BASIC:
        return MOVE_POOL.basic;
      case MOVE_GROUPS.PRIMES:
        return MOVE_POOL.primes;
      case MOVE_GROUPS.DOUBLES:
        return MOVE_POOL.doubles;
      case MOVE_GROUPS.RIGHT_LEFT:
        return MOVE_POOL.right_left;
      case MOVE_GROUPS.UP_DOWN:
        return MOVE_POOL.up_down;
      case MOVE_GROUPS.FRONT_BACK:
        return MOVE_POOL.front_back;
      case MOVE_GROUPS.ALL:
      default:
        return [...MOVE_POOL.basic, ...MOVE_POOL.primes, ...MOVE_POOL.doubles];
    }
  }

  nextPrompt() {
    this.performedSequence = [];
    this.status = 'waiting';
    this.startTime = Date.now();

    if (this.mode === TRAINER_MODES.SEQUENCE_DRILL) {
      const seqItem = COMMON_SEQUENCES[Math.floor(Math.random() * COMMON_SEQUENCES.length)];
      const parsed = parseAlgorithm(seqItem.notation);
      this.currentPrompt = {
        type: 'sequence',
        expected: seqItem.notation,
        expectedMoves: parsed.map(m => m.notation),
        name: seqItem.name,
        description: `Execute sequence: ${seqItem.notation}`,
        hint: `Sequence length: ${parsed.length} moves`
      };
    } else {
      const pool = this._getMovesForGroup(this.filterGroup);
      // Avoid picking the exact same move consecutively if pool > 1
      let pick = pool[Math.floor(Math.random() * pool.length)];
      if (this.currentPrompt && pool.length > 1 && pick === this.currentPrompt.expected) {
        pick = pool.find(m => m !== this.currentPrompt.expected) || pick;
      }

      const moveObj = parseMove(pick);
      let desc = '';
      if (moveObj.amount === 1) desc = `Rotate ${moveObj.face} face 90° clockwise`;
      else if (moveObj.amount === 2) desc = `Rotate ${moveObj.face} face 180° (double turn)`;
      else if (moveObj.amount === 3) desc = `Rotate ${moveObj.face} face 90° counter-clockwise (prime)`;

      this.currentPrompt = {
        type: 'single_move',
        expected: pick,
        face: moveObj.face,
        amount: moveObj.amount,
        description: this.mode === TRAINER_MODES.NOTATION_READING
          ? `Read notation: "${pick}" → Perform the move`
          : desc,
        hint: `Face: ${moveObj.face} | Modifier: ${moveObj.amount === 3 ? "Prime (')" : moveObj.amount === 2 ? 'Double (2)' : 'Clockwise'}`
      };
    }

    this.notify();
  }

  /**
   * Observe a move performed by the user on the simulator.
   * @param {string} moveNotation
   */
  observeMove(moveNotation) {
    if (!this.currentPrompt || this.status === 'success') return;

    const timeSpent = this.startTime ? Date.now() - this.startTime : 0;
    const trainerKey = this.mode === TRAINER_MODES.NOTATION_READING ? 'notationTrainer' : 'moveTrainer';

    if (this.currentPrompt.type === 'sequence') {
      this.performedSequence.push(moveNotation);
      const result = detectSequenceDivergence(this.currentPrompt.expected, this.performedSequence);

      if (result.isComplete && result.isCorrect) {
        this.status = 'success';
        this.lastFeedback = {
          isCorrect: true,
          mistakeType: MISTAKE_TYPES.CORRECT,
          message: `✓ Perfect! Completed ${this.currentPrompt.name} (${this.currentPrompt.expected}) in ${(timeSpent / 1000).toFixed(1)}s.`,
          tip: 'Ready for next prompt!'
        };
        recordTrainerAttempt(trainerKey, {
          expected: this.currentPrompt.expected,
          actual: this.performedSequence.join(' '),
          isCorrect: true,
          timeMs: timeSpent
        }, this.storage);
        this._syncStats();
      } else if (!result.isCorrect) {
        this.status = 'mistake';
        this.lastFeedback = {
          isCorrect: false,
          mistakeType: result.type,
          message: result.message,
          tip: result.tip,
          expected: result.expectedMove,
          actual: result.actualMove
        };
        recordTrainerAttempt(trainerKey, {
          expected: this.currentPrompt.expected,
          actual: this.performedSequence.join(' '),
          isCorrect: false,
          mistakeType: result.type,
          timeMs: timeSpent
        }, this.storage);
        this._syncStats();
      } else {
        // Correct intermediate step
        this.status = 'waiting';
        this.lastFeedback = {
          isCorrect: true,
          mistakeType: MISTAKE_TYPES.CORRECT,
          message: result.message,
          tip: result.tip
        };
      }
    } else {
      // Single move validation
      const result = detectMoveMistake(this.currentPrompt.expected, moveNotation);

      if (result.isCorrect) {
        this.status = 'success';
        this.lastFeedback = result;
        recordTrainerAttempt(trainerKey, {
          expected: this.currentPrompt.expected,
          actual: moveNotation,
          isCorrect: true,
          timeMs: timeSpent
        }, this.storage);
        this._syncStats();
      } else {
        this.status = 'mistake';
        this.lastFeedback = result;
        recordTrainerAttempt(trainerKey, {
          expected: this.currentPrompt.expected,
          actual: moveNotation,
          isCorrect: false,
          mistakeType: result.type,
          timeMs: timeSpent
        }, this.storage);
        this._syncStats();
      }
    }

    this.notify();
  }

  resetCurrent() {
    this.performedSequence = [];
    this.status = 'waiting';
    this.lastFeedback = null;
    this.startTime = Date.now();
    this.notify();
  }
}
