/**
 * CubeStudio V2 - Sticker & Facelet Model
 * Utilities for indexing, 2D coordinates, and color mapping across the 54 facelets.
 * Standard Kociemba layout: U (0..8), R (9..17), F (18..26), D (27..35), L (36..44), B (45..53)
 */

import {
  FACES,
  FACE_INDICES,
  FACE_COLORS,
  COLOR_CODES,
  STICKERS_PER_FACE,
  FACELET_COUNT
} from './constants.js';

/**
 * Returns the starting offset in the 54-facelet array for a given face.
 * @param {string} face - 'U'|'R'|'F'|'D'|'L'|'B'
 * @returns {number}
 */
export function getFaceOffset(face) {
  const index = FACE_INDICES[face];
  if (index === undefined) {
    throw new Error(`Invalid face: ${face}`);
  }
  return index * STICKERS_PER_FACE;
}

/**
 * Calculates global 54-facelet index from face name and local sticker index (0..8).
 * @param {string} face
 * @param {number} localIndex - 0..8
 * @returns {number}
 */
export function toGlobalIndex(face, localIndex) {
  if (localIndex < 0 || localIndex >= STICKERS_PER_FACE) {
    throw new Error(`Invalid local sticker index: ${localIndex}. Must be 0..8`);
  }
  return getFaceOffset(face) + localIndex;
}

/**
 * Converts global 54-facelet index back to face name and local sticker index.
 * @param {number} globalIndex - 0..53
 * @returns {{ face: string, localIndex: number }}
 */
export function fromGlobalIndex(globalIndex) {
  if (globalIndex < 0 || globalIndex >= FACELET_COUNT) {
    throw new Error(`Invalid global facelet index: ${globalIndex}. Must be 0..53`);
  }
  const faceIndex = Math.floor(globalIndex / STICKERS_PER_FACE);
  const localIndex = globalIndex % STICKERS_PER_FACE;
  return {
    face: FACES[faceIndex],
    localIndex
  };
}

/**
 * Converts row (0..2) and col (0..2) on a face to local sticker index (0..8).
 * @param {number} row
 * @param {number} col
 * @returns {number}
 */
export function coordsToLocalIndex(row, col) {
  if (row < 0 || row > 2 || col < 0 || col > 2) {
    throw new Error(`Invalid coordinates: (${row}, ${col}). Row and col must be 0..2`);
  }
  return row * 3 + col;
}

/**
 * Converts local sticker index (0..8) to row (0..2) and col (0..2).
 * @param {number} localIndex
 * @returns {{ row: number, col: number }}
 */
export function localIndexToCoords(localIndex) {
  if (localIndex < 0 || localIndex >= STICKERS_PER_FACE) {
    throw new Error(`Invalid local sticker index: ${localIndex}. Must be 0..8`);
  }
  return {
    row: Math.floor(localIndex / 3),
    col: localIndex % 3
  };
}

/**
 * Converts a face letter (U, R, F, D, L, B) to its standard color name.
 * @param {string} face
 * @returns {string}
 */
export function faceToColor(face) {
  const color = FACE_COLORS[face];
  if (!color) {
    throw new Error(`Invalid face for color mapping: ${face}`);
  }
  return color;
}

/**
 * Converts a color name (white, red, green, yellow, orange, blue) to face letter.
 * @param {string} color
 * @returns {string}
 */
export function colorToFace(color) {
  const face = COLOR_CODES[color.toLowerCase()];
  if (!face) {
    throw new Error(`Invalid color name: ${color}`);
  }
  return face;
}
