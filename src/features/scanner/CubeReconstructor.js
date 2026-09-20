/**
 * CubeStudio V2 — Phase 7B
 * CubeReconstructor: Pure, deterministic module to reconstruct a canonical 54-facelet
 * CubeState from six individual physical face captures.
 *
 * Responsibilities:
 *  - Validate capture completeness (all 6 faces: U, R, F, D, L, B)
 *  - Validate sticker count (exactly 9 per face) and canonical colors
 *  - Convert color names ('white', 'red', etc.) to canonical symbols ('U', 'R', etc.)
 *  - Assemble 54-facelet array in strict Kociemba standard order: U(0..8), R(9..17), F(18..26), D(27..35), L(36..44), B(45..53)
 *  - Run authoritative multi-tier validation via validation.js
 *  - Derive actionable face-level diagnostic advice when validation fails
 *
 * PURE MODULE — no side effects, no React or DOM dependencies.
 */

import { FACES, STICKERS_PER_FACE, FACELET_COUNT, COLOR_CODES, FACE_COLORS } from '../../cube/model/constants.js';
import { CubeState } from '../../cube/model/CubeState.js';
import { validate, VALIDATION_ERRORS } from '../../cube/engine/validation.js';

/**
 * Standard mapping of center color names to face identifiers.
 * @type {Record<string, string>}
 */
export const CENTER_COLOR_TO_FACE = Object.freeze({
  white: 'U',
  red: 'R',
  green: 'F',
  yellow: 'D',
  orange: 'L',
  blue: 'B'
});

/**
 * Normalizes any sticker color representation ('white', 'red', 'U', etc.) to a canonical face letter ('U', 'R', etc.).
 * @param {string|{ color: string }} sticker
 * @returns {string} canonical face letter 'U'|'R'|'F'|'D'|'L'|'B'
 */
export function normalizeStickerColor(sticker) {
  if (!sticker) {
    throw new Error('Invalid empty sticker input');
  }

  const colorVal = typeof sticker === 'object' ? sticker.color : String(sticker);
  if (!colorVal) {
    throw new Error('Missing color property on sticker');
  }

  const lower = colorVal.toLowerCase();
  if (COLOR_CODES[lower]) {
    return COLOR_CODES[lower];
  }

  const upper = colorVal.toUpperCase();
  if (FACES.includes(upper)) {
    return upper;
  }

  throw new Error(`Unknown sticker color: "${colorVal}"`);
}

/**
 * Reconstructs a full 54-facelet CubeState from six scanned faces.
 *
 * @param {Record<string, { stickers: Array<string|{ color: string, confidence?: number }> } | Array<string|{ color: string }>>} scannedFaces
 * @returns {{
 *   success: boolean,
 *   cubeState?: CubeState,
 *   facelets: string[],
 *   validation: { valid: boolean, error?: { code: string, message: string, details?: any } },
 *   diagnostic?: {
 *     affectedFaces: string[],
 *     message: string,
 *     colorCounts: Record<string, number>
 *   }
 * }}
 */
