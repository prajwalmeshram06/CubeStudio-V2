/**
 * CubeStudio V2 - Cube Domain & Engine Public API
 */

// Model exports
export {
  FACES,
  FACE_INDICES,
  OPPOSITE_FACES,
  FACE_COLORS,
  COLOR_CODES,
  FACELET_COUNT,
  STICKERS_PER_FACE,
  CENTER_STICKER_INDEX,
  CENTER_FACELET_INDICES,
  SOLVED_FACELET_STRING,
  STANDARD_MOVES
} from './model/constants.js';

export { CubeState } from './model/CubeState.js';
export {
  Move,
  createMove,
  inverseMove,
  isSameFace,
  isOppositeFace,
  composeMoves
} from './model/moves.js';

export {
  parseMove,
  parseAlgorithm,
  formatAlgorithm,
  inverseAlgorithm
} from './model/notation.js';

export {
  getFaceOffset,
  toGlobalIndex,
  fromGlobalIndex,
  coordsToLocalIndex,
  localIndexToCoords,
  faceToColor,
  colorToFace
} from './model/stickers.js';

export {
  CORNER_SLOTS,
  EDGE_SLOTS,
  deriveCorners,
  deriveEdges,
  permutationParity
} from './model/cubies.js';

// Engine exports
export {
  getMovePermutation,
  composePermutations,
  invertPermutation
} from './engine/permutations.js';

export {
  applyMove,
  applyMoves,
  applyAlgorithm
} from './engine/applyMove.js';

export {
  validate,
  VALIDATION_ERRORS
} from './engine/validation.js';

export {
  generateScramble,
  generateScrambleString
} from './engine/scramble.js';

export { CubeHistory } from './engine/history.js';
