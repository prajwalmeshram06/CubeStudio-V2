/**
 * CubeStudio V2 - Training lesson validation
 *
 * Pure predicates over the authoritative CubeState.
 * Cubie permutation/orientation are derived; they are never stored as a second cube.
 */

import { CubeState } from '../../cube/model/CubeState.js';
import { applyAlgorithm } from '../../cube/engine/applyMove.js';
import {
  CORNER_SLOTS,
  EDGE_SLOTS,
  deriveCorners,
  deriveEdges
} from '../../cube/model/cubies.js';

const WHITE_EDGE_SLOTS = Object.freeze(['UR', 'UF', 'UL', 'UB']);
const WHITE_CORNER_SLOTS = Object.freeze(['URF', 'UFL', 'ULB', 'UBR']);
const E_SLICE_SLOTS = Object.freeze(['FR', 'FL', 'BL', 'BR']);
const YELLOW_EDGE_SLOTS = Object.freeze(['DR', 'DF', 'DL', 'DB']);
const YELLOW_CORNER_SLOTS = Object.freeze(['DFR', 'DLF', 'DBL', 'DRB']);
const D_FACE_EDGE_LOCAL = Object.freeze([1, 3, 5, 7]);

function faceletsOf(state) {
  if (!(state instanceof CubeState)) {
    throw new Error('Lesson validation requires an instance of CubeState');
  }
  return state.getFacelets();
}

function edgeIndex(slotName) {
  return EDGE_SLOTS.findIndex((slot) => slot.name === slotName);
}

function cornerIndex(slotName) {
  return CORNER_SLOTS.findIndex((slot) => slot.name === slotName);
}

export function isEdgeSlotSolved(state, slotName) {
  const { edges, isValidPieces } = deriveEdges(faceletsOf(state));
  if (!isValidPieces) return false;
  const index = edgeIndex(slotName);
  const cubie = edges[index];
  return cubie.pieceIndex === index && cubie.orientation === 0;
}

export function isCornerSlotSolved(state, slotName) {
  const { corners, isValidPieces } = deriveCorners(faceletsOf(state));
  if (!isValidPieces) return false;
  const index = cornerIndex(slotName);
  const cubie = corners[index];
  return cubie.pieceIndex === index && cubie.orientation === 0;
}

export function countSolvedSlots(state, slotNames, kind) {
  const check = kind === 'corner' ? isCornerSlotSolved : isEdgeSlotSolved;
  return slotNames.filter((name) => check(state, name)).length;
}

export function isWhiteCrossComplete(state) {
  return WHITE_EDGE_SLOTS.every((slot) => isEdgeSlotSolved(state, slot));
}

export function isWhiteCornersComplete(state) {
  return isWhiteCrossComplete(state)
    && WHITE_CORNER_SLOTS.every((slot) => isCornerSlotSolved(state, slot));
}

export function isSecondLayerComplete(state) {
  return isWhiteCornersComplete(state)
    && E_SLICE_SLOTS.every((slot) => isEdgeSlotSolved(state, slot));
}

export function isF2LComplete(state) {
  return isSecondLayerComplete(state);
}

export function isYellowCrossComplete(state) {
  if (!isF2LComplete(state)) return false;
  return D_FACE_EDGE_LOCAL.every((local) => state.getSticker('D', local) === 'D');
}

export function isYellowFaceComplete(state) {
  if (!isF2LComplete(state)) return false;
  return state.getFace('D').every((sticker) => sticker === 'D');
}

export function isLastLayerCornersComplete(state) {
  if (!isF2LComplete(state)) return false;
  return [...WHITE_CORNER_SLOTS, ...YELLOW_CORNER_SLOTS]
    .every((slot) => isCornerSlotSolved(state, slot));
}

export function isLastLayerEdgesComplete(state) {
  return state.isSolved();
}

export function findEdgePieceSlot(state, homeSlotName) {
  const { edges, isValidPieces } = deriveEdges(faceletsOf(state));
  if (!isValidPieces) return null;
  const pieceIndex = edgeIndex(homeSlotName);
  const slotIndex = edges.findIndex((edge) => edge.pieceIndex === pieceIndex);
  return slotIndex >= 0 ? EDGE_SLOTS[slotIndex].name : null;
}

/**
 * Evaluates a declarative completion condition against CubeState.
 * @param {CubeState} state
 * @param {object} condition
 * @param {{ lessonStart?: CubeState, stepStart?: CubeState }} [ctx]
 * @returns {boolean}
 */
export function evaluateCondition(state, condition, ctx = {}) {
  if (!condition) return false;

  switch (condition.kind) {
    case 'solved':
      return state.isSolved();
    case 'whiteCross':
      return isWhiteCrossComplete(state);
    case 'whiteCorners':
      return isWhiteCornersComplete(state);
    case 'secondLayer':
      return isSecondLayerComplete(state);
    case 'yellowCross':
      return isYellowCrossComplete(state);
    case 'yellowFace':
      return isYellowFaceComplete(state);
    case 'lastLayerCorners':
      return isLastLayerCornersComplete(state);
    case 'lastLayerEdges':
      return isLastLayerEdgesComplete(state);
    case 'edgesSolved': {
      const min = condition.min ?? condition.slots.length;
      return countSolvedSlots(state, condition.slots, 'edge') >= min;
    }
    case 'cornersSolved': {
      const min = condition.min ?? condition.slots.length;
      return countSolvedSlots(state, condition.slots, 'corner') >= min;
    }
    case 'equalsApplied': {
      const base = condition.from === 'lessonStart' ? ctx.lessonStart : ctx.stepStart;
      if (!base) return false;
      const target = applyAlgorithm(base, condition.algorithm);
      return state.equals(target);
    }
    case 'equalsState': {
      const target = condition.state instanceof CubeState
        ? condition.state
        : CubeState.deserialize(condition.state);
      return state.equals(target);
    }
    case 'all':
      return (condition.conditions || []).every((item) => evaluateCondition(state, item, ctx));
    default:
      return false;
  }
}

export {
  WHITE_EDGE_SLOTS,
  WHITE_CORNER_SLOTS,
  E_SLICE_SLOTS,
  YELLOW_EDGE_SLOTS,
  YELLOW_CORNER_SLOTS
};
