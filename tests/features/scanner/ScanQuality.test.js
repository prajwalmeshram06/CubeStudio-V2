import { describe, it, expect } from 'vitest';
import {
  evaluateQuality,
  SCAN_QUALITY,
  QUALITY_LABEL
} from '../../../src/features/scanner/ScanQuality.js';

describe('ScanQuality', () => {
  const dummyColors = Array(9).fill({
    color: 'white',
    confidence: 0.85
  });

  const validDetection = {
    x: 50,
    y: 50,
    w: 200,
    h: 200,
    confidence: 0.75
  };

  it('returns CAPTURED when isCaptured is true', () => {
    const quality = evaluateQuality({
      avgBrightness: 120,
      detection: validDetection,
      classifiedColors: dummyColors,
      stableFrames: 20,
      stableFramesRequired: 10,
      isCaptured: true
    });
    expect(quality).toBe(SCAN_QUALITY.CAPTURED);
  });

  it('returns LOW_LIGHT when brightness is below threshold', () => {
    const quality = evaluateQuality({
      avgBrightness: 20,
      detection: validDetection,
      classifiedColors: dummyColors,
      stableFrames: 5,
      stableFramesRequired: 10,
      isCaptured: false
    });
    expect(quality).toBe(SCAN_QUALITY.LOW_LIGHT);
  });

  it('returns SEARCHING when no detection or low face confidence', () => {
    const quality = evaluateQuality({
      avgBrightness: 120,
      detection: null,
      classifiedColors: null,
      stableFrames: 0,
      stableFramesRequired: 10,
      isCaptured: false
    });
    expect(quality).toBe(SCAN_QUALITY.SEARCHING);
  });

  it('returns POOR_ALIGNMENT when aspect ratio is heavily skewed', () => {
    const skewedDetection = {
      x: 10,
      y: 10,
      w: 300,
      h: 50,
      confidence: 0.8
    };

    const quality = evaluateQuality({
      avgBrightness: 120,
      detection: skewedDetection,
      classifiedColors: dummyColors,
      stableFrames: 5,
      stableFramesRequired: 10,
      isCaptured: false
    });
    expect(quality).toBe(SCAN_QUALITY.POOR_ALIGNMENT);
  });

  it('returns LOW_CONFIDENCE when classified color confidences are weak', () => {
    const weakColors = Array(9).fill({
      color: 'white',
      confidence: 0.2
    });

    const quality = evaluateQuality({
      avgBrightness: 120,
      detection: validDetection,
      classifiedColors: weakColors,
      stableFrames: 5,
      stableFramesRequired: 10,
      isCaptured: false
    });
    expect(quality).toBe(SCAN_QUALITY.LOW_CONFIDENCE);
  });

  it('returns ALIGNING when detected and valid but stability count not reached', () => {
    const quality = evaluateQuality({
      avgBrightness: 120,
      detection: validDetection,
      classifiedColors: dummyColors,
      stableFrames: 3,
      stableFramesRequired: 10,
      isCaptured: false
    });
    expect(quality).toBe(SCAN_QUALITY.ALIGNING);
  });

  it('returns READY when detection, colors, and stability threshold are satisfied', () => {
    const quality = evaluateQuality({
      avgBrightness: 120,
      detection: validDetection,
      classifiedColors: dummyColors,
      stableFrames: 12,
      stableFramesRequired: 10,
      isCaptured: false
    });
    expect(quality).toBe(SCAN_QUALITY.READY);
  });

  it('provides human-readable labels for all states', () => {
    Object.values(SCAN_QUALITY).forEach((q) => {
      expect(QUALITY_LABEL[q]).toBeDefined();
      expect(typeof QUALITY_LABEL[q]).toBe('string');
    });
  });
});
