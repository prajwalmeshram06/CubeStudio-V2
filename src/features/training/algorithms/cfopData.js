/**
 * cfopData.js — Comprehensive CFOP Algorithm Catalog & Training Data.
 *
 * Covers:
 * - Cross fundamentals & basic alignment
 * - F2L core patterns (basic inserts, split & pair, corner in slot)
 * - 2-Look OLL (Edges & Corners)
 * - 2-Look PLL (Corner Permutation & Edge Permutation)
 *
 * Each entry provides setup sequences, recognition cues, and execution instructions.
 */

import { parseAlgorithm, inverseAlgorithm, formatAlgorithm } from '../../../cube/model/notation.js';

/**
 * Helper to generate an inverted setup string for an algorithm.
 * @param {string} alg
 * @returns {string}
 */
function deriveSetup(alg) {
  return formatAlgorithm(inverseAlgorithm(alg));
}

export const CFOP_STAGES = Object.freeze({
  CROSS: 'cross',
  F2L: 'f2l',
  OLL: 'oll',
  PLL: 'pll',
});

export const CFOP_ALGORITHMS = [
  // ==========================================
  // 1. CROSS FUNDAMENTALS
  // ==========================================
  {
    id: 'cross-direct-insert',
    name: 'Direct Bottom Insert',
    stage: CFOP_STAGES.CROSS,
    category: 'Cross Fundamentals',
    difficulty: 'Beginner',
    notation: "F2",
    setup: "F2",
    recognition: 'White edge piece located in the top layer (U), white sticker facing Up, matching the front center.',
    explanation: 'Rotate the front face 180° to bring the white cross piece directly into the bottom D layer aligned with its center.',
  },
  {
    id: 'cross-side-insert',
    name: 'Flipped Edge Keyhole Insert',
    stage: CFOP_STAGES.CROSS,
    category: 'Cross Fundamentals',
    difficulty: 'Beginner',
    notation: "F' U' R U",
    setup: deriveSetup("F' U' R U"),
    recognition: 'White edge piece is in the front slot with white facing Front (flipped orientation).',
    explanation: 'Move the front face counter-clockwise, place it into the right slot with R, and restore the top layer.',
  },
  {
    id: 'cross-middle-slice-insert',
    name: 'Middle Layer Edge Insert',
    stage: CFOP_STAGES.CROSS,
    category: 'Cross Fundamentals',
    difficulty: 'Beginner',
    notation: "R' D' R D",
    setup: deriveSetup("R' D' R D"),
    recognition: 'Cross edge piece stuck in equatorial middle layer facing right.',
    explanation: 'Bring the edge into the bottom layer with R\' D\', then restore the right layer with R.',
  },

  // ==========================================
  // 2. FIRST TWO LAYERS (F2L)
  // ==========================================
  {
    id: 'f2l-basic-insert-right',
    name: 'Basic Right Insert (Connected Pair)',
    stage: CFOP_STAGES.F2L,
    category: 'F2L Basics',
    difficulty: 'Beginner',
    notation: "U R U' R'",
    setup: deriveSetup("U R U' R'"),
    recognition: 'Corner and edge are correctly paired in the U layer ready to be inserted into the front-right slot.',
    explanation: 'Move the pair out of the way, open the right slot with R, insert with U\', and close with R\'.',
  },
  {
    id: 'f2l-basic-insert-left',
    name: 'Basic Left Insert (Connected Pair)',
    stage: CFOP_STAGES.F2L,
    category: 'F2L Basics',
    difficulty: 'Beginner',
    notation: "U' L' U L",
    setup: deriveSetup("U' L' U L"),
    recognition: 'Corner and edge are correctly paired in the U layer ready to be inserted into the front-left slot.',
    explanation: 'Move the pair away with U\', raise the left slot with L\', insert with U, and close with L.',
  },
  {
    id: 'f2l-sexy-move-insert',
    name: 'Standard 3-Move Insert (Sexy Insert)',
    stage: CFOP_STAGES.F2L,
    category: 'F2L Basics',
    difficulty: 'Beginner',
    notation: "R U R'",
    setup: deriveSetup("R U R'"),
    recognition: 'Corner has white facing Right above its target FR slot, edge is in the back-right position matching colors.',
    explanation: 'Open the right slot with R, join corner and edge with U, and insert into the bottom layer with R\'.',
  },
  {
    id: 'f2l-split-pair-diff-top',
    name: 'Different Colors on Top (Separated)',
    stage: CFOP_STAGES.F2L,
    category: 'F2L Intermediate',
    difficulty: 'Intermediate',
    notation: "U' R U R' U R U R'",
    setup: deriveSetup("U' R U R' U R U R'"),
    recognition: 'Corner white sticker faces right or front, top stickers of corner and edge have different colors.',
    explanation: 'Position the pieces to pair up on the U layer, then insert directly into the front-right slot.',
  },
  {
    id: 'f2l-split-pair-same-top',
    name: 'Same Color on Top (Separated)',
    stage: CFOP_STAGES.F2L,
    category: 'F2L Intermediate',
    difficulty: 'Intermediate',
    notation: "U' R U2 R' U2 R U' R'",
    setup: deriveSetup("U' R U2 R' U2 R U' R'"),
    recognition: 'Corner and edge both have matching colors facing UP on the top layer.',
    explanation: 'Hide the corner using R U2 R\', reposition the edge with U2, then join and insert with R U\' R\'.',
  },
  {
    id: 'f2l-white-facing-up',
    name: 'Corner White Facing Up',
    stage: CFOP_STAGES.F2L,
    category: 'F2L Intermediate',
    difficulty: 'Intermediate',
    notation: "R U2 R' U' R U R'",
    setup: deriveSetup("R U2 R' U' R U R'"),
    recognition: 'White sticker of the corner piece is pointing straight UP on the U layer.',
    explanation: 'Orient the corner while matching with edge using R U2 R\', then insert the paired pieces with R U R\'.',
  },

  // ==========================================
  // 3. 2-LOOK OLL (ORIENTATION OF LAST LAYER)
  // ==========================================
  // --- Step 1: Edge Orientation (Yellow Cross) ---
  {
    id: 'oll-edge-line',
    name: 'OLL Edge Line (Bar)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Edges)',
    difficulty: 'Beginner',
    notation: "F R U R' U' F'",
    setup: deriveSetup("F R U R' U' F'"),
    recognition: 'Horizontal yellow bar across the top face with 2 oriented yellow edges.',
    explanation: 'Standard front face trigger followed by the standard sexy move (R U R\' U\') to orient all 4 top edges.',
  },
  {
    id: 'oll-edge-small-l',
    name: 'OLL Edge Small L (Angle)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Edges)',
    difficulty: 'Beginner',
    notation: "F U R U' R' F'",
    setup: deriveSetup("F U R U' R' F'"),
    recognition: 'Two adjacent yellow edges forming an "L" shape at the back and left positions.',
    explanation: 'Alternative front trigger (F U R U\' R\' F\') converting the 90° angle into a full yellow cross.',
  },
  {
    id: 'oll-edge-dot',
    name: 'OLL Edge Dot',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Edges)',
    difficulty: 'Intermediate',
    notation: "F R U R' U' F' U2 F U R U' R' F'",
    setup: deriveSetup("F R U R' U' F' U2 F U R U' R' F'"),
    recognition: 'Only the center yellow sticker is oriented; no yellow edge stickers on top.',
    explanation: 'Execute the Line algorithm to create an L-shape, rotate top face, then execute the L-shape algorithm.',
  },

  // --- Step 2: Corner Orientation (Yellow Face) ---
  {
    id: 'oll-corner-sune',
    name: 'Sune (OLL 27)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Corners)',
    difficulty: 'Beginner',
    notation: "R U R' U R U2 R'",
    setup: deriveSetup("R U R' U R U2 R'"),
    recognition: '1 corner oriented on top (bottom-left), front-right corner yellow sticker points Front (Fish pattern).',
    explanation: 'The classic Sune algorithm: lifts the right pair, tracks it around the top layer, and drops it home.',
  },
  {
    id: 'oll-corner-anti-sune',
    name: 'Anti-Sune (OLL 26)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Corners)',
    difficulty: 'Beginner',
    notation: "R' U' R U' R' U2 R",
    setup: deriveSetup("R' U' R U' R' U2 R"),
    recognition: '1 corner oriented on top (top-right), front-left corner yellow sticker points Left.',
    explanation: 'The mirror inverse of Sune: lifts the back-right pair with R\', rotates U\', and settles with U2 R.',
  },
  {
    id: 'oll-corner-h',
    name: 'H Pattern / Double Headlights (OLL 21)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Corners)',
    difficulty: 'Intermediate',
    notation: "R U R' U R U' R' U R U2 R'",
    setup: deriveSetup("R U R' U R U' R' U R U2 R'"),
    recognition: '0 corners oriented on top; two pairs of headlights pointing out on the Left and Right faces.',
    explanation: 'Double Sune combination or standard H algorithm to orient all 4 unoriented yellow corners.',
  },
  {
    id: 'oll-corner-pi',
    name: 'Pi Pattern / Wheel (OLL 22)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Corners)',
    difficulty: 'Intermediate',
    notation: "R U2 R2 U' R2 U' R2 U2 R",
    setup: deriveSetup("R U2 R2 U' R2 U' R2 U2 R"),
    recognition: '0 corners oriented on top; one pair of headlights on Left and two opposing stickers on Front & Back.',
    explanation: 'Pi algorithm using double right turns (R2) to rapidly flip all 4 corners simultaneously.',
  },
  {
    id: 'oll-corner-headlights-t',
    name: 'Headlights / T Shape (OLL 24)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Corners)',
    difficulty: 'Intermediate',
    notation: "R2 D R' U2 R D' R' U2 R'",
    setup: deriveSetup("R2 D R' U2 R D' R' U2 R'"),
    recognition: '2 adjacent corners oriented facing UP; other 2 corners face forward like car headlights.',
    explanation: 'A commutator-based OLL utilizing D and D\' slice maneuvers to twist both front corners.',
  },
  {
    id: 'oll-corner-chameleon-l',
    name: 'Chameleon / L Shape (OLL 25)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Corners)',
    difficulty: 'Intermediate',
    notation: "F' R U R' U' R' F R",
    setup: deriveSetup("F' R U R' U' R' F R"),
    recognition: '2 adjacent corners oriented facing UP; the other 2 face outward away from each other.',
    explanation: 'A swift algorithm beginning with F\' and using sexy move fragments to twist diagonal corners.',
  },
  {
    id: 'oll-corner-bowtie',
    name: 'Bowtie Pattern (OLL 23)',
    stage: CFOP_STAGES.OLL,
    category: '2-Look OLL (Corners)',
    difficulty: 'Intermediate',
    notation: "R2 D' R U2 R' D R U2 R",
    setup: deriveSetup("R2 D' R U2 R' D R U2 R"),
    recognition: '2 diagonally opposite corners oriented facing UP; the other 2 yellow stickers face Front & Left.',
    explanation: 'Smooth D\'/D corner-twisting sequence for the diagonal corner orientation case.',
  },

  // ==========================================
  // 4. 2-LOOK PLL (PERMUTATION OF LAST LAYER)
  // ==========================================
  // --- Step 1: Corner Permutation ---
  {
    id: 'pll-corner-t-perm',
    name: 'T Permutation (Adjacent Swap)',
    stage: CFOP_STAGES.PLL,
    category: '2-Look PLL (Corners)',
    difficulty: 'Intermediate',
    notation: "R U R' U' R' F R2 U' R' U' R U R' F'",
    setup: deriveSetup("R U R' U' R' F R2 U' R' U' R U R' F'"),
    recognition: 'One side has 2 matching corner headlights; swaps the other two adjacent corners and two edges.',
    explanation: 'The most popular PLL algorithm in speedcubing: sexy move → sledgehammer transition → final F\'.',
  },
  {
    id: 'pll-corner-y-perm',
    name: 'Y Permutation (Diagonal Swap)',
    stage: CFOP_STAGES.PLL,
    category: '2-Look PLL (Corners)',
    difficulty: 'Intermediate',
    notation: "F R U' R' U' R U R' F' R U R' U' R' F R F'",
    setup: deriveSetup("F R U' R' U' R U R' F' R U R' U' R' F R F'"),
    recognition: 'No matching corner headlights anywhere on the sides; swaps diagonally opposite corners.',
    explanation: 'Compound algorithm: first block executes an inverted trigger, followed by a standard T-perm ending.',
  },

  // --- Step 2: Edge Permutation ---
  {
    id: 'pll-edge-ua-perm',
    name: 'Ua Permutation (Clockwise 3-Edge Cycle)',
    stage: CFOP_STAGES.PLL,
    category: '2-Look PLL (Edges)',
    difficulty: 'Beginner',
    notation: "R U' R U R U R U' R' U' R2",
    setup: deriveSetup("R U' R U R U R U' R' U' R2"),
    recognition: 'One solved bar at the back; remaining 3 edges cycle clockwise (Left → Front → Right).',
    explanation: 'Fast RU-gen edge cycle algorithm widely used by speedcubers for right-handed execution.',
  },
  {
    id: 'pll-edge-ub-perm',
    name: 'Ub Permutation (Counter-Clockwise 3-Edge Cycle)',
    stage: CFOP_STAGES.PLL,
    category: '2-Look PLL (Edges)',
    difficulty: 'Beginner',
    notation: "R2 U R U R' U' R' U' R' U R'",
    setup: deriveSetup("R2 U R U R' U' R' U' R' U R'"),
    recognition: 'One solved bar at the back; remaining 3 edges cycle counter-clockwise (Right → Front → Left).',
    explanation: 'Mirror RU-gen edge cycle starting with R2 and driving counter-clockwise edge cycling.',
  },
  {
    id: 'pll-edge-h-perm',
    name: 'H Permutation (Opposite 4-Edge Swap)',
    stage: CFOP_STAGES.PLL,
    category: '2-Look PLL (Edges)',
    difficulty: 'Intermediate',
    notation: "R2 U2 R U2 R2 U2 R2 U2 R U2 R2",
    setup: deriveSetup("R2 U2 R U2 R2 U2 R2 U2 R U2 R2"),
    recognition: 'All corners are solved; opposite edges need to swap (Front ↔ Back and Left ↔ Right).',
    explanation: 'RU-gen variation of H Perm avoiding middle slice turns for clean standard simulator execution.',
  },
  {
    id: 'pll-edge-z-perm',
    name: 'Z Permutation (Adjacent 4-Edge Swap)',
    stage: CFOP_STAGES.PLL,
    category: '2-Look PLL (Edges)',
    difficulty: 'Intermediate',
    notation: "R' U' R2 U R U R' U' R U R U' R U' R'",
    setup: deriveSetup("R' U' R2 U R U R' U' R U R U' R U' R'"),
    recognition: 'All corners solved; adjacent edges need to swap pairwise (Front ↔ Right, Back ↔ Left).',
    explanation: 'Clean RU-gen algorithm that swaps adjacent edge pairs without middle-slice notation.',
  },
];

/**
 * Validates and ensures all algorithm setups parse properly.
 */
CFOP_ALGORITHMS.forEach(item => {
  try {
    item.parsedMoves = parseAlgorithm(item.notation);
    item.moveCount = item.parsedMoves.length;
  } catch (e) {
    console.error(`Failed to parse algorithm ${item.id}:`, e);
  }
});

/**
 * Get algorithm by unique ID.
 * @param {string} id
 * @returns {typeof CFOP_ALGORITHMS[0]|undefined}
 */
export function getAlgorithmById(id) {
  return CFOP_ALGORITHMS.find(a => a.id === id);
}

/**
 * Get algorithms filtered by stage.
 * @param {'cross'|'f2l'|'oll'|'pll'} stage
 * @returns {typeof CFOP_ALGORITHMS}
 */
export function getAlgorithmsByStage(stage) {
  return CFOP_ALGORITHMS.filter(a => a.stage === stage);
}