export function reconstructCube(scannedFaces) {
  if (!scannedFaces || typeof scannedFaces !== 'object') {
    return {
      success: false,
      facelets: [],
      validation: {
        valid: false,
        error: {
          code: VALIDATION_ERRORS.MALFORMED_DATA,
          message: 'Missing or malformed scanned faces input object.'
        }
      }
    };
  }

  // 1. Verify all 6 faces are provided
  const missingFaces = FACES.filter(face => !scannedFaces[face]);
  if (missingFaces.length > 0) {
    return {
      success: false,
      facelets: [],
      validation: {
        valid: false,
        error: {
          code: VALIDATION_ERRORS.MALFORMED_DATA,
          message: `Missing ${missingFaces.length} face(s): ${missingFaces.join(', ')}`
        }
      },
      diagnostic: {
        affectedFaces: missingFaces,
        message: `Please scan all 6 faces. Missing: ${missingFaces.join(', ')}`,
        colorCounts: {}
      }
    };
  }

  // 2. Validate and assemble the 54 facelets in Kociemba order: U, R, F, D, L, B
  const facelets = [];
  const faceConfidenceSums = {};

  for (const face of FACES) {
    const faceData = scannedFaces[face];
    const stickers = Array.isArray(faceData) ? faceData : faceData?.stickers;

    if (!Array.isArray(stickers) || stickers.length !== STICKERS_PER_FACE) {
      return {
        success: false,
        facelets: [],
        validation: {
          valid: false,
          error: {
            code: VALIDATION_ERRORS.MALFORMED_DATA,
            message: `Face "${face}" must have exactly 9 stickers. Received: ${stickers ? stickers.length : 0}`
          }
        },
        diagnostic: {
          affectedFaces: [face],
          message: `Face "${face}" scan data is corrupted or incomplete. Please rescan face ${face}.`,
          colorCounts: {}
        }
      };
    }

    let confSum = 0;
    for (let i = 0; i < STICKERS_PER_FACE; i++) {
      const sticker = stickers[i];
      try {
        const symbol = normalizeStickerColor(sticker);
        facelets.push(symbol);
        if (typeof sticker === 'object' && typeof sticker.confidence === 'number') {
          confSum += sticker.confidence;
        } else {
          confSum += 1.0;
        }
      } catch (err) {
        return {
          success: false,
          facelets: [],
          validation: {
            valid: false,
            error: {
              code: VALIDATION_ERRORS.INVALID_SYMBOLS,
              message: `Face "${face}" sticker at position ${i} has invalid color: ${err.message}`
            }
          },
          diagnostic: {
            affectedFaces: [face],
            message: `Invalid sticker color on face ${face}. Please rescan this face.`,
            colorCounts: {}
          }
        };
      }
    }
    faceConfidenceSums[face] = confSum / STICKERS_PER_FACE;
  }

  // 3. Authoritative validation
  const validation = validate(facelets);

  if (!validation.valid) {
    const diagnostic = diagnoseValidationFailure(facelets, scannedFaces, validation, faceConfidenceSums);
    return {
      success: false,
      facelets,
      validation,
      diagnostic
    };
  }

  // 4. Create authoritative CubeState
  const cubeState = new CubeState(facelets);

  return {
    success: true,
    cubeState,
    facelets,
    validation: { valid: true }
  };
}

/**
 * Analyzes validation failure to provide face-level diagnostic hints to the user.
 *
 * @param {string[]} facelets
 * @param {object} scannedFaces
 * @param {object} validation
 * @param {Record<string, number>} faceConfidenceSums
 * @returns {{ affectedFaces: string[], message: string, colorCounts: Record<string, number> }}
 */
export function diagnoseValidationFailure(facelets, scannedFaces, validation, faceConfidenceSums = {}) {
  const colorCounts = { U: 0, R: 0, F: 0, D: 0, L: 0, B: 0 };
  for (const s of facelets) {
    if (colorCounts[s] !== undefined) {
      colorCounts[s]++;
    }
  }

  const affectedFaces = new Set();
  const issues = [];

  // Check color frequencies
  for (const f of FACES) {
    const count = colorCounts[f];
    if (count !== 9) {
      const diff = count - 9;
      const colorName = FACE_COLORS[f];
      issues.push(`${colorName} (${f}) appears ${count} times (${diff > 0 ? `+${diff}` : diff})`);
    }
  }

  // If color counts are wrong, locate faces with abnormal counts or lowest confidence
  if (validation.error?.code === VALIDATION_ERRORS.INVALID_COUNTS) {
    // Find faces containing over-represented colors or having low average confidence
    for (const face of FACES) {
      const faceData = scannedFaces[face];
      const stickers = Array.isArray(faceData) ? faceData : faceData?.stickers;
      if (stickers) {
        for (const s of stickers) {
          try {
            const sym = normalizeStickerColor(s);
            if (colorCounts[sym] !== 9) {
              affectedFaces.add(face);
            }
          } catch (_) {
            affectedFaces.add(face);
          }
        }
      }
    }
  } else if (validation.error?.code === VALIDATION_ERRORS.INVALID_CENTERS) {
    // Center mismatch
    for (const face of FACES) {
      const expectedCenter = face;
      const faceData = scannedFaces[face];
      const stickers = Array.isArray(faceData) ? faceData : faceData?.stickers;
      if (stickers && stickers[4]) {
        try {
          const centerSym = normalizeStickerColor(stickers[4]);
          if (centerSym !== expectedCenter) {
            affectedFaces.add(face);
          }
        } catch (_) {
          affectedFaces.add(face);
        }
      }
    }
  } else {
    // For parity / piece permutation errors, pick the faces with lowest scan confidence
    const sortedByConf = [...FACES].sort((a, b) => (faceConfidenceSums[a] || 1) - (faceConfidenceSums[b] || 1));
    affectedFaces.add(sortedByConf[0]);
    affectedFaces.add(sortedByConf[1]);
  }

  let message = validation.error?.message || 'The reconstructed cube state is physically invalid.';
  if (issues.length > 0) {
    message = `Color mismatch detected: ${issues.join(', ')}.`;
  }

  return {
    affectedFaces: Array.from(affectedFaces),
    message,
    colorCounts
  };
}
