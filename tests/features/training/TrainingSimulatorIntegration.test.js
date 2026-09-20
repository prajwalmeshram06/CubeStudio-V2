import { describe, it, expect } from 'vitest';
import { SimulatorController } from '../../../src/features/simulator/SimulatorController.js';
import { CubeRenderer } from '../../../src/cube/rendering/CubeRenderer.js';
import { CubeState } from '../../../src/cube/model/CubeState.js';
import { applyMove } from '../../../src/cube/engine/applyMove.js';
import { TrainingController, LESSON_PHASES } from '../../../src/features/training/TrainingController.js';
import { createLessonStartState, getBeginnerLessonById } from '../../../src/features/training/curriculum.js';

function wait(ms = 20) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function enterPractice(engine, lessonId) {
  engine.startLesson(lessonId);
  engine.continuePhase();
  engine.continuePhase();
  await wait(30);
  if (engine.phase === LESSON_PHASES.DEMO) {
    await wait(40);
  }
  expect(engine.phase).toBe(LESSON_PHASES.PRACTICE);
}

describe('Training + Simulator integration', () => {
  it('executes learner moves through SimulatorController and evaluates that CubeState', async () => {
    const renderer = new CubeRenderer();
    const simulator = new SimulatorController({ renderer, animationSpeed: 0 });
    const engine = new TrainingController({ simulatorController: simulator });

    await enterPractice(engine, 'cube-basics');
    expect(simulator.cubeState.isSolved()).toBe(true);

    const before = simulator.cubeState.clone();
    await simulator.applyMove('R');
    await wait(20);

    expect(simulator.cubeState.equals(applyMove(before, 'R'))).toBe(true);
    expect(engine.phase).toBe(LESSON_PHASES.PRACTICE);
    expect(engine.stepIndex).toBe(1);
    expect(engine.feedback.type).toBe('step_complete');
  });

  it('keeps CubeState authoritative: training never replaces the simulator instance', async () => {
    const simulator = new SimulatorController({ animationSpeed: 0 });
    const engine = new TrainingController({ simulatorController: simulator });
    await enterPractice(engine, 'cube-basics');

    const instance = simulator;
    engine.resetLesson();
    expect(engine.simulatorController).toBe(instance);
    expect(simulator.cubeState.isSolved()).toBe(true);
  });

  it('resets a practical lesson back to the curriculum start via loadState', async () => {
    const simulator = new SimulatorController({ animationSpeed: 0 });
    const engine = new TrainingController({ simulatorController: simulator });
    engine.completedLessonIds.add('cube-basics');
    engine.completedLessonIds.add('cube-notation');

    await enterPractice(engine, 'white-cross');
    const start = createLessonStartState(getBeginnerLessonById('white-cross'));
    expect(simulator.cubeState.equals(start)).toBe(true);

    await simulator.applyMove('U');
    await wait(20);
    expect(simulator.cubeState.equals(start)).toBe(false);

    engine.resetLesson();
    expect(simulator.cubeState.equals(start)).toBe(true);
    expect(simulator.getState().moveCount).toBe(0);
  });

  it('does not break independent simulator usage after training detach', async () => {
    const simulator = new SimulatorController({ animationSpeed: 0 });
    const engine = new TrainingController({ simulatorController: simulator });
    await enterPractice(engine, 'cube-basics');
    engine.dispose();

    await simulator.applyMove('F');
    await wait(20);
    expect(simulator.cubeState.isSolved()).toBe(false);
    simulator.reset();
    expect(simulator.cubeState.equals(CubeState.createSolved())).toBe(true);
  });
});
