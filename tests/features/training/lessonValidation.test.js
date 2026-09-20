import { describe, it, expect } from 'vitest';
import { CubeState } from '../../../src/cube/model/CubeState.js';
import { applyAlgorithm } from '../../../src/cube/engine/applyMove.js';
import {
  BEGINNER_LESSONS,
  createLessonStartState,
  getBeginnerLessonById
} from '../../../src/features/training/curriculum.js';
import {
  evaluateCondition,
  isLastLayerCornersComplete,
  isLastLayerEdgesComplete,
  isSecondLayerComplete,
  isWhiteCornersComplete,
  isWhiteCrossComplete,
  isYellowCrossComplete,
  isYellowFaceComplete
} from '../../../src/features/training/lessonValidation.js';

function lesson(id) {
  return getBeginnerLessonById(id);
}

describe('Deterministic lesson validation', () => {
  it('marks starting states incomplete and demo solutions complete', () => {
    const cases = [
      ['white-cross', isWhiteCrossComplete],
      ['white-corners', isWhiteCornersComplete],
      ['second-layer', isSecondLayerComplete],
      ['yellow-cross', isYellowCrossComplete],
      ['yellow-face', isYellowFaceComplete],
      ['last-layer-corners', isLastLayerCornersComplete],
      ['last-layer-edges', isLastLayerEdgesComplete]
    ];

    for (const [id, predicate] of cases) {
      const item = lesson(id);
      const start = createLessonStartState(item);
      expect(predicate(start), `${id} start should be incomplete`).toBe(false);
      expect(evaluateCondition(start, item.completion), `${id} start condition`).toBe(false);

      const solvedFromStart = applyAlgorithm(start, item.demoAlgorithm);
      expect(predicate(solvedFromStart), `${id} after demo`).toBe(true);
      expect(evaluateCondition(solvedFromStart, item.completion)).toBe(true);
    }
  });

  it('treats partial white-cross progress as incomplete', () => {
    const item = lesson('white-cross');
    const start = createLessonStartState(item);
    const partial = applyAlgorithm(start, 'F2');
    expect(isWhiteCrossComplete(partial)).toBe(false);
    expect(evaluateCondition(partial, { kind: 'edgesSolved', slots: ['UR', 'UF', 'UL', 'UB'], min: 1 })).toBe(true);
    expect(evaluateCondition(partial, item.completion)).toBe(false);
  });

  it('does not treat a solved cube as white-cross-only when checking an unsolved start', () => {
    const start = createLessonStartState(lesson('white-cross'));
    expect(start.isSolved()).toBe(false);
    expect(isWhiteCrossComplete(CubeState.createSolved())).toBe(true);
  });

  it('reset equivalent: re-creating the start state matches the original start', () => {
    for (const item of BEGINNER_LESSONS) {
      const first = createLessonStartState(item);
      const disturbed = applyAlgorithm(first, 'U');
      expect(disturbed.equals(first)).toBe(false);
      const reset = createLessonStartState(item);
      expect(reset.equals(first)).toBe(true);
    }
  });
});
