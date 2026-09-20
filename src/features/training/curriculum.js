/**
 * CubeStudio V2 - Beginner 9-lesson curriculum
 *
 * Lesson metadata only. Cube transformations use applyAlgorithm / CubeState.
 */

import { CubeState } from '../../cube/model/CubeState.js';
import { applyAlgorithm } from '../../cube/engine/applyMove.js';

export const BEGINNER_CURRICULUM_ID = 'beginner-method';
export const BEGINNER_CURRICULUM_TITLE = 'Beginner Method';

export const LESSON_PHASES = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  INTRO: 'INTRO',
  EXPLANATION: 'EXPLANATION',
  DEMO: 'DEMO',
  PRACTICE: 'PRACTICE',
  COMPLETED: 'COMPLETED'
});

const WHITE_EDGES = ['UR', 'UF', 'UL', 'UB'];
const WHITE_CORNERS = ['URF', 'UFL', 'ULB', 'UBR'];
const E_SLICE = ['FR', 'FL', 'BL', 'BR'];

/**
 * @param {object} lesson
 * @returns {import('../../cube/model/CubeState.js').CubeState}
 */
export function createLessonStartState(lesson) {
  const solved = CubeState.createSolved();
  if (!lesson?.setupAlgorithm) return solved;
  return applyAlgorithm(solved, lesson.setupAlgorithm);
}

