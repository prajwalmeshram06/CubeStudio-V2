/**
 * SolutionPlayerController.js — Solution Playback & Hint State Machine.
 *
 * Architecture rules:
 * - Owns: solution Move[], currentIndex, playback status, progress, step intent, hint derivation.
 * - Coordinates with optional SimulatorController for 3D animated execution without duplicating queues.
 * - Single source of truth for cube mechanics: delegates to CubeState and applyMove.
 * - Works with Move instances and handles move.inverse() for reliable step-backward.
 */

import { CubeState } from '../../cube/model/CubeState.js';
import { applyMove } from '../../cube/engine/applyMove.js';
import { parseMove } from '../../cube/model/notation.js';

const FACE_NAMES = Object.freeze({
  U: 'Up',
  R: 'Right',
  F: 'Front',
  D: 'Down',
  L: 'Left',
  B: 'Back',
});

export class SolutionPlayerController {
  /**
   * @param {object} options
   * @param {import('../../cube/model/CubeState.js').CubeState} [options.initialCubeState]
   * @param {Array<import('../../cube/model/moves.js').Move|string>} [options.moves]
   * @param {number} [options.playbackSpeed=500]
   * @param {(move: import('../../cube/model/moves.js').Move) => void} [options.onStep]
   * @param {import('../simulator/SimulatorController.js').SimulatorController} [options.simulatorController]
   */
  constructor(options = {}) {
    this.initialCubeState = options.initialCubeState
      ? options.initialCubeState.clone()
      : CubeState.createSolved();

    this.currentCubeState = this.initialCubeState.clone();

    this.moves = (options.moves || []).map((m) =>
      typeof m === 'string' ? parseMove(m) : m
    );

    this.currentIndex = 0;
    this.status = this.moves.length === 0 ? 'completed' : 'idle'; // 'idle' | 'playing' | 'paused' | 'completed'
    this.playbackSpeed = options.playbackSpeed ?? 500;
    this.onStep = options.onStep || null;
    this.simulatorController = options.simulatorController || null;

    this._timer = null;
    this._listeners = new Set();
  }

  /**
   * Connect or disconnect an external SimulatorController.
   * @param {import('../simulator/SimulatorController.js').SimulatorController|null} simController
   */
  setSimulatorController(simController) {
    this.simulatorController = simController;
  }

  /**
   * Returns true if the associated simulator queue is currently busy processing animation.
   * @returns {boolean}
   */
  isSimulatorBusy() {
    return Boolean(this.simulatorController && this.simulatorController.queue?.isBusy());
  }

  // ─────────────────────────────────────────────────────────────
  // Subscriptions & State Query
  // ─────────────────────────────────────────────────────────────

