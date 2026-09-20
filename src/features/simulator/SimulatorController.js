/**
 * CubeStudio V2 - Simulator Controller
 * Connects user actions and UI to Pure Cube Engine and Three.js presentation.
 *
 * Rules:
 * - CubeState is the SINGLE source of truth for the cube.
 * - Renderer is presentation-only and synchronized on state transitions.
 * - History is recorded cleanly.
 */

import { CubeState } from '../../cube/model/CubeState.js';
import { CubeHistory } from '../../cube/engine/history.js';
import { applyMove } from '../../cube/engine/applyMove.js';
import { parseMove, parseAlgorithm } from '../../cube/model/notation.js';
import { generateScramble } from '../../cube/engine/scramble.js';
import { MoveAnimator } from '../../cube/rendering/MoveAnimator.js';
import { AnimationQueue } from '../../cube/rendering/AnimationQueue.js';

export class SimulatorController {
  /**
   * @param {object} [options]
   * @param {import('../../cube/rendering/CubeRenderer.js').CubeRenderer} [options.renderer]
   * @param {number} [options.animationSpeed=200]
   */
  constructor(options = {}) {
    this.cubeState = CubeState.createSolved();
    this.history = new CubeHistory(this.cubeState);
    this.renderer = options.renderer || null;
    this.animationSpeed = options.animationSpeed ?? 200;

    this.animator = new MoveAnimator({ defaultDuration: this.animationSpeed });
    this.queue = new AnimationQueue({
      processor: this._processQueueMove.bind(this),
      onEmpty: () => this._notifyListeners()
    });

    this._listeners = new Set();
    this._moveListeners = new Set();
    this._lastMove = null;
  }

  /**
   * Subscribes to authoritative move execution events.
   * @param {(event: { move: string, moveObj: import('../../cube/model/moves.js').Move, source: string, timestamp: number, state: CubeState }) => void} listener
   * @returns {() => void} unsubscribe
   */
  onMove(listener) {
    this._moveListeners.add(listener);
    return () => this._moveListeners.delete(listener);
  }

