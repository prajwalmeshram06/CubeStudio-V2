/**
 * CubeStudio V2 — Phase 7A
 * GridDetector: Divide a detected cube-face region into a 3×3 grid of cell descriptors.
 *
 * Given a detected region { x, y, w, h }, divides it into 9 equal cells and
 * returns the center + sample radius for each cell in row-major order
 * (top-left → top-right → middle-left → ... → bottom-right).
 *
 * PURE FUNCTION — no side effects, no I/O.
 */

/**
 * @typedef {Object} CellDescriptor
 * @property {number} cx          - center x in frame coords
 * @property {number} cy          - center y in frame coords
 * @property {number} sampleRadius - radius of sampling square (pixels)
 * @property {number} row          - 0-based row index (0=top)
 * @property {number} col          - 0-based col index (0=left)
 * @property {number} index        - 0-based index in row-major order
 */

/**
 * Generate 9 cell descriptors for the 3×3 sticker grid within a detected region.
 *
 * @param {{ x: number, y: number, w: number, h: number }} region
 * @param {Object} [opts]
 * @param {number} [opts.borderFraction=0.12] - fraction of each cell to skip at border (avoids grid lines)
 * @returns {CellDescriptor[]} array of 9 descriptors in row-major order
 */
export function buildGrid(region, opts = {}) {
  const { x, y, w, h } = region;
  const borderFraction = opts.borderFraction ?? 0.12;

  const cellW = w / 3;
  const cellH = h / 3;

  // Sample radius = half cell minus border fraction to avoid grid lines and edges
  const sampleRadius = Math.max(1, Math.floor(Math.min(cellW, cellH) * (0.5 - borderFraction)));

  const cells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const cellLeft = x + col * cellW;
      const cellTop  = y + row * cellH;
      const cx = Math.round(cellLeft + cellW / 2);
      const cy = Math.round(cellTop  + cellH / 2);
      cells.push({
        cx,
        cy,
        sampleRadius,
        row,
        col,
        index: row * 3 + col
      });
    }
  }
  return cells;
}

/**
 * Clamp a value to [min, max].
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
