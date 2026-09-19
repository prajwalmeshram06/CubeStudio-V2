# CubeStudio V2 — Training and Learning Specification

## 1. Purpose
Teach users to solve and improve while reusing the same CubeState and cube engine.

## 2. Beginner curriculum
1. Cube Basics
2. Notation
3. White Cross
4. White Corners
5. Second Layer
6. Yellow Cross
7. Yellow Face
8. Last-Layer Corners
9. Last-Layer Edges

## 3. Lesson structure
Each lesson defines:
- objective
- explanation
- starting state
- target state
- algorithm
- animation
- practice
- validation
- completion condition

## 4. Feedback
Distinguish correct move, incorrect move, incorrect direction, wrong piece, and completed step. Explain mistakes rather than silently fixing them unless auto-reset is explicitly part of the lesson.

## 5. Trainers
Provide move, notation, and algorithm trainers with visual and text recognition.

## 6. CFOP
Support Cross, F2L, OLL, PLL, including 2-look OLL and 2-look PLL.

## 7. Mistake detection
Compare expected and actual CubeState and classify wrong move, wrong direction, wrong piece, extra move, missing move, or incorrect algorithm state where possible.

## 8. Progress
Track lessons, attempts, accuracy, execution time, recurring mistakes, and learned algorithms.

## 9. Future AI coach
May analyze solve history, recurring mistakes, timing trends, algorithms, and training progress to provide explanations and practice plans. It must not become a hidden source of cube state.
