import { describe, it, expect } from 'vitest';
import { SimulatorController } from '../../src/features/simulator/SimulatorController.js';
import { CubeRenderer } from '../../src/cube/rendering/CubeRenderer.js';
import { CubeState } from '../../src/cube/model/CubeState.js';

describe('SimulatorController', () => {
  it('initializes with solved CubeState and empty history', () => {
    const controller = new SimulatorController({ animationSpeed: 0 });
    const state = controller.getState();

    expect(state.isSolved).toBe(true);
    expect(state.moveCount).toBe(0);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.lastMove).toBeNull();
  });

  it('applies moves, updates CubeState, history, and notifies subscribers', async () => {
    const controller = new SimulatorController({ animationSpeed: 0 });
    const historyStates = [];

    controller.subscribe((state) => {
      historyStates.push(state);
    });

    controller.applyMove('R');
    await new Promise((resolve) => setTimeout(resolve, 30));

    const state = controller.getState();
    expect(state.isSolved).toBe(false);
    expect(state.moveCount).toBe(1);
    expect(state.canUndo).toBe(true);
    expect(state.canRedo).toBe(false);
    expect(state.lastMove).toBe('R');
  });

  it('executes undo and redo transitions accurately', async () => {
    const controller = new SimulatorController({ animationSpeed: 0 });

    controller.applyMove('R');
    await new Promise((resolve) => setTimeout(resolve, 30));
    controller.applyMove('U');
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(controller.getState().moveCount).toBe(2);

    // Undo U
    controller.undo();
    expect(controller.getState().moveCount).toBe(1);
    expect(controller.getState().canRedo).toBe(true);

    // Undo R
    controller.undo();
    expect(controller.getState().moveCount).toBe(0);
    expect(controller.getState().isSolved).toBe(true);
    expect(controller.getState().canUndo).toBe(false);

    // Redo R
    controller.redo();
    expect(controller.getState().moveCount).toBe(1);
    expect(controller.getState().isSolved).toBe(false);

    // Redo U
    controller.redo();
    expect(controller.getState().moveCount).toBe(2);
  });

  it('scrambles the cube and records history', () => {
    const controller = new SimulatorController({ animationSpeed: 0 });
    controller.scramble(20, false);

    const state = controller.getState();
    expect(state.moveCount).toBe(20);
    expect(state.isSolved).toBe(false);
    expect(state.canUndo).toBe(true);
  });

  it('resets the cube back to solved state', () => {
    const controller = new SimulatorController({ animationSpeed: 0 });
    controller.scramble(20, false);
    expect(controller.getState().isSolved).toBe(false);

    controller.reset();
    const state = controller.getState();
    expect(state.isSolved).toBe(true);
    expect(state.moveCount).toBe(0);
    expect(state.canUndo).toBe(false);
    expect(state.canRedo).toBe(false);
    expect(state.lastMove).toBeNull();
  });

  it('applies algorithm string sequentially', async () => {
    const controller = new SimulatorController({ animationSpeed: 0 });
    controller.applyAlgorithm("R U R' U'");
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(controller.getState().moveCount).toBe(4);
    expect(controller.getState().isSolved).toBe(false);
  });

  it('synchronizes with CubeRenderer without drift', async () => {
    const renderer = new CubeRenderer();
    const controller = new SimulatorController({
      renderer,
      animationSpeed: 0
    });

    // 6 Sexy Moves should return cube to solved
    for (let i = 0; i < 6; i++) {
      controller.applyAlgorithm("R U R' U'");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(controller.getState().isSolved).toBe(true);
    expect(controller.cubeState.isSolved()).toBe(true);
  });

  it('loadState replaces CubeState, clears history, and keeps the same controller instance', () => {
    const controller = new SimulatorController({ animationSpeed: 0 });
    controller.scramble(12, false);
    const scrambled = controller.cubeState.clone();
    expect(controller.getState().isSolved).toBe(false);

    const target = CubeState.createSolved();
    controller.loadState(target);

    expect(controller.cubeState.equals(target)).toBe(true);
    expect(controller.getState().isSolved).toBe(true);
    expect(controller.getState().moveCount).toBe(0);
    expect(controller.getState().lastMove).toBeNull();
    expect(scrambled.isSolved()).toBe(false);
  });
});
