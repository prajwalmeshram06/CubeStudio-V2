/**
 * mistakeDetection.js — Pure Mistake Classification Engine for CubeStudio V2 Training.
 *
 * Classifies learner moves and algorithm sequences against expectations, producing
 * structured mistake taxonomy without mutating any cube state.
 */

import { parseMove, parseAlgorithm } from '../../cube/model/notation.js';

export const MISTAKE_TYPES = Object.freeze({
  CORRECT: 'correct',
  WRONG_DIRECTION: 'wrong_direction',
  WRONG_AMOUNT: 'wrong_amount',
  WRONG_FACE: 'wrong_face',
  EXTRA_MOVE: 'extra_move',
  MISSING_MOVE: 'missing_move',
  DIVERGED: 'diverged',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
});

/**
 * Compares an expected single move against an actual move.
 * @param {string|import('../../cube/model/moves.js').Move} expected
 * @param {string|import('../../cube/model/moves.js').Move} actual
 * @returns {{
 *   isCorrect: boolean,
 *   type: string,
 *   expected: string,
 *   actual: string,
 *   message: string,
 *   tip: string
 * }}
 */
export function detectMoveMistake(expected, actual) {
  if (!expected || !actual) {
    return {
      isCorrect: false,
      type: MISTAKE_TYPES.MISSING_MOVE,
      expected: expected ? (typeof expected === 'string' ? expected : expected.notation) : '',
      actual: actual ? (typeof actual === 'string' ? actual : actual.notation) : '',
      message: 'No move was detected.',
      tip: 'Perform the expected move on the cube.'
    };
  }

  const expMove = typeof expected === 'string' ? parseMove(expected) : expected;
  const actMove = typeof actual === 'string' ? parseMove(actual) : actual;

  if (expMove.equals(actMove)) {
    return {
      isCorrect: true,
      type: MISTAKE_TYPES.CORRECT,
      expected: expMove.notation,
      actual: actMove.notation,
      message: `✓ Correct — ${actMove.notation} executed cleanly.`,
      tip: 'Well done!'
    };
  }

  // Same face checks
  if (expMove.face === actMove.face) {
    // Inverse check (e.g. R vs R')
    if (expMove.inverse().equals(actMove)) {
      return {
        isCorrect: false,
        type: MISTAKE_TYPES.WRONG_DIRECTION,
        expected: expMove.notation,
        actual: actMove.notation,
        message: `✗ Wrong direction — Expected ${expMove.notation}, but detected inverse ${actMove.notation}.`,
        tip: expMove.amount === 3
          ? `Turn the ${expMove.face} face counter-clockwise (prime).`
          : `Turn the ${expMove.face} face clockwise.`
      };
    }

    // Wrong rotation amount (e.g. R2 vs R, or R vs R2)
    if (expMove.amount !== actMove.amount) {
      const expDeg = expMove.amount === 2 ? '180° (double turn)' : expMove.amount === 3 ? '90° CCW' : '90° CW';
      const actDeg = actMove.amount === 2 ? '180°' : actMove.amount === 3 ? '90° CCW' : '90° CW';
      return {
        isCorrect: false,
        type: MISTAKE_TYPES.WRONG_AMOUNT,
        expected: expMove.notation,
        actual: actMove.notation,
        message: `✗ Wrong amount — Expected ${expMove.notation} (${expDeg}), but detected ${actMove.notation} (${actDeg}).`,
        tip: `Rotate the ${expMove.face} layer by exactly the specified degrees.`
      };
    }
  }

  // Different face
  return {
    isCorrect: false,
    type: MISTAKE_TYPES.WRONG_FACE,
    expected: expMove.notation,
    actual: actMove.notation,
    message: `✗ Wrong face — Expected ${expMove.notation} on the ${expMove.face} face, but detected ${actMove.notation} on ${actMove.face}.`,
    tip: `Focus on turning the ${expMove.face} face layer.`
  };
}

/**
 * Validates a sequence of performed moves against an expected algorithm.
 * Identifies the exact move index where divergence occurred.
 *
 * @param {string|Move[]} expectedAlgorithm
 * @param {string|Move[]} actualMoves
 * @returns {{
 *   isComplete: boolean,
 *   isCorrect: boolean,
 *   type: string,
 *   divergenceIndex: number|null,
 *   expectedMove: string|null,
 *   actualMove: string|null,
 *   expectedRemaining: string[],
 *   message: string,
 *   tip: string
 * }}
 */
export function detectSequenceDivergence(expectedAlgorithm, actualMoves) {
  const expected = typeof expectedAlgorithm === 'string'
    ? parseAlgorithm(expectedAlgorithm)
    : expectedAlgorithm;
  const actual = typeof actualMoves === 'string'
    ? parseAlgorithm(actualMoves)
    : (actualMoves || []).map(m => typeof m === 'string' ? parseMove(m) : m);

  // Check each move in sequence up to actual length
  for (let i = 0; i < actual.length; i++) {
    if (i >= expected.length) {
      // Extra unexpected move after algorithm finished
      return {
        isComplete: false,
        isCorrect: false,
        type: MISTAKE_TYPES.EXTRA_MOVE,
        divergenceIndex: i,
        expectedMove: null,
        actualMove: actual[i].notation,
        expectedRemaining: [],
        message: `✗ Extra move — Algorithm finished at step ${expected.length}, but detected extra move ${actual[i].notation}.`,
        tip: 'Stop executing once the full algorithm is completed.'
      };
    }

    const exp = expected[i];
    const act = actual[i];

    if (!exp.equals(act)) {
      const singleMistake = detectMoveMistake(exp, act);
      return {
        isComplete: false,
        isCorrect: false,
        type: singleMistake.type,
        divergenceIndex: i,
        expectedMove: exp.notation,
        actualMove: act.notation,
        expectedRemaining: expected.slice(i).map(m => m.notation),
        message: `✗ Diverged at move ${i + 1} of ${expected.length}: Expected ${exp.notation}, but performed ${act.notation}.`,
        tip: singleMistake.tip
      };
    }
  }

  // All moves so far are correct
  const isComplete = actual.length === expected.length;
  const remaining = expected.slice(actual.length).map(m => m.notation);

  if (isComplete) {
    return {
      isComplete: true,
      isCorrect: true,
      type: MISTAKE_TYPES.CORRECT,
      divergenceIndex: null,
      expectedMove: null,
      actualMove: null,
      expectedRemaining: [],
      message: `✓ Algorithm completed successfully (${expected.length}/${expected.length} moves).`,
      tip: 'Great execution!'
    };
  }

  return {
    isComplete: false,
    isCorrect: true, // In-progress correct
    type: MISTAKE_TYPES.CORRECT,
    divergenceIndex: null,
    expectedMove: expected[actual.length].notation,
    actualMove: null,
    expectedRemaining: remaining,
    message: `✓ Move ${actual.length} of ${expected.length} correct. Next move: ${expected[actual.length].notation}.`,
    tip: `Next up: ${expected[actual.length].notation}`
  };
}