export const BEGINNER_LESSONS = Object.freeze([
  Object.freeze({
    id: 'cube-basics',
    title: 'Cube Basics',
    order: 1,
    objective: 'Learn the cube’s faces, centers, edges, and corners, then perform a reversible turn.',
    explanation:
      'A 3×3 cube has six faces. Each face has a fixed center color: white (U), yellow (D), red (R), orange (L), green (F), and blue (B). '
      + 'Edges have two colors and corners have three. Centers never move relative to each other; they define the color of each face. '
      + 'A face turn rotates one layer 90° clockwise unless marked otherwise.',
    setupAlgorithm: '',
    demoAlgorithm: "R R'",
    algorithms: ['R', "R'"],
    progressMode: 'sequence',
    completion: { kind: 'solved' },
    instructions: 'Turn the right face clockwise, then undo that turn.',
    validationRules: ['sequence-steps', 'authoritative-cube-state'],
    hints: [
      'Centers stay put. Use them as a reference for where each color belongs.',
      'The piece you are moving is on the right face, next to the red center.',
      'Perform R, then restore the cube with R′.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'turn-right',
        instruction: 'Turn the Right face clockwise (R). Watch the right layer rotate as a group.',
        expectedMoves: ['R'],
        targetPiece: { kind: 'edge', homeSlot: 'UR' },
        completion: { kind: 'equalsApplied', from: 'stepStart', algorithm: 'R' },
        hints: [
          'A clockwise turn is the default R move, without a prime or 2.',
          'The white-red edge on top of the red center will leave the top layer.',
          'Press R (or click R).'
        ]
      }),
      Object.freeze({
        id: 'undo-right',
        instruction: 'Undo the turn with R′ so the cube returns to solved.',
        expectedMoves: ["R'"],
        completion: { kind: 'equalsApplied', from: 'stepStart', algorithm: "R'" },
        hints: [
          'The inverse of a clockwise face turn is the same face, counter-clockwise.',
          'The white-red edge should return beside the white and red centers.',
          'Press R′.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'cube-notation',
    title: 'Cube Notation',
    order: 2,
    objective: 'Read Singmaster / WCA notation: faces, primes, and double turns.',
    explanation:
      'Each face is a letter: U (up), D (down), L (left), R (right), F (front), B (back). '
      + 'R turns the right face 90° clockwise. R′ is counter-clockwise. R2 is 180°. '
      + 'Algorithms are sequences of these tokens, such as R U R′ U′.',
    setupAlgorithm: '',
    demoAlgorithm: "U U'",
    algorithms: ['U', 'R', 'R2', "R'"],
    progressMode: 'sequence',
    completion: { kind: 'solved' },
    instructions: 'Execute U, then R2, then restore with R2 and U′.',
    validationRules: ['sequence-steps', 'notation-moves'],
    hints: [
      'Letter = face. No suffix means clockwise. ′ means counter-clockwise. 2 means 180°.',
      'U is the white face (top). R is the red face (right).',
      'The practice sequence is U, R2, R2, U′.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'u-turn',
        instruction: 'Perform U — turn the Up (white) face clockwise.',
        expectedMoves: ['U'],
        completion: { kind: 'equalsApplied', from: 'stepStart', algorithm: 'U' },
        hints: [
          'U is the top face, whose center is white.',
          'Only the top layer should move.',
          'Press U.'
        ]
      }),
      Object.freeze({
        id: 'r2-turn',
        instruction: 'Perform R2 — a 180° turn of the Right face.',
        expectedMoves: ['R2'],
        completion: { kind: 'equalsApplied', from: 'stepStart', algorithm: 'R2' },
        hints: [
          'A 2 suffix means two quarter-turns in the same direction.',
          'The white-red edge will travel to the bottom layer.',
          'Press R2.'
        ]
      }),
      Object.freeze({
        id: 'r2-undo',
        instruction: 'Repeat R2 to restore the right face.',
        expectedMoves: ['R2'],
        completion: { kind: 'equalsApplied', from: 'stepStart', algorithm: 'R2' },
        hints: [
          'R2 is its own inverse: two 180° turns return the face.',
          'The white-red edge should return to the top layer.',
          'Press R2 again.'
        ]
      }),
      Object.freeze({
        id: 'u-undo',
        instruction: 'Perform U′ to return the cube to solved.',
        expectedMoves: ["U'"],
        completion: { kind: 'equalsApplied', from: 'stepStart', algorithm: "U'" },
        hints: [
          'U′ is the inverse of the U you started with.',
          'The top layer should match the white center again.',
          'Press U′.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'white-cross',
    title: 'White Cross',
    order: 3,
    objective: 'Place the four white edges on the white (U) face so the side colors match the centers.',
    explanation:
      'The white cross is the first stage of the beginner method. Each white edge belongs between the white center and one side center. '
      + 'In this drill the four white edges start on the yellow face, opposite their home slots. A 180° turn of the matching side face sends each edge home.',
    setupAlgorithm: 'F2 R2 B2 L2',
    demoAlgorithm: 'L2 B2 R2 F2',
    algorithms: ['F2', 'R2', 'B2', 'L2'],
    progressMode: 'state',
    completion: { kind: 'whiteCross' },
    instructions: 'Bring each white edge to the top so the side color matches the side center.',
    validationRules: ['white-u-edges-permutation-and-orientation'],
    hints: [
      'A solved white cross has white on top and matching side colors — not a daisy of white edges around yellow.',
      'Each white edge in this setup sits on the yellow face, opposite its home. Look at the side color to choose the face.',
      'F2, R2, B2, and L2 each place one white edge. Order does not matter.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'one-white-edge',
        instruction: 'Place any one white edge into its correct top slot, aligned with the side center.',
        expectedMoves: ['F2', 'R2', 'B2', 'L2'],
        targetPiece: { kind: 'edge', homeSlot: 'UF' },
        completion: { kind: 'edgesSolved', slots: WHITE_EDGES, min: 1 },
        hints: [
          'Find a white edge on the bottom. Its other color tells you which face to turn.',
          'The white-green edge belongs at UF, above the green center.',
          'If the white-green edge is on the front-down slot, F2 places it.'
        ]
      }),
      Object.freeze({
        id: 'two-white-edges',
        instruction: 'Place a second white edge without displacing the first.',
        expectedMoves: ['F2', 'R2', 'B2', 'L2'],
        completion: { kind: 'edgesSolved', slots: WHITE_EDGES, min: 2 },
        hints: [
          'Turn a different side face so you do not kick out an already-placed edge.',
          'White-red belongs at UR, white-blue at UB, white-orange at UL.',
          'Use the matching 180° side turn: R2, B2, or L2.'
        ]
      }),
      Object.freeze({
        id: 'three-white-edges',
        instruction: 'Place a third white edge of the cross.',
        expectedMoves: ['F2', 'R2', 'B2', 'L2'],
        completion: { kind: 'edgesSolved', slots: WHITE_EDGES, min: 3 },
        hints: [
          'Three arms of the cross should now match their side centers.',
          'Identify the remaining white edge on the bottom layer.',
          'The last unused double turn among F2, R2, B2, L2 will place it later — for now place the third.'
        ]
      }),
      Object.freeze({
        id: 'full-white-cross',
        instruction: 'Place the fourth white edge to complete the aligned white cross.',
        expectedMoves: ['F2', 'R2', 'B2', 'L2'],
        completion: { kind: 'whiteCross' },
        hints: [
          'The cross is finished only when all four side colors match their centers.',
          'The last white edge is still on the yellow face, opposite its home slot.',
          'Perform the remaining F2, R2, B2, or L2.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'white-corners',
    title: 'White Corners',
    order: 4,
    objective: 'Seat the four white corners around the white cross without destroying the cross.',
    explanation:
      'Each white corner belongs in one U-layer slot whose three centers match the corner’s colors. '
      + 'This drill starts with the white cross solved and three U-layer corners cycled. Restore those corners to complete the first layer.',
    setupAlgorithm: "R' F R' B2 R F' R' B2 R2",
    demoAlgorithm: "R2 B2 R F R' B2 R F' R",
    algorithms: ["R' F R' B2 R F' R' B2 R2"],
    progressMode: 'state',
    completion: { kind: 'whiteCorners' },
    instructions: 'Cycle the U-layer corners until each white corner sits in its matching slot, correctly oriented.',
    validationRules: ['u-corners-permutation-and-orientation', 'white-cross-preserved'],
    hints: [
      'Keep the white cross on top. You are only permuting the four white corners.',
      'The three displaced corners are URF, ULB, and UBR.',
      'The demonstration algorithm is the inverse A-permutation: R2 B2 R F R′ B2 R F′ R.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'one-white-corner',
        instruction: 'Place at least one displaced white corner into its correct U-layer slot.',
        targetPiece: { kind: 'corner', homeSlot: 'URF' },
        completion: { kind: 'cornersSolved', slots: WHITE_CORNERS, min: 2 },
        hints: [
          'One white corner is already solved in this setup; restore another into its slot.',
          'URF is the white-red-green corner, above the red and green centers.',
          'Use the lesson algorithm or its inverse to cycle the three corners.'
        ]
      }),
      Object.freeze({
        id: 'all-white-corners',
        instruction: 'Finish seating every white corner so the entire first layer is solved.',
        completion: { kind: 'whiteCorners' },
        hints: [
          'All four U corners must match permutation and orientation, not just show white on top.',
          'Check that each corner’s side colors match the adjacent centers.',
          'Complete the inverse A-permutation: R2 B2 R F R′ B2 R F′ R.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'second-layer',
    title: 'Second Layer',
    order: 5,
    objective: 'Insert the four middle-layer edges between the completed first layer and the yellow face.',
    explanation:
      'With the white face solved, the E-slice edges (FR, FL, BL, BR) belong between the side centers. '
      + 'This drill keeps both the white and yellow faces solved and cycles three middle-layer edges.',
    setupAlgorithm: 'R2 U2 F2 U2 R2 U2 F2 U2',
    demoAlgorithm: 'U2 F2 U2 R2 U2 F2 U2 R2',
    algorithms: ['R2 U2 F2 U2 R2 U2 F2 U2'],
    progressMode: 'state',
    completion: { kind: 'secondLayer' },
    instructions: 'Restore the front, right, and left middle-layer edges to their matching centers.',
    validationRules: ['e-slice-edges', 'first-layer-preserved'],
    hints: [
      'Do not turn the white face as a “first layer” reset; the first layer is already solved.',
      'FR is green-red, FL is green-orange, BR is blue-red. One of those three is already home.',
      'The restoring sequence is U2 F2 U2 R2 U2 F2 U2 R2.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'one-middle-edge',
        instruction: 'Place at least three of the four middle-layer edges correctly (one is already home).',
        targetPiece: { kind: 'edge', homeSlot: 'FR' },
        completion: { kind: 'edgesSolved', slots: E_SLICE, min: 3 },
        hints: [
          'Only FR, FL, and BR are displaced in this starting state.',
          'The green-red edge belongs between the green and red centers.',
          'Follow the demonstration algorithm if the cycle is unclear.'
        ]
      }),
      Object.freeze({
        id: 'all-middle-edges',
        instruction: 'Finish the second layer so all four E-slice edges are solved.',
        completion: { kind: 'secondLayer' },
        hints: [
          'The second layer is done when FR, FL, BL, and BR all match their two centers.',
          'The first layer must still be intact — white on top, yellow on bottom.',
          'U2 F2 U2 R2 U2 F2 U2 R2 restores the cycle.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'yellow-cross',
    title: 'Yellow Cross',
    order: 6,
    objective: 'Form a yellow cross on the yellow (D) face while keeping the first two layers solved.',
    explanation:
      'After F2L, the last layer is yellow (D). The beginner yellow-cross algorithm orients the yellow edges into a plus. '
      + 'Because CubeStudio keeps white as U, this conjugated algorithm works on D without breaking the white face: B R D R′ D′ B′.',
    setupAlgorithm: "B D R D' R' B'",
    demoAlgorithm: "B R D R' D' B'",
    algorithms: ["B R D R' D' B'"],
    progressMode: 'state',
    completion: { kind: 'yellowCross' },
    instructions: 'Orient the yellow edges so the yellow face shows a cross (plus) around the yellow center.',
    validationRules: ['d-face-yellow-edge-stickers', 'f2l-preserved'],
    hints: [
      'You need a plus of yellow edge stickers on D, not yet a fully solved yellow face.',
      'Hold the cube so you can see the yellow center; the first two layers stay on U and the equator.',
      'Apply B R D R′ D′ B′.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'form-yellow-cross',
        instruction: 'Form the yellow cross on D without breaking the first two layers.',
        expectedMoves: ['B', 'R', 'D', "R'", "D'", "B'"],
        completion: { kind: 'yellowCross' },
        hints: [
          'Dot, L, and line cases all reduce to a cross with the same beginner algorithm, repeated as needed.',
          'Yellow edge stickers belong on the D face, around the yellow center.',
          'The full sequence is B R D R′ D′ B′.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'yellow-face',
    title: 'Yellow Face',
    order: 7,
    objective: 'Orient the yellow corners so the entire yellow face is yellow.',
    explanation:
      'Once the yellow cross exists, Sune orients last-layer corners. With yellow on D the conjugated Sune is R D R′ D R D2 R′. '
      + 'Permutation can still be wrong after this step; the whole D face should simply show yellow.',
    setupAlgorithm: "R D2 R' D' R D' R'",
    demoAlgorithm: "R D R' D R D2 R'",
    algorithms: ["R D R' D R D2 R'"],
    progressMode: 'state',
    completion: { kind: 'yellowFace' },
    instructions: 'Twist the last-layer corners until every D-face sticker is yellow.',
    validationRules: ['d-face-all-yellow', 'f2l-preserved'],
    hints: [
      'Ignore side-color permutation for now. Only yellow on D matters for this lesson.',
      'Sune is usually repeated while a correctly oriented corner is held in a fixed slot.',
      'The conjugated Sune is R D R′ D R D2 R′.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'orient-yellow-corners',
        instruction: 'Orient the yellow corners to complete the yellow face.',
        expectedMoves: ['R', 'D', "R'", 'D', 'R', 'D2', "R'"],
        completion: { kind: 'yellowFace' },
        hints: [
          'The yellow cross is already present in this starting state.',
          'Corner orientation is separate from corner permutation.',
          'Execute R D R′ D R D2 R′.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'last-layer-corners',
    title: 'Last-Layer Corners',
    order: 8,
    objective: 'Permute the yellow corners into their correct slots.',
    explanation:
      'With the yellow face oriented, swap last-layer corners until each sits between its two side centers. '
      + 'This drill uses a D-layer A-permutation that leaves edges untouched.',
    setupAlgorithm: "R' B R' F2 R B' R' F2 R2",
    demoAlgorithm: "R2 F2 R B R' F2 R B' R",
    algorithms: ["R' B R' F2 R B' R' F2 R2"],
    progressMode: 'state',
    completion: { kind: 'lastLayerCorners' },
    instructions: 'Cycle the three displaced D-layer corners into their home slots.',
    validationRules: ['all-eight-corners-solved', 'f2l-preserved'],
    hints: [
      'Headlights (matching side colors on a face) help you aim the cycle.',
      'The displaced corners are DFR, DLF, and DRB.',
      'Restore them with R2 F2 R B R′ F2 R B′ R.'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'permute-ll-corners',
        instruction: 'Permute the last-layer corners until all eight cube corners are solved.',
        targetPiece: { kind: 'corner', homeSlot: 'DFR' },
        completion: { kind: 'lastLayerCorners' },
        hints: [
          'Edges are already solved in this drill — only three yellow corners are cycled.',
          'DFR is the yellow-green-red corner.',
          'Apply R2 F2 R B R′ F2 R B′ R.'
        ]
      })
    ])
  }),

  Object.freeze({
    id: 'last-layer-edges',
    title: 'Last-Layer Edges',
    order: 9,
    objective: 'Permute the yellow edges to fully solve the cube.',
    explanation:
      'The last beginner step swaps last-layer edges. This drill starts from a D-layer H-permutation: opposite yellow edges are swapped. '
      + 'Restoring them solves the cube.',
    setupAlgorithm: 'R2 D2 R D2 R2 D2 R2 D2 R D2 R2',
    demoAlgorithm: 'R2 D2 R D2 R2 D2 R2 D2 R D2 R2',
    algorithms: ['R2 D2 R D2 R2 D2 R2 D2 R D2 R2'],
    progressMode: 'state',
    completion: { kind: 'lastLayerEdges' },
    instructions: 'Swap the last-layer edges until the cube is solved.',
    validationRules: ['solved-cube'],
    hints: [
      'All corners are already solved. Only the four yellow edges are misplaced.',
      'Opposite edges are swapped: DR with DL, and DF with DB.',
      'The H-permutation on D is R2 D2 R D2 R2 D2 R2 D2 R D2 R2 (it is self-inverse).'
    ],
    steps: Object.freeze([
      Object.freeze({
        id: 'permute-ll-edges',
        instruction: 'Permute the last-layer edges to solve the cube.',
        expectedMoves: ['R2', 'D2', 'R', 'D2', 'R2', 'D2', 'R2', 'D2', 'R', 'D2', 'R2'],
        completion: { kind: 'lastLayerEdges' },
        hints: [
          'A solved cube has every face matching its center color.',
          'You are swapping two pairs of opposite yellow edges.',
          'Execute R2 D2 R D2 R2 D2 R2 D2 R D2 R2.'
        ]
      })
    ])
  })
]);

export function getBeginnerLessonById(id) {
  return BEGINNER_LESSONS.find((lesson) => lesson.id === id) || null;
}

export function getBeginnerLessonByOrder(order) {
  return BEGINNER_LESSONS.find((lesson) => lesson.order === order) || null;
}
