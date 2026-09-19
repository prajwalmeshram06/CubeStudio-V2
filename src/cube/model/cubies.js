/**
 * CubeStudio V2 - Cubie Derivation Model
 *
 * NOTE: CubeState is the SINGLE source of truth.
 * This module derives cubie data (corners and edges with permutation & orientation)
 * from CubeState facelets strictly for mathematical validation and analysis.
 * Cubie data is read-only and never stored as a second mutable source of truth.
 */

/**
 * Standard Kociemba corner definitions:
 * 8 corners in order:
 * 0: URF, 1: UFL, 2: ULB, 3: UBR, 4: DFR, 5: DLF, 6: DBL, 7: DRB
 * Facelet indices are in order: [Primary (U/D), CW, CCW]
 */
export const CORNER_SLOTS = Object.freeze([
  { name: 'URF', facelets: [8, 9, 20], baseColors: ['U', 'R', 'F'] },
  { name: 'UFL', facelets: [6, 18, 38], baseColors: ['U', 'F', 'L'] },
  { name: 'ULB', facelets: [0, 36, 47], baseColors: ['U', 'L', 'B'] },
  { name: 'UBR', facelets: [2, 45, 11], baseColors: ['U', 'B', 'R'] },
  { name: 'DFR', facelets: [29, 26, 15], baseColors: ['D', 'F', 'R'] },
  { name: 'DLF', facelets: [27, 44, 24], baseColors: ['D', 'L', 'F'] },
  { name: 'DBL', facelets: [33, 53, 42], baseColors: ['D', 'B', 'L'] },
  { name: 'DRB', facelets: [35, 17, 51], baseColors: ['D', 'R', 'B'] }
]);

/**
 * Standard Kociemba edge definitions:
 * 12 edges in order:
 * 0: UR, 1: UF, 2: UL, 3: UB, 4: DR, 5: DF, 6: DL, 7: DB, 8: FR, 9: FL, 10: BL, 11: BR
 * Facelet indices in order: [Primary, Secondary]
 */
export const EDGE_SLOTS = Object.freeze([
  { name: 'UR', facelets: [5, 10], baseColors: ['U', 'R'] },
  { name: 'UF', facelets: [7, 19], baseColors: ['U', 'F'] },
  { name: 'UL', facelets: [3, 37], baseColors: ['U', 'L'] },
  { name: 'UB', facelets: [1, 46], baseColors: ['U', 'B'] },
  { name: 'DR', facelets: [32, 16], baseColors: ['D', 'R'] },
  { name: 'DF', facelets: [28, 25], baseColors: ['D', 'F'] },
  { name: 'DL', facelets: [30, 43], baseColors: ['D', 'L'] },
  { name: 'DB', facelets: [34, 52], baseColors: ['D', 'B'] },
  { name: 'FR', facelets: [23, 12], baseColors: ['F', 'R'] },
  { name: 'FL', facelets: [21, 41], baseColors: ['F', 'L'] },
  { name: 'BL', facelets: [50, 39], baseColors: ['B', 'L'] },
  { name: 'BR', facelets: [48, 14], baseColors: ['B', 'R'] }
]);

/**
 * Normalizes an array of color letters into a sorted string key for piece lookup.
 * e.g. ['F', 'U', 'R'] -> "FRU"
 */
function pieceKey(colors) {
  return [...colors].sort().join('');
}

const CORNER_MAP = new Map();
CORNER_SLOTS.forEach((slot, index) => {
  CORNER_MAP.set(pieceKey(slot.baseColors), index);
});

const EDGE_MAP = new Map();
EDGE_SLOTS.forEach((slot, index) => {
  EDGE_MAP.set(pieceKey(slot.baseColors), index);
});

/**
 * Derives corner cubie states (permutation and orientation) from 54-facelet array.
 * Orientation:
 * 0 = U or D sticker is on the U or D face
 * 1 = U or D sticker is twisted clockwise
 * 2 = U or D sticker is twisted counter-clockwise
 *
 * @param {string[]|string} facelets - 54 facelet characters
 * @returns {{
 *   corners: Array<{ slot: string, pieceIndex: number, orientation: number }>,
 *   twistSum: number,
 *   isValidPieces: boolean,
 *   error?: string
 * }}
 */
