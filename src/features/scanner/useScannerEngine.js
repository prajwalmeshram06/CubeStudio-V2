/**
 * CubeStudio V2 — Phase 7A
 * useScannerEngine: Custom React hook orchestrating camera stream, video processing,
 * frame-by-frame face/grid detection, color classification, stability tracking,
 * scan quality evaluation, and single-face capture.
 *
 * Performance note:
 *  - Raw frame processing runs via requestAnimationFrame and operates directly on refs
 *    and HTML5 Canvas to achieve 30+ FPS without re-rendering the React tree on every frame.
 *  - React state is only updated when UI-visible status changes (quality state, camera state,
 *    captured result, error).
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { CameraController } from './CameraController.js';
import { detectFace, computeAverageBrightness } from './FaceDetector.js';
import { buildGrid } from './GridDetector.js';
import { sampleCells } from './ColorSampler.js';
import { classifyCells, CUBE_COLOR_HEX } from './ColorClassifier.js';
import { SCAN_QUALITY, evaluateQuality } from './ScanQuality.js';

export const STABLE_FRAMES_REQUIRED = 12; // ~400ms at 30fps

export function useScannerEngine() {
  // ── React UI State (Low-frequency updates) ──────────────────────────────
  const [cameraStatus, setCameraStatus] = useState('idle'); // 'idle' | 'starting' | 'running' | 'error'
  const [errorMessage, setErrorMessage] = useState(null);
  const [quality, setQuality] = useState(SCAN_QUALITY.SEARCHING);
  const [stabilityProgress, setStabilityProgress] = useState(0); // 0.0 to 1.0
  const [liveStickers, setLiveStickers] = useState(null); // Array of 9 classified colors for live preview UI
  const [scanResult, setScanResult] = useState(null); // Captured single-face result

  // ── Persistent Refs ─────────────────────────────────────────────────────
  const cameraControllerRef = useRef(null);
  if (!cameraControllerRef.current) {
    cameraControllerRef.current = new CameraController();
  }

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafIdRef = useRef(null);
  const isMountedRef = useRef(true);

  // Engine state refs to avoid re-renders during 30-60 FPS loop
  const isCapturedRef = useRef(false);
  const stableFramesRef = useRef(0);
  const lastColorsSignatureRef = useRef('');
  const lastQualityRef = useRef(SCAN_QUALITY.SEARCHING);
  const latestStickersRef = useRef(null);
  const latestDetectionRef = useRef(null);
  const lastUiUpdateTimestampRef = useRef(0);

  // Offscreen canvas for fast pixel data extraction
  const offscreenCanvasRef = useRef(null);
  if (!offscreenCanvasRef.current && typeof document !== 'undefined') {
    offscreenCanvasRef.current = document.createElement('canvas');
  }

  /**
   * Stop camera and processing loop.
   */
  const stopCamera = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (cameraControllerRef.current) {
      cameraControllerRef.current.stop();
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (isMountedRef.current) {
      setCameraStatus('idle');
      setQuality(SCAN_QUALITY.SEARCHING);
      setStabilityProgress(0);
    }
  }, []);

  /**
   * Process a single video frame.
   */
  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const offscreen = offscreenCanvasRef.current;

    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || video.videoWidth === 0) {
      if (cameraControllerRef.current?.isActive) {
        rafIdRef.current = requestAnimationFrame(processFrame);
      }
      return;
    }

    const vw = video.videoWidth;
    const vh = video.videoHeight;

    // Ensure offscreen canvas matches video dimensions for sampling
    if (offscreen.width !== vw || offscreen.height !== vh) {
      offscreen.width = vw;
      offscreen.height = vh;
    }

    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!offCtx) {
      rafIdRef.current = requestAnimationFrame(processFrame);
      return;
    }

    // Draw video to offscreen canvas to extract pixel data
    offCtx.drawImage(video, 0, 0, vw, vh);
    const imageData = offCtx.getImageData(0, 0, vw, vh);
    const pixels = imageData.data;

    // ── Pipeline Step 1: Brightness ───────────────────────────────────────
    const avgBrightness = computeAverageBrightness(pixels, vw, vh);

    // ── Pipeline Step 2: Face Detection ───────────────────────────────────
    const detection = detectFace(pixels, vw, vh);
    latestDetectionRef.current = detection;

    let gridCells = null;
    let classifiedColors = null;

    if (detection) {
      // ── Pipeline Step 3: 3x3 Grid Generation ────────────────────────────
      gridCells = buildGrid(detection);

      // ── Pipeline Step 4: Color Sampling ─────────────────────────────────
      const sampled = sampleCells(pixels, vw, vh, gridCells);

      // ── Pipeline Step 5: Color Classification ───────────────────────────
      classifiedColors = classifyCells(sampled);
      latestStickersRef.current = classifiedColors;

      // ── Pipeline Step 6: Stability Evaluation ───────────────────────────
      const signature = classifiedColors.map(c => c.color).join('-');
      if (signature === lastColorsSignatureRef.current && signature.length > 0) {
        stableFramesRef.current += 1;
      } else {
        stableFramesRef.current = 0;
        lastColorsSignatureRef.current = signature;
      }
    } else {
      stableFramesRef.current = 0;
      lastColorsSignatureRef.current = '';
      latestStickersRef.current = null;
    }

    // ── Pipeline Step 7: Scan Quality Evaluation ──────────────────────────
    const currentQuality = evaluateQuality({
      avgBrightness,
      detection,
      classifiedColors,
      stableFrames: stableFramesRef.current,
      stableFramesRequired: STABLE_FRAMES_REQUIRED,
      isCaptured: isCapturedRef.current
    });

    // ── Pipeline Step 8: Live Canvas Rendering (Video + Overlay) ──────────
    const displayCtx = canvas.getContext('2d');
    if (displayCtx) {
      // Synchronize canvas buffer resolution with container display
      const cw = canvas.clientWidth || vw;
      const ch = canvas.clientHeight || vh;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      // Draw the camera frame covering the canvas
      displayCtx.save();
      displayCtx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Scale factors from video coords to display canvas coords
      const scaleX = canvas.width / vw;
      const scaleY = canvas.height / vh;

      // Draw Face Region & Grid Overlay
      if (detection && !isCapturedRef.current) {
        const dx = detection.x * scaleX;
        const dy = detection.y * scaleY;
        const dw = detection.w * scaleX;
        const dh = detection.h * scaleY;

        // Overlay stroke color based on quality state
        let strokeColor = '#3b82f6'; // default blue
        if (currentQuality === SCAN_QUALITY.READY) {
          strokeColor = '#10b981'; // vibrant green
        } else if (currentQuality === SCAN_QUALITY.LOW_LIGHT || currentQuality === SCAN_QUALITY.POOR_ALIGNMENT) {
          strokeColor = '#f59e0b'; // warning yellow/orange
        } else if (currentQuality === SCAN_QUALITY.LOW_CONFIDENCE) {
          strokeColor = '#ef4444'; // red
        }

        // Draw Outer Bounding Box
        displayCtx.lineWidth = 3;
        displayCtx.strokeStyle = strokeColor;
        displayCtx.strokeRect(dx, dy, dw, dh);

        // Draw Corner Accents
        const cornerSize = Math.min(dw, dh) * 0.15;
        displayCtx.lineWidth = 4;
        displayCtx.beginPath();
        // Top-left
        displayCtx.moveTo(dx, dy + cornerSize); displayCtx.lineTo(dx, dy); displayCtx.lineTo(dx + cornerSize, dy);
        // Top-right
        displayCtx.moveTo(dx + dw - cornerSize, dy); displayCtx.lineTo(dx + dw, dy); displayCtx.lineTo(dx + dw, dy + cornerSize);
        // Bottom-left
        displayCtx.moveTo(dx, dy + dh - cornerSize); displayCtx.lineTo(dx, dy + dh); displayCtx.lineTo(dx + cornerSize, dy + dh);
        // Bottom-right
        displayCtx.moveTo(dx + dw - cornerSize, dy + dh); displayCtx.lineTo(dx + dw, dy + dh); displayCtx.lineTo(dx + dw, dy + dh - cornerSize);
        displayCtx.stroke();

        // Draw 3x3 Internal Grid Lines
        displayCtx.lineWidth = 1;
        displayCtx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        displayCtx.beginPath();
        // Vertical grid lines
        displayCtx.moveTo(dx + dw / 3, dy); displayCtx.lineTo(dx + dw / 3, dy + dh);
        displayCtx.moveTo(dx + (dw * 2) / 3, dy); displayCtx.lineTo(dx + (dw * 2) / 3, dy + dh);
        // Horizontal grid lines
        displayCtx.moveTo(dx, dy + dh / 3); displayCtx.lineTo(dx + dw, dy + dh / 3);
        displayCtx.moveTo(dx, dy + (dh * 2) / 3); displayCtx.lineTo(dx + dw, dy + (dh * 2) / 3);
        displayCtx.stroke();

        // Draw Cell Sample Markers & Classified Color Dots
        if (gridCells && classifiedColors) {
          gridCells.forEach((cell, idx) => {
            const cx = cell.cx * scaleX;
            const cy = cell.cy * scaleY;
            const classified = classifiedColors[idx];
            const hex = CUBE_COLOR_HEX[classified.color] || '#ffffff';

            // Draw center sample point circle
            displayCtx.beginPath();
            displayCtx.arc(cx, cy, Math.max(4, 12 * scaleX), 0, Math.PI * 2);
            displayCtx.fillStyle = hex;
            displayCtx.fill();
            displayCtx.lineWidth = 2;
            displayCtx.strokeStyle = '#ffffff';
            displayCtx.stroke();
          });
        }
      }

      displayCtx.restore();
    }

    // ── Step 9: Throttled React State Update ───────────────────────────────
    const now = performance.now();
    const shouldUpdateUi = (
      currentQuality !== lastQualityRef.current ||
      now - lastUiUpdateTimestampRef.current > 120
    );

    if (shouldUpdateUi && isMountedRef.current) {
      lastQualityRef.current = currentQuality;
      lastUiUpdateTimestampRef.current = now;
      setQuality(currentQuality);
      setStabilityProgress(Math.min(1, stableFramesRef.current / STABLE_FRAMES_REQUIRED));

      if (classifiedColors) {
        setLiveStickers(classifiedColors.map((c, i) => ({
          index: i,
          color: c.color,
          hex: CUBE_COLOR_HEX[c.color] || '#ffffff',
          confidence: c.confidence
        })));
      } else {
        setLiveStickers(null);
      }
    }

    // Continue frame processing loop if camera is active
    if (cameraControllerRef.current?.isActive && isMountedRef.current) {
      rafIdRef.current = requestAnimationFrame(processFrame);
    }
  }, []);

  /**
   * Start the camera stream and processing loop.
   * @param {'user'|'environment'} facingMode
   */
  const startCamera = useCallback(async (facingMode = 'environment') => {
    setCameraStatus('starting');
    setErrorMessage(null);
    isCapturedRef.current = false;
    stableFramesRef.current = 0;

    try {
      const stream = await cameraControllerRef.current.start(facingMode);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      if (isMountedRef.current) {
        setCameraStatus('running');
        rafIdRef.current = requestAnimationFrame(processFrame);
      }
    } catch (err) {
      console.error('Camera access error:', err);
      if (isMountedRef.current) {
        setCameraStatus('error');
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Camera permission was denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('No camera device found on this system.');
        } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
          setErrorMessage('Camera is currently in use by another application.');
        } else {
          setErrorMessage(`Unable to access camera: ${err.message || 'Unknown error'}`);
        }
      }
    }
  }, [processFrame]);

  /**
   * Capture current single-face scan.
   */
  const capture = useCallback(() => {
    if (!latestStickersRef.current || latestStickersRef.current.length !== 9) {
      return null;
    }

    const stickers = latestStickersRef.current.map((c, i) => ({
      index: i,
      row: Math.floor(i / 3),
      col: i % 3,
      color: c.color,
      hex: CUBE_COLOR_HEX[c.color] || '#ffffff',
      confidence: c.confidence,
      hue: c.hue,
      saturation: c.saturation,
      lightness: c.lightness
    }));

    const result = {
      stickers,
      centerColor: stickers[4].color, // center sticker is authoritative for face identity
      timestamp: Date.now(),
      quality: lastQualityRef.current
    };

    isCapturedRef.current = true;
    setScanResult(result);
    setQuality(SCAN_QUALITY.CAPTURED);
    return result;
  }, []);

  /**
   * Reset capture and resume live scanning.
   */
  const rescan = useCallback(() => {
    isCapturedRef.current = false;
    stableFramesRef.current = 0;
    lastColorsSignatureRef.current = '';
    setScanResult(null);
    setQuality(SCAN_QUALITY.SEARCHING);
    setStabilityProgress(0);
    if (cameraControllerRef.current?.isActive && !rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(processFrame);
    }
  }, [processFrame]);

  // Lifecycle cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      if (cameraControllerRef.current) {
        cameraControllerRef.current.stop();
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    cameraStatus,
    errorMessage,
    quality,
    stabilityProgress,
    liveStickers,
    scanResult,
    startCamera,
    stopCamera,
    capture,
    rescan,
    isCaptured: !!scanResult
  };
}
