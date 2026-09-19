/**
 * CubeStudio V2 - Cube History Manager
 * Manages undo, redo, and move sequence history independently of CubeState.
 */

import { CubeState } from '../model/CubeState.js';
import { Move } from '../model/moves.js';
import { parseMove } from '../model/notation.js';

export class CubeHistory {
  /**
   * @param {CubeState} [initialState] - Starting cube state
   */
  constructor(initialState = CubeState.createSolved()) {
    this.clear(initialState);
  }

  /**
   * Resets history to a new initial state.
   * @param {CubeState} initialState
   */
  clear(initialState = CubeState.createSolved()) {
    if (!(initialState instanceof CubeState)) {
      throw new Error('Initial state must be an instance of CubeState');
    }
    // Entries: { move: Move|null, state: CubeState }
    this._entries = [{ move: null, state: initialState.clone() }];
    this._currentIndex = 0;
  }

  /**
   * Pushes a new state transition resulting from a move.
   * Discards any undone forward history (branching).
   * @param {Move|string} move
   * @param {CubeState} resultingState
   */
  push(move, resultingState) {
    if (!(resultingState instanceof CubeState)) {
      throw new Error('resultingState must be an instance of CubeState');
    }

    const moveObj = typeof move === 'string' ? parseMove(move) : move;

    // Discard any forward redo history if we are currently branching from an undo
    if (this._currentIndex < this._entries.length - 1) {
      this._entries = this._entries.slice(0, this._currentIndex + 1);
    }

    this._entries.push({
      move: moveObj,
      state: resultingState.clone()
    });
    this._currentIndex++;
  }

  /**
   * Checks if undo is available.
   * @returns {boolean}
   */
  canUndo() {
    return this._currentIndex > 0;
  }

  /**
   * Checks if redo is available.
   * @returns {boolean}
   */
  canRedo() {
    return this._currentIndex < this._entries.length - 1;
  }

  /**
   * Undoes the last move, returning the previous CubeState.
   * Returns null if at the beginning of history.
   * @returns {CubeState|null}
   */
  undo() {
    if (!this.canUndo()) {
      return null;
    }
    this._currentIndex--;
    return this._entries[this._currentIndex].state.clone();
  }

  /**
   * Redoes the previously undone move, returning the next CubeState.
   * Returns null if at the end of history.
   * @returns {CubeState|null}
   */
  redo() {
    if (!this.canRedo()) {
      return null;
    }
    this._currentIndex++;
    return this._entries[this._currentIndex].state.clone();
  }

  /**
   * Returns the current CubeState.
   * @returns {CubeState}
   */
  getCurrentState() {
    return this._entries[this._currentIndex].state.clone();
  }

  /**
   * Returns the total number of moves executed up to the current position.
   * @returns {number}
   */
  get moveCount() {
    return this._currentIndex;
  }

  /**
   * Returns the current 0-based index in the history stack.
   * @returns {number}
   */
  get currentIndex() {
    return this._currentIndex;
  }

  /**
   * Returns the list of moves applied up to the current position.
   * @returns {Move[]}
   */
  getMoves() {
    const moves = [];
    for (let i = 1; i <= this._currentIndex; i++) {
      moves.push(this._entries[i].move);
    }
    return moves;
  }

  /**
   * Returns all moves in the entire history buffer, including redoable moves.
   * @returns {Move[]}
   */
  getAllMoves() {
    const moves = [];
    for (let i = 1; i < this._entries.length; i++) {
      moves.push(this._entries[i].move);
    }
    return moves;
  }
}
