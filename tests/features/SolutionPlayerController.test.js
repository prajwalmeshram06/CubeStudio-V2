import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SolutionPlayerController } from '../../src/features/solver/SolutionPlayerController.js';
import { CubeState } from '../../src/cube/model/CubeState.js';
import { applyAlgorithm } from '../../src/cube/engine/applyMove.js';
import { parseAlgorithm } from '../../src/cube/model/notation.js';

describe('SolutionPlayerController', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─────────────────────────────────────────────────────────────
  // 1. Initialization
  // ─────────────────────────────────────────────────────────────
  describe('Initialization', () => {
    it('initializes correctly with a normal solution sequence', () => {
      const state = CubeState.createSolved();
      const moves = ['R', 'U', "R'", "U'"];
      const player = new SolutionPlayerController({ initialCubeState: state, moves });

      const s = player.getState();
      expect(s.currentIndex).toBe(0);
      expect(s.status).toBe('idle');
      expect(s.isPlaying).toBe(false);
      expect(s.isCompleted).toBe(false);
      expect(s.canStepForward).toBe(true);
      expect(s.canStepBackward).toBe(false);
      expect(s.moves).toHaveLength(4);
      expect(s.progress).toEqual({
        current: 0,
        total: 4,
        percent: 0,
        remaining: 4,
      });
    });

    it('initializes correctly with an empty solution', () => {
      const state = CubeState.createSolved();
      const player = new SolutionPlayerController({ initialCubeState: state, moves: [] });

      const s = player.getState();
      expect(s.currentIndex).toBe(0);
      expect(s.status).toBe('completed');
      expect(s.isCompleted).toBe(true);
      expect(s.canStepForward).toBe(false);
      expect(s.canStepBackward).toBe(false);
      expect(s.progress.percent).toBe(100);
      expect(s.nextHint.hasHint).toBe(false);
    });

    it('initializes with default solved cube if initialCubeState is omitted', () => {
      const player = new SolutionPlayerController({ moves: ['R'] });
      expect(player.initialCubeState.isSolved()).toBe(true);
      expect(player.currentCubeState.isSolved()).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Step Forward
  // ─────────────────────────────────────────────────────────────
  describe('stepForward()', () => {
    it('applies the first move and advances currentIndex to 1', () => {
      const initial = CubeState.createSolved();
      const moves = ['R', 'U'];
      const player = new SolutionPlayerController({ initialCubeState: initial, moves });

      const executed = player.stepForward();
      expect(executed.notation).toBe('R');

      const s = player.getState();
      expect(s.currentIndex).toBe(1);
      expect(s.canStepBackward).toBe(true);
      expect(s.canStepForward).toBe(true);
      expect(s.isCompleted).toBe(false);
      // Cube state should have changed from solved
      expect(s.currentCubeState.isSolved()).toBe(false);
    });

    it('executes multiple moves in sequence to completion', () => {
      const initial = CubeState.createSolved();
      const moves = ['R', 'U', "R'", "U'"];
      const player = new SolutionPlayerController({ initialCubeState: initial, moves });

      player.stepForward();
      player.stepForward();
      player.stepForward();
      const finalMove = player.stepForward();

      expect(finalMove.notation).toBe("U'");
      const s = player.getState();
      expect(s.currentIndex).toBe(4);
      expect(s.status).toBe('completed');
      expect(s.isCompleted).toBe(true);
      expect(s.canStepForward).toBe(false);
      expect(s.canStepBackward).toBe(true);
      expect(s.progress.percent).toBe(100);
    });

    it('returns null and does not increment beyond the final move', () => {
      const initial = CubeState.createSolved();
      const moves = ['R'];
      const player = new SolutionPlayerController({ initialCubeState: initial, moves });

      player.stepForward(); // index 1 (end)
      const overflow = player.stepForward();

      expect(overflow).toBeNull();
      expect(player.currentIndex).toBe(1);
      expect(player.status).toBe('completed');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Step Backward
  // ─────────────────────────────────────────────────────────────
  describe('stepBackward()', () => {
    it('returns null when already at index 0', () => {
      const initial = CubeState.createSolved();
      const player = new SolutionPlayerController({ initialCubeState: initial, moves: ['R', 'U'] });

      const undo = player.stepBackward();
      expect(undo).toBeNull();
      expect(player.currentIndex).toBe(0);
    });

    it('undoes the previous move by applying its exact inverse', () => {
      const initial = CubeState.createSolved();
      const moves = ['R', 'U'];
      const player = new SolutionPlayerController({ initialCubeState: initial, moves });

      player.stepForward(); // Applied R
      expect(player.currentCubeState.equals(initial)).toBe(false);

      const inverse = player.stepBackward();
      expect(inverse.notation).toBe("R'");
      expect(player.currentIndex).toBe(0);
      expect(player.currentCubeState.equals(initial)).toBe(true);
    });

    it('undoes multiple moves sequentially back to the initial state', () => {
      const initial = CubeState.createSolved();
      const moves = ['R', 'U', 'F2'];
      const player = new SolutionPlayerController({ initialCubeState: initial, moves });

      player.stepForward(); // R
      player.stepForward(); // U
      player.stepForward(); // F2

      expect(player.currentIndex).toBe(3);

      const inv1 = player.stepBackward(); // undo F2 -> F2
      expect(inv1.notation).toBe('F2');
      expect(player.currentIndex).toBe(2);

      const inv2 = player.stepBackward(); // undo U -> U'
      expect(inv2.notation).toBe("U'");
      expect(player.currentIndex).toBe(1);

      const inv3 = player.stepBackward(); // undo R -> R'
      expect(inv3.notation).toBe("R'");
      expect(player.currentIndex).toBe(0);

      expect(player.currentCubeState.equals(initial)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Restart
  // ─────────────────────────────────────────────────────────────
  describe('restart()', () => {
    it('restores initialCubeState, resets index to 0 and status to idle', () => {
      const initial = CubeState.createSolved();
      const moves = ['R', 'U', "R'"];
      const player = new SolutionPlayerController({ initialCubeState: initial, moves });

      player.stepForward();
      player.stepForward();
      expect(player.currentIndex).toBe(2);

      const restored = player.restart();
      expect(player.currentIndex).toBe(0);
      expect(player.status).toBe('idle');
      expect(player.currentCubeState.equals(initial)).toBe(true);
      expect(restored.equals(initial)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Progress Tracking
  // ─────────────────────────────────────────────────────────────
  describe('Progress Tracking', () => {
    it('reports accurate progress and percentage across all steps', () => {
      const initial = CubeState.createSolved();
      const moves = ['R', 'U', 'F', 'D'];
      const player = new SolutionPlayerController({ initialCubeState: initial, moves });

      expect(player.getProgress()).toEqual({ current: 0, total: 4, percent: 0, remaining: 4 });

      player.stepForward();
      expect(player.getProgress()).toEqual({ current: 1, total: 4, percent: 25, remaining: 3 });

      player.stepForward();
      expect(player.getProgress()).toEqual({ current: 2, total: 4, percent: 50, remaining: 2 });

      player.stepForward();
      expect(player.getProgress()).toEqual({ current: 3, total: 4, percent: 75, remaining: 1 });

      player.stepForward();
      expect(player.getProgress()).toEqual({ current: 4, total: 4, percent: 100, remaining: 0 });
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 6. Hint System
  // ─────────────────────────────────────────────────────────────
  describe('Hint System', () => {
    it('returns clockwise hint for single-turn move', () => {
      const player = new SolutionPlayerController({ moves: ['R'] });
      const hint = player.getNextHint();

      expect(hint.hasHint).toBe(true);
      expect(hint.notation).toBe('R');
      expect(hint.face).toBe('R');
      expect(hint.description).toBe('Turn Right face clockwise (R)');
    });

    it('returns counter-clockwise hint for prime move', () => {
      const player = new SolutionPlayerController({ moves: ["U'"] });
      const hint = player.getNextHint();

      expect(hint.hasHint).toBe(true);
      expect(hint.notation).toBe("U'");
      expect(hint.description).toBe('Turn Up face counter-clockwise (U\')');
    });

    it('returns 180 degrees hint for double move', () => {
      const player = new SolutionPlayerController({ moves: ['F2'] });
      const hint = player.getNextHint();

      expect(hint.hasHint).toBe(true);
      expect(hint.notation).toBe('F2');
      expect(hint.description).toBe('Turn Front face 180 degrees (F2)');
    });

    it('updates hint dynamically after advancing and after stepping backward', () => {
      const player = new SolutionPlayerController({ moves: ['R', "U'", 'D2'] });

      expect(player.getNextHint().notation).toBe('R');

      player.stepForward();
      expect(player.getNextHint().notation).toBe("U'");

      player.stepForward();
      expect(player.getNextHint().notation).toBe('D2');

      player.stepBackward();
      expect(player.getNextHint().notation).toBe("U'");
    });

    it('returns complete message when solution finishes', () => {
      const player = new SolutionPlayerController({ moves: ['R'] });
      player.stepForward();

      const hint = player.getNextHint();
      expect(hint.hasHint).toBe(false);
      expect(hint.message).toContain('Solution complete');
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 7. Autoplay (Play / Pause)
  // ─────────────────────────────────────────────────────────────
  describe('Autoplay (Play / Pause)', () => {
    it('advances sequentially when playing and stops when completed', () => {
      const stepSpy = vi.fn();
      const player = new SolutionPlayerController({
        moves: ['R', 'U', "R'"],
        playbackSpeed: 100,
        onStep: stepSpy,
      });

      player.play();
      expect(player.status).toBe('playing');
      expect(player.getState().isPlaying).toBe(true);

      // Tick 0 executes first step immediately
      vi.advanceTimersByTime(0);
      expect(player.currentIndex).toBe(1);
      expect(stepSpy).toHaveBeenCalledTimes(1);

      // Fast-forward 100ms for step 2
      vi.advanceTimersByTime(100);
      expect(player.currentIndex).toBe(2);
      expect(stepSpy).toHaveBeenCalledTimes(2);

      // Fast-forward 100ms for step 3 (completion)
      vi.advanceTimersByTime(100);
      expect(player.currentIndex).toBe(3);
      expect(stepSpy).toHaveBeenCalledTimes(3);
      expect(player.status).toBe('completed');
      expect(player.getState().isPlaying).toBe(false);
    });

    it('pauses cleanly without additional steps', () => {
      const player = new SolutionPlayerController({
        moves: ['R', 'U', "R'", "U'"],
        playbackSpeed: 100,
      });

      player.play();
      vi.advanceTimersByTime(0); // 1 step executed
      expect(player.currentIndex).toBe(1);

      player.pause();
      expect(player.status).toBe('paused');

      vi.advanceTimersByTime(300); // time passes while paused
      expect(player.currentIndex).toBe(1); // no extra steps
    });

    it('ignores redundant play calls while already playing', () => {
      const player = new SolutionPlayerController({ moves: ['R', 'U'], playbackSpeed: 100 });
      player.play();
      const timerRef = player._timer;

      player.play(); // redundant call
      expect(player._timer).toBe(timerRef);
    });

    it('busy simulator does not advance the solution until free', () => {
      let isBusy = true;
      const mockSimController = {
        queue: { isBusy: () => isBusy },
        applyMove: vi.fn(),
      };
      const player = new SolutionPlayerController({
        moves: ['R', 'U'],
        playbackSpeed: 100,
        simulatorController: mockSimController,
      });

      player.play();
      vi.advanceTimersByTime(50); // multiple 16ms busy retry ticks pass
      expect(player.currentIndex).toBe(0); // blocked by simulator busy
      expect(player.status).toBe('playing');

      // Simulator becomes free
      isBusy = false;
      vi.advanceTimersByTime(20); // next 16ms tick executes
      expect(player.currentIndex).toBe(1);
    });

    it('changing speed while playing reschedules with new speed', () => {
      const player = new SolutionPlayerController({
        moves: ['R', 'U', "R'"],
        playbackSpeed: 200,
      });

      player.play();
      vi.advanceTimersByTime(0); // step 1 executed
      expect(player.currentIndex).toBe(1);

      // Change speed to 50ms while playing
      player.setPlaybackSpeed(50);
      expect(player.playbackSpeed).toBe(50);
      expect(player.status).toBe('playing');

      // 50ms later step 2 executes
      vi.advanceTimersByTime(50);
      expect(player.currentIndex).toBe(2);
    });

    it('restart cancels active playback', () => {
      const player = new SolutionPlayerController({ moves: ['R', 'U'], playbackSpeed: 100 });
      player.play();
      player.restart();

      expect(player.status).toBe('idle');
      expect(player._timer).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 8. Invariant: Valid Solution to Solved Cube & Reverse
  // ─────────────────────────────────────────────────────────────
  describe('Mathematical Invariant', () => {
    it('executes a scramble and its exact solution to reach solved state, then unwinds to scramble state', () => {
      // Create a scrambled state with "R U R' U'"
      const scramble = "R U R' U'";
      const scrambledState = applyAlgorithm(CubeState.createSolved(), scramble);

      // Solution is the inverse of the scramble: "U R U' R'"
      const solutionMoves = parseAlgorithm("U R U' R'");

      const player = new SolutionPlayerController({
        initialCubeState: scrambledState,
        moves: solutionMoves,
      });

      // 1. Execute all solution moves
      while (player.currentIndex < player.moves.length) {
        player.stepForward();
      }

      // Assert cube is now solved!
      expect(player.currentCubeState.isSolved()).toBe(true);
      expect(player.status).toBe('completed');

      // 2. Execute all inverse moves backwards
      while (player.currentIndex > 0) {
        player.stepBackward();
      }

      // Assert cube is back to the exact initial scramble
      expect(player.currentCubeState.equals(scrambledState)).toBe(true);
      expect(player.currentIndex).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // 9. SimulatorController Coordination & Busy State Guard
  // ─────────────────────────────────────────────────────────────
  describe('SimulatorController Coordination', () => {
    it('forwards forward and backward moves to simulatorController', () => {
      const mockSimController = {
        applyMove: vi.fn(),
        queue: { isBusy: () => false },
      };

      const player = new SolutionPlayerController({
        moves: ['R', 'U'],
        simulatorController: mockSimController,
      });

      player.stepForward();
      expect(mockSimController.applyMove).toHaveBeenCalledTimes(1);
      expect(mockSimController.applyMove.mock.calls[0][0].notation).toBe('R');

      player.stepBackward();
      expect(mockSimController.applyMove).toHaveBeenCalledTimes(2);
      expect(mockSimController.applyMove.mock.calls[1][0].notation).toBe("R'");
    });

    it('blocks stepForward and stepBackward when simulator is busy animating', () => {
      const mockSimController = {
        applyMove: vi.fn(),
        queue: { isBusy: () => true }, // busy!
      };

      const player = new SolutionPlayerController({
        moves: ['R', 'U'],
        simulatorController: mockSimController,
      });

      expect(player.isSimulatorBusy()).toBe(true);
      expect(player.getState().canStepForward).toBe(false);

      const fwd = player.stepForward();
      expect(fwd).toBeNull();
      expect(player.currentIndex).toBe(0);
      expect(mockSimController.applyMove).not.toHaveBeenCalled();
    });

    it('restart restores simulatorController state, history, and synchronizes renderer', () => {
      const mockRenderer = {
        resetPositions: vi.fn(),
        syncWithState: vi.fn(),
      };
      const mockSimController = {
        cubeState: null,
        history: { clear: vi.fn() },
        queue: { clear: vi.fn(), isBusy: () => false },
        animator: { cancel: vi.fn() },
        renderer: mockRenderer,
        _notifyListeners: vi.fn(),
        applyMove: vi.fn(),
      };

      const initial = CubeState.createSolved();
      const player = new SolutionPlayerController({
        initialCubeState: initial,
        moves: ['R'],
        simulatorController: mockSimController,
      });

      player.stepForward();
      player.restart();

      expect(mockSimController.queue.clear).toHaveBeenCalled();
      expect(mockSimController.animator.cancel).toHaveBeenCalled();
      expect(mockSimController.history.clear).toHaveBeenCalledWith(initial);
      expect(mockRenderer.resetPositions).toHaveBeenCalled();
      expect(mockRenderer.syncWithState).toHaveBeenCalledWith(initial);
      expect(mockSimController._notifyListeners).toHaveBeenCalled();
    });

    it('setPlaybackSpeed updates speed and notifies subscribers without changing simulator animation speed', () => {
      const mockSimController = {
        setAnimationSpeed: vi.fn(),
        queue: { isBusy: () => false },
      };
      const player = new SolutionPlayerController({
        moves: ['R'],
        playbackSpeed: 500,
        simulatorController: mockSimController,
      });

      const subscriber = vi.fn();
      player.subscribe(subscriber);

      player.setPlaybackSpeed(300);
      expect(player.playbackSpeed).toBe(300);
      // Simulator animation speed must remain decoupled
      expect(mockSimController.setAnimationSpeed).not.toHaveBeenCalled();
      expect(subscriber).toHaveBeenCalled();
    });

    it('skipTo jumps directly to target move index and synchronizes simulator', () => {
      const mockRenderer = {
        resetPositions: vi.fn(),
        syncWithState: vi.fn(),
      };
      const mockSimController = {
        cubeState: null,
        history: { clear: vi.fn() },
        queue: { clear: vi.fn(), isBusy: () => false },
        animator: { cancel: vi.fn() },
        renderer: mockRenderer,
        _notifyListeners: vi.fn(),
        applyMove: vi.fn(),
      };

      const initial = CubeState.createSolved();
      const player = new SolutionPlayerController({
        initialCubeState: initial,
        moves: ['R', 'U', "R'", "U'"],
        simulatorController: mockSimController,
      });

      player.skipTo(2);
      expect(player.currentIndex).toBe(2);
      expect(player.status).toBe('paused');
      expect(mockSimController.queue.clear).toHaveBeenCalled();
      expect(mockRenderer.resetPositions).toHaveBeenCalled();
      expect(mockRenderer.syncWithState).toHaveBeenCalled();

      // Skip to end
      player.skipTo(4);
      expect(player.currentIndex).toBe(4);
      expect(player.status).toBe('completed');
    });
  });
});


