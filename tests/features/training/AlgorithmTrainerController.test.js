import { describe, it, expect, beforeEach } from 'vitest';
import { AlgorithmTrainerController } from '../../../src/features/training/trainers/AlgorithmTrainerController.js';
import { parseAlgorithm } from '../../../src/cube/model/notation.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
}

describe('AlgorithmTrainerController', () => {
  let storage;
  let controller;

  beforeEach(() => {
    storage = new MockStorage();
    controller = new AlgorithmTrainerController({
      storage,
      initialAlgorithmId: 'oll-corner-sune'
    });
  });

  it('initializes with selected algorithm and ready status', () => {
    const state = controller.getState();
    expect(state.selectedAlgorithm.id).toBe('oll-corner-sune');
    expect(state.status).toBe('ready');
    expect(state.expectedMoves.length).toBe(7);
  });

  it('tracks sequential correct moves to full completion', () => {
    const moves = ['R', 'U', "R'", 'U', 'R', 'U2', "R'"];
    moves.forEach(m => controller.observeMove(m));

    const state = controller.getState();
    expect(state.status).toBe('success');
    expect(state.divergenceInfo.isCorrect).toBe(true);
    expect(state.executedMoves.length).toBe(7);
  });

  it('flags sequence divergence when a wrong move is performed', () => {
    controller.observeMove('R');
    controller.observeMove('U');
    controller.observeMove("R2"); // Mistake at step 3

    const state = controller.getState();
    expect(state.status).toBe('diverged');
    expect(state.divergenceInfo.isCorrect).toBe(false);
    expect(state.divergenceInfo.divergenceIndex).toBe(2);
  });

  it('filters algorithms by stage', () => {
    controller.setStageFilter('pll');
    const state = controller.getState();
    expect(state.filteredAlgorithms.every(a => a.stage === 'pll')).toBe(true);
  });
});
