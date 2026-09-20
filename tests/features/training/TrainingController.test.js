import { describe, it, expect } from 'vitest';
import { applyMove, applyAlgorithm } from '../../../src/cube/engine/applyMove.js';
import { TrainingController, LESSON_PHASES, FEEDBACK_TYPES } from '../../../src/features/training/TrainingController.js';
import { BEGINNER_LESSONS, createLessonStartState } from '../../../src/features/training/curriculum.js';

function unlockThrough(engine, lessonId) {
  for (const item of BEGINNER_LESSONS) {
    if (item.id === lessonId) break;
    engine.completedLessonIds.add(item.id);
  }
}

function enterPractice(engine, lessonId) {
  unlockThrough(engine, lessonId);
  engine.startLesson(lessonId);
  engine.continuePhase();
  engine.continuePhase();
  expect(engine.phase).toBe(LESSON_PHASES.PRACTICE);
}

describe('TrainingController lesson engine', () => {
  it('starts in NOT_STARTED with locked later lessons', () => {
    const engine = new TrainingController();
    expect(engine.phase).toBe(LESSON_PHASES.NOT_STARTED);
    const progress = engine.getCurriculumProgress();
    expect(progress[0].status).toBe('unlocked');
    expect(progress[1].status).toBe('locked');
    expect(progress[8].status).toBe('locked');
  });

  it('transitions INTRO → EXPLANATION → PRACTICE', () => {
    const engine = new TrainingController();
    engine.startLesson('cube-basics');
    expect(engine.phase).toBe(LESSON_PHASES.INTRO);
    engine.continuePhase();
    expect(engine.phase).toBe(LESSON_PHASES.EXPLANATION);
    engine.continuePhase();
    expect(engine.phase).toBe(LESSON_PHASES.PRACTICE);
  });

  it('rejects starting a locked lesson', () => {
    const engine = new TrainingController();
    expect(() => engine.startLesson('white-cross')).toThrow(/locked/);
  });

  it('reveals hints one level at a time', () => {
    const engine = new TrainingController();
    enterPractice(engine, 'cube-basics');
    expect(engine.getCurrentHint()).toBeNull();
    const first = engine.requestHint();
    const second = engine.requestHint();
    const third = engine.requestHint();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(third).toBeTruthy();
    expect(second).not.toBe(first);
    engine.requestHint();
    expect(engine.hintLevel).toBe(3);
    expect(engine.getCurrentHint()).toBe(third);
  });

  it('accepts the correct move and completes cube-basics after the inverse', () => {
    const engine = new TrainingController();
    enterPractice(engine, 'cube-basics');
    let state = engine.lessonStartState.clone();

    const afterR = applyMove(state, 'R');
    engine.observeState(state, afterR, 'R');
    expect(engine.feedback.type).toBe(FEEDBACK_TYPES.STEP_COMPLETE);
    expect(engine.phase).toBe(LESSON_PHASES.PRACTICE);

    const solved = applyMove(afterR, "R'");
    engine.observeState(afterR, solved, "R'");
    expect(engine.phase).toBe(LESSON_PHASES.COMPLETED);
    expect(engine.completedLessonIds.has('cube-basics')).toBe(true);
  });

  it('classifies an inverse as wrong direction and does not auto-correct the cube', () => {
    const engine = new TrainingController();
    enterPractice(engine, 'cube-basics');
    const start = engine.lessonStartState.clone();
    const afterPrime = applyMove(start, "R'");
    engine.observeState(start, afterPrime, "R'");

    expect(engine.feedback.type).toBe(FEEDBACK_TYPES.WRONG_DIRECTION);
    expect(engine.phase).toBe(LESSON_PHASES.PRACTICE);
    expect(engine.stepIndex).toBe(0);
    expect(engine._lastSeenState.equals(afterPrime)).toBe(true);
    expect(afterPrime.equals(start)).toBe(false);
  });

  it('classifies an unrelated move as incorrect', () => {
    const engine = new TrainingController();
    enterPractice(engine, 'cube-notation');
    const start = engine.lessonStartState.clone();
    const next = applyMove(start, 'D');
    engine.observeState(start, next, 'D');
    expect(engine.feedback.type).toBe(FEEDBACK_TYPES.INCORRECT);
    expect(engine.stepIndex).toBe(0);
  });

  it('resets the lesson to the deterministic starting state', () => {
    const engine = new TrainingController();
    enterPractice(engine, 'white-cross');
    const start = engine.lessonStartState.clone();
    const next = applyAlgorithm(start, 'U R');
    engine.observeState(start, next, 'R');
    expect(engine._lastSeenState.equals(start)).toBe(false);

    engine.resetLesson();
    expect(engine.stepIndex).toBe(0);
    expect(engine.phase).toBe(LESSON_PHASES.PRACTICE);
    expect(engine.lessonStartState.equals(createLessonStartState(BEGINNER_LESSONS[2]))).toBe(true);
  });

  it('completes white-cross from the demo algorithm and unlocks the next lesson', () => {
    const engine = new TrainingController();
    enterPractice(engine, 'white-cross');
    const start = engine.lessonStartState.clone();
    const done = applyAlgorithm(start, engine.lesson.demoAlgorithm);
    engine.observeState(start, done, 'F2');
    expect(engine.phase).toBe(LESSON_PHASES.COMPLETED);
    expect(engine.getCurriculumProgress()[3].status).toBe('unlocked');
  });
});
