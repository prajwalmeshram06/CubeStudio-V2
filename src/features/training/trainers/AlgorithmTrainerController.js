/**
 * AlgorithmTrainerController.js — Algorithm & CFOP Trainer State Machine.
 *
 * Coordinates algorithm setup on the 3D cube, step-by-step execution tracking,
 * sequence divergence detection, timing, and persistent analytics.
 */

import { CFOP_ALGORITHMS, CFOP_STAGES, getAlgorithmById, getAlgorithmsByStage } from '../algorithms/cfopData.js';
import { detectSequenceDivergence, MISTAKE_TYPES } from '../mistakeDetection.js';
import { recordAlgorithmAttempt, getTrainingData } from '../../../services/trainingStorage.js';
import { parseAlgorithm } from '../../../cube/model/notation.js';

export class AlgorithmTrainerController {
  constructor(options = {}) {
    this.storage = options.storage || null;
    this.stageFilter = options.stageFilter || 'all';

    const initialList = this._getFilteredAlgorithms();
    this.selectedAlgorithm = options.initialAlgorithmId
      ? getAlgorithmById(options.initialAlgorithmId)
      : initialList[0] || CFOP_ALGORITHMS[0];

    this.mode = options.mode || 'guided'; // 'guided' | 'recall'
    this.status = 'ready'; // 'ready' | 'practicing' | 'success' | 'diverged'
    this.executedMoves = [];
    this.divergenceInfo = null;
    this.startTime = null;
    this.elapsedMs = 0;

    this.listeners = new Set();
    this._syncStats();
  }

