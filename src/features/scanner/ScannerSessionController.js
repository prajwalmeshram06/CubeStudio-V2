/**
 * CubeStudio V2 — Phase 7B
 * ScannerSessionController: State machine and controller orchestrating the complete
 * 6-face Rubik's Cube camera scanning, review, validation, and handoff workflow.
 *
 * Responsibilities:
 *  - Guides user sequentially through all 6 faces (U, R, F, D, L, B)
 *  - Validates center colors to prevent duplicate or conflicting face captures
 *  - Handles single-face review, confirmation, and targeted rescan of individual faces
 *  - Invokes CubeReconstructor to assemble the 54-facelet authoritative CubeState
 *  - Provides reactive subscription for UI rendering
 */

import { FACES, FACE_COLORS, COLOR_CODES } from '../../cube/model/constants.js';
import { reconstructCube, CENTER_COLOR_TO_FACE } from './CubeReconstructor.js';

export const SCAN_SESSION_STATE = Object.freeze({
  IDLE:           'IDLE',
  SCANNING_FACE:  'SCANNING_FACE',
  REVIEWING_FACE: 'REVIEWING_FACE',
  VALIDATING:     'VALIDATING',
  READY:          'READY',
  INVALID:        'INVALID'
});

export const FACE_GUIDANCE = Object.freeze({
  U: {
    name: 'Top (Up)',
    color: 'White',
    centerColor: 'white',
    topHint: 'Blue (Back)',
    bottomHint: 'Green (Front)',
    leftHint: 'Orange (Left)',
    rightHint: 'Red (Right)'
  },
  R: {
    name: 'Right',
    color: 'Red',
    centerColor: 'red',
    topHint: 'White (Up)',
    bottomHint: 'Yellow (Down)',
    leftHint: 'Green (Front)',
    rightHint: 'Blue (Back)'
  },
  F: {
    name: 'Front',
    color: 'Green',
    centerColor: 'green',
    topHint: 'White (Up)',
    bottomHint: 'Yellow (Down)',
    leftHint: 'Orange (Left)',
    rightHint: 'Red (Right)'
  },
  D: {
    name: 'Bottom (Down)',
    color: 'Yellow',
    centerColor: 'yellow',
    topHint: 'Green (Front)',
    bottomHint: 'Blue (Back)',
    leftHint: 'Orange (Left)',
    rightHint: 'Red (Right)'
  },
  L: {
    name: 'Left',
    color: 'Orange',
    centerColor: 'orange',
    topHint: 'White (Up)',
    bottomHint: 'Yellow (Down)',
    leftHint: 'Blue (Back)',
    rightHint: 'Green (Front)'
  },
  B: {
    name: 'Back',
    color: 'Blue',
    centerColor: 'blue',
    topHint: 'White (Up)',
    bottomHint: 'Yellow (Down)',
    leftHint: 'Red (Right)',
    rightHint: 'Orange (Left)'
  }
});

export class ScannerSessionController {
  constructor() {
    this.status = SCAN_SESSION_STATE.SCANNING_FACE;
    this.scannedFaces = { U: null, R: null, F: null, D: null, L: null, B: null };
    this.currentFace = 'U';
    this.pendingCapture = null;
    this.reconstruction = null;
    this.conflictWarning = null;
    this._listeners = new Set();
  }

  /**
   * Subscribe to session state changes.
   * @param {(state: object) => void} listener
   * @returns {() => void} unsubscribe
   */
  subscribe(listener) {
    this._listeners.add(listener);
    listener(this.getState());
    return () => this._listeners.delete(listener);
  }

  _notify() {
    const state = this.getState();
    for (const listener of this._listeners) {
      listener(state);
    }
  }

  /**
   * Returns current snapshot of scanning session.
   */
  getState() {
    const completedFaces = FACES.filter(f => !!this.scannedFaces[f]);
    const isComplete = completedFaces.length === 6;

    return {
      status: this.status,
      currentFace: this.currentFace,
      guidance: FACE_GUIDANCE[this.currentFace],
      scannedFaces: { ...this.scannedFaces },
      completedFaces,
      completedCount: completedFaces.length,
      isComplete,
      pendingCapture: this.pendingCapture ? { ...this.pendingCapture } : null,
      reconstruction: this.reconstruction,
      conflictWarning: this.conflictWarning,
      isValid: this.reconstruction?.success ?? false,
      cubeState: this.reconstruction?.cubeState ?? null
    };
  }

