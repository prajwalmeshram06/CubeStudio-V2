import { describe, it, expect } from 'vitest';
import { EditorController } from '../../src/features/editor/EditorController.js';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { SOLVED_FACELET_STRING } from '../../src/cube/model/constants.js';

describe('EditorController Feature', () => {
  it('initializes with solved state, valid status, and correct color counts (9 of each)', () => {
    const controller = new EditorController();
    const state = controller.getState();

    expect(state.cubeState.isSolved()).toBe(true);
    expect(state.validation.valid).toBe(true);
    expect(state.selectedColor).toBe('U');

    // Each of the 6 colors should count 9
    for (const color of ['U', 'R', 'F', 'D', 'L', 'B']) {
      expect(state.colorCounts[color]).toBe(9);
    }
  });

  it('allows changing active brush color', () => {
    const controller = new EditorController();
    controller.setSelectedColor('R');
    expect(controller.getState().selectedColor).toBe('R');

    // Invalid color ignored
    controller.setSelectedColor('Z');
    expect(controller.getState().selectedColor).toBe('R');
  });

  it('changes sticker colors on non-center stickers and updates validation and counts', () => {
    const controller = new EditorController();
    // Paint U0 to R
    controller.setSticker('U', 0, 'R');

    const state = controller.getState();
    expect(state.cubeState.getSticker('U', 0)).toBe('R');
    expect(state.colorCounts.U).toBe(8);
    expect(state.colorCounts.R).toBe(10);
    expect(state.validation.valid).toBe(false);
    expect(state.validation.error?.code).toBe('INVALID_COUNTS');
  });

  it('protects center stickers from modification', () => {
    const controller = new EditorController();
    // Attempt to overwrite U center (index 4) with R
    controller.setSticker('U', 4, 'R');

    expect(controller.getState().cubeState.getSticker('U', 4)).toBe('U');
  });

  it('cycles sticker colors', () => {
    const controller = new EditorController();
    // U0 starts as U. Faces order: U, R, F, D, L, B. Next after U is R.
    controller.cycleSticker('U', 0);
    expect(controller.getState().cubeState.getSticker('U', 0)).toBe('R');

    controller.cycleSticker('U', 0);
    expect(controller.getState().cubeState.getSticker('U', 0)).toBe('F');
  });

  it('resets to solved cube', () => {
    const controller = new EditorController();
    controller.setSticker('U', 0, 'B');
    expect(controller.getState().cubeState.isSolved()).toBe(false);

    controller.resetToSolved();
    expect(controller.getState().cubeState.isSolved()).toBe(true);
    expect(controller.getState().validation.valid).toBe(true);
  });

  it('clears net (sets non-center stickers to U)', () => {
    const controller = new EditorController();
    controller.clear();

    const state = controller.getState();
    expect(state.validation.valid).toBe(false);
    // All 48 non-center stickers are U + 1 U center = 49 U stickers
    expect(state.colorCounts.U).toBe(49);
  });

  it('supports undo and redo of sticker edits', () => {
    const controller = new EditorController();
    controller.setSticker('U', 0, 'R');
    expect(controller.getState().cubeState.getSticker('U', 0)).toBe('R');
    expect(controller.getState().canUndo).toBe(true);

    controller.undo();
    expect(controller.getState().cubeState.getSticker('U', 0)).toBe('U');
    expect(controller.getState().canRedo).toBe(true);

    controller.redo();
    expect(controller.getState().cubeState.getSticker('U', 0)).toBe('R');
  });

  it('detects impossible cubes (e.g. single twisted corner)', () => {
    const controller = new EditorController();
    // Twist URF corner: indices 8, 9, 20
    // URF corner: U8='U', R0='R', F2='F'
    // Twisted CW: U8='F', R0='U', F2='R'
    controller.setSticker('U', 8, 'F');
    controller.setSticker('R', 0, 'U');
    controller.setSticker('F', 2, 'R');

    const state = controller.getState();
    // Counts are still 9 each
    expect(state.colorCounts.U).toBe(9);
    expect(state.colorCounts.R).toBe(9);
    expect(state.colorCounts.F).toBe(9);
    // Parity error detected!
    expect(state.validation.valid).toBe(false);
    expect(state.validation.error?.code).toBe('CORNER_TWIST_PARITY');
  });

  it('exports and imports state roundtrip using standard 54-char string', () => {
    const controller = new EditorController();
    const exportedStr = controller.exportState('string');
    expect(exportedStr).toBe(SOLVED_FACELET_STRING);

    const res = controller.importState(SOLVED_FACELET_STRING);
    expect(res.success).toBe(true);
    expect(controller.getState().cubeState.isSolved()).toBe(true);
  });

  it('rejects malformed imports safely', () => {
    const controller = new EditorController();
    const res = controller.importState('NOT_A_VALID_STRING');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('loads external state and synchronizes with CubeState', () => {
    const externalCube = CubeState.createSolved();
    externalCube.setSticker('U', 0, 'B');

    const controller = new EditorController();
    controller.loadState(externalCube);

    expect(controller.getState().cubeState.equals(externalCube)).toBe(true);
  });

  it('produces a valid CubeState ready to pass to the simulator', () => {
    const controller = new EditorController();
    const state = controller.getState();

    expect(state.validation.valid).toBe(true);
    const simulatorReadyState = controller.cubeState.clone();
    expect(simulatorReadyState instanceof CubeState).toBe(true);
    expect(simulatorReadyState.isSolved()).toBe(true);
  });
});
