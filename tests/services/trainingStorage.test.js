import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTrainingData,
  saveTrainingData,
  recordLessonProgress,
  recordTrainerAttempt,
  recordAlgorithmAttempt,
  getAggregatedTrainingStats,
  clearTrainingData,
  exportTrainingDataToJSON
} from '../../src/services/trainingStorage.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

describe('trainingStorage Service', () => {
  let mockStore;

  beforeEach(() => {
    mockStore = new MockStorage();
  });

  it('initializes with default structure on empty storage', () => {
    const data = getTrainingData(mockStore);
    expect(data.version).toBe(1);
    expect(data.lessonProgress).toEqual({});
    expect(data.trainerStats.moveTrainer.totalAttempts).toBe(0);
  });

  it('records and updates lesson progress', () => {
    recordLessonProgress('lesson-1', true, 95, mockStore);
    const data = getTrainingData(mockStore);
    expect(data.lessonProgress['lesson-1']).toBeDefined();
    expect(data.lessonProgress['lesson-1'].completed).toBe(true);
    expect(data.lessonProgress['lesson-1'].bestAccuracy).toBe(95);
  });

  it('tracks move trainer streaks and mistakes', () => {
    recordTrainerAttempt('moveTrainer', { expected: 'R', actual: 'R', isCorrect: true }, mockStore);
    recordTrainerAttempt('moveTrainer', { expected: 'U', actual: 'U', isCorrect: true }, mockStore);
    recordTrainerAttempt('moveTrainer', { expected: 'F', actual: "F'", isCorrect: false, mistakeType: 'wrong_direction' }, mockStore);

    const data = getTrainingData(mockStore);
    expect(data.trainerStats.moveTrainer.totalAttempts).toBe(3);
    expect(data.trainerStats.moveTrainer.successfulAttempts).toBe(2);
    expect(data.trainerStats.moveTrainer.bestStreak).toBe(2);
    expect(data.trainerStats.moveTrainer.currentStreak).toBe(0);
    expect(data.trainerStats.moveTrainer.mistakesByType.wrong_direction).toBe(1);
  });

  it('tracks per-algorithm statistics in algorithm trainer', () => {
    recordAlgorithmAttempt({
      algorithmId: 'oll-corner-sune',
      isCorrect: true,
      timeMs: 2500,
      movesCompleted: 7,
      totalMoves: 7
    }, mockStore);

    const stats = getAggregatedTrainingStats(mockStore);
    expect(stats.algorithmTrainer.totalAttempts).toBe(1);
    expect(stats.algorithmTrainer.byAlgorithm['oll-corner-sune'].completions).toBe(1);
    expect(stats.algorithmTrainer.byAlgorithm['oll-corner-sune'].bestTimeMs).toBe(2500);
  });

  it('exports and clears data properly', () => {
    recordLessonProgress('lesson-2', true, 100, mockStore);
    const json = exportTrainingDataToJSON(mockStore);
    expect(json).toContain('lesson-2');

    clearTrainingData(mockStore);
    const resetData = getTrainingData(mockStore);
    expect(Object.keys(resetData.lessonProgress).length).toBe(0);
  });
});
