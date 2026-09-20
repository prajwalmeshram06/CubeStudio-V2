/**
 * trainingStorage.js — Training Persistence, Statistics Aggregation, and Export.
 *
 * Persists learner progress, trainer metrics, streaks, mistakes, and algorithm mastery
 * under the key `cubestudio_training_v1` in localStorage.
 */

const STORAGE_KEY = 'cubestudio_training_v1';

/**
 * Default empty training store state.
 */
export function createDefaultTrainingData() {
  return {
    version: 1,
    lessonProgress: {},
    trainerStats: {
      moveTrainer: {
        totalAttempts: 0,
        successfulAttempts: 0,
        currentStreak: 0,
        bestStreak: 0,
        mistakesByType: {},
        history: []
      },
      notationTrainer: {
        totalAttempts: 0,
        successfulAttempts: 0,
        currentStreak: 0,
        bestStreak: 0,
        mistakesByType: {},
        history: []
      },
      algorithmTrainer: {
        totalAttempts: 0,
        successfulAttempts: 0,
        currentStreak: 0,
        bestStreak: 0,
        byAlgorithm: {},
        mistakesByType: {},
        history: []
      }
    }
  };
}

/**
 * Resolves the storage object, falling back to window.localStorage if available.
 * @param {Storage|null|undefined} storage
 * @returns {Storage|null}
 */
function getStorage(storage) {
  if (storage !== undefined && storage !== null) {
    return storage;
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

/**
 * Loads training data safely from persistent storage.
 * @param {Storage} [storage]
 * @returns {ReturnType<typeof createDefaultTrainingData>}
 */
export function getTrainingData(storage) {
  const store = getStorage(storage);
  const defaults = createDefaultTrainingData();
  if (!store) return defaults;

  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return defaults;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaults;

    return {
      version: 1,
      lessonProgress: parsed.lessonProgress || {},
      trainerStats: {
        moveTrainer: {
          ...defaults.trainerStats.moveTrainer,
          ...(parsed.trainerStats?.moveTrainer || {})
        },
        notationTrainer: {
          ...defaults.trainerStats.notationTrainer,
          ...(parsed.trainerStats?.notationTrainer || {})
        },
        algorithmTrainer: {
          ...defaults.trainerStats.algorithmTrainer,
          ...(parsed.trainerStats?.algorithmTrainer || {})
        }
      }
    };
  } catch (err) {
    console.warn('[TrainingStorage] Failed to read training data:', err);
    return defaults;
  }
}

/**
 * Saves training data to storage.
 * @param {object} data
 * @param {Storage} [storage]
 * @returns {object}
 */
export function saveTrainingData(data, storage) {
  const store = getStorage(storage);
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.error('[TrainingStorage] Failed to save training data:', err);
    }
  }
  return data;
}

/**
 * Records lesson completion and progress.
 * @param {string} lessonId
 * @param {boolean} isCompleted
 * @param {number} [accuracy=100]
 * @param {Storage} [storage]
 */
export function recordLessonProgress(lessonId, isCompleted, accuracy = 100, storage) {
  const data = getTrainingData(storage);
  const current = data.lessonProgress[lessonId] || {
    completed: false,
    completedAt: null,
    attempts: 0,
    bestAccuracy: 0
  };

  data.lessonProgress[lessonId] = {
    completed: current.completed || isCompleted,
    completedAt: isCompleted ? (current.completedAt || new Date().toISOString()) : current.completedAt,
    attempts: current.attempts + 1,
    bestAccuracy: Math.max(current.bestAccuracy, accuracy)
  };

  return saveTrainingData(data, storage);
}

/**
 * Records an attempt for Move or Notation Trainer.
 * @param {'moveTrainer'|'notationTrainer'} trainerKey
 * @param {{
 *   expected: string,
 *   actual?: string,
 *   isCorrect: boolean,
 *   mistakeType?: string,
 *   timeMs?: number
 * }} attempt
 * @param {Storage} [storage]
 */
export function recordTrainerAttempt(trainerKey, attempt, storage) {
  const data = getTrainingData(storage);
  const section = data.trainerStats[trainerKey] || data.trainerStats.moveTrainer;

  section.totalAttempts += 1;
  if (attempt.isCorrect) {
    section.successfulAttempts += 1;
    section.currentStreak += 1;
    if (section.currentStreak > section.bestStreak) {
      section.bestStreak = section.currentStreak;
    }
  } else {
    section.currentStreak = 0;
    const type = attempt.mistakeType || 'unknown';
    section.mistakesByType[type] = (section.mistakesByType[type] || 0) + 1;
  }

  const record = {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    expected: attempt.expected,
    actual: attempt.actual || null,
    isCorrect: attempt.isCorrect,
    mistakeType: attempt.isCorrect ? null : (attempt.mistakeType || 'unknown'),
    timeMs: attempt.timeMs || 0
  };

  section.history = [record, ...(section.history || [])].slice(0, 100);
  return saveTrainingData(data, storage);
}

