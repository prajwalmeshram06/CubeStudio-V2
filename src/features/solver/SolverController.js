/**
 * SolverController.js — Feature controller for the Solver tab.
 *
 * Bridges the UI to:
 *   1. The Cube Engine (CubeState + validation + notation parsing)
 *   2. The backend API (via solverApi.js — never raw fetch)
 *
 * Does NOT hold a second cube representation; CubeState is always the authority.
 */

import { validate as validateCube } from '../../cube/engine/validation.js';
import { parseAlgorithm } from '../../cube/model/notation.js';
import { solve as apiSolve, health as apiHealth, SolverApiError } from '../../services/solverApi.js';

export class SolverController {
  /**
   * @param {import('../../cube/model/CubeState.js').CubeState} cubeState
   */
  constructor(cubeState) {
    this._cubeState = cubeState;
  }

  // ─────────────────────────────────────────────────────────────
  // Public state accessors
  // ─────────────────────────────────────────────────────────────

  /** Replace the cube state reference (called when App.jsx syncs from simulator/editor). */
  setCubeState(cubeState) {
    this._cubeState = cubeState;
  }

  // ─────────────────────────────────────────────────────────────
  // Validation
  // ─────────────────────────────────────────────────────────────

  /**
   * Run client-side validation before hitting the backend.
   * @returns {{ valid: boolean, error?: { code: string, message: string } }}
   */
  validateLocally() {
    return validateCube(this._cubeState);
  }

  // ─────────────────────────────────────────────────────────────
  // Solve
  // ─────────────────────────────────────────────────────────────

  /**
   * Serialize the current CubeState and request a solution from the backend.
   *
   * @returns {Promise<{
   *   solution: string[],
   *   raw: string,
   *   moveCount: number,
   *   parsed: import('../../cube/model/moves.js').Move[]
   * }>}
   * @throws {SolverApiError | Error}
   */
  async solve() {
    const cubeString = this._cubeState.serialize('string');
    const result = await apiSolve(cubeString);

    // Parse the solution tokens into Move objects using the existing notation module
    const parsed = result.raw ? parseAlgorithm(result.raw) : [];

    return {
      solution: result.solution,
      raw: result.raw,
      moveCount: result.moveCount,
      parsed,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Health check
  // ─────────────────────────────────────────────────────────────

  /**
   * Ping the backend to confirm it is reachable.
   * @returns {Promise<{ status: string, version: string, service: string }>}
   */
  async checkHealth() {
    return apiHealth();
  }
}