  _notifyMoveListeners(event) {
    for (const listener of this._moveListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[SimulatorController] Error in move listener:', err);
      }
    }
  }

  /**
   * Sets or updates the 3D renderer.
   * @param {import('../../cube/rendering/CubeRenderer.js').CubeRenderer} renderer
   */
  setRenderer(renderer) {
    this.renderer = renderer;
    if (this.renderer) {
      this.renderer.syncWithState(this.cubeState);
    }
  }

  /**
   * Subscribes to simulator state updates.
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
   * Returns current UI/simulator summary state.
   */
  getState() {
    return {
      isSolved: this.cubeState.isSolved(),
      moveCount: this.history.moveCount,
      canUndo: this.history.canUndo(),
      canRedo: this.history.canRedo(),
      lastMove: this._lastMove ? this._lastMove.notation : null,
      isBusy: this.queue.isBusy(),
      animationSpeed: this.animationSpeed
    };
  }

  /**
   * Applies a single move (e.g. "R", "U'", "F2").
   * Enqueues the move for sequential processing and animation.
   * @param {import('../../cube/model/moves.js').Move|string} moveInput
   * @param {object} [options]
   * @param {boolean} [options.instant=false]
   * @param {string} [options.source='user']
   */
  applyMove(moveInput, options = {}) {
    const move = typeof moveInput === 'string' ? parseMove(moveInput) : moveInput;
    return new Promise((resolve) => {
      this.queue.enqueue({
        move,
        instant: options.instant || this.animationSpeed === 0,
        source: options.source || 'user',
        resolve
      });
    });
  }

  /**
   * Applies an algorithm string (e.g. "R U R' U'").
   * @param {string} algorithm
   * @param {object} [options]
   * @param {string} [options.source='algorithm']
   */
  applyAlgorithm(algorithm, options = {}) {
    const moves = parseAlgorithm(algorithm);
    const items = moves.map(move => ({
      move,
      instant: options.instant || this.animationSpeed === 0,
      source: options.source || 'algorithm'
    }));
    this.queue.enqueueAll(items);
  }

  /**
   * Processor invoked by AnimationQueue for each move item.
   */
  async _processQueueMove(item) {
    const { move, instant, source = 'user' } = item;
    this._lastMove = move;

    // 1. Calculate next state using pure Cube Engine
    const nextState = applyMove(this.cubeState, move);

    // 2. Animate visually on the presentation layer
    if (this.renderer && !instant && this.animationSpeed > 0) {
      await this.animator.animate(this.renderer, move, this.animationSpeed);
    }

    // 3. Update logical CubeState (single source of truth)
    this.cubeState = nextState;

    // 4. Record move in history
    this.history.push(move, this.cubeState);

    // 5. Hard sync with presentation layer to prevent any numerical drift
    if (this.renderer) {
      this.renderer.syncWithState(this.cubeState);
    }

    // 6. Notify authoritative move listeners
    const moveEvent = {
      move: move.notation,
      moveObj: move,
      source,
      timestamp: Date.now(),
      state: this.cubeState
    };
    this._notifyMoveListeners(moveEvent);

    // 7. Notify UI
    this._notifyListeners();

    if (typeof item.resolve === 'function') {
      item.resolve(this.cubeState);
    }
  }

  /**
   * Scrambles the cube with a standard WCA sequence.
   * @param {number} [length=20]
   * @param {boolean} [animated=false]
   */
  scramble(length = 20, animated = false) {
    this.queue.clear();
    this.animator.cancel();

    const moves = generateScramble(length);

    if (animated) {
      const items = moves.map(move => ({
        move,
        instant: false,
        source: 'scramble'
      }));
      this.queue.enqueueAll(items);
    } else {
      // Instant scramble
      for (const move of moves) {
        this.cubeState = applyMove(this.cubeState, move);
        this.history.push(move, this.cubeState);
      }
      this._lastMove = moves[moves.length - 1];
      if (this.renderer) {
        this.renderer.resetPositions();
        this.renderer.syncWithState(this.cubeState);
      }
      this._notifyListeners();
    }
  }

  /**
   * Loads an authoritative CubeState into the simulator without remounting the renderer.
   * History is cleared to the loaded state. Used by training resets and lesson entry.
   * @param {import('../../cube/model/CubeState.js').CubeState} cubeState
   */
  loadState(cubeState) {
    if (!(cubeState instanceof CubeState)) {
      throw new Error('loadState requires an instance of CubeState');
    }

    this.queue.clear();
    this.animator.cancel();

    this.cubeState = cubeState.clone();
    this.history.clear(this.cubeState);
    this._lastMove = null;

    if (this.renderer) {
      this.renderer.resetPositions();
      this.renderer.syncWithState(this.cubeState);
    }

    this._notifyListeners();
  }

  /**
   * Resets the cube to the solved state.
   */
  reset() {
    this.queue.clear();
    this.animator.cancel();

    this.cubeState = CubeState.createSolved();
    this.history.clear(this.cubeState);
    this._lastMove = null;

    if (this.renderer) {
      this.renderer.resetPositions();
      this.renderer.syncWithState(this.cubeState);
    }

    this._notifyListeners();
  }

  /**
   * Undoes the last move.
   */
  undo() {
    if (!this.history.canUndo() || this.queue.isBusy()) return;

    this.queue.clear();
    this.animator.cancel();

    const prevState = this.history.undo();
    if (prevState) {
      this.cubeState = prevState;
      this._lastMove = null;

      if (this.renderer) {
        this.renderer.resetPositions();
        this.renderer.syncWithState(this.cubeState);
      }

      this._notifyListeners();
    }
  }

  /**
   * Redoes the last undone move.
   */
  redo() {
    if (!this.history.canRedo() || this.queue.isBusy()) return;

    this.queue.clear();
    this.animator.cancel();

    const nextState = this.history.redo();
    if (nextState) {
      this.cubeState = nextState;
      this._lastMove = null;

      if (this.renderer) {
        this.renderer.resetPositions();
        this.renderer.syncWithState(this.cubeState);
      }

      this._notifyListeners();
    }
  }

  /**
   * Updates animation speed in ms.
   * @param {number} speedMs
   */
  setAnimationSpeed(speedMs) {
    this.animationSpeed = speedMs;
    this.animator.defaultDuration = speedMs;
    this._notifyListeners();
  }
}
