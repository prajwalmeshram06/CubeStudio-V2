/**
 * CubeStudio V2 - Move Permutations
 * Exact 54-facelet permutation arrays for the 6 base face turns (U, R, F, D, L, B).
 *
 * Convention:
 * A permutation array P defines: newState[i] = oldState[P[i]]
 * (i.e. target index i receives the facelet currently at source index P[i]).
 */

import {
  FACELET_COUNT,
  STICKERS_PER_FACE,
  FACE_INDICES
} from '../model/constants.js';

/**
 * Creates an identity permutation where P[i] = i
 * @returns {number[]}
 */
function createIdentity() {
  const p = new Array(FACELET_COUNT);
  for (let i = 0; i < FACELET_COUNT; i++) {
    p[i] = i;
  }
  return p;
}

/**
 * Applies 90-degree clockwise rotation to facelet indices of a given face.
 * Local index mapping (target <- source):
 * 0<-6, 1<-3, 2<-0, 3<-7, 4<-4, 5<-1, 6<-8, 7<-5, 8<-2
 */
function rotateFace(p, face) {
  const offset = FACE_INDICES[face] * STICKERS_PER_FACE;
  const rot = [6, 3, 0, 7, 4, 1, 8, 5, 2];
  const oldVals = p.slice(offset, offset + STICKERS_PER_FACE);
  for (let i = 0; i < STICKERS_PER_FACE; i++) {
    p[offset + i] = oldVals[rot[i]];
  }
}

/**
 * Generates the base permutation for U (Up face clockwise)
 */
function createUPermutation() {
  const p = createIdentity();
  rotateFace(p, 'U');

  // Adjacent slices:
  // F0..2 <- R0..2 <- B0..2 <- L0..2 <- F0..2
  // Target <- Source:
  // F0..2 <- R0..2
  p[18] = 9;
  p[19] = 10;
  p[20] = 11;
  // R0..2 <- B0..2
  p[9] = 45;
  p[10] = 46;
  p[11] = 47;
  // B0..2 <- L0..2
  p[45] = 36;
  p[46] = 37;
  p[47] = 38;
  // L0..2 <- F0..2
  p[36] = 18;
  p[37] = 19;
  p[38] = 20;

  return Object.freeze(p);
}

/**
 * Generates the base permutation for D (Down face clockwise looking at D)
 */
function createDPermutation() {
  const p = createIdentity();
  rotateFace(p, 'D');

  // Adjacent slices:
  // Target <- Source:
  // F6..8 <- L6..8
  p[24] = 42;
  p[25] = 43;
  p[26] = 44;
  // L6..8 <- B6..8
  p[42] = 51;
  p[43] = 52;
  p[44] = 53;
  // B6..8 <- R6..8
  p[51] = 15;
  p[52] = 16;
  p[53] = 17;
  // R6..8 <- F6..8
  p[15] = 24;
  p[16] = 25;
  p[17] = 26;

  return Object.freeze(p);
}

/**
 * Generates the base permutation for F (Front face clockwise)
 */
function createFPermutation() {
  const p = createIdentity();
  rotateFace(p, 'F');

  // Adjacent slices:
  // Target <- Source:
  // R left col <- U bottom row
  p[9] = 6;
  p[12] = 7;
  p[15] = 8;
  // D top row <- R left col (reversed)
  p[29] = 9;
  p[28] = 12;
  p[27] = 15;
  // L right col <- D top row
  p[44] = 29;
  p[41] = 28;
  p[38] = 27;
  // U bottom row <- L right col (reversed)
  p[6] = 44;
  p[7] = 41;
  p[8] = 38;

  return Object.freeze(p);
}

/**
 * Generates the base permutation for B (Back face clockwise looking at B)
 */
function createBPermutation() {
  const p = createIdentity();
  rotateFace(p, 'B');

  // Adjacent slices:
  // Target <- Source:
  p[0] = 11;
  p[1] = 14;
  p[2] = 17;

  p[42] = 0;
  p[39] = 1;
  p[36] = 2;

  p[35] = 42;
  p[34] = 39;
  p[33] = 36;

  p[11] = 35;
  p[14] = 34;
  p[17] = 33;

  return Object.freeze(p);
}

/**
 * Generates the base permutation for R (Right face clockwise looking at R)
 */
function createRPermutation() {
  const p = createIdentity();
  rotateFace(p, 'R');

  // Adjacent slices:
  // Target <- Source:
  p[45] = 8;
  p[48] = 5;
  p[51] = 2;

  p[35] = 45;
  p[32] = 48;
  p[29] = 51;

  p[26] = 35;
  p[23] = 32;
  p[20] = 29;

  p[8] = 26;
  p[5] = 23;
  p[2] = 20;

  return Object.freeze(p);
}

/**
 * Generates the base permutation for L (Left face clockwise looking at L)
 */
function createLPermutation() {
  const p = createIdentity();
  rotateFace(p, 'L');

  // Adjacent slices:
  // Target <- Source:
  p[18] = 0;
  p[21] = 3;
  p[24] = 6;

  p[27] = 18;
  p[30] = 21;
  p[33] = 24;

  p[53] = 27;
  p[50] = 30;
  p[47] = 33;

  p[0] = 53;
  p[3] = 50;
  p[6] = 47;

  return Object.freeze(p);
}

// 6 Base permutations
const BASE_PERMUTATIONS = {
  U: createUPermutation(),
  D: createDPermutation(),
  F: createFPermutation(),
  B: createBPermutation(),
  R: createRPermutation(),
  L: createLPermutation()
};

/**
 * Composes two permutations: (A o B)[i] = B[A[i]]
 * If target gets source via A, then source was moved by B.
 */
export function composePermutations(pA, pB) {
  const res = new Array(FACELET_COUNT);
  for (let i = 0; i < FACELET_COUNT; i++) {
    res[i] = pB[pA[i]];
  }
  return Object.freeze(res);
}

/**
 * Inverts a permutation.
 */
export function invertPermutation(p) {
  const inv = new Array(FACELET_COUNT);
  for (let i = 0; i < FACELET_COUNT; i++) {
    inv[p[i]] = i;
  }
  return Object.freeze(inv);
}

/**
 * Cache for all 18 standard move permutations
 */
const MOVE_PERMUTATIONS = {};

for (const [face, basePerm] of Object.entries(BASE_PERMUTATIONS)) {
  const doublePerm = composePermutations(basePerm, basePerm);
  const primePerm = invertPermutation(basePerm);

  MOVE_PERMUTATIONS[`${face}`] = basePerm;
  MOVE_PERMUTATIONS[`${face}2`] = doublePerm;
  MOVE_PERMUTATIONS[`${face}'`] = primePerm;
}

/**
 * Returns the 54-facelet permutation array for a Move or notation string.
 * @param {import('../model/moves.js').Move|string} move
 * @returns {number[]}
 */
export function getMovePermutation(move) {
  const notation = typeof move === 'string' ? move : move.notation;
  const perm = MOVE_PERMUTATIONS[notation];
  if (!perm) {
    throw new Error(`Unsupported move permutation: "${notation}"`);
  }
  return perm;
}
