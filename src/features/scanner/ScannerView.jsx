/**
 * CubeStudio V2 — Phase 7B
 * ScannerView: Comprehensive 6-face Camera Scanner & 3D/Solver Handoff Component.
 *
 * Workflow:
 *  1. Guided sequential face scanning (U, R, F, D, L, B) with orientation hints.
 *  2. Live camera viewfinder with 3x3 overlay and stability detection.
 *  3. Single-face capture review & confirmation with duplicate/center conflict detection.
 *  4. 54-facelet reconstruction and multi-tier validation.
 *  5. Full unfolded 2D Cube Net review screen with interactive face rescan.
 *  6. Seamless handoff to 3D Simulator, Solver, and Manual Editor.
 *
 * Governed by DESIGN.md & Stitch Visual Specifications.
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
  Maximize2,
  VideoOff,
  Sun,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  Box,
  Wand2,
  Edit3,
  Layers,
  Check
} from 'lucide-react';
import { useScannerEngine } from './useScannerEngine.js';
import { QUALITY_LABEL, SCAN_QUALITY } from './ScanQuality.js';
import { ScannerSessionController, SCAN_SESSION_STATE, FACE_GUIDANCE } from './ScannerSessionController.js';
import { FACES, FACE_COLORS } from '../../cube/model/constants.js';
import { CUBE_COLOR_HEX } from './ColorClassifier.js';
import './scanner.css';

export function ScannerView({ onLoadIntoSimulator, onOpenSolver, onOpenEditor }) {
  const sessionControllerRef = useRef(null);
  if (!sessionControllerRef.current) {
    sessionControllerRef.current = new ScannerSessionController();
  }

  const [sessionState, setSessionState] = useState(() => sessionControllerRef.current.getState());
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'

  const {
    videoRef,
    canvasRef,
    cameraStatus,
    errorMessage,
    quality,
    stabilityProgress,
    liveStickers,
    startCamera,
    stopCamera,
    capture: engineCapture,
    rescan: engineRescan
  } = useScannerEngine();

  // Subscribe to session controller updates
  useEffect(() => {
    const controller = sessionControllerRef.current;
    const unsubscribe = controller.subscribe((nextState) => {
      setSessionState({ ...nextState });
    });
    return () => unsubscribe();
  }, []);

  // Manage camera lifecycle based on active session state
  useEffect(() => {
    if (sessionState.status === SCAN_SESSION_STATE.SCANNING_FACE) {
      startCamera(facingMode);
    } else if (sessionState.status === SCAN_SESSION_STATE.READY || sessionState.status === SCAN_SESSION_STATE.INVALID) {
      stopCamera();
    }
  }, [sessionState.status, startCamera, stopCamera, facingMode]);

  // Clean up camera on component unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    if (sessionState.status === SCAN_SESSION_STATE.SCANNING_FACE) {
      startCamera(nextMode);
    }
  };

  const handleCaptureClick = () => {
    const payload = engineCapture();
    if (payload) {
      sessionControllerRef.current.handleFaceCaptured(payload);
    }
  };

  const handleConfirmFace = () => {
    sessionControllerRef.current.confirmPendingFace();
    engineRescan();
  };

  const handleRescanCurrent = () => {
    sessionControllerRef.current.rescanCurrentPending();
    engineRescan();
  };

  const handleRescanSpecificFace = (face) => {
    sessionControllerRef.current.rescanFace(face);
    engineRescan();
  };

  const handleResetSession = () => {
    sessionControllerRef.current.resetSession();
    engineRescan();
    startCamera(facingMode);
  };

  const handleSendToSimulator = () => {
    if (sessionState.cubeState && onLoadIntoSimulator) {
      onLoadIntoSimulator(sessionState.cubeState);
    }
  };

  const handleSendToSolver = () => {
    if (sessionState.cubeState && onOpenSolver) {
      onOpenSolver(sessionState.cubeState);
    }
  };

  const handleSendToEditor = () => {
    if (sessionState.cubeState && onOpenEditor) {
      onOpenEditor(sessionState.cubeState);
    }
  };

  const getQualityBadgeIcon = () => {
    switch (quality) {
      case SCAN_QUALITY.READY:
      case SCAN_QUALITY.CAPTURED:
        return <CheckCircle2 size={16} className="status-icon success" />;
      case SCAN_QUALITY.LOW_LIGHT:
        return <Sun size={16} className="status-icon warning" />;
      case SCAN_QUALITY.POOR_ALIGNMENT:
      case SCAN_QUALITY.LOW_CONFIDENCE:
        return <AlertTriangle size={16} className="status-icon warning" />;
      case SCAN_QUALITY.SEARCHING:
      case SCAN_QUALITY.DETECTED:
      case SCAN_QUALITY.ALIGNING:
      default:
        return <RefreshCw size={16} className="status-icon spin" />;
    }
  };

  const isFullReview = sessionState.status === SCAN_SESSION_STATE.READY || sessionState.status === SCAN_SESSION_STATE.INVALID;

  // Helper to render a 3x3 face in the full 2D Net
  const renderNetFace = (face, posClass) => {
    const faceData = sessionState.scannedFaces[face];
    const stickers = faceData?.stickers || [];
    const isTarget = sessionState.currentFace === face;

    return (
      <div key={face} className={`net-face-wrapper ${posClass} ${isTarget ? 'is-target' : ''}`}>
        <div className="net-face-header">
          <span className="net-face-label">{face} • {FACE_GUIDANCE[face]?.name}</span>
          <button
            className="btn-net-rescan"
            onClick={() => handleRescanSpecificFace(face)}
            title={`Rescan face ${face}`}
          >
            <RefreshCw size={12} />
          </button>
        </div>
        <div className="net-face-grid">
          {stickers.length === 9 ? (
            stickers.map((stk, idx) => {
              const colorName = typeof stk === 'object' ? stk.color : stk;
              const hex = CUBE_COLOR_HEX[colorName] || '#ffffff';
              const isCenter = idx === 4;
              return (
                <div
                  key={idx}
                  className={`net-sticker-tile ${isCenter ? 'is-center' : ''}`}
                  style={{ backgroundColor: hex }}
                  title={`${face}${idx}: ${colorName}`}
                >
                  {isCenter && <div className="net-center-indicator" />}
                </div>
              );
            })
          ) : (
            Array(9).fill(0).map((_, idx) => (
              <div key={idx} className="net-sticker-tile placeholder">
                {idx === 4 && <div className="net-center-indicator" />}
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="scanner-view-container">
      {/* Hidden video element feeding frames to offscreen processing canvas */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: 'none' }}
      />

      {/* Top 6-Face Progress Header */}
      <header className="scanner-top-nav">
        <div className="scanner-progress-header">
          <div className="scanner-title-block">
            <Camera size={20} className="text-accent" />
            <h1 className="scanner-main-title">Cube Camera Scanner</h1>
            <span className="scanner-step-badge">
              {sessionState.completedCount} of 6 Faces Scanned
            </span>
          </div>

          <div className="face-stepper-row" role="tablist">
            {FACES.map((face) => {
              const isScanned = !!sessionState.scannedFaces[face];
              const isCurrent = sessionState.currentFace === face && sessionState.status === SCAN_SESSION_STATE.SCANNING_FACE;
              const targetColor = FACE_COLORS[face];
              const hex = CUBE_COLOR_HEX[targetColor];

              return (
                <button
                  key={face}
                  role="tab"
                  aria-selected={isCurrent}
                  className={`face-step-chip ${isScanned ? 'scanned' : ''} ${isCurrent ? 'active' : ''}`}
                  onClick={() => handleRescanSpecificFace(face)}
                  title={`Face ${face} (${FACE_GUIDANCE[face]?.name}) - Click to Scan/Rescan`}
                >
                  <span className="step-color-dot" style={{ backgroundColor: hex }} />
                  <span className="step-face-letter">{face}</span>
                  {isScanned ? (
                    <Check size={12} className="step-check-icon" />
                  ) : (
                    <span className="step-pending-dot" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Linear progress track */}
        <div className="session-progress-bar">
          <div
            className="session-progress-fill"
            style={{ width: `${(sessionState.completedCount / 6) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="scanner-layout">
        {/* Left Column: Viewfinder OR Full 2D Net */}
        <section className="scanner-main-panel">
          {!isFullReview ? (
            <div className="scanner-card viewfinder-card">
              {/* Viewfinder Header with Target Face Instruction */}
              <div className="viewfinder-header">
                <div className="viewfinder-target-info">
                  <span className="target-face-badge" style={{ borderColor: CUBE_COLOR_HEX[sessionState.guidance.centerColor] }}>
                    <span className="target-color-dot" style={{ backgroundColor: CUBE_COLOR_HEX[sessionState.guidance.centerColor] }} />
                    Face: <strong>{sessionState.currentFace} ({sessionState.guidance.name})</strong>
                  </span>
                  <span className="target-center-name">
                    Target Center: <strong>{sessionState.guidance.color}</strong>
                  </span>
                </div>

                {/* Quality Status Badge */}
                <div className={`quality-badge ${quality.toLowerCase().replace('_', '-')}`}>
                  {getQualityBadgeIcon()}
                  <span className="quality-badge-text">
                    {cameraStatus === 'running' ? QUALITY_LABEL[quality] : cameraStatus.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Viewfinder Viewport Canvas */}
              <div className="viewfinder-viewport">
                {cameraStatus === 'running' && (
                  <canvas ref={canvasRef} className="viewfinder-canvas" />
                )}

                {/* Orientation Overlay Guidance */}
                {cameraStatus === 'running' && (
                  <div className="viewfinder-compass-hints">
                    <span className="compass-edge top">▲ {sessionState.guidance.topHint}</span>
                    <span className="compass-edge bottom">▼ {sessionState.guidance.bottomHint}</span>
                    <span className="compass-edge left">◄ {sessionState.guidance.leftHint}</span>
                    <span className="compass-edge right">► {sessionState.guidance.rightHint}</span>
                  </div>
                )}

                {/* Placeholder / Error States */}
                {cameraStatus === 'starting' && (
                  <div className="viewfinder-placeholder">
                    <RefreshCw size={36} className="spin text-accent" />
                    <p className="placeholder-text">Requesting camera access...</p>
                    <span className="placeholder-subtext">Please allow camera permissions if prompted</span>
                  </div>
                )}

                {cameraStatus === 'error' && (
                  <div className="viewfinder-placeholder error-state">
                    <ShieldAlert size={40} className="text-error" />
                    <p className="placeholder-text text-error">Camera Error</p>
                    <span className="placeholder-subtext">{errorMessage}</span>
                    <button className="btn-action primary mt-3" onClick={() => startCamera(facingMode)}>
                      <RefreshCw size={16} />
                      <span>Try Again</span>
                    </button>
                  </div>
                )}

                {cameraStatus === 'idle' && (
                  <div className="viewfinder-placeholder">
                    <VideoOff size={36} className="text-muted" />
                    <p className="placeholder-text">Camera Inactive</p>
                    <button className="btn-action primary mt-3" onClick={() => startCamera(facingMode)}>
                      <Camera size={16} />
                      <span>Start Camera</span>
                    </button>
                  </div>
                )}

                {/* Stability Progress Bar */}
                {cameraStatus === 'running' && (
                  <div className="stability-meter-wrapper">
                    <div className="stability-meter-track">
                      <div
                        className="stability-meter-fill"
                        style={{ width: `${Math.round(stabilityProgress * 100)}%` }}
                      />
                    </div>
                    <span className="stability-meter-label">
                      {quality === SCAN_QUALITY.READY ? 'Hold Still — Ready!' : 'Stabilizing Face...'}
                    </span>
                  </div>
                )}
              </div>

              {/* Viewfinder Actions */}
              <div className="viewfinder-actions">
                <button
                  className={`btn-action primary btn-capture ${quality === SCAN_QUALITY.READY ? 'glow-ready' : ''}`}
                  onClick={handleCaptureClick}
                  disabled={cameraStatus !== 'running' || !liveStickers}
                >
                  <Camera size={18} />
                  <span>Capture {sessionState.guidance.name} Face</span>
                </button>

                <button
                  className="btn-action secondary"
                  onClick={handleToggleFacingMode}
                  title="Switch Front/Back Camera"
                  disabled={cameraStatus !== 'running'}
                >
                  <RefreshCw size={16} />
                  <span>Switch Camera</span>
                </button>
              </div>
            </div>
          ) : (
            /* Full 6-Face Reconstructed 2D Net View */
            <div className="scanner-card full-net-card">
              <div className="card-header">
                <div className="card-title-group">
                  <Layers size={20} className="text-accent" />
                  <h2 className="card-title">Reconstructed 3x3 Cube Net</h2>
                </div>
                <span className={`badge-pill ${sessionState.isValid ? 'success' : 'error'}`}>
                  {sessionState.isValid ? 'Valid Cube State' : 'Validation Failed'}
                </span>
              </div>

              {/* 2D Net Grid (U top; L, F, R, B mid; D bottom) */}
              <div className="unfolded-cube-net">
                {renderNetFace('U', 'net-pos-u')}
                <div className="net-middle-band">
                  {renderNetFace('L', 'net-pos-l')}
                  {renderNetFace('F', 'net-pos-f')}
                  {renderNetFace('R', 'net-pos-r')}
                  {renderNetFace('B', 'net-pos-b')}
                </div>
                {renderNetFace('D', 'net-pos-d')}
              </div>

              {/* Action Buttons for Valid Cube */}
              {sessionState.isValid && (
                <div className="handoff-actions-grid">
                  <button className="btn-action primary glow-ready btn-handoff" onClick={handleSendToSimulator}>
                    <Box size={18} />
                    <span>Open in 3D Simulator</span>
                    <ArrowRight size={16} />
                  </button>

                  <button className="btn-action secondary btn-handoff" onClick={handleSendToSolver}>
                    <Wand2 size={18} className="text-accent" />
                    <span>Open in AI Solver</span>
                    <ArrowRight size={16} />
                  </button>

                  <button className="btn-action secondary btn-handoff" onClick={handleSendToEditor}>
                    <Edit3 size={16} />
                    <span>Adjust in Manual Editor</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Column: Review Panel / Validation Diagnostics */}
        <section className="scanner-sidebar">
          {sessionState.status === SCAN_SESSION_STATE.REVIEWING_FACE && sessionState.pendingCapture ? (
            /* Single-Face Capture Review Card */
            <div className="scanner-card review-modal-card">
              <div className="card-header">
                <div className="card-title-group">
                  <Sparkles size={18} className="text-accent" />
                  <h3 className="card-title">Review Captured Face</h3>
                </div>
                <span className="badge-pill success">Captured</span>
              </div>

              <div className="card-body">
                <div className="review-face-meta">
                  <span className="review-detected-face">
                    Identified Face: <strong>{sessionState.pendingCapture.targetFace} ({FACE_GUIDANCE[sessionState.pendingCapture.targetFace]?.name})</strong>
                  </span>
                  <span className="review-center-color" style={{ color: CUBE_COLOR_HEX[sessionState.pendingCapture.centerColor] }}>
                    Center: {sessionState.pendingCapture.centerColor}
                  </span>
                </div>

                {/* Conflict warning if center mismatch or overwrite */}
                {sessionState.conflictWarning && (
                  <div className="conflict-warning-box">
                    <AlertTriangle size={16} className="text-warning flex-shrink-0" />
                    <span>{sessionState.conflictWarning}</span>
                  </div>
                )}

                {/* 3x3 Preview Grid */}
                <div className="face-grid-preview">
                  {sessionState.pendingCapture.stickers.map((sticker, idx) => (
                    <div
                      key={idx}
                      className={`face-grid-tile tile-${sticker.color} ${idx === 4 ? 'is-center' : ''}`}
                      style={{ backgroundColor: sticker.hex || CUBE_COLOR_HEX[sticker.color] }}
                    >
                      <span className="tile-color-label">{sticker.color.slice(0, 3)}</span>
                      {idx === 4 && <span className="tile-center-dot" />}
                    </div>
                  ))}
                </div>

                {/* Confirm / Rescan Buttons */}
                <div className="review-action-row">
                  <button className="btn-action primary" onClick={handleConfirmFace}>
                    <Check size={16} />
                    <span>Confirm & Next Face</span>
                  </button>
                  <button className="btn-action secondary" onClick={handleRescanCurrent}>
                    <RotateCcw size={16} />
                    <span>Rescan</span>
                  </button>
                </div>
              </div>
            </div>
          ) : isFullReview ? (
            /* Diagnostic & Validation Summary Card */
            <div className={`scanner-card validation-summary-card ${sessionState.isValid ? 'valid' : 'invalid'}`}>
              <div className="card-header">
                <div className="card-title-group">
                  {sessionState.isValid ? (
                    <CheckCircle2 size={18} className="text-success" />
                  ) : (
                    <AlertTriangle size={18} className="text-error" />
                  )}
                  <h3 className="card-title">
                    {sessionState.isValid ? 'Cube Validation Passed' : 'Validation Diagnostics'}
                  </h3>
                </div>
              </div>

              <div className="card-body">
                {sessionState.isValid ? (
                  <div className="validation-success-content">
                    <p className="validation-msg text-success">
                      ✓ All 54 facelets, center alignments, and parity constraints verified successfully!
                    </p>
                    <p className="validation-subtext">
                      The reconstructed cube state is ready to be loaded into the 3D Simulator or solved.
                    </p>
                  </div>
                ) : (
                  <div className="validation-error-content">
                    <div className="error-alert-box">
                      <p className="error-code-title">
                        {sessionState.reconstruction?.validation?.error?.code || 'INVALID_STATE'}
                      </p>
                      <p className="error-description">
                        {sessionState.reconstruction?.diagnostic?.message || sessionState.reconstruction?.validation?.error?.message}
                      </p>
                    </div>

                    {sessionState.reconstruction?.diagnostic?.affectedFaces?.length > 0 && (
                      <div className="affected-faces-section">
                        <h4 className="affected-title">Recommended Faces to Rescan:</h4>
                        <div className="rescan-chips-row">
                          {sessionState.reconstruction.diagnostic.affectedFaces.map((f) => (
                            <button
                              key={f}
                              className="btn-action secondary btn-chip-rescan"
                              onClick={() => handleRescanSpecificFace(f)}
                            >
                              <RefreshCw size={13} />
                              <span>Rescan Face {f} ({FACE_GUIDANCE[f]?.name})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="reset-session-divider">
                  <button className="btn-action secondary w-full mt-4" onClick={handleResetSession}>
                    <RotateCcw size={16} />
                    <span>Start New Scan</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Live 3x3 Preview & Tips Card */
            <>
              <div className="scanner-card live-status-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <Sparkles size={16} className="text-accent" />
                    <h3 className="card-title">Current Face View</h3>
                  </div>
                  <span className="badge-pill info">{sessionState.currentFace} Face</span>
                </div>
                <div className="card-body">
                  {liveStickers ? (
                    <div className="face-grid-preview live">
                      {liveStickers.map((sticker, idx) => (
                        <div
                          key={idx}
                          className={`face-grid-tile tile-${sticker.color} ${idx === 4 ? 'is-center' : ''}`}
                          style={{ backgroundColor: sticker.hex }}
                        >
                          <span className="tile-color-label">{sticker.color.slice(0, 3)}</span>
                          {idx === 4 && <span className="tile-center-dot" />}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-result-prompt">
                      <Maximize2 size={28} className="text-muted opacity-50" />
                      <p className="prompt-title">Align {sessionState.guidance.name} Face</p>
                      <p className="prompt-desc">Point camera at the face with the {sessionState.guidance.color} center sticker.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Scanning Instructions */}
              <div className="scanner-card info-card">
                <div className="card-header">
                  <div className="card-title-group">
                    <Info size={16} className="text-accent" />
                    <h3 className="card-title">Orientation Guide</h3>
                  </div>
                </div>
                <div className="card-body">
                  <ul className="scanner-tips-list">
                    <li>Top edge should face <strong>{sessionState.guidance.topHint}</strong>.</li>
                    <li>Left edge should face <strong>{sessionState.guidance.leftHint}</strong>.</li>
                    <li>Wait for the <strong>Ready</strong> indicator before capturing.</li>
                    <li>Scan all 6 faces to reconstruct the digital cube.</li>
                  </ul>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
export default ScannerView;
