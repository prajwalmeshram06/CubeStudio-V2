/**
 * CubeStudio V2 - Training lesson engine
 *
 * Owns lesson progress, hints, and feedback. CubeState remains authoritative
 * on SimulatorController; this engine only evaluates that state.
 *
 * Phases: NOT_STARTED → INTRO → EXPLANATION → DEMO → PRACTICE → COMPLETED
 */

import { CubeState } from '../../cube/model/CubeState.js';
import {
  BEGINNER_LESSONS,
  LESSON_PHASES,
  createLessonStartState,
  getBeginnerLessonById,
  getBeginnerLessonByOrder
} from './curriculum.js';
import { evaluateCondition } from './lessonValidation.js';
import { classifyMoveFeedback, FEEDBACK_TYPES } from './feedback.js';
import { recordLessonProgress } from '../../services/trainingStorage.js';

export { LESSON_PHASES, FEEDBACK_TYPES };

export class TrainingController {
  /**
   * @param {object} [options]
   * @param {object[]} [options.lessons]
   * @param {import('../simulator/SimulatorController.js').SimulatorController|null} [options.simulatorController]
   */
  constructor(options = {}) {
    this.lessons = options.lessons || BEGINNER_LESSONS;
    this.simulatorController = options.simulatorController || null;

    this.phase = LESSON_PHASES.NOT_STARTED;
    this.lesson = null;
    this.stepIndex = 0;
    this.hintLevel = 0;
    this.feedback = null;
    this.completedLessonIds = new Set();
    this.lessonStartState = CubeState.createSolved();
    this.stepStartState = CubeState.createSolved();
    this._lastSeenState = CubeState.createSolved();
    this._suppressObservation = false;
    this._observingPractice = false;
    this._demoFinishing = false;
    this._unsubscribeSim = null;
    this._listeners = new Set();

    if (this.simulatorController) {
      this.setSimulatorController(this.simulatorController);
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    listener(this.getState());
    return () => this._listeners.delete(listener);
  }

  _notify() {
    const snapshot = this.getState();
    for (const listener of this._listeners) {
      listener(snapshot);
    }
  }

  setSimulatorController(simulatorController) {
    if (this._unsubscribeSim) {
      this._unsubscribeSim();
      this._unsubscribeSim = null;
    }
    this.simulatorController = simulatorController || null;
    if (!this.simulatorController) return;

    this._lastSeenState = this.simulatorController.cubeState.clone();
    this._unsubscribeSim = this.simulatorController.subscribe((uiState) => {
      this._handleSimulatorUpdate(uiState);
    });
  }

  _handleSimulatorUpdate(uiState) {
    if (!this.simulatorController) return;

    const current = this.simulatorController.cubeState;

    if (this.phase === LESSON_PHASES.DEMO) {
      this._lastSeenState = current.clone();
      if (this._demoFinishing && !uiState.isBusy) {
        this._demoFinishing = false;
        this._enterPractice(true);
      }
      return;
    }

    if (this._suppressObservation || !this._observingPractice || this.phase !== LESSON_PHASES.PRACTICE) {
      this._lastSeenState = current.clone();
      return;
    }

    if (current.equals(this._lastSeenState)) {
      return;
    }

    const prev = this._lastSeenState;
    this._lastSeenState = current.clone();
    this._evaluatePracticeMove(prev, current, uiState.lastMove);
  }

  getState() {
    const step = this.getCurrentStep();
    const cubeState = this.simulatorController
      ? this.simulatorController.cubeState
      : this._lastSeenState;

    return {
      phase: this.phase,
      lessonId: this.lesson?.id ?? null,
      lesson: this.lesson,
      stepIndex: this.stepIndex,
      step,
      hintLevel: this.hintLevel,
      hint: this.getCurrentHint(),
      feedback: this.feedback,
      isLessonComplete: this.phase === LESSON_PHASES.COMPLETED,
      completedLessonIds: [...this.completedLessonIds],
      curriculum: this.getCurriculumProgress(),
      cubeState,
      startState: this.lessonStartState,
      isDemoPlaying: this.phase === LESSON_PHASES.DEMO,
      isBusy: Boolean(this.simulatorController?.queue?.isBusy())
    };
  }

  getCurrentStep() {
    if (!this.lesson || !Array.isArray(this.lesson.steps)) return null;
    if (this.stepIndex < 0 || this.stepIndex >= this.lesson.steps.length) return null;
    return this.lesson.steps[this.stepIndex];
  }

  getCurriculumProgress() {
    return this.lessons.map((lesson, index) => {
      const completed = this.completedLessonIds.has(lesson.id);
      const previous = index === 0 ? null : this.lessons[index - 1];
      const unlocked = index === 0 || this.completedLessonIds.has(previous.id);
      return {
        id: lesson.id,
        title: lesson.title,
        order: lesson.order,
        objective: lesson.objective,
        completed,
        unlocked,
        status: completed ? 'completed' : unlocked ? 'unlocked' : 'locked'
      };
    });
  }

  isLessonUnlocked(lessonId) {
    const progress = this.getCurriculumProgress();
    return Boolean(progress.find((item) => item.id === lessonId)?.unlocked);
  }

  /**
   * Starts a lesson. Does not remount any renderer; loads state through the simulator.
   */
  startLesson(lessonId) {
    const lesson = getBeginnerLessonById(lessonId) || this.lessons.find((item) => item.id === lessonId);
    if (!lesson) {
      throw new Error(`Unknown lesson: ${lessonId}`);
    }
    if (!this.isLessonUnlocked(lesson.id) && !this.completedLessonIds.has(lesson.id)) {
      throw new Error(`Lesson is locked: ${lesson.id}`);
    }

    this.lesson = lesson;
    this.phase = LESSON_PHASES.INTRO;
    this.stepIndex = 0;
    this.hintLevel = 0;
    this.feedback = null;
    this.lessonStartState = createLessonStartState(lesson);
    this.stepStartState = this.lessonStartState.clone();
    this._observingPractice = false;
    this._syncSimulator(this.lessonStartState);
    this._notify();
  }

  continuePhase() {
    if (!this.lesson) return;

    switch (this.phase) {
      case LESSON_PHASES.INTRO:
        this.phase = LESSON_PHASES.EXPLANATION;
        this.feedback = null;
        break;
      case LESSON_PHASES.EXPLANATION:
        if (this.lesson.demoAlgorithm) {
          this.playDemo();
          return;
        }
        this._enterPractice(false);
        return;
      case LESSON_PHASES.DEMO:
        this._enterPractice(true);
        return;
      case LESSON_PHASES.PRACTICE:
        if (this._isLessonComplete(this._currentCube())) {
          this._completeLesson();
        }
        break;
      case LESSON_PHASES.COMPLETED:
        this._openNextLesson();
        return;
      default:
        break;
    }
    this._notify();
  }

  playDemo() {
    if (!this.lesson?.demoAlgorithm || !this.simulatorController) {
      this._enterPractice(false);
      return;
    }

    this._observingPractice = false;
    this.phase = LESSON_PHASES.DEMO;
    this.feedback = {
      type: 'demo',
      message: 'Watch the demonstration. The cube will return to the practice start when it finishes.'
    };
    this._demoFinishing = false;
    this._syncSimulator(this.lessonStartState);
    this._demoFinishing = true;
    this.simulatorController.applyAlgorithm(this.lesson.demoAlgorithm);
    this._notify();

    Promise.resolve().then(() => {
      if (this.phase !== LESSON_PHASES.DEMO || !this._demoFinishing) return;
      if (!this.simulatorController.queue?.isBusy()) {
        this._demoFinishing = false;
        this._enterPractice(true);
      }
    });
  }

  _enterPractice(reloadStart) {
    this._demoFinishing = false;
    this._observingPractice = false;
    this.phase = LESSON_PHASES.PRACTICE;
    this.hintLevel = 0;
    this.feedback = {
      type: 'practice',
      message: this.getCurrentStep()?.instruction || this.lesson.instructions
    };
    if (reloadStart) {
      this.stepIndex = 0;
      this.stepStartState = this.lessonStartState.clone();
      this._syncSimulator(this.lessonStartState);
    }
    this._refreshProgressFromState(this._currentCube(), { silent: true });
    this._observingPractice = true;
    this._notify();
  }

  /**
   * Headless practice evaluation for tests (no simulator required).
   * Applies the move to an explicit CubeState and records progress.
   */
  observeState(prevState, nextState, moveNotation = null) {
    this._lastSeenState = nextState.clone();
    if (this.phase !== LESSON_PHASES.PRACTICE) return this.getState();
    this._evaluatePracticeMove(prevState, nextState, moveNotation);
    return this.getState();
  }

  _evaluatePracticeMove(prevState, nextState, moveNotation) {
    const beforeIndex = this.stepIndex;
    const beforeStep = this.getCurrentStep();
    const lessonWasComplete = this._isLessonComplete(prevState);

    this._refreshProgressFromState(nextState, { silent: true });

    const lessonComplete = this._isLessonComplete(nextState);
    const stepComplete = this.lesson.progressMode === 'sequence'
      ? this.stepIndex > beforeIndex
      : Boolean(beforeStep && evaluateCondition(nextState, beforeStep.completion, this._conditionCtx()));

    this.feedback = classifyMoveFeedback({
      prevState,
      nextState,
      move: moveNotation,
      step: beforeStep,
      lesson: this.lesson,
      ctx: {
        lessonStart: this.lessonStartState,
        stepStart: this.stepStartState
      },
      lessonComplete: lessonComplete && !lessonWasComplete,
      stepComplete: stepComplete && !lessonComplete
    });

    if (lessonComplete) {
      this._completeLesson();
      return;
    }

    this._notify();
  }

  _refreshProgressFromState(state, { silent } = {}) {
    if (!this.lesson) return;

    if (this.lesson.progressMode === 'sequence') {
      while (this.stepIndex < this.lesson.steps.length) {
        const step = this.lesson.steps[this.stepIndex];
        if (!evaluateCondition(state, step.completion, this._conditionCtx())) break;
        this.stepIndex += 1;
        this.hintLevel = 0;
        this.stepStartState = state.clone();
      }
    } else {
      let index = 0;
      while (
        index < this.lesson.steps.length
        && evaluateCondition(state, this.lesson.steps[index].completion, this._conditionCtx())
      ) {
        index += 1;
      }
      if (index !== this.stepIndex) {
        this.hintLevel = 0;
      }
      this.stepIndex = Math.min(index, this.lesson.steps.length);
      if (this.stepIndex < this.lesson.steps.length) {
        this.stepStartState = this.stepStartState || state.clone();
      }
    }

    if (!silent && this._isLessonComplete(state)) {
      this._completeLesson();
    }
  }

  _isLessonComplete(state) {
    if (!this.lesson) return false;
    if (this.lesson.progressMode === 'sequence') {
      return this.stepIndex >= this.lesson.steps.length;
    }
    return evaluateCondition(state, this.lesson.completion, this._conditionCtx());
  }

  _completeLesson() {
    this.phase = LESSON_PHASES.COMPLETED;
    this.completedLessonIds.add(this.lesson.id);
    try {
      recordLessonProgress(this.lesson.id, true, 100);
    } catch (e) {
      // Ignore storage failure in headless mode
    }
    this.feedback = {
      type: FEEDBACK_TYPES.LESSON_COMPLETE,
      message: `✓ Lesson complete — ${this.lesson.title} is finished.`
    };
    this._notify();
  }

  _openNextLesson() {
    const next = getBeginnerLessonByOrder(this.lesson.order + 1);
    if (next) {
      this.startLesson(next.id);
    }
  }

  requestHint() {
    const step = this.getCurrentStep();
    const pool = (step?.hints && step.hints.length > 0)
      ? step.hints
      : (this.lesson?.hints || []);
    if (pool.length === 0) return null;
    this.hintLevel = Math.min(this.hintLevel + 1, pool.length);
    this._notify();
    return this.getCurrentHint();
  }

  getCurrentHint() {
    const step = this.getCurrentStep();
    const pool = (step?.hints && step.hints.length > 0)
      ? step.hints
      : (this.lesson?.hints || []);
    if (this.hintLevel <= 0) return null;
    return pool[Math.min(this.hintLevel, pool.length) - 1] || null;
  }

  resetStep() {
    if (!this.lesson || this.phase === LESSON_PHASES.NOT_STARTED) return;
    this.phase = LESSON_PHASES.PRACTICE;
    this.hintLevel = 0;
    this.feedback = { type: 'reset', message: 'Step reset to the start of the current instruction.' };
    this._observingPractice = false;
    this._syncSimulator(this.stepStartState);
    this._observingPractice = true;
    this._notify();
  }

  resetLesson() {
    if (!this.lesson) return;
    this.phase = LESSON_PHASES.PRACTICE;
    this.stepIndex = 0;
    this.hintLevel = 0;
    this.feedback = { type: 'reset', message: 'Lesson reset to the deterministic starting state.' };
    this.stepStartState = this.lessonStartState.clone();
    this._observingPractice = false;
    this._syncSimulator(this.lessonStartState);
    this._observingPractice = true;
    this._notify();
  }

  previousPhase() {
    if (!this.lesson) return;
    if (this.phase === LESSON_PHASES.EXPLANATION) {
      this.phase = LESSON_PHASES.INTRO;
    } else if (this.phase === LESSON_PHASES.PRACTICE || this.phase === LESSON_PHASES.DEMO) {
      this.phase = LESSON_PHASES.EXPLANATION;
      this._syncSimulator(this.lessonStartState);
    } else if (this.phase === LESSON_PHASES.COMPLETED) {
      this.phase = LESSON_PHASES.PRACTICE;
    }
    this._notify();
  }

  returnToCurriculum() {
    this.phase = LESSON_PHASES.NOT_STARTED;
    this.lesson = null;
    this.stepIndex = 0;
    this.hintLevel = 0;
    this.feedback = null;
    this._notify();
  }

  _conditionCtx() {
    return {
      lessonStart: this.lessonStartState,
      stepStart: this.stepStartState
    };
  }

  _currentCube() {
    return this.simulatorController
      ? this.simulatorController.cubeState
      : this._lastSeenState;
  }

  _syncSimulator(state) {
    this._suppressObservation = true;
    this._lastSeenState = state.clone();
    if (this.simulatorController) {
      this.simulatorController.loadState(state);
    }
    this._suppressObservation = false;
  }

  dispose() {
    if (this._unsubscribeSim) {
      this._unsubscribeSim();
      this._unsubscribeSim = null;
    }
    this._listeners.clear();
  }
}
