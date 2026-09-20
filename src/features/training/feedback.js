/**
 * CubeStudio V2 - Training move feedback
 *
 * Classifies a learner move against lesson metadata when the CubeState
 * provides enough evidence. Never mutates the cube.
 */

import { parseMove } from '../../cube/model/notation.js';
import { FACE_COLORS } from '../../cube/model/constants.js';
import { CORNER_SLOTS, EDGE_SLOTS } from '../../cube/model/cubies.js';
import { evaluateCondition, findEdgePieceSlot } from './lessonValidation.js';

export const FEEDBACK_TYPES = Object.freeze({
  CORRECT: 'correct',
  INCORRECT: 'incorrect',
  WRONG_DIRECTION: 'wrong_direction',
  WRONG_PIECE: 'wrong_piece',
  STEP_COMPLETE: 'step_complete',
  LESSON_COMPLETE: 'lesson_complete',
  NOT_MATCHED: 'not_matched'
});

const GENERIC_MESSAGE =
  "The cube state doesn't match the expected step yet. Try the hint or review the previous instruction.";

function pieceLabel(homeSlot, kind) {
  const table = kind === 'corner' ? CORNER_SLOTS : EDGE_SLOTS;
  const slot = table.find((item) => item.name === homeSlot);
  if (!slot) return homeSlot;
  return slot.baseColors.map((face) => FACE_COLORS[face]).join('-');
}

function parseExpectedMoves(expectedMoves = []) {
  return expectedMoves.map((item) => (typeof item === 'string' ? parseMove(item) : item));
}

/**
 * @param {object} params
 * @param {import('../../cube/model/CubeState.js').CubeState} params.prevState
 * @param {import('../../cube/model/CubeState.js').CubeState} params.nextState
 * @param {string|import('../../cube/model/moves.js').Move|null} params.move
 * @param {object} params.step
 * @param {object} params.lesson
 * @param {object} params.ctx
 * @param {boolean} params.lessonComplete
 * @param {boolean} params.stepComplete
 */
export function classifyMoveFeedback({
  prevState,
  nextState,
  move,
  step,
  lesson,
  ctx,
  lessonComplete,
  stepComplete
}) {
  if (lessonComplete) {
    return {
      type: FEEDBACK_TYPES.LESSON_COMPLETE,
      message: `✓ Lesson complete — ${lesson.title} is finished.`
    };
  }

  if (stepComplete) {
    return {
      type: FEEDBACK_TYPES.STEP_COMPLETE,
      message: '✓ Step complete!'
    };
  }

  let parsedMove = null;
  try {
    parsedMove = move
      ? (typeof move === 'string' ? parseMove(move) : move)
      : null;
  } catch {
    parsedMove = null;
  }

  const expected = parseExpectedMoves(step?.expectedMoves || []);

  if (parsedMove && expected.length > 0) {
    const exact = expected.find((item) => item.equals(parsedMove));
    if (exact) {
      const stillComplete = evaluateCondition(nextState, step.completion, ctx);
      if (stillComplete) {
        return { type: FEEDBACK_TYPES.STEP_COMPLETE, message: '✓ Step complete!' };
      }
      return {
        type: FEEDBACK_TYPES.CORRECT,
        message: '✓ Correct — keep going with the current instruction.'
      };
    }

    const inverseHit = expected.find((item) => item.inverse().equals(parsedMove));
    if (inverseHit) {
      return {
        type: FEEDBACK_TYPES.WRONG_DIRECTION,
        message: `✗ Wrong direction — try the inverse of ${parsedMove.notation}.`
      };
    }
  }

  const target = step?.targetPiece;
  if (target?.kind === 'edge' && target.homeSlot && prevState && nextState) {
    const prevSlot = findEdgePieceSlot(prevState, target.homeSlot);
    const nextSlot = findEdgePieceSlot(nextState, target.homeSlot);
    const label = pieceLabel(target.homeSlot, 'edge');
    if (prevSlot && nextSlot && prevSlot === nextSlot) {
      return {
        type: FEEDBACK_TYPES.WRONG_PIECE,
        message: `✗ Wrong piece — this step requires the ${label} edge.`
      };
    }
  }

  if (parsedMove && expected.length > 0) {
    return {
      type: FEEDBACK_TYPES.INCORRECT,
      message: `✗ Incorrect move — ${parsedMove.notation} is not what this step needs.`
    };
  }

  return {
    type: FEEDBACK_TYPES.NOT_MATCHED,
    message: GENERIC_MESSAGE
  };
}

export { GENERIC_MESSAGE };