  _syncStats() {
    const data = getTrainingData(this.storage);
    const sec = data.trainerStats.algorithmTrainer || {};
    this.globalStats = {
      totalAttempts: sec.totalAttempts || 0,
      successfulAttempts: sec.successfulAttempts || 0,
      currentStreak: sec.currentStreak || 0,
      bestStreak: sec.bestStreak || 0
    };
    this.algStats = (sec.byAlgorithm && this.selectedAlgorithm)
      ? sec.byAlgorithm[this.selectedAlgorithm.id] || null
      : null;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  _getFilteredAlgorithms() {
    if (this.stageFilter === 'all') return CFOP_ALGORITHMS;
    return getAlgorithmsByStage(this.stageFilter);
  }

  getState() {
    const parsed = this.selectedAlgorithm ? parseAlgorithm(this.selectedAlgorithm.notation) : [];
    const expectedMoves = parsed.map(m => m.notation);

    return {
      stageFilter: this.stageFilter,
      selectedAlgorithm: this.selectedAlgorithm,
      expectedMoves,
      totalMoves: expectedMoves.length,
      currentStepIndex: this.executedMoves.length,
      executedMoves: [...this.executedMoves],
      status: this.status,
      divergenceInfo: this.divergenceInfo,
      elapsedMs: this.elapsedMs,
      mode: this.mode,
      globalStats: { ...this.globalStats },
      algStats: this.algStats ? { ...this.algStats } : null,
      filteredAlgorithms: this._getFilteredAlgorithms()
    };
  }

  setStageFilter(stage) {
    this.stageFilter = stage;
    const list = this._getFilteredAlgorithms();
    if (list.length > 0 && (!this.selectedAlgorithm || !list.some(a => a.id === this.selectedAlgorithm.id))) {
      this.selectAlgorithm(list[0].id);
    } else {
      this.notify();
    }
  }

  setMode(mode) {
    this.mode = mode;
    this.notify();
  }

  selectAlgorithm(id) {
    const alg = getAlgorithmById(id);
    if (!alg) return;
    this.selectedAlgorithm = alg;
    this.resetPractice();
  }

  resetPractice() {
    this.executedMoves = [];
    this.status = 'ready';
    this.divergenceInfo = null;
    this.startTime = null;
    this.elapsedMs = 0;
    this._syncStats();
    this.notify();
  }

  /**
   * Applies the algorithm's setup sequence to the simulator.
   * Marked with source: 'setup' so it is not treated as a user training move.
   * @param {import('../../simulator/SimulatorController.js').SimulatorController} simulatorController
   */
  async applySetupToSimulator(simulatorController) {
    if (!simulatorController || !this.selectedAlgorithm) return;
    this.resetPractice();

    try {
      simulatorController.reset();
      if (this.selectedAlgorithm.setup) {
        await simulatorController.applyAlgorithm(this.selectedAlgorithm.setup, { source: 'setup' });
      }
      this.status = 'practicing';
      this.startTime = Date.now();
      this.notify();
    } catch (err) {
      console.error('[AlgorithmTrainer] Failed to apply setup to simulator:', err);
    }
  }

  /**
   * Observe an authoritative user move on the simulator.
   * @param {string} moveNotation
   */
  observeMove(moveNotation) {
    if (!this.selectedAlgorithm || this.status === 'success' || this.status === 'diverged') return;

    if (!this.startTime) {
      this.startTime = Date.now();
      this.status = 'practicing';
    }

    this.executedMoves.push(moveNotation);
    this.elapsedMs = Date.now() - this.startTime;

    const result = detectSequenceDivergence(this.selectedAlgorithm.notation, this.executedMoves);

    if (result.isComplete && result.isCorrect) {
      this.status = 'success';
      this.divergenceInfo = {
        isCorrect: true,
        type: MISTAKE_TYPES.CORRECT,
        message: `✓ Flawless! Algorithm completed in ${(this.elapsedMs / 1000).toFixed(2)}s.`,
        tip: 'Case mastered! Try practicing at speed.'
      };

      recordAlgorithmAttempt({
        algorithmId: this.selectedAlgorithm.id,
        isCorrect: true,
        timeMs: this.elapsedMs,
        movesCompleted: this.executedMoves.length,
        totalMoves: this.selectedAlgorithm.moveCount
      }, this.storage);

      this._syncStats();
    } else if (!result.isCorrect) {
      this.status = 'diverged';
      this.divergenceInfo = {
        isCorrect: false,
        type: result.type,
        message: result.message,
        tip: result.tip,
        expectedMove: result.expectedMove,
        actualMove: result.actualMove,
        divergenceIndex: result.divergenceIndex
      };

      recordAlgorithmAttempt({
        algorithmId: this.selectedAlgorithm.id,
        isCorrect: false,
        mistakeType: result.type,
        timeMs: this.elapsedMs,
        movesCompleted: this.executedMoves.length,
        totalMoves: this.selectedAlgorithm.moveCount
      }, this.storage);

      this._syncStats();
    } else {
      // In-progress correct step
      this.status = 'practicing';
      this.divergenceInfo = {
        isCorrect: true,
        type: MISTAKE_TYPES.CORRECT,
        message: result.message,
        tip: result.tip
      };
    }

    this.notify();
  }

  skipAlgorithm() {
    if (!this.selectedAlgorithm) return;
    if (this.status !== 'success') {
      recordAlgorithmAttempt({
        algorithmId: this.selectedAlgorithm.id,
        isCorrect: false,
        mistakeType: MISTAKE_TYPES.SKIPPED,
        timeMs: this.elapsedMs || 0,
        movesCompleted: this.executedMoves.length,
        totalMoves: this.selectedAlgorithm.moveCount
      }, this.storage);
    }
    this.nextAlgorithm();
  }

  nextAlgorithm() {
    const list = this._getFilteredAlgorithms();
    if (list.length === 0) return;
    const currentIndex = list.findIndex(a => a.id === this.selectedAlgorithm?.id);
    const nextIndex = (currentIndex + 1) % list.length;
    this.selectAlgorithm(list[nextIndex].id);
  }

  prevAlgorithm() {
    const list = this._getFilteredAlgorithms();
    if (list.length === 0) return;
    const currentIndex = list.findIndex(a => a.id === this.selectedAlgorithm?.id);
    const prevIndex = (currentIndex - 1 + list.length) % list.length;
    this.selectAlgorithm(list[prevIndex].id);
  }
}
