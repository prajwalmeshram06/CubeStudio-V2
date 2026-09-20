import { describe, it, expect } from 'vitest';
import {
  BEGINNER_LESSONS,
  createLessonStartState,
  getBeginnerLessonById
} from '../../../src/features/training/curriculum.js';

const REQUIRED_FIELDS = [
  'id',
  'title',
  'order',
  'objective',
  'explanation',
  'setupAlgorithm',
  'instructions',
  'completion',
  'validationRules',
  'hints',
  'steps'
];

describe('Beginner curriculum data', () => {
  it('defines nine lessons in order 1–9', () => {
    expect(BEGINNER_LESSONS).toHaveLength(9);
    expect(BEGINNER_LESSONS.map((lesson) => lesson.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(BEGINNER_LESSONS.map((lesson) => lesson.title)).toEqual([
      'Cube Basics',
      'Cube Notation',
      'White Cross',
      'White Corners',
      'Second Layer',
      'Yellow Cross',
      'Yellow Face',
      'Last-Layer Corners',
      'Last-Layer Edges'
    ]);
  });

  it('has unique ids and required metadata', () => {
    const ids = BEGINNER_LESSONS.map((lesson) => lesson.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const lesson of BEGINNER_LESSONS) {
      for (const field of REQUIRED_FIELDS) {
        expect(lesson[field], `${lesson.id} missing ${field}`).toBeDefined();
      }
      expect(lesson.hints.length).toBeGreaterThanOrEqual(1);
      expect(lesson.steps.length).toBeGreaterThanOrEqual(1);
      expect(lesson.completion.kind).toBeTruthy();
      expect(getBeginnerLessonById(lesson.id)).toBe(lesson);
    }
  });

  it('uses deterministic starting states (no RNG)', () => {
    for (const lesson of BEGINNER_LESSONS) {
      const a = createLessonStartState(lesson);
      const b = createLessonStartState(lesson);
      expect(a.equals(b)).toBe(true);
      expect(a.serialize()).toHaveLength(54);
    }
  });
});
