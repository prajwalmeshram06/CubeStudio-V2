import { describe, it, expect, beforeEach } from 'vitest';
import {
  ScannerSessionController,
  SCAN_SESSION_STATE
} from '../../../src/features/scanner/ScannerSessionController.js';

describe('ScannerSessionController', () => {
  let controller;

  beforeEach(() => {
    controller = new ScannerSessionController();
  });

  it('initializes with U face as target in SCANNING_FACE state', () => {
    const state = controller.getState();
    expect(state.status).toBe(SCAN_SESSION_STATE.SCANNING_FACE);
    expect(state.currentFace).toBe('U');
    expect(state.completedCount).toBe(0);
    expect(state.isComplete).toBe(false);
    expect(state.guidance.color).toBe('White');
  });

  it('transitions to REVIEWING_FACE upon receiving a face capture payload', () => {
    const samplePayload = {
      stickers: Array(9).fill({ color: 'white', confidence: 0.95 }),
      centerColor: 'white',
      timestamp: Date.now(),
      quality: 'READY'
    };

    controller.handleFaceCaptured(samplePayload);
    const state = controller.getState();

    expect(state.status).toBe(SCAN_SESSION_STATE.REVIEWING_FACE);
    expect(state.pendingCapture).toBeDefined();
    expect(state.pendingCapture.targetFace).toBe('U');
    expect(state.conflictWarning).toBeNull();
  });

  it('detects center color mismatch warning when capturing wrong face', () => {
    const wrongCenterPayload = {
      stickers: Array(9).fill({ color: 'green', confidence: 0.95 }),
      centerColor: 'green', // Green center corresponds to Front face, while currentFace is U
      timestamp: Date.now(),
      quality: 'READY'
    };

    controller.handleFaceCaptured(wrongCenterPayload);
    const state = controller.getState();

    expect(state.status).toBe(SCAN_SESSION_STATE.REVIEWING_FACE);
    expect(state.conflictWarning).toContain('Front');
  });

  it('advances sequentially through faces upon confirmation', () => {
    // 1. Confirm U face
    controller.handleFaceCaptured({
      stickers: Array(9).fill({ color: 'white' }),
      centerColor: 'white'
    });
    controller.confirmPendingFace();

    let state = controller.getState();
    expect(state.scannedFaces.U).toBeDefined();
    expect(state.completedCount).toBe(1);
    expect(state.currentFace).toBe('R'); // Next missing face
    expect(state.status).toBe(SCAN_SESSION_STATE.SCANNING_FACE);

    // 2. Confirm R face
    controller.handleFaceCaptured({
      stickers: Array(9).fill({ color: 'red' }),
      centerColor: 'red'
    });
    controller.confirmPendingFace();

    state = controller.getState();
    expect(state.completedCount).toBe(2);
    expect(state.currentFace).toBe('F');
  });

  it('completes full 6-face session and evaluates to READY for solved cube', () => {
    const faceColors = {
      U: 'white',
      R: 'red',
      F: 'green',
      D: 'yellow',
      L: 'orange',
      B: 'blue'
    };

    for (const [face, color] of Object.entries(faceColors)) {
      controller.handleFaceCaptured({
        stickers: Array(9).fill({ color }),
        centerColor: color
      });
      controller.confirmPendingFace();
    }

    const state = controller.getState();
    expect(state.completedCount).toBe(6);
    expect(state.isComplete).toBe(true);
    expect(state.status).toBe(SCAN_SESSION_STATE.READY);
    expect(state.isValid).toBe(true);
    expect(state.cubeState).toBeDefined();
    expect(state.cubeState.isSolved()).toBe(true);
  });

  it('rescanFace clears specific face and sets it as active target', () => {
    // Confirm U face
    controller.handleFaceCaptured({
      stickers: Array(9).fill({ color: 'white' }),
      centerColor: 'white'
    });
    controller.confirmPendingFace();

    expect(controller.getState().scannedFaces.U).toBeDefined();

    // Rescan U face
    controller.rescanFace('U');
    const state = controller.getState();

    expect(state.scannedFaces.U).toBeNull();
    expect(state.currentFace).toBe('U');
    expect(state.status).toBe(SCAN_SESSION_STATE.SCANNING_FACE);
  });

  it('resetSession resets all state cleanly', () => {
    controller.handleFaceCaptured({
      stickers: Array(9).fill({ color: 'white' }),
      centerColor: 'white'
    });
    controller.confirmPendingFace();

    controller.resetSession();
    const state = controller.getState();

    expect(state.completedCount).toBe(0);
    expect(state.currentFace).toBe('U');
    expect(state.status).toBe(SCAN_SESSION_STATE.SCANNING_FACE);
    expect(state.reconstruction).toBeNull();
  });
});
