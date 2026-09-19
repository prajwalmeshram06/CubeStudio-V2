import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SolverController } from '../../src/features/solver/SolverController.js';
import { CubeState } from '../../src/cube/model/CubeState.js';
import * as solverApi from '../../src/services/solverApi.js';

describe('SolverController', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with a CubeState instance', () => {
    const state = CubeState.createSolved();
    const controller = new SolverController(state);
    expect(controller).toBeDefined();
  });

  it('validates solved cube locally as valid', () => {
    const state = CubeState.createSolved();
    const controller = new SolverController(state);
    const result = controller.validateLocally();
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('validates illegal cube locally as invalid', () => {
    const state = CubeState.createSolved();
    // Tamper with corner to create an impossible twist
    state.setSticker('U', 0, 'R');
    const controller = new SolverController(state);
    const result = controller.validateLocally();
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('updates cube state reference when setCubeState is called', () => {
    const state1 = CubeState.createSolved();
    const controller = new SolverController(state1);

    const state2 = CubeState.createSolved();
    state2.setSticker('U', 0, 'R');
    controller.setCubeState(state2);

    expect(controller.validateLocally().valid).toBe(false);
  });

  it('solves cube by calling solverApi and parses solution into Move objects', async () => {
    const state = CubeState.createSolved();
    const controller = new SolverController(state);

    const mockApiResult = {
      solution: ["R", "U", "R'", "U'"],
      raw: "R U R' U'",
      moveCount: 4
    };

    vi.spyOn(solverApi, 'solve').mockResolvedValue(mockApiResult);

    const result = await controller.solve();

    expect(solverApi.solve).toHaveBeenCalledWith(state.serialize('string'));
    expect(result.solution).toEqual(["R", "U", "R'", "U'"]);
    expect(result.raw).toBe("R U R' U'");
    expect(result.moveCount).toBe(4);
    expect(result.parsed).toHaveLength(4);
    expect(result.parsed[0].face).toBe('R');
    expect(result.parsed[1].face).toBe('U');
  });

  it('handles already-solved cube with empty raw string gracefully', async () => {
    const state = CubeState.createSolved();
    const controller = new SolverController(state);

    vi.spyOn(solverApi, 'solve').mockResolvedValue({
      solution: [],
      raw: '',
      moveCount: 0
    });

    const result = await controller.solve();
    expect(result.solution).toEqual([]);
    expect(result.moveCount).toBe(0);
    expect(result.parsed).toEqual([]);
  });

  it('delegates checkHealth to solverApi.health', async () => {
    const state = CubeState.createSolved();
    const controller = new SolverController(state);

    const mockHealth = { status: 'ok', version: '1.0.0', service: 'cubestudio-api' };
    vi.spyOn(solverApi, 'health').mockResolvedValue(mockHealth);

    const health = await controller.checkHealth();
    expect(health).toEqual(mockHealth);
    expect(solverApi.health).toHaveBeenCalled();
  });
});
