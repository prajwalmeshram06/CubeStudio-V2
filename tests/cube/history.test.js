import { describe, it, expect } from 'vitest';
import { CubeHistory } from '../../src/cube/engine/history.js';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { applyMove } from '../../src/cube/engine/applyMove.js';
import { createMove } from '../../src/cube/model/moves.js';

describe('Cube History Engine', () => {
  it('initializes with solved state and empty history', () => {
    const history = new CubeHistory();
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(false);
    expect(history.moveCount).toBe(0);
    expect(history.getCurrentState().isSolved()).toBe(true);
  });

  it('records state transitions via push', () => {
    const history = new CubeHistory();
    let state = history.getCurrentState();

    const moveR = createMove('R', 1);
    state = applyMove(state, moveR);
    history.push(moveR, state);

    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(false);
    expect(history.moveCount).toBe(1);
    expect(history.getCurrentState().isSolved()).toBe(false);
  });

  it('performs undo and redo cycles accurately', () => {
    const history = new CubeHistory();
    const state0 = history.getCurrentState();

    const move1 = createMove('R', 1);
    const state1 = applyMove(state0, move1);
    history.push(move1, state1);

    const move2 = createMove('U', 1);
    const state2 = applyMove(state1, move2);
    history.push(move2, state2);

    expect(history.moveCount).toBe(2);

    // Undo move 2
    const undone1 = history.undo();
    expect(undone1.equals(state1)).toBe(true);
    expect(history.moveCount).toBe(1);
    expect(history.canUndo()).toBe(true);
    expect(history.canRedo()).toBe(true);

    // Undo move 1
    const undone2 = history.undo();
    expect(undone2.equals(state0)).toBe(true);
    expect(history.moveCount).toBe(0);
    expect(history.canUndo()).toBe(false);
    expect(history.canRedo()).toBe(true);

    // Cannot undo past beginning
    expect(history.undo()).toBeNull();

    // Redo move 1
    const redone1 = history.redo();
    expect(redone1.equals(state1)).toBe(true);
    expect(history.moveCount).toBe(1);

    // Redo move 2
    const redone2 = history.redo();
    expect(redone2.equals(state2)).toBe(true);
    expect(history.moveCount).toBe(2);
    expect(history.canRedo()).toBe(false);

    // Cannot redo past end
    expect(history.redo()).toBeNull();
  });

  it('truncates forward redo history upon branching (new move after undo)', () => {
    const history = new CubeHistory();
    const state0 = history.getCurrentState();

    const state1 = applyMove(state0, 'R');
    history.push('R', state1);

    const state2 = applyMove(state1, 'U');
    history.push('U', state2);

    // Undo once (back to state1)
    history.undo();
    expect(history.canRedo()).toBe(true);

    // Now branch by applying 'F' instead of 'U'
    const stateBranch = applyMove(state1, 'F');
    history.push('F', stateBranch);

    // Redo should no longer be available
    expect(history.canRedo()).toBe(false);
    expect(history.moveCount).toBe(2);
    expect(history.getMoves().map(m => m.notation)).toEqual(['R', 'F']);
  });

  it('clears history completely', () => {
    const history = new CubeHistory();
    const state = applyMove(history.getCurrentState(), 'R');
    history.push('R', state);

    history.clear();
    expect(history.moveCount).toBe(0);
    expect(history.canUndo()).toBe(false);
    expect(history.getCurrentState().isSolved()).toBe(true);
  });
});
