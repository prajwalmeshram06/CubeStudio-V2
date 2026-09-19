import { describe, it, expect, vi } from 'vitest';
import { SolutionPlayerController } from '../../src/features/solver/SolutionPlayerController.js';
import { SimulatorController } from '../../src/features/simulator/SimulatorController.js';
import { CubeRenderer } from '../../src/cube/rendering/CubeRenderer.js';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { applyAlgorithm } from '../../src/cube/engine/applyMove.js';
import { parseAlgorithm } from '../../src/cube/model/notation.js';

describe('Solution Player & Simulator Integration', () => {
  it('steps forward through a solution updating SimulatorController to solved state', async () => {
    // 1. Setup a scrambled state using Sexy Move: "R U R' U'"
    const scramble = "R U R' U'";
    const scrambledState = applyAlgorithm(CubeState.createSolved(), scramble);

    // 2. The solution is the exact inverse: "U R U' R'"
    const solutionMoves = parseAlgorithm("U R U' R'");

    // 3. Setup SimulatorController with instant speed for deterministic testing
    const renderer = new CubeRenderer();
    const simController = new SimulatorController({ renderer, animationSpeed: 0 });
    simController.cubeState = scrambledState.clone();
    simController.history.clear(simController.cubeState);
    renderer.syncWithState(simController.cubeState);

    expect(simController.cubeState.isSolved()).toBe(false);

    // 4. Setup SolutionPlayerController linked to SimulatorController
    const player = new SolutionPlayerController({
      initialCubeState: scrambledState,
      moves: solutionMoves,
      simulatorController: simController,
    });

    // 5. Execute all 4 solution moves
    while (player.currentIndex < player.moves.length) {
      player.stepForward();
      // Allow simulator's animation queue microtask to process
      await new Promise((r) => setTimeout(r, 10));
    }

    // 6. Verify BOTH SolutionPlayer and SimulatorController are solved!
    expect(player.currentCubeState.isSolved()).toBe(true);
    expect(player.status).toBe('completed');
    expect(simController.cubeState.isSolved()).toBe(true);
    expect(simController.history.moveCount).toBe(4);
  });

  it('steps backward rewinding both player and simulator state', async () => {
    const scramble = "R U R' U'";
    const scrambledState = applyAlgorithm(CubeState.createSolved(), scramble);
    const solutionMoves = parseAlgorithm("U R U' R'");

    const renderer = new CubeRenderer();
    const simController = new SimulatorController({ renderer, animationSpeed: 0 });
    simController.cubeState = scrambledState.clone();
    renderer.syncWithState(simController.cubeState);

    const player = new SolutionPlayerController({
      initialCubeState: scrambledState,
      moves: solutionMoves,
      simulatorController: simController,
    });

    // Step 2 moves forward
    player.stepForward();
    await new Promise((r) => setTimeout(r, 10));
    player.stepForward();
    await new Promise((r) => setTimeout(r, 10));
    expect(player.currentIndex).toBe(2);

    // Step 1 move backward
    player.stepBackward();
    await new Promise((r) => setTimeout(r, 10));
    expect(player.currentIndex).toBe(1);

    // Step 1 more move backward to initial
    player.stepBackward();
    await new Promise((r) => setTimeout(r, 10));
    expect(player.currentIndex).toBe(0);

    // Both player and simulator should be back at the exact scrambled state
    expect(player.currentCubeState.equals(scrambledState)).toBe(true);
    expect(simController.cubeState.equals(scrambledState)).toBe(true);
  });

  it('restart restores both player and simulator to initial scrambled state', async () => {
    const scramble = 'F R U';
    const scrambledState = applyAlgorithm(CubeState.createSolved(), scramble);
    const solutionMoves = parseAlgorithm("U' R' F'");

    const renderer = new CubeRenderer();
    const simController = new SimulatorController({ renderer, animationSpeed: 0 });
    simController.cubeState = scrambledState.clone();
    renderer.syncWithState(simController.cubeState);

    const player = new SolutionPlayerController({
      initialCubeState: scrambledState,
      moves: solutionMoves,
      simulatorController: simController,
    });

    // Step 2 moves
    player.stepForward();
    await new Promise((r) => setTimeout(r, 10));
    player.stepForward();
    await new Promise((r) => setTimeout(r, 10));

    expect(player.currentCubeState.equals(scrambledState)).toBe(false);

    // Restart
    player.restart();
    await new Promise((r) => setTimeout(r, 10));

    expect(player.currentIndex).toBe(0);
    expect(player.status).toBe('idle');
    expect(player.currentCubeState.equals(scrambledState)).toBe(true);
    expect(simController.cubeState.equals(scrambledState)).toBe(true);
  });
});
