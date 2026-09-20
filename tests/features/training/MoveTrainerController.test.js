import { describe, it, expect, beforeEach } from 'vitest';
import { MoveTrainerController, TRAINER_MODES, MOVE_GROUPS } from '../../../src/features/training/trainers/MoveTrainerController.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
}

describe('MoveTrainerController', () => {
  let storage;
  let controller;

  beforeEach(() => {
    storage = new MockStorage();
    controller = new MoveTrainerController({ storage });
  });

  it('generates an initial prompt upon creation', () => {
    const state = controller.getState();
    expect(state.currentPrompt).toBeDefined();
    expect(state.currentPrompt.expected).toBeTruthy();
    expect(state.status).toBe('waiting');
  });

  it('evaluates a correct single move and increments streak', () => {
    const expected = controller.currentPrompt.expected;
    controller.observeMove(expected);

    const state = controller.getState();
    expect(state.status).toBe('success');
    expect(state.lastFeedback.isCorrect).toBe(true);
    expect(state.stats.currentStreak).toBe(1);
  });

  it('evaluates an incorrect move with mistake details', () => {
    // Pick a move guaranteed different from expected
    const wrongMove = controller.currentPrompt.expected === 'R' ? "R'" : 'R';
    controller.observeMove(wrongMove);

    const state = controller.getState();
    expect(state.status).toBe('mistake');
    expect(state.lastFeedback.isCorrect).toBe(false);
    expect(state.lastFeedback.tip).toBeTruthy();
  });

  it('switches to sequence drill mode and validates multi-step input', () => {
    controller.setMode(TRAINER_MODES.SEQUENCE_DRILL);
    const state = controller.getState();
    expect(state.mode).toBe(TRAINER_MODES.SEQUENCE_DRILL);
    expect(state.currentPrompt.expectedMoves).toBeDefined();

    const firstExpected = state.currentPrompt.expectedMoves[0];
    controller.observeMove(firstExpected);

    const nextState = controller.getState();
    expect(nextState.performedSequence).toContain(firstExpected);
  });
});
