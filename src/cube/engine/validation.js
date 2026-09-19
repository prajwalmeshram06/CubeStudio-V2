/**
 * CubeStudio V2 - Cube State Validation Engine
 *
 * Implements mathematically complete multi-tier validation:
 * 1. Malformed data & length check
 * 2. Allowed symbols check
 * 3. Facelet frequency check (exactly 9 of each face/color)
 * 4. Center facelet check
 * 5. Cubie piece validity & duplicate detection
 * 6. Corner twist parity (sum of corner twists mod 3 == 0)
 * 7. Edge flip parity (sum of edge flips mod 2 == 0)
 * 8. Permutation parity (corner permutation sign == edge permutation sign)
 */

import {
  FACES,
  FACELET_COUNT,
  STICKERS_PER_FACE,
  CENTER_FACELET_INDICES,
  OPPOSITE_FACES
} from '../model/constants.js';
import { CubeState } from '../model/CubeState.js';
import { deriveCorners, deriveEdges, permutationParity } from '../model/cubies.js';

export const VALIDATION_ERRORS = Object.freeze({
  MALFORMED_DATA: 'MALFORMED_DATA',
  INVALID_SYMBOLS: 'INVALID_SYMBOLS',
  INVALID_COUNTS: 'INVALID_COUNTS',
  INVALID_CENTERS: 'INVALID_CENTERS',
  IMPOSSIBLE_PIECE: 'IMPOSSIBLE_PIECE',
  DUPLICATE_PIECES: 'DUPLICATE_PIECES',
  CORNER_TWIST_PARITY: 'CORNER_TWIST_PARITY',
  EDGE_FLIP_PARITY: 'EDGE_FLIP_PARITY',
  PERMUTATION_PARITY: 'PERMUTATION_PARITY'
});

/**
 * Validates a CubeState or 54-facelet representation.
 * @param {CubeState|string[]|string} input
 * @returns {{ valid: boolean, error?: { code: string, message: string, details?: any } }}
 */
export function validate(input) {
  // 1. Data format and length
  let facelets;
  if (input instanceof CubeState) {
    facelets = input.getFacelets();
  } else if (typeof input === 'string') {
    facelets = input.split('');
  } else if (Array.isArray(input)) {
    facelets = [...input];
  } else {
    return {
      valid: false,
      error: {
        code: VALIDATION_ERRORS.MALFORMED_DATA,
        message: `Expected CubeState, 54-char string, or array, got ${typeof input}`
      }
    };
  }

  if (facelets.length !== FACELET_COUNT) {
    return {
      valid: false,
      error: {
        code: VALIDATION_ERRORS.MALFORMED_DATA,
        message: `Invalid facelet count: ${facelets.length}. Expected ${FACELET_COUNT}`
      }
    };
  }

  // 2. Allowed symbols
  const validFaceSet = new Set(FACES);
  for (let i = 0; i < facelets.length; i++) {
    if (!validFaceSet.has(facelets[i])) {
      return {
        valid: false,
        error: {
          code: VALIDATION_ERRORS.INVALID_SYMBOLS,
          message: `Invalid symbol "${facelets[i]}" at index ${i}. Expected one of: ${FACES.join(', ')}`
        }
      };
    }
  }

  // 3. Exact 9 of each color / symbol
  const counts = {};
  for (const f of FACES) counts[f] = 0;
  for (const sym of facelets) {
    counts[sym]++;
  }
  for (const f of FACES) {
    if (counts[f] !== STICKERS_PER_FACE) {
      return {
        valid: false,
        error: {
          code: VALIDATION_ERRORS.INVALID_COUNTS,
          message: `Face "${f}" has ${counts[f]} stickers. Each face must have exactly ${STICKERS_PER_FACE}`,
          details: counts
        }
      };
    }
  }

  // 4. Center pieces check
  // Center positions: U=4, R=13, F=22, D=31, L=40, B=49
  const centerValues = {
    U: facelets[CENTER_FACELET_INDICES.U],
    R: facelets[CENTER_FACELET_INDICES.R],
    F: facelets[CENTER_FACELET_INDICES.F],
    D: facelets[CENTER_FACELET_INDICES.D],
    L: facelets[CENTER_FACELET_INDICES.L],
    B: facelets[CENTER_FACELET_INDICES.B]
  };

  // Standard orientation centers: U=U, R=R, F=F, D=D, L=L, B=B
  for (const f of FACES) {
    if (centerValues[f] !== f) {
      return {
        valid: false,
        error: {
          code: VALIDATION_ERRORS.INVALID_CENTERS,
          message: `Center facelet on face ${f} is "${centerValues[f]}", expected standard fixed center "${f}"`,
          details: centerValues
        }
      };
    }
  }

  // 5. Piece validity: Corners
  const cornerResult = deriveCorners(facelets);
  if (!cornerResult.isValidPieces) {
    const code = cornerResult.error?.includes('Duplicate')
      ? VALIDATION_ERRORS.DUPLICATE_PIECES
      : VALIDATION_ERRORS.IMPOSSIBLE_PIECE;
    return {
      valid: false,
      error: {
        code,
        message: cornerResult.error
      }
    };
  }

  // 6. Piece validity: Edges
  const edgeResult = deriveEdges(facelets);
  if (!edgeResult.isValidPieces) {
    const code = edgeResult.error?.includes('Duplicate')
      ? VALIDATION_ERRORS.DUPLICATE_PIECES
      : VALIDATION_ERRORS.IMPOSSIBLE_PIECE;
    return {
      valid: false,
      error: {
        code,
        message: edgeResult.error
      }
    };
  }

  // 7. Corner Twist Parity: sum(twists) mod 3 === 0
  if (cornerResult.twistSum % 3 !== 0) {
    return {
      valid: false,
      error: {
        code: VALIDATION_ERRORS.CORNER_TWIST_PARITY,
        message: `Corner orientation parity violation (twist sum ${cornerResult.twistSum} is not divisible by 3)`
      }
    };
  }

  // 8. Edge Flip Parity: sum(flips) mod 2 === 0
  if (edgeResult.flipSum % 2 !== 0) {
    return {
      valid: false,
      error: {
        code: VALIDATION_ERRORS.EDGE_FLIP_PARITY,
        message: `Edge orientation parity violation (flip sum ${edgeResult.flipSum} is not even)`
      }
    };
  }

  // 9. Permutation Parity: corner parity === edge parity
  const cornerPerm = cornerResult.corners.map(c => c.pieceIndex);
  const edgePerm = edgeResult.edges.map(e => e.pieceIndex);
  const cornerParity = permutationParity(cornerPerm);
  const edgeParity = permutationParity(edgePerm);

  if (cornerParity !== edgeParity) {
    return {
      valid: false,
      error: {
        code: VALIDATION_ERRORS.PERMUTATION_PARITY,
        message: `Permutation parity violation: corner parity (${cornerParity}) does not match edge parity (${edgeParity})`
      }
    };
  }

  return { valid: true };
}
