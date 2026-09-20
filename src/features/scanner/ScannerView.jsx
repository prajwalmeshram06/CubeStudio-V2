/**
 * CubeStudio V2 — Phase 7A
 * ScannerView: Presentation component for the camera-based Rubik's Cube scanner foundation.
 *
 * Provides:
 *  - Live camera viewfinder canvas with 3x3 overlay grid and sampling points
 *  - Scan quality status badge & stability progress indicator
 *  - Manual Capture and Rescan actions
 *  - Single-face review panel displaying the 3x3 classified sticker grid
 *  - Camera permission and error feedback
 *  - Complete resource cleanup on tab unmount
 *
 * Governed by DESIGN.md & Stitch Visual Specifications.
 */

import React, { useEffect, useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';
import { useScannerEngine } from './useScannerEngine.js';
import { QUALITY_LABEL, SCAN_QUALITY } from './ScanQuality.js';
import './scanner.css';

export function ScannerView() {
  const {
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
    isCaptured
  } = useScannerEngine();

  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'

  // Auto-start camera when ScannerView mounts, cleanup on unmount
  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera, facingMode]);

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
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

  return (
    <div className="scanner-view-container">
      {/* Hidden video element feeding frames to offscreen processing canvas */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ display: 'none' }}
      />

      <div className="scanner-layout">
        {/* Left Column: Viewfinder & Controls */}
        <section className="scanner-main-panel">
          <div className="scanner-card viewfinder-card">
            <div className="viewfinder-header">
              <div className="viewfinder-title-group">
                <Camera size={18} className="text-accent" />
                <h2 className="viewfinder-title">Face Scanner</h2>
              </div>

              {/* Status Badge */}
              <div className={`quality-badge ${quality.toLowerCase().replace('_', '-')}`}>
                {getQualityBadgeIcon()}
                <span className="quality-badge-text">
                  {cameraStatus === 'running' ? QUALITY_LABEL[quality] : cameraStatus.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Viewfinder Canvas Container */}
            <div className="viewfinder-viewport">
              {cameraStatus === 'running' && (
                <canvas
                  ref={canvasRef}
                  className={`viewfinder-canvas ${isCaptured ? 'captured' : ''}`}
                />
              )}

              {/* Camera Starting / Permission States */}
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

              {/* Stability Progress Bar Overlay */}
              {cameraStatus === 'running' && !isCaptured && (
                <div className="stability-meter-wrapper">
                  <div className="stability-meter-track">
                    <div
                      className="stability-meter-fill"
                      style={{ width: `${Math.round(stabilityProgress * 100)}%` }}
                    />
                  </div>
                  <span className="stability-meter-label">
                    {quality === SCAN_QUALITY.READY ? 'Hold Still — Ready!' : 'Stabilizing...'}
                  </span>
                </div>
              )}
            </div>

            {/* Viewfinder Control Bar */}
            <div className="viewfinder-actions">
              {!isCaptured ? (
                <>
                  <button
                    className={`btn-action primary btn-capture ${quality === SCAN_QUALITY.READY ? 'glow-ready' : ''}`}
                    onClick={capture}
                    disabled={cameraStatus !== 'running' || !liveStickers}
                  >
                    <Camera size={18} />
                    <span>Capture Face</span>
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
                </>
              ) : (
                <>
                  <button className="btn-action primary btn-rescan" onClick={rescan}>
                    <RefreshCw size={18} />
                    <span>Scan Another Face</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Scan Result & Diagnostic Info */}
        <section className="scanner-sidebar">
          {/* Result Card: 3x3 Review Grid */}
          <div className="scanner-card result-card">
            <div className="card-header">
              <div className="card-title-group">
                <Sparkles size={18} className="text-accent" />
                <h3 className="card-title">Single Face Result</h3>
              </div>
              {isCaptured && (
                <span className="badge-pill success">Captured</span>
              )}
            </div>

            <div className="card-body">
              {scanResult ? (
                <div className="single-face-review">
                  <div className="review-meta">
                    <span className="review-center-badge">
                      Face Center:{' '}
                      <strong className="text-capitalize" style={{ color: scanResult.stickers[4]?.hex }}>
                        {scanResult.centerColor}
                      </strong>
                    </span>
                    <span className="review-timestamp">
                      {new Date(scanResult.timestamp).toLocaleTimeString()}
                    </span>
                  </div>

                  {/* 3x3 Color Tiles Grid */}
                  <div className="face-grid-preview">
                    {scanResult.stickers.map((sticker, idx) => (
                      <div
                        key={idx}
                        className={`face-grid-tile tile-${sticker.color} ${idx === 4 ? 'is-center' : ''}`}
                        style={{ backgroundColor: sticker.hex }}
                        title={`Sticker #${idx + 1}: ${sticker.color} (${Math.round(sticker.confidence * 100)}% conf)`}
                      >
                        <span className="tile-color-label">{sticker.color.slice(0, 3)}</span>
                        {idx === 4 && <span className="tile-center-dot" />}
                      </div>
                    ))}
                  </div>

                  {/* Sticker Breakdown Table */}
                  <div className="stickers-breakdown">
                    <h4 className="breakdown-title">Classified Facelets</h4>
                    <div className="stickers-chip-list">
                      {scanResult.stickers.map((stk, i) => (
                        <div key={i} className="sticker-chip">
                          <span className="chip-dot" style={{ backgroundColor: stk.hex }} />
                          <span className="chip-pos">[{stk.row},{stk.col}]</span>
                          <span className="chip-name">{stk.color}</span>
                          <span className="chip-conf">{Math.round(stk.confidence * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : liveStickers ? (
                <div className="single-face-live-preview">
                  <p className="preview-help-text">Live 3x3 sampling:</p>
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
                  <p className="preview-tip">
                    Align the cube face inside the square guide until status shows <strong>Ready</strong>.
                  </p>
                </div>
              ) : (
                <div className="empty-result-prompt">
                  <Maximize2 size={32} className="text-muted opacity-50" />
                  <p className="prompt-title">No Face Captured Yet</p>
                  <p className="prompt-desc">
                    Point your camera directly at one face of your Rubik's cube. The scanner will automatically detect the 3x3 grid.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Instructions Card */}
          <div className="scanner-card info-card">
            <div className="card-header">
              <div className="card-title-group">
                <Info size={16} className="text-accent" />
                <h3 className="card-title">Scanning Tips</h3>
              </div>
            </div>
            <div className="card-body">
              <ul className="scanner-tips-list">
                <li>Hold the cube <strong>parallel</strong> to the camera frame.</li>
                <li>Ensure <strong>even lighting</strong> without harsh glare or deep shadows.</li>
                <li>Fill roughly <strong>60–80%</strong> of the camera frame with the face.</li>
                <li>Wait for the <strong>Ready</strong> status indicator before capturing.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
export default ScannerView;
