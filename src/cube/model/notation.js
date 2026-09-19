/**
 * CubeStudio V2 - Move and Algorithm Notation Parser
 * Parses standard WCA / Singmaster move strings and algorithms.
 */

import { Move } from './moves.js';

// Regex for a single move token: Face letter followed by optional modifier (' or 2 or 2' or i)
const MOVE_REGEX = /^([URFDLB])(['’i2]?)$/;

/**
 * Parses a single move string token into a Move instance.
 * Examples: "R", "U'", "F2", "L’", "Bi"
 * @param {string} text
 * @returns {Move}
 */
export function parseMove(text) {
  if (typeof text !== 'string') {
    throw new Error(`Invalid move input: expected string, got ${typeof text}`);
  }

  const trimmed = text.trim();
  const match = trimmed.match(MOVE_REGEX);

  if (!match) {
    throw new Error(`Invalid move notation: "${text}"`);
  }

  const [, face, modifier] = match;
  let amount = 1;

  if (modifier === '2') {
    amount = 2;
  } else if (modifier === "'" || modifier === '’' || modifier === 'i') {
    amount = 3;
  }

  return new Move(face, amount);
}

/**
 * Parses a sequence of moves (algorithm) from string.
 * Strips parentheses, brackets, commentary, and extra whitespace.
 * Expands simple multipliers if formatted as (R U R' U')2 or (R U R' U')*2.
 * @param {string} text
 * @returns {Move[]}
 */
export function parseAlgorithm(text) {
  if (typeof text !== 'string') {
    throw new Error(`Invalid algorithm input: expected string, got ${typeof text}`);
  }

  // Remove comment lines (e.g. // or #)
  const cleaned = text
    .split('\n')
    .map(line => line.replace(/(\/\/|#).*$/, ''))
    .join(' ');

  // Handle multiplier groups: e.g. (R U R' U')2 or (R U R' U')*3
  let expanded = cleaned;
  const groupRegex = /\(([^)]+)\)\s*\*?(\d+)/g;
  while (groupRegex.test(expanded)) {
    expanded = expanded.replace(groupRegex, (_, inner, count) => {
      const times = parseInt(count, 10);
      return Array(times).fill(inner).join(' ');
    });
  }

  // Remove remaining grouping parentheses/brackets
  expanded = expanded.replace(/[()[\]{}]/g, ' ');

  // Split by whitespace
  const tokens = expanded.trim().split(/\s+/).filter(Boolean);

  return tokens.map(token => parseMove(token));
}

/**
 * Formats an array of Move instances into a standard space-separated string.
 * @param {Move[]} moves
 * @returns {string}
 */
export function formatAlgorithm(moves) {
  if (!Array.isArray(moves)) {
    throw new Error(`Expected array of moves, got ${typeof moves}`);
  }
  return moves.map(m => m.notation).join(' ');
}

/**
 * Inverts an algorithm: reverses the sequence and inverts each move.
 * (A B C)^-1 = C^-1 B^-1 A^-1
 * @param {Move[]|string} input - Array of Move objects or algorithm string
 * @returns {Move[]}
 */
export function inverseAlgorithm(input) {
  const moves = typeof input === 'string' ? parseAlgorithm(input) : input;
  if (!Array.isArray(moves)) {
    throw new Error(`Expected array of moves or string, got ${typeof input}`);
  }

  return [...moves].reverse().map(move => move.inverse());
}
