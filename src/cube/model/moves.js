/**
 * CubeStudio V2 - Move Representation
 * Structured representation for standard 3x3 moves.
 * 18 standard moves: U, U', U2, D, D', D2, L, L', L2, R, R', R2, F, F', F2, B, B', B2
 */

import { FACES, OPPOSITE_FACES } from './constants.js';

export class Move {
  /**
   * @param {string} face - 'U'|'R'|'F'|'D'|'L'|'B'
   * @param {number} amount - 1 (CW, 90 deg), 2 (180 deg), 3 (CCW, 270 deg / prime)
   */
  constructor(face, amount = 1) {
    if (!FACES.includes(face)) {
      throw new Error(`Invalid face: "${face}". Expected one of: ${FACES.join(', ')}`);
    }

    // Normalize amount to 1, 2, or 3 (mod 4)
    const normalizedAmount = ((amount % 4) + 4) % 4;
    if (normalizedAmount === 0) {
      throw new Error(`Invalid move amount 0 for face ${face}. A move must represent a non-zero rotation.`);
    }

    this.face = face;
    this.amount = normalizedAmount; // 1: CW, 2: double, 3: prime
  }

  get direction() {
    return this.amount === 3 ? -1 : this.amount;
  }

  get notation() {
    if (this.amount === 1) return this.face;
    if (this.amount === 2) return `${this.face}2`;
    return `${this.face}'`;
  }

  inverse() {
    // 1 -> 3, 2 -> 2, 3 -> 1
    const invAmount = (4 - this.amount) % 4;
    return new Move(this.face, invAmount);
  }

  equals(other) {
    if (!other || typeof other !== 'object') return false;
    return this.face === other.face && this.amount === other.amount;
  }

  toString() {
    return this.notation;
  }
}

/**
 * Creates a Move instance
 * @param {string} face
 * @param {number} amount - 1: CW, 2: double, 3 or -1: CCW (prime)
 */
export function createMove(face, amount = 1) {
  const normalized = amount === -1 ? 3 : amount;
  return new Move(face, normalized);
}

/**
 * Inverts a Move
 * @param {Move} move
 * @returns {Move}
 */
export function inverseMove(move) {
  return move.inverse();
}

/**
 * Checks if two moves target the same face
 */
export function isSameFace(move1, move2) {
  return move1.face === move2.face;
}

/**
 * Checks if two moves target opposite faces (e.g. U and D, L and R, F and B)
 */
export function isOppositeFace(move1, move2) {
  return OPPOSITE_FACES[move1.face] === move2.face;
}

/**
 * Composes two moves on the same face.
 * Returns a new Move, or null if they cancel out to identity.
 */
export function composeMoves(move1, move2) {
  if (move1.face !== move2.face) {
    throw new Error(`Cannot compose moves on different faces: ${move1.face} and ${move2.face}`);
  }
  const combined = (move1.amount + move2.amount) % 4;
  if (combined === 0) return null;
  return new Move(move1.face, combined);
}