  /**
   * Set target face to scan.
   * @param {'U'|'R'|'F'|'D'|'L'|'B'} face
   */
  selectFace(face) {
    if (!FACES.includes(face)) return;
    this.currentFace = face;
    this.pendingCapture = null;
    this.conflictWarning = null;
    this.status = SCAN_SESSION_STATE.SCANNING_FACE;
    this._notify();
  }

  /**
   * Processes a single-face capture payload from the scanner engine.
   * @param {object} capturePayload - Output from useScannerEngine.capture()
   */
  handleFaceCaptured(capturePayload) {
    if (!capturePayload || !Array.isArray(capturePayload.stickers) || capturePayload.stickers.length !== 9) {
      return;
    }

    const detectedCenterColor = capturePayload.centerColor?.toLowerCase();
    const identifiedFace = CENTER_COLOR_TO_FACE[detectedCenterColor] || this.currentFace;

    let conflict = null;
    if (identifiedFace !== this.currentFace) {
      conflict = `Detected center color "${detectedCenterColor}" corresponds to the ${FACE_GUIDANCE[identifiedFace]?.name || identifiedFace} face rather than ${this.currentFace}.`;
    } else if (this.scannedFaces[identifiedFace]) {
      conflict = `Face ${identifiedFace} was previously scanned. Confirming will replace the previous capture.`;
    }

    this.pendingCapture = {
      ...capturePayload,
      targetFace: identifiedFace
    };
    this.conflictWarning = conflict;
    this.status = SCAN_SESSION_STATE.REVIEWING_FACE;
    this._notify();
  }

  /**
   * User confirms the pending face capture.
   */
  confirmPendingFace() {
    if (!this.pendingCapture) return;

    const faceToAssign = this.pendingCapture.targetFace || this.currentFace;
    this.scannedFaces[faceToAssign] = {
      stickers: this.pendingCapture.stickers,
      centerColor: this.pendingCapture.centerColor,
      timestamp: this.pendingCapture.timestamp,
      quality: this.pendingCapture.quality
    };

    this.pendingCapture = null;
    this.conflictWarning = null;

    // Check if all 6 faces have been collected
    const missing = FACES.filter(f => !this.scannedFaces[f]);
    if (missing.length === 0) {
      this.evaluateReconstruction();
    } else {
      // Advance to the next un-scanned face in canonical order
      this.currentFace = missing[0];
      this.status = SCAN_SESSION_STATE.SCANNING_FACE;
      this._notify();
    }
  }

  /**
   * User rejects the pending capture and returns to live scanning for this face.
   */
  rescanCurrentPending() {
    this.pendingCapture = null;
    this.conflictWarning = null;
    this.status = SCAN_SESSION_STATE.SCANNING_FACE;
    this._notify();
  }

  /**
   * Rescans a specific face from the summary / review screen.
   * @param {'U'|'R'|'F'|'D'|'L'|'B'} face
   */
  rescanFace(face) {
    if (!FACES.includes(face)) return;
    this.scannedFaces[face] = null;
    this.reconstruction = null;
    this.selectFace(face);
  }

  /**
   * Runs reconstruction and validation across all 6 collected faces.
   */
  evaluateReconstruction() {
    this.status = SCAN_SESSION_STATE.VALIDATING;
    this._notify();

    const result = reconstructCube(this.scannedFaces);
    this.reconstruction = result;

    if (result.success) {
      this.status = SCAN_SESSION_STATE.READY;
    } else {
      this.status = SCAN_SESSION_STATE.INVALID;
    }
    this._notify();
  }

  /**
   * Resets the entire scanning session to clean state.
   */
  resetSession() {
    this.scannedFaces = { U: null, R: null, F: null, D: null, L: null, B: null };
    this.currentFace = 'U';
    this.pendingCapture = null;
    this.reconstruction = null;
    this.conflictWarning = null;
    this.status = SCAN_SESSION_STATE.SCANNING_FACE;
    this._notify();
  }
}
