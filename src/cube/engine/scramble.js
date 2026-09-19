/**
 * CubeStudio V2 - WCA Scramble Generator
 * Generates official-compliant random scrambles.
 *
 * Rules:
 * - Configurable length (default 20 for standard 3x3).
 * - No consecutive turns of the same face (e.g. R followed by R, R', or R2).
 * - No redundant turns across the same axis (e.g. R L R or U D U).
 * - Optional deterministic seed for reproducible testing and competition batches.
 */

import { FACES, OPPOSITE_FACES } from '../model/constants.js';
import { createMove } from '../model/moves.js';

/**
 * Axis grouping for standard 3x3 faces:
 * 0: U-D axis
 * 1: L-R axis
 * 2: F-B axis
 */
const FACE_AXIS = Object.freeze({
  U: 0,
  D: 0,
  L: 1,
  R: 1,
  F: 2,
  B: 2
});

/**
 * 32-bit Mulberry32 PRNG for deterministic seeds.
 * @param {number} seed
 * @returns {() => number}
 */
function createMulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Converts any string or number seed into a 32-bit integer.
 * @param {string|number} seed
 * @returns {number}
 */
function hashSeed(seed) {
  if (typeof seed === 'number') {
    return seed | 0;
  }
  const str = String(seed);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}

/**
 * Generates a scramble as an array of Move instances.
 * @param {number} [length=20] - Number of moves in scramble
 * @param {string|number} [seed] - Optional seed for deterministic scrambles
 * @returns {import('../model/moves.js').Move[]}
 */
export function generateScramble(length = 20, seed = undefined) {
  if (length <= 0) return [];

  const random = seed !== undefined ? createMulberry32(hashSeed(seed)) : Math.random;

  const moves = [];
  let lastFace = null;
  let secondLastFace = null;

  for (let i = 0; i < length; i++) {
    // Determine available faces
    const availableFaces = FACES.filter(face => {
      // 1. Never same face as immediately preceding move
      if (face === lastFace) return false;

      // 2. Avoid redundant axis sandwich: e.g. R L R
      if (lastFace && secondLastFace) {
        const currentAxis = FACE_AXIS[face];
        const lastAxis = FACE_AXIS[lastFace];
        const secondLastAxis = FACE_AXIS[secondLastFace];

        if (currentAxis === lastAxis && currentAxis === secondLastAxis) {
          return false;
        }
      }

      return true;
    });

    const chosenFace = availableFaces[Math.floor(random() * availableFaces.length)];

    // Random amount: 1 (CW), 2 (double), 3 (prime)
    const amounts = [1, 2, 3];
    const chosenAmount = amounts[Math.floor(random() * amounts.length)];

    moves.push(createMove(chosenFace, chosenAmount));

    secondLastFace = lastFace;
    lastFace = chosenFace;
  }

  return moves;
}

/**
 * Generates a scramble formatted as a standard space-separated algorithm string.
 * @param {number} [length=20]
 * @param {string|number} [seed]
 * @returns {string}
 */
export function generateScrambleString(length = 20, seed = undefined) {
  const moves = generateScramble(length, seed);
  return moves.map(m => m.notation).join(' ');
}
