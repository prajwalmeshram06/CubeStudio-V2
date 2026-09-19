/**
 * CubeStudio V2 - Apply Move Engine
 * Pure, deterministic functions to transform CubeState via standard 3x3 moves.
 */

import { CubeState } from '../model/CubeState.js';
import { Move } from '../model/moves.js';
import { parseMove, parseAlgorithm } from '../model/notation.js';
import { getMovePermutation } from './permutations.js';
import { FACELET_COUNT } from '../model/constants.js';

/**
 * Applies a single move to a CubeState, returning a new transformed CubeState.
 * Non-mutating and pure.
 * @param {CubeState} state
 * @param {Move|string} moveInput
 * @returns {CubeState}
 */
export function applyMove(state, moveInput) {
  if (!(state instanceof CubeState)) {
    throw new Error('applyMove requires an instance of CubeState');
  }

  const move = typeof moveInput === 'string' ? parseMove(moveInput) : moveInput;
  const perm = getMovePermutation(move);
  const oldFacelets = state.getFacelets();
  const newFacelets = new Array(FACELET_COUNT);

  for (let i = 0; i < FACELET_COUNT; i++) {
    newFacelets[i] = oldFacelets[perm[i]];
  }

  return new CubeState(newFacelets);
}

/**
 * Applies a sequence of moves to a CubeState, returning a new transformed CubeState.
 * @param {CubeState} state
 * @param {Move[]|string[]} moves
 * @returns {CubeState}
 */
export function applyMoves(state, moves) {
  if (!Array.isArray(moves)) {
    throw new Error('applyMoves requires an array of moves');
  }

  let currentState = state;
  for (const move of moves) {
    currentState = applyMove(currentState, move);
  }
  return currentState;
}

/**
 * Parses an algorithm string and applies it to a CubeState.
 * @param {CubeState} state
 * @param {string} algorithm
 * @returns {CubeState}
 */
export function applyAlgorithm(state, algorithm) {
  const moves = parseAlgorithm(algorithm);
  return applyMoves(state, moves);
}
