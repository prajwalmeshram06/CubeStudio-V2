/**
 * CubeStudio V2 - Editor Controller
 * Feature controller for the 2D Manual Cube Editor.
 *
 * Rules:
 * - Operates directly on CubeState through domain APIs.
 * - Reuses existing validation, serialization, and constants.
 * - Does not duplicate cube logic.
 */

import { CubeState } from '../../cube/model/CubeState.js';
import { validate } from '../../cube/engine/validation.js';
import { FACES, STICKERS_PER_FACE, CENTER_STICKER_INDEX } from '../../cube/model/constants.js';

export class EditorController {
  /**
   * @param {object} [options]
   * @param {CubeState} [options.initialState]
   */
  constructor(options = {}) {
    this.cubeState = options.initialState ? options.initialState.clone() : CubeState.createSolved();
    this.selectedColor = 'U'; // Default active brush
    this._listeners = new Set();
    this._history = [this.cubeState.clone()];
    this._historyIndex = 0;
  }

  /**
   * Subscribes to editor state changes.
   * @param {(state: object) => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(listener) {
    this._listeners.add(listener);
    listener(this.getState());
    return () => this._listeners.delete(listener);
  }

  _notifyListeners() {
    const state = this.getState();
    for (const listener of this._listeners) {
      listener(state);
    }
  }

  /**
   * Computes counts of each color currently on the cube.
   * @returns {Record<string, number>}
   */
  getColorCounts() {
    const counts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0, EMPTY: 0 };
    const facelets = this.cubeState.getFacelets();
    for (const f of facelets) {
      if (counts[f] !== undefined) {
        counts[f]++;
      } else {
        counts.EMPTY++;
      }
    }
    return counts;
  }

  /**
   * Returns current editor state summary.
   */
  getState() {
    const validation = validate(this.cubeState);
    return {
      cubeState: this.cubeState.clone(),
      selectedColor: this.selectedColor,
      validation,
      colorCounts: this.getColorCounts(),
      canUndo: this._historyIndex > 0,
      canRedo: this._historyIndex < this._history.length - 1
    };
  }

  /**
   * Sets the active brush color.
   * @param {string} color - 'U'|'R'|'F'|'D'|'L'|'B'
   */
  setSelectedColor(color) {
    if (FACES.includes(color)) {
      this.selectedColor = color;
      this._notifyListeners();
    }
  }

  /**
   * Sets a sticker's color at face and local index (0..8).
   * Center stickers (index 4) are fixed to maintain canonical orientation.
   * @param {string} face
   * @param {number} localIndex
   * @param {string} [color] - Defaults to active selectedColor
   */
  setSticker(face, localIndex, color = this.selectedColor) {
    // Fixed centers cannot be overridden in standard mode
    if (localIndex === CENTER_STICKER_INDEX) {
      return;
    }

    const currentColor = this.cubeState.getSticker(face, localIndex);
    if (currentColor === color) return;

    this.cubeState.setSticker(face, localIndex, color);
    this._pushHistory();
    this._notifyListeners();
  }

  /**
   * Cycles a sticker through the 6 colors on click.
   * @param {string} face
   * @param {number} localIndex
   */
  cycleSticker(face, localIndex) {
    if (localIndex === CENTER_STICKER_INDEX) return;

    const current = this.cubeState.getSticker(face, localIndex);
    const currentIndex = FACES.indexOf(current);
    const nextColor = FACES[(currentIndex + 1) % FACES.length];

    this.cubeState.setSticker(face, localIndex, nextColor);
    this._pushHistory();
    this._notifyListeners();
  }

  /**
   * Resets the editor to a solved cube.
   */
  resetToSolved() {
    this.cubeState = CubeState.createSolved();
    this._pushHistory();
    this._notifyListeners();
  }

  /**
   * Clears all non-center stickers to 'U' (or unassigned/white).
   */
  clear() {
    for (const face of FACES) {
      for (let i = 0; i < STICKERS_PER_FACE; i++) {
        if (i !== CENTER_STICKER_INDEX) {
          this.cubeState.setSticker(face, i, 'U');
        }
      }
    }
    this._pushHistory();
    this._notifyListeners();
  }

  /**
   * Loads a CubeState into the editor.
   * @param {CubeState} state
   */
  loadState(state) {
    if (state instanceof CubeState) {
      this.cubeState = state.clone();
      this._pushHistory();
      this._notifyListeners();
    }
  }

  /**
   * Exports the current state.
   * @param {'string'|'json'} [format='string']
   * @returns {string|object}
   */
  exportState(format = 'string') {
    return this.cubeState.serialize(format);
  }

  /**
   * Imports a state string or JSON.
   * @param {string|object} data
   * @returns {{ success: boolean, error?: string }}
   */
  importState(data) {
    try {
      const imported = CubeState.deserialize(data);
      this.cubeState = imported;
      this._pushHistory();
      this._notifyListeners();
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  _pushHistory() {
    if (this._historyIndex < this._history.length - 1) {
      this._history = this._history.slice(0, this._historyIndex + 1);
    }
    this._history.push(this.cubeState.clone());
    this._historyIndex++;
  }

  undo() {
    if (this._historyIndex > 0) {
      this._historyIndex--;
      this.cubeState = this._history[this._historyIndex].clone();
      this._notifyListeners();
    }
  }

  redo() {
    if (this._historyIndex < this._history.length - 1) {
      this._historyIndex++;
      this.cubeState = this._history[this._historyIndex].clone();
      this._notifyListeners();
    }
  }
}
