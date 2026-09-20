import { describe, it, expect, beforeEach } from 'vitest';
import { SimulatorController } from '../../../src/features/simulator/SimulatorController.js';
import { MoveTrainerController, TRAINER_MODES } from '../../../src/features/training/trainers/MoveTrainerController.js';
import { AlgorithmTrainerController } from '../../../src/features/training/trainers/AlgorithmTrainerController.js';
import { MISTAKE_TYPES } from '../../../src/features/training/mistakeDetection.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) { return this.store[key] || null; }
  setItem(key, value) { this.store[key] = String(value); }
  removeItem(key) { delete this.store[key]; }
}

describe('Authoritative Simulator Move Integration with Training', () => {
  let simulator;
  let storage;

  beforeEach(() => {
    storage = new MockStorage();
    simulator = new SimulatorController({ animationSpeed: 0 }); // Instant execution in tests
  });

  it('1. Event propagation: simulator emits exactly one authoritative event per executed move', async () => {
    const receivedEvents = [];
    simulator.onMove(event => receivedEvents.push(event));

    await simulator.applyMove('R');
    expect(receivedEvents.length).toBe(1);
    expect(receivedEvents[0].move).toBe('R');
    expect(receivedEvents[0].source).toBe('user');
  });

  it('2. Correct move: expected R, actual R -> success and streak recorded', async () => {
    const trainer = new MoveTrainerController({ storage });
    trainer.currentPrompt = {
      type: 'single_move',
      expected: 'R',
      face: 'R',
      amount: 1,
      description: 'Rotate R face 90° clockwise',
      hint: 'R face'
    };

    simulator.onMove(event => {
      if (event.source === 'user') trainer.observeMove(event.move);
    });

    await simulator.applyMove('R');

    const state = trainer.getState();
    expect(state.status).toBe('success');
    expect(state.lastExecutedMove.move).toBe('R');
    expect(state.lastExecutedMove.isCorrect).toBe(true);
    expect(state.stats.successfulAttempts).toBe(1);
    expect(state.accuracy).toBe(100);
  });

  it('3. Wrong move: expected R, actual U -> wrong_face, does not falsely advance', async () => {
    const trainer = new MoveTrainerController({ storage });
    trainer.currentPrompt = {
      type: 'single_move',
      expected: 'R',
      face: 'R',
      amount: 1,
      description: 'Rotate R face 90° clockwise'
    };

    simulator.onMove(event => {
      if (event.source === 'user') trainer.observeMove(event.move);
    });

    await simulator.applyMove('U');

    const state = trainer.getState();
    expect(state.status).toBe('mistake');
    expect(state.lastExecutedMove.move).toBe('U');
    expect(state.lastExecutedMove.isCorrect).toBe(false);
    expect(state.lastExecutedMove.mistakeType).toBe(MISTAKE_TYPES.WRONG_FACE);
    expect(state.currentPrompt.expected).toBe('R'); // Still expects R
    expect(state.stats.successfulAttempts).toBe(0);
    expect(state.stats.totalAttempts).toBe(1);
    expect(state.accuracy).toBe(0);
  });

  it("4. Wrong direction: expected R, actual R' -> wrong_direction", async () => {
    const trainer = new MoveTrainerController({ storage });
    trainer.currentPrompt = {
      type: 'single_move',
      expected: 'R',
      face: 'R',
      amount: 1
    };

    simulator.onMove(event => {
      if (event.source === 'user') trainer.observeMove(event.move);
    });

    await simulator.applyMove("R'");

    const state = trainer.getState();
    expect(state.status).toBe('mistake');
    expect(state.lastExecutedMove.mistakeType).toBe(MISTAKE_TYPES.WRONG_DIRECTION);
  });

  it('5. Wrong amount: expected R2, actual R -> wrong_amount', async () => {
    const trainer = new MoveTrainerController({ storage });
    trainer.currentPrompt = {
      type: 'single_move',
      expected: 'R2',
      face: 'R',
      amount: 2
    };

    simulator.onMove(event => {
      if (event.source === 'user') trainer.observeMove(event.move);
    });

    await simulator.applyMove('R');

    const state = trainer.getState();
    expect(state.status).toBe('mistake');
    expect(state.lastExecutedMove.mistakeType).toBe(MISTAKE_TYPES.WRONG_AMOUNT);
  });

  it('6. Algorithm divergence: detects exact divergence location in sequence', async () => {
    const algTrainer = new AlgorithmTrainerController({
      storage,
      initialAlgorithmId: 'oll-edge-line' // "F R U R' U' F'"
    });

    simulator.onMove(event => {
      if (event.source === 'user') algTrainer.observeMove(event.move);
    });

    await simulator.applyMove('F');
    await simulator.applyMove('R');
    await simulator.applyMove('U');
    await simulator.applyMove('R'); // Divergence at move 4 (expected R')

    const state = algTrainer.getState();
    expect(state.status).toBe('diverged');
    expect(state.divergenceInfo.isCorrect).toBe(false);
    expect(state.divergenceInfo.divergenceIndex).toBe(3);
    expect(state.divergenceInfo.expectedMove).toBe("R'");
    expect(state.divergenceInfo.actualMove).toBe('R');
  });

  it('7. Skip action: records skipped attempt and does not inflate accuracy', () => {
    const trainer = new MoveTrainerController({ storage });
    trainer.currentPrompt = {
      type: 'single_move',
      expected: 'F',
      face: 'F',
      amount: 1
    };

    trainer.skipPrompt();

    const state = trainer.getState();
    expect(state.stats.totalAttempts).toBe(1);
    expect(state.stats.successfulAttempts).toBe(0);
    expect(state.accuracy).toBe(0);
    expect(state.stats.currentStreak).toBe(0);
  });

  it('8. Unsubscribe: unbinding listener prevents subsequent cube moves from affecting trainer', async () => {
    const trainer = new MoveTrainerController({ storage });
    trainer.currentPrompt = {
      type: 'single_move',
      expected: 'R',
      face: 'R',
      amount: 1
    };

    const unsub = simulator.onMove(event => {
      if (event.source === 'user') trainer.observeMove(event.move);
    });

    // Unsubscribe (simulating leaving tab)
    unsub();

    await simulator.applyMove('R');

    const state = trainer.getState();
    expect(state.status).toBe('waiting'); // Did not change to success
    expect(state.stats.totalAttempts).toBe(0);
  });

  it('9. Setup algorithm isolation: algorithm setup moves are marked source: setup and ignored by user trainer', async () => {
    const algTrainer = new AlgorithmTrainerController({
      storage,
      initialAlgorithmId: 'oll-corner-sune'
    });

    simulator.onMove(event => {
      if (event.source === 'user') algTrainer.observeMove(event.move);
    });

    // Apply setup
    await algTrainer.applySetupToSimulator(simulator);

    // Setup moves should NOT have been observed as user attempts
    const state = algTrainer.getState();
    expect(state.executedMoves.length).toBe(0);
    expect(state.status).toBe('practicing');
    expect(state.globalStats.totalAttempts).toBe(0);
  });
});
