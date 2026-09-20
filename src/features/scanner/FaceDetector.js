/**
 * CubeStudio V2 — Phase 7A
 * FaceDetector: Lightweight geometric detection of a cube face in a camera frame.
 *
 * Strategy (no ML model):
 *  1. Compute per-row and per-column variance of pixel brightness.
 *  2. Find the largest contiguous band of high-variance rows/cols — this is the
 *     region where something with edges (like a cube face) is present.
 *  3. Use the intersection of high-variance row-band and col-band as the candidate region.
 *  4. Score the region for square-ness (aspect ratio near 1:1).
 *  5. Fall back to a centered crop if no region found, with low confidence.
 *
 * Returns { x, y, w, h, confidence } where confidence ∈ [0, 1].
 * Returns null only if input is invalid.
 *
 * PURE FUNCTION — no side effects, no I/O.
 */

/**
 * Minimum confidence below which we treat the detection as failed.
 */
export const MIN_DETECTION_CONFIDENCE = 0.35;

/**
 * Detect a cube face in the given pixel data.
 *
 * @param {Uint8ClampedArray} pixels - RGBA pixel data (length = width * height * 4)
 * @param {number} width  - frame width in pixels
 * @param {number} height - frame height in pixels
 * @returns {{ x: number, y: number, w: number, h: number, confidence: number }|null}
 */
export function detectFace(pixels, width, height) {
  if (!pixels || pixels.length === 0 || width <= 0 || height <= 0) return null;

  // ── Step 1: brightness map (greyscale, fast) ─────────────────────────────
  const brightness = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    // Perceptual luminance
    brightness[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // ── Step 2: per-row variance ─────────────────────────────────────────────
  const rowVar = new Float32Array(height);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    let sumSq = 0;
    for (let x = 0; x < width; x++) {
      const v = brightness[y * width + x];
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / width;
    rowVar[y] = sumSq / width - mean * mean;
  }

  // ── Step 3: per-col variance ─────────────────────────────────────────────
  const colVar = new Float32Array(width);
  for (let x = 0; x < width; x++) {
    let sum = 0;
    let sumSq = 0;
    for (let y = 0; y < height; y++) {
      const v = brightness[y * width + x];
      sum += v;
      sumSq += v * v;
    }
    const mean = sum / height;
    colVar[x] = sumSq / height - mean * mean;
  }

  // ── Step 4: threshold = mean variance * 1.2 ──────────────────────────────
  const meanRowVar = rowVar.reduce((a, b) => a + b, 0) / height;
  const meanColVar = colVar.reduce((a, b) => a + b, 0) / width;

  let rx, ry, rw, rh, confidence;

  // If variance across the frame is negligible (e.g. flat uniform image), fallback
  if (meanRowVar < 1.0 || meanColVar < 1.0) {
    const size = Math.floor(Math.min(width, height) * 0.6);
    rx = Math.floor((width - size) / 2);
    ry = Math.floor((height - size) / 2);
    rw = size;
    rh = size;
    confidence = 0.2; // Low-confidence fallback
    return { x: rx, y: ry, w: rw, h: rh, confidence };
  }

  const rowThresh = meanRowVar * 1.2;
  const colThresh = meanColVar * 1.2;

  // ── Step 5: find largest contiguous band above threshold ──────────────────
  const rowBand = _largestBand(rowVar, rowThresh, height);
  const colBand = _largestBand(colVar, colThresh, width);

  // ── Step 6: compute candidate region ────────────────────────────────────
  if (rowBand.size > 0 && colBand.size > 0 && rowThresh > 0 && colThresh > 0) {
    rx = colBand.start;
    ry = rowBand.start;
    rw = colBand.size;
    rh = rowBand.size;

    // Square-ness score: 1.0 = perfect square, drops toward 0 as it deforms
    const aspectRatio = Math.min(rw, rh) / Math.max(rw, rh);
    // Coverage score: bigger region = more likely a large face
    const coverage = (rw * rh) / (width * height);
    // Variance score: how far above threshold the bands are
    const varScore = Math.min(1, (rowBand.meanVar / rowThresh + colBand.meanVar / colThresh) / 4);

    confidence = Math.min(1, aspectRatio * 0.5 + coverage * 0.3 + varScore * 0.2);
  } else {
    // Fallback: center crop, 60% of the smaller dimension
    const size = Math.floor(Math.min(width, height) * 0.6);
    rx = Math.floor((width - size) / 2);
    ry = Math.floor((height - size) / 2);
    rw = size;
    rh = size;
    confidence = 0.2; // Low-confidence fallback
  }

  return { x: rx, y: ry, w: rw, h: rh, confidence };
}

/**
 * Find the largest contiguous band of values above threshold in an array.
 * @param {Float32Array} arr
 * @param {number} threshold
 * @param {number} len
 * @returns {{ start: number, size: number, meanVar: number }}
 */
function _largestBand(arr, threshold, len) {
  let bestStart = 0;
  let bestSize = 0;
  let bestMean = 0;

  let curStart = -1;
  let curSum = 0;
  let curCount = 0;

  for (let i = 0; i < len; i++) {
    if (arr[i] >= threshold) {
      if (curStart === -1) curStart = i;
      curSum += arr[i];
      curCount++;
    } else {
      if (curCount > bestSize) {
        bestSize = curCount;
        bestStart = curStart;
        bestMean = curSum / curCount;
      }
      curStart = -1;
      curSum = 0;
      curCount = 0;
    }
  }
  // flush
  if (curCount > bestSize) {
    bestSize = curCount;
    bestStart = curStart;
    bestMean = curSum / curCount;
  }

  return { start: bestStart, size: bestSize, meanVar: bestMean };
}

/**
 * Compute the average brightness of the entire frame.
 * Used by ScanQuality to detect low-light conditions.
 *
 * @param {Uint8ClampedArray} pixels
 * @param {number} width
 * @param {number} height
 * @returns {number} average brightness in [0, 255]
 */
export function computeAverageBrightness(pixels, width, height) {
  if (!pixels || pixels.length === 0) return 0;
  let sum = 0;
  const n = width * height;
  for (let i = 0; i < n; i++) {
    sum += 0.299 * pixels[i * 4] + 0.587 * pixels[i * 4 + 1] + 0.114 * pixels[i * 4 + 2];
  }
  return sum / n;
}
