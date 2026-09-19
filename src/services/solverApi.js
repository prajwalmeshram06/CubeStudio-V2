/**
 * solverApi.js — Abstraction over the CubeStudio V2 Flask backend.
 *
 * All HTTP calls to the solver backend are centralised here.
 * Components and controllers must NEVER call fetch() directly to the backend.
 *
 * Uses VITE_API_BASE_URL environment variable (default: http://localhost:5000).
 */

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000').replace(/\/$/, '');

/**
 * Internal helper — performs a JSON POST request to the backend.
 * @param {string} path  - API path e.g. "/api/v1/solve"
 * @param {object} body  - Request payload
 * @returns {Promise<object>} Parsed JSON body
 * @throws {SolverApiError} On HTTP or parse errors
 */
async function post(path, body) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    throw new SolverApiError('NETWORK_ERROR', `Network error: ${err.message}`, null);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new SolverApiError('PARSE_ERROR', 'Server returned non-JSON response', response.status);
  }

  if (!response.ok) {
    const code = data?.error?.code ?? 'UNKNOWN_ERROR';
    const message = data?.error?.message ?? `HTTP ${response.status}`;
    throw new SolverApiError(code, message, response.status);
  }

  return data;
}

/**
 * Internal helper — performs a JSON GET request.
 * @param {string} path
 * @returns {Promise<object>}
 */
async function get(path) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`);
  } catch (err) {
    throw new SolverApiError('NETWORK_ERROR', `Network error: ${err.message}`, null);
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new SolverApiError('PARSE_ERROR', 'Server returned non-JSON response', response.status);
  }

  if (!response.ok) {
    const code = data?.error?.code ?? 'UNKNOWN_ERROR';
    const message = data?.error?.message ?? `HTTP ${response.status}`;
    throw new SolverApiError(code, message, response.status);
  }

  return data;
}

// ─────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────

/**
 * Check backend health.
 * @returns {Promise<{ status: string, version: string, service: string }>}
 */
export async function health() {
  return get('/api/v1/health');
}

/**
 * Validate a 54-character Kociemba cube string via the backend.
 * @param {string} cubeString - 54-char Kociemba string (URFDLB face order)
 * @returns {Promise<{ valid: true, message: string }>}
 * @throws {SolverApiError} If invalid
 */
export async function validate(cubeString) {
  return post('/api/v1/validate', { cube: cubeString });
}

/**
 * Request a Kociemba solution for a cube.
 * @param {string} cubeString - 54-char Kociemba string (URFDLB face order)
 * @returns {Promise<{ solution: string[], raw: string, moveCount: number }>}
 * @throws {SolverApiError} If validation fails or cube is unsolvable
 */
export async function solve(cubeString) {
  return post('/api/v1/solve', { cube: cubeString });
}

// ─────────────────────────────────────────────────────────────
// Error class
// ─────────────────────────────────────────────────────────────

/**
 * Typed error thrown by all solverApi functions.
 */
export class SolverApiError extends Error {
  /**
   * @param {string} code    - Machine-readable error code from backend
   * @param {string} message - Human-readable message
   * @param {number|null} statusCode - HTTP status code (null for network errors)
   */
  constructor(code, message, statusCode) {
    super(message);
    this.name = 'SolverApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
