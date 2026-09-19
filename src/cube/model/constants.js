/**
 * CubeStudio V2 - Cube Domain Constants
 * Western / Kociemba standard specification:
 * Faces: U (Up), R (Right), F (Front), D (Down), L (Left), B (Back)
 * Order: U, R, F, D, L, B (0..5)
 * Total facelets: 54 (9 per face, index 0..8)
 * Center index on each face: 4
 */

export const FACES = Object.freeze(['U', 'R', 'F', 'D', 'L', 'B']);

export const FACE_INDICES = Object.freeze({
  U: 0,
  R: 1,
  F: 2,
  D: 3,
  L: 4,
  B: 5
});

export const OPPOSITE_FACES = Object.freeze({
  U: 'D',
  D: 'U',
  L: 'R',
  R: 'L',
  F: 'B',
  B: 'F'
});

export const FACE_COLORS = Object.freeze({
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue'
});

export const COLOR_CODES = Object.freeze({
  white: 'U',
  red: 'R',
  green: 'F',
  yellow: 'D',
  orange: 'L',
  blue: 'B'
});

export const FACELET_COUNT = 54;
export const STICKERS_PER_FACE = 9;
export const CENTER_STICKER_INDEX = 4;

/**
 * Global facelet indices of centers (U4, R4, F4, D4, L4, B4)
 */
export const CENTER_FACELET_INDICES = Object.freeze({
  U: 4,
  R: 13,
  F: 22,
  D: 31,
  L: 40,
  B: 49
});

/**
 * Canonical 54-facelet solved string representation in Kociemba order:
 * UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB
 */
export const SOLVED_FACELET_STRING = Object.freeze(
  FACES.map(face => face.repeat(STICKERS_PER_FACE)).join('')
);

export const STANDARD_MOVES = Object.freeze([
  'U', "U'", 'U2',
  'D', "D'", 'D2',
  'L', "L'", 'L2',
  'R', "R'", 'R2',
  'F', "F'", 'F2',
  'B', "B'", 'B2'
]);