  /**
   * Subscribes to player state changes.
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
   * Returns complete current snapshot of the player state.
   */
  getState() {
    const progress = this.getProgress();
    const nextHint = this.getNextHint();

    const nextMove =
      this.currentIndex < this.moves.length
        ? this.moves[this.currentIndex]
        : null;

    const prevMove =
      this.currentIndex > 0
        ? this.moves[this.currentIndex - 1]
        : null;

    const isBusy = this.isSimulatorBusy();

    return {
      initialCubeState: this.initialCubeState,
      currentCubeState: this.currentCubeState,
      moves: this.moves,
      currentIndex: this.currentIndex,
      status: this.status,
      isPlaying: this.status === 'playing',
      isCompleted: this.currentIndex === this.moves.length,
      isBusy,

      canStepForward:
        this.currentIndex < this.moves.length &&
        this.status !== 'playing' &&
        !isBusy,

      canStepBackward:
        this.currentIndex > 0 &&
        this.status !== 'playing' &&
        !isBusy,

      canRestart:
        (this.currentIndex > 0 || this.status === 'completed') &&
        !isBusy,

      progress,
      nextHint,
      nextMove,
      prevMove,
      playbackSpeed: this.playbackSpeed,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Progress & Hints
  // ─────────────────────────────────────────────────────────────

  /**
   * Computes progress stats.
   * @returns {{ current: number, total: number, percent: number, remaining: number }}
   */
  getProgress() {
    const total = this.moves.length;
    const current = this.currentIndex;
    const percent = total === 0 ? 100 : Math.round((current / total) * 100);
    return {
      current,
      total,
      percent,
      remaining: Math.max(0, total - current),
    };
  }

  /**
   * Generates next move hint based on actual solution.
   */
  getNextHint() {
    if (this.currentIndex >= this.moves.length) {
      return {
        hasHint: false,
        message: 'No remaining moves. Solution complete.',
        move: null,
        notation: null,
        face: null,
        description: 'No remaining moves. Solution complete.',
      };
    }

    const nextMove = this.moves[this.currentIndex];
    const faceName = FACE_NAMES[nextMove.face] || nextMove.face;

    let turnText = 'clockwise';
    if (nextMove.amount === 2) {
      turnText = '180 degrees';
    } else if (nextMove.amount === 3) {
      turnText = 'counter-clockwise';
    }

    const description = `Turn ${faceName} face ${turnText} (${nextMove.notation})`;

    return {
      hasHint: true,
      move: nextMove,
      notation: nextMove.notation,
      face: nextMove.face,
      amount: nextMove.amount,
      description,
      message: `Next move: ${nextMove.notation}`,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Step Execution
  // ─────────────────────────────────────────────────────────────

  /**
   * Executes the next move forward.
   * Disallows advancement while simulator queue is busy.
   * @returns {import('../../cube/model/moves.js').Move | null} Move that was executed, or null
   */
  stepForward() {
    if (this.isSimulatorBusy()) {
      return null;
    }

    if (this.currentIndex >= this.moves.length) {
      this.status = 'completed';
      this._notifyListeners();
      return null;
    }

    const move = this.moves[this.currentIndex];
    this.currentCubeState = applyMove(this.currentCubeState, move);
    this.currentIndex++;

    // Forward to simulator if connected
    if (this.simulatorController) {
      this.simulatorController.applyMove(move);
    }

    if (this.currentIndex === this.moves.length) {
      this.status = 'completed';
      if (this._timer) {
        clearTimeout(this._timer);
        this._timer = null;
      }
    }

    this._notifyListeners();
    return move;
  }

  /**
   * Executes the previous move in reverse (undo step).
   * Disallows stepping backward while simulator queue is busy.
   * @returns {import('../../cube/model/moves.js').Move | null} Inverse move executed, or null
   */
  stepBackward() {
    if (this.isSimulatorBusy()) {
      return null;
    }

    if (this.currentIndex <= 0) {
      return null;
    }

    // Previously executed move
    const prevMove = this.moves[this.currentIndex - 1];
    const inverseMove = prevMove.inverse();

    this.currentCubeState = applyMove(this.currentCubeState, inverseMove);
    this.currentIndex--;

    // Forward inverse move to simulator if connected
    if (this.simulatorController) {
      this.simulatorController.applyMove(inverseMove);
    }

    if (this.status === 'completed') {
      this.status = 'paused';
    }

    this._notifyListeners();
    return inverseMove;
  }

  /**
   * Restores currentCubeState back to initialCubeState and resets index to 0.
   * Synchronizes visual simulator if connected.
   * @returns {import('../../cube/model/CubeState.js').CubeState}
   */
  restart() {
    this.pause();

    if (this.simulatorController) {
      this.simulatorController.queue?.clear();
      this.simulatorController.animator?.cancel();
      this.simulatorController.cubeState = this.initialCubeState.clone();
      this.simulatorController.history?.clear(this.initialCubeState);
      if (this.simulatorController.renderer) {
        this.simulatorController.renderer.resetPositions();
        this.simulatorController.renderer.syncWithState(this.initialCubeState);
      }
      this.simulatorController._lastMove = null;
      this.simulatorController._notifyListeners();
    }

    this.currentCubeState = this.initialCubeState.clone();
    this.currentIndex = 0;
    this.status = this.moves.length === 0 ? 'completed' : 'idle';
    this._notifyListeners();
    return this.currentCubeState;
  }

  /**
   * Skips to a target move index (0 to total moves), updating state and simulator.
   * @param {number} targetIndex
   * @returns {import('../../cube/model/CubeState.js').CubeState | null}
   */
  skipTo(targetIndex) {
    if (this.isSimulatorBusy()) {
      return null;
    }

    const clampedIndex = Math.max(0, Math.min(targetIndex, this.moves.length));
    if (clampedIndex === this.currentIndex) {
      return this.currentCubeState;
    }

    this.pause();

    // Recompute state from initial state up to target index
    let state = this.initialCubeState.clone();
    for (let i = 0; i < clampedIndex; i++) {
      state = applyMove(state, this.moves[i]);
    }

    this.currentCubeState = state;
    this.currentIndex = clampedIndex;
    this.status = clampedIndex === this.moves.length ? 'completed' : (clampedIndex === 0 ? 'idle' : 'paused');

    if (this.simulatorController) {
      this.simulatorController.queue?.clear();
      this.simulatorController.animator?.cancel();
      this.simulatorController.cubeState = state.clone();
      this.simulatorController.history?.clear(state);
      if (this.simulatorController.renderer) {
        this.simulatorController.renderer.resetPositions();
        this.simulatorController.renderer.syncWithState(state);
      }
      this.simulatorController._lastMove = clampedIndex > 0 ? this.moves[clampedIndex - 1].notation : null;
      this.simulatorController._notifyListeners();
    }

    this._notifyListeners();
    return this.currentCubeState;
  }

  // ─────────────────────────────────────────────────────────────
  // Autoplay Playback
  // ─────────────────────────────────────────────────────────────

  /**
   * Starts automatic playback.
   *
   * Important:
   * - Uses a recursive timeout instead of setInterval.
   * - Never allows multiple playback ticks to overlap.
   * - Waits for the simulator queue to become free before issuing another move.
   *
   * @param {(move: import('../../cube/model/moves.js').Move) => void} [onStep]
   */
  play(onStep) {
    if (this.status === 'playing') {
      return;
    }

    if (this.currentIndex >= this.moves.length) {
      return;
    }

    const stepCallback = onStep || this.onStep;

    this.status = 'playing';
    this._notifyListeners();

    const tick = () => {
      if (this.status !== 'playing') {
        return;
      }

      if (this.currentIndex >= this.moves.length) {
        this.pause();
        return;
      }

      /*
       * The simulator is still animating the previous move.
       * Don't issue another move and don't advance the player.
       */
      if (this.isSimulatorBusy()) {
        this._timer = setTimeout(tick, 16);
        return;
      }

      const executed = this.stepForward();

      if (stepCallback && executed) {
        stepCallback(executed);
      }

      if (
        this.status === 'completed' ||
        this.currentIndex >= this.moves.length
      ) {
        this.pause();
        return;
      }

      this._timer = setTimeout(tick, this.playbackSpeed);
    };

    this._tick = tick;
    this._timer = setTimeout(tick, 0);
  }

  /**
   * Pauses automatic playback cleanly.
   */
  pause() {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this._tick = null;

    if (this.status === 'playing') {
      this.status =
        this.currentIndex >= this.moves.length
          ? 'completed'
          : 'paused';

      this._notifyListeners();
    }
  }

  /**
   * Updates autoplay interval speed in milliseconds.
   * @param {number} speedMs
   */
  setPlaybackSpeed(speedMs) {
    this.playbackSpeed = speedMs;

    /*
     * Do not modify SimulatorController animation speed here.
     * Playback speed is the Solution Player's timing preference.
     * The simulator owns its own animation duration.
     */
    if (this.status === 'playing' && this._tick) {
      if (this._timer) {
        clearTimeout(this._timer);
      }
      this._timer = setTimeout(this._tick, this.playbackSpeed);
    }

    this._notifyListeners();
  }

  /**
   * Cleans up timers and subscriptions.
   */
  dispose() {
    this.pause();
    this._listeners.clear();
  }
}