export function deriveCorners(facelets) {
  const corners = [];
  let twistSum = 0;
  const seenPieces = new Set();

  for (let i = 0; i < CORNER_SLOTS.length; i++) {
    const slot = CORNER_SLOTS[i];
    const actualColors = slot.facelets.map(idx => facelets[idx]);
    const key = pieceKey(actualColors);
    const pieceIndex = CORNER_MAP.get(key);

    if (pieceIndex === undefined) {
      return {
        corners: [],
        twistSum: 0,
        isValidPieces: false,
        error: `Invalid corner colors at slot ${slot.name}: [${actualColors.join(', ')}]`
      };
    }

    if (seenPieces.has(pieceIndex)) {
      return {
        corners: [],
        twistSum: 0,
        isValidPieces: false,
        error: `Duplicate corner piece detected: ${CORNER_SLOTS[pieceIndex].name}`
      };
    }
    seenPieces.add(pieceIndex);

    // Determine orientation: where is the U or D sticker located?
    // slot.facelets[0] is on U or D face
    let orientation = -1;
    for (let o = 0; o < 3; o++) {
      if (actualColors[o] === 'U' || actualColors[o] === 'D') {
        orientation = o;
        break;
      }
    }

    if (orientation === -1) {
      return {
        corners: [],
        twistSum: 0,
        isValidPieces: false,
        error: `Corner at ${slot.name} has no U or D sticker`
      };
    }

    twistSum += orientation;
    corners.push({
      slot: slot.name,
      pieceIndex,
      orientation
    });
  }

  return {
    corners,
    twistSum,
    isValidPieces: true
  };
}

/**
 * Derives edge cubie states (permutation and orientation) from 54-facelet array.
 * Orientation:
 * 0 = Good edge
 * 1 = Bad / flipped edge
 *
 * @param {string[]|string} facelets - 54 facelet characters
 * @returns {{
 *   edges: Array<{ slot: string, pieceIndex: number, orientation: number }>,
 *   flipSum: number,
 *   isValidPieces: boolean,
 *   error?: string
 * }}
 */
export function deriveEdges(facelets) {
  const edges = [];
  let flipSum = 0;
  const seenPieces = new Set();

  for (let i = 0; i < EDGE_SLOTS.length; i++) {
    const slot = EDGE_SLOTS[i];
    const actualColors = slot.facelets.map(idx => facelets[idx]);
    const key = pieceKey(actualColors);
    const pieceIndex = EDGE_MAP.get(key);

    if (pieceIndex === undefined) {
      return {
        edges: [],
        flipSum: 0,
        isValidPieces: false,
        error: `Invalid edge colors at slot ${slot.name}: [${actualColors.join(', ')}]`
      };
    }

    if (seenPieces.has(pieceIndex)) {
      return {
        edges: [],
        flipSum: 0,
        isValidPieces: false,
        error: `Duplicate edge piece detected: ${EDGE_SLOTS[pieceIndex].name}`
      };
    }
    seenPieces.add(pieceIndex);

    // In Kociemba convention:
    // For edges with U or D: orientation is 0 if U/D is on primary facelet slot, 1 otherwise
    // For middle layer edges (FR, FL, BL, BR): orientation is 0 if F or B is on primary slot, 1 otherwise
    const baseSlot = EDGE_SLOTS[pieceIndex];
    let orientation = 0;

    if (baseSlot.baseColors.includes('U') || baseSlot.baseColors.includes('D')) {
      // Primary color is U or D
      orientation = (actualColors[0] === 'U' || actualColors[0] === 'D') ? 0 : 1;
    } else {
      // Middle layer edge: primary color is F or B
      orientation = (actualColors[0] === 'F' || actualColors[0] === 'B') ? 0 : 1;
    }

    flipSum += orientation;
    edges.push({
      slot: slot.name,
      pieceIndex,
      orientation
    });
  }

  return {
    edges,
    flipSum,
    isValidPieces: true
  };
}

/**
 * Computes permutation parity (0 for even, 1 for odd) of an array of piece indices.
 * @param {number[]} perm
 * @returns {number} 0 or 1
 */
export function permutationParity(perm) {
  let inversions = 0;
  for (let i = 0; i < perm.length; i++) {
    for (let j = i + 1; j < perm.length; j++) {
      if (perm[i] > perm[j]) {
        inversions++;
      }
    }
  }
  return inversions % 2;
}