/**
 * Records an attempt for Algorithm Trainer (including CFOP cases).
 * @param {{
 *   algorithmId: string,
 *   isCorrect: boolean,
 *   mistakeType?: string,
 *   timeMs?: number,
 *   movesCompleted?: number,
 *   totalMoves?: number
 * }} attempt
 * @param {Storage} [storage]
 */
export function recordAlgorithmAttempt(attempt, storage) {
  const data = getTrainingData(storage);
  const section = data.trainerStats.algorithmTrainer;

  section.totalAttempts += 1;
  if (attempt.isCorrect) {
    section.successfulAttempts += 1;
    section.currentStreak += 1;
    if (section.currentStreak > section.bestStreak) {
      section.bestStreak = section.currentStreak;
    }
  } else {
    section.currentStreak = 0;
    const type = attempt.mistakeType || 'unknown';
    section.mistakesByType[type] = (section.mistakesByType[type] || 0) + 1;
  }

  // Per-algorithm tracking
  const algId = attempt.algorithmId;
  if (algId) {
    section.byAlgorithm = section.byAlgorithm || {};
    const algStats = section.byAlgorithm[algId] || {
      attempts: 0,
      completions: 0,
      bestTimeMs: null,
      lastPracticed: null,
      mistakeCount: 0
    };

    algStats.attempts += 1;
    algStats.lastPracticed = new Date().toISOString();

    if (attempt.isCorrect) {
      algStats.completions += 1;
      if (attempt.timeMs && (!algStats.bestTimeMs || attempt.timeMs < algStats.bestTimeMs)) {
        algStats.bestTimeMs = attempt.timeMs;
      }
    } else {
      algStats.mistakeCount += 1;
    }

    section.byAlgorithm[algId] = algStats;
  }

  const record = {
    id: `alg_att_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString(),
    algorithmId: attempt.algorithmId,
    isCorrect: attempt.isCorrect,
    mistakeType: attempt.isCorrect ? null : (attempt.mistakeType || 'unknown'),
    timeMs: attempt.timeMs || 0,
    movesCompleted: attempt.movesCompleted || 0,
    totalMoves: attempt.totalMoves || 0
  };

  section.history = [record, ...(section.history || [])].slice(0, 100);
  return saveTrainingData(data, storage);
}

/**
 * Calculates aggregated overall statistics for the training dashboard.
 * @param {Storage} [storage]
 */
export function getAggregatedTrainingStats(storage) {
  const data = getTrainingData(storage);

  // Lesson stats
  const lessonIds = Object.keys(data.lessonProgress);
  const lessonsCompleted = lessonIds.filter(id => data.lessonProgress[id].completed).length;

  // Global trainer attempts & accuracy
  let totalAttempts = 0;
  let totalSuccesses = 0;
  const combinedMistakes = {};

  ['moveTrainer', 'notationTrainer', 'algorithmTrainer'].forEach(key => {
    const sec = data.trainerStats[key] || {};
    totalAttempts += sec.totalAttempts || 0;
    totalSuccesses += sec.successfulAttempts || 0;
    Object.entries(sec.mistakesByType || {}).forEach(([mType, count]) => {
      combinedMistakes[mType] = (combinedMistakes[mType] || 0) + count;
    });
  });

  const accuracy = totalAttempts > 0 ? Math.round((totalSuccesses / totalAttempts) * 100) : 100;

  // Best streak across all trainers
  const bestStreak = Math.max(
    data.trainerStats.moveTrainer.bestStreak || 0,
    data.trainerStats.notationTrainer.bestStreak || 0,
    data.trainerStats.algorithmTrainer.bestStreak || 0
  );

  const currentStreak =
    data.trainerStats.moveTrainer.currentStreak +
    data.trainerStats.notationTrainer.currentStreak +
    data.trainerStats.algorithmTrainer.currentStreak;

  return {
    lessonsCompleted,
    totalAttempts,
    totalSuccesses,
    accuracy,
    currentStreak,
    bestStreak,
    combinedMistakes,
    moveTrainer: data.trainerStats.moveTrainer,
    notationTrainer: data.trainerStats.notationTrainer,
    algorithmTrainer: data.trainerStats.algorithmTrainer,
    lessonProgress: data.lessonProgress
  };
}

/**
 * Clears all training data.
 * @param {Storage} [storage]
 */
export function clearTrainingData(storage) {
  const store = getStorage(storage);
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch (err) {
      console.error('[TrainingStorage] Failed to clear training data:', err);
    }
  }
}

/**
 * Exports training data to formatted JSON string.
 * @param {Storage} [storage]
 * @returns {string}
 */
export function exportTrainingDataToJSON(storage) {
  const data = getTrainingData(storage);
  return JSON.stringify(data, null, 2);
}

/**
 * Triggers file download of training data.
 * @param {Storage} [storage]
 */
export function downloadTrainingDataExport(storage) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const content = exportTrainingDataToJSON(storage);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cubestudio-training-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
