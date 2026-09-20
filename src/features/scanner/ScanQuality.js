/**
 * CubeStudio V2 — Phase 7A
 * ScanQuality: Derives the scan quality state from pipeline outputs.
 *
 * The quality state is consumed by:
 *  - useScannerEngine (stability counter logic)
 *  - ScannerView (overlay color, status badge, capture button enabled state)
 *
 * PURE FUNCTION — no side effects, no I/O.
 */

/**
 * @enum {string}
 */
export const SCAN_QUALITY = {
  /** No face detected yet — camera is searching */
  SEARCHING:       'SEARCHING',
  /** A face-like region was detected */
  DETECTED:        'DETECTED',
  /** Face detected and grid is roughly aligned */
  ALIGNING:        'ALIGNING',
  /** Grid is stable and ready to capture */
  READY:           'READY',
  /** Capture has been taken */
  CAPTURED:        'CAPTURED',
  /** Too dark to scan reliably */
  LOW_LIGHT:       'LOW_LIGHT',
  /** Face region is too small, skewed, or at an extreme angle */
  POOR_ALIGNMENT:  'POOR_ALIGNMENT',
  /** Color classification confidence is too low */
  LOW_CONFIDENCE:  'LOW_CONFIDENCE'
};

/** Average brightness threshold below which LOW_LIGHT is reported. */
const LOW_LIGHT_THRESHOLD = 40;

/** Minimum face confidence for any positive detection. */
const MIN_FACE_CONFIDENCE = 0.35;

/** Minimum face confidence to consider grid ALIGNING/READY (not just DETECTED). */
const ALIGNING_CONFIDENCE = 0.50;

/** Minimum average color classification confidence to avoid LOW_CONFIDENCE. */
const MIN_COLOR_CONFIDENCE = 0.45;

/** Minimum aspect ratio (min/max) for the detected region. */
const MIN_SQUARE_RATIO = 0.55;

/**
 * Evaluate scan quality.
 *
 * @param {Object} params
 * @param {number} params.avgBrightness            - average pixel brightness [0, 255]
 * @param {{ x: number, y: number, w: number, h: number, confidence: number }|null} params.detection
 *   - Face detection result, or null if no face detected
 * @param {import('./ColorClassifier.js').ClassifiedColor[]|null} params.classifiedColors
 *   - Array of 9 classified colors, or null if grid was not sampled
 * @param {number} params.stableFrames             - consecutive frames with matching classification
 * @param {number} params.stableFramesRequired     - frames needed to be READY
 * @param {boolean} params.isCaptured              - true if a capture has already been taken
 * @returns {string} one of SCAN_QUALITY values
 */
export function evaluateQuality({
  avgBrightness,
  detection,
  classifiedColors,
  stableFrames,
  stableFramesRequired,
  isCaptured
}) {
  if (isCaptured) return SCAN_QUALITY.CAPTURED;

  // Low light check (independent of detection)
  if (avgBrightness < LOW_LIGHT_THRESHOLD) return SCAN_QUALITY.LOW_LIGHT;

  // No detection
  if (!detection || detection.confidence < MIN_FACE_CONFIDENCE) return SCAN_QUALITY.SEARCHING;

  // Check aspect ratio (reject very non-square detections)
  const { w, h } = detection;
  const aspectRatio = Math.min(w, h) / Math.max(w, h);
  if (aspectRatio < MIN_SQUARE_RATIO) return SCAN_QUALITY.POOR_ALIGNMENT;

  // Not confident enough for grid alignment
  if (detection.confidence < ALIGNING_CONFIDENCE) return SCAN_QUALITY.DETECTED;

  // No color data yet
  if (!classifiedColors || classifiedColors.length !== 9) return SCAN_QUALITY.ALIGNING;

  // Color confidence check
  const avgColorConf = classifiedColors.reduce((sum, c) => sum + c.confidence, 0) / 9;
  if (avgColorConf < MIN_COLOR_CONFIDENCE) return SCAN_QUALITY.LOW_CONFIDENCE;

  // Stable enough to capture
  if (stableFrames >= stableFramesRequired) return SCAN_QUALITY.READY;

  // Aligned but still stabilizing
  return SCAN_QUALITY.ALIGNING;
}

/**
 * UI-facing label for each quality state.
 * @type {Record<string, string>}
 */
export const QUALITY_LABEL = {
  [SCAN_QUALITY.SEARCHING]:      'Searching...',
  [SCAN_QUALITY.DETECTED]:       'Face Detected',
  [SCAN_QUALITY.ALIGNING]:       'Aligning...',
  [SCAN_QUALITY.READY]:          'Ready to Capture',
  [SCAN_QUALITY.CAPTURED]:       'Captured!',
  [SCAN_QUALITY.LOW_LIGHT]:      'Too Dark',
  [SCAN_QUALITY.POOR_ALIGNMENT]: 'Align the Cube',
  [SCAN_QUALITY.LOW_CONFIDENCE]: 'Low Confidence'
};

/**
 * CSS modifier class for each quality state (used in overlay coloring).
 * @type {Record<string, string>}
 */
export const QUALITY_CSS_CLASS = {
  [SCAN_QUALITY.SEARCHING]:      'quality-searching',
  [SCAN_QUALITY.DETECTED]:       'quality-detected',
  [SCAN_QUALITY.ALIGNING]:       'quality-aligning',
  [SCAN_QUALITY.READY]:          'quality-ready',
  [SCAN_QUALITY.CAPTURED]:       'quality-captured',
  [SCAN_QUALITY.LOW_LIGHT]:      'quality-low-light',
  [SCAN_QUALITY.POOR_ALIGNMENT]: 'quality-poor-alignment',
  [SCAN_QUALITY.LOW_CONFIDENCE]: 'quality-low-confidence'
};
