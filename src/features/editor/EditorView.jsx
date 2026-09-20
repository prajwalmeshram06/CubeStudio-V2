/**
 * CubeStudio V2 - Manual Cube Editor View
 * 2D Net Manual Cube Editor React Component.
 * Governed by DESIGN.md & Stitch Visual Reference (media_1789896645224.png).
 */

import React, { useState, useEffect, useRef } from 'react';
import { EditorController } from './EditorController.js';
import { FACES, FACE_COLORS, CENTER_STICKER_INDEX } from '../../cube/model/constants.js';
import {
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RotateCw,
  RefreshCw,
  Trash2,
  ArrowRight,
  Download,
  Upload,
  Copy,
  Check,
  Wand2,
  Layers,
  Info
} from 'lucide-react';
import './editor.css';

const COLOR_NAMES = {
  U: 'White',
  R: 'Red',
  F: 'Green',
  D: 'Yellow',
  L: 'Orange',
  B: 'Blue'
};

export function EditorView({ initialCubeState, onLoadIntoSimulator, onOpenSolver }) {
  const controllerRef = useRef(null);
  const [editorState, setEditorState] = useState(null);
  const [ioText, setIoText] = useState('');
  const [ioMessage, setIoMessage] = useState(null);
  const [copiedString, setCopiedString] = useState(false);

  useEffect(() => {
    const controller = new EditorController({ initialState: initialCubeState });
    controllerRef.current = controller;

    const unsubscribe = controller.subscribe((state) => {
      setEditorState({ ...state });
      setIoText(controller.exportState('string'));
    });

    return () => unsubscribe();
  }, [initialCubeState]);

  if (!editorState) return null;

  const { cubeState, selectedColor, validation, colorCounts, canUndo, canRedo } = editorState;

  const handleStickerClick = (face, index) => {
    if (index === CENTER_STICKER_INDEX) return;
    controllerRef.current?.setSticker(face, index, selectedColor);
  };

  const handleImport = () => {
    if (!ioText.trim()) return;
    const result = controllerRef.current?.importState(ioText.trim());
    if (result && result.success) {
      setIoMessage({ type: 'success', text: 'State imported successfully!' });
    } else {
      setIoMessage({ type: 'error', text: result?.error || 'Import failed' });
    }
  };

  const handleCopyString = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ioText);
      setCopiedString(true);
      setIoMessage({ type: 'success', text: 'Copied to clipboard!' });
      setTimeout(() => setCopiedString(false), 2000);
    }
  };

  const handleSendToSimulator = () => {
    if (!validation.valid || !onLoadIntoSimulator) return;
    onLoadIntoSimulator(controllerRef.current.cubeState.clone());
  };

  // 2D Net Faces: U (top), L, F, R, B (middle row), D (bottom)
  const renderFace = (face, posClass) => {
    const stickers = cubeState.getFace(face);
    return (
      <div key={face} className={`face-grid-wrapper ${posClass}`}>
        <span className="face-tag-label">{face} • {COLOR_NAMES[face]}</span>
        <div className="face-grid">
          {stickers.map((color, idx) => {
            const isCenter = idx === CENTER_STICKER_INDEX;
            return (
              <div
                key={idx}
                className={`sticker-cell bg-${color} ${isCenter ? 'center' : ''}`}
                onClick={() => handleStickerClick(face, idx)}
                title={isCenter ? `Center (${face} - Fixed)` : `Facelet ${face}${idx} (Click to paint)`}
                role="button"
                tabIndex={isCenter ? -1 : 0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && !isCenter) {
                    e.preventDefault();
                    handleStickerClick(face, idx);
                  }
                }}
              >
                {isCenter && <div className="center-dot" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="editor-container">
      {/* Top Header (Stitch Reference) */}
      <div className="editor-top-header">
        <div className="editor-title-row">
          <h1>Manual Cube Editor</h1>
          <span className="editor-wca-badge">WCA 3x3x3</span>
          <span className={`editor-state-badge ${validation.valid ? 'valid' : 'invalid'}`}>
            {validation.valid ? (
              <>
                <CheckCircle2 size={13} />
                <span>Valid State</span>
              </>
            ) : (
              <>
                <AlertTriangle size={13} />
                <span>{validation.error?.code || 'State Mismatch'}</span>
              </>
            )}
          </span>
        </div>

        <div className="editor-subtitle-row">
          <p className="editor-instruction-text">
            Click a palette color and apply to stickers on the unfolded 2D net. Center stickers are fixed WCA standard.
          </p>
          <div className="editor-active-color-legend">
            <span>● U (White) Top</span>
            <span>● F (Green) Front</span>
            <span className="active-paint-indicator">
              Active Paint: <strong>{COLOR_NAMES[selectedColor]} ({selectedColor})</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Work Area (Stitch Reference) */}
      <div className="editor-main-layout">
        {/* Left Column: 2D Unfolded Net */}
        <div className="editor-net-panel">
          <div className="net-panel-header">
            <span className="net-panel-title">ORTHOGONAL UNFOLDED NET • Click facelet to paint</span>
          </div>

          <div className="net-viewport">
            <div className="cube-net-container">
              {renderFace('U', 'pos-U')}
              {renderFace('L', 'pos-L')}
              {renderFace('F', 'pos-F')}
              {renderFace('R', 'pos-R')}
              {renderFace('B', 'pos-B')}
              {renderFace('D', 'pos-D')}
            </div>
          </div>

          <div className="net-panel-footer">
            <div className="net-footer-legend">
              <span>○ Dot = Fixed center piece</span>
              <span className="footer-legend-sep">•</span>
              <span>1–6 Select Color</span>
            </div>
            <span className="net-footer-count">Facelets Indexed: 54/54</span>
          </div>
        </div>

        {/* Right Column: Inspector Panel */}
        <div className="editor-inspector-panel">
          {/* Palette & Live Distribution */}
          <div className="inspector-card">
            <div className="inspector-card-header">
              <h4>PALETTE &amp; LIVE DISTRIBUTION</h4>
              <span className="inspector-sublabel">Required: 9 each</span>
            </div>

            <div className="palette-grid">
              {FACES.map((face) => {
                const count = colorCounts[face] || 0;
                const isSelected = selectedColor === face;
                const isExact = count === 9;
                return (
                  <button
                    key={face}
                    className={`palette-card-btn ${isSelected ? 'selected' : ''}`}
                    onClick={() => controllerRef.current?.setSelectedColor(face)}
                    title={`Select ${COLOR_NAMES[face]} (${face})`}
                  >
                    <div className="palette-card-left">
                      <div className={`palette-swatch bg-${face}`} />
                      <span className="palette-color-name">{COLOR_NAMES[face]}</span>
                    </div>

                    <div className="palette-card-right">
                      <span className={`palette-count ${isExact ? 'exact' : 'mismatch'}`}>
                        {count}/9
                      </span>
                      {isExact ? (
                        <Check size={13} className="count-icon-exact" />
                      ) : (
                        <AlertTriangle size={13} className="count-icon-mismatch" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation Status Card */}
          <div className={`inspector-validation-card ${validation.valid ? 'valid' : 'invalid'}`}>
            <div className="validation-card-header">
              <span className="validation-status-kicker">
                {validation.valid ? 'VALID CUBE STATE' : 'INVALID CUBE STATE'}
              </span>
              {validation.error?.code && (
                <span className="validation-code-badge">{validation.error.code}</span>
              )}
            </div>

            <div className="validation-card-body">
              <div className="validation-card-message">
                {validation.valid ? (
                  <>
                    <CheckCircle2 size={16} className="validation-body-icon valid" />
                    <span>Cube configuration is valid and physically solvable.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} className="validation-body-icon invalid" />
                    <span>{validation.error?.message}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* History & Controls */}
          <div className="inspector-card">
            <div className="inspector-card-header">
              <h4>HISTORY &amp; CONTROLS</h4>
            </div>

            <div className="editor-control-grid">
              <button
                className="editor-grid-btn"
                disabled={!canUndo}
                onClick={() => controllerRef.current?.undo()}
                title="Undo sticker edit"
              >
                <RotateCcw size={14} />
                <span>Undo</span>
              </button>

              <button
                className="editor-grid-btn"
                disabled={!canRedo}
                onClick={() => controllerRef.current?.redo()}
                title="Redo sticker edit"
              >
                <RotateCw size={14} />
                <span>Redo</span>
              </button>

              <button
                className="editor-grid-btn"
                onClick={() => controllerRef.current?.resetToSolved()}
                title="Reset to standard solved cube"
              >
                <RefreshCw size={14} />
                <span>Reset Solved</span>
              </button>

              <button
                className="editor-grid-btn danger"
                onClick={() => controllerRef.current?.clear()}
                title="Clear all non-center stickers"
              >
                <Trash2 size={14} />
                <span>Clear Net</span>
              </button>
            </div>

            {/* Main Action CTAs */}
            <div className="editor-cta-column">
              {onLoadIntoSimulator && (
                <button
                  className="btn-editor-primary"
                  disabled={!validation.valid}
                  onClick={handleSendToSimulator}
                  title={validation.valid ? 'Open this cube in the 3D Simulator' : 'Fix validation errors first'}
                >
                  <Layers size={15} />
                  <span>Load into Simulator</span>
                </button>
              )}

              {onOpenSolver && (
                <button
                  className="btn-editor-secondary"
                  disabled={!validation.valid}
                  onClick={() => onOpenSolver(controllerRef.current?.cubeState.clone())}
                  title={validation.valid ? 'Open current state in Kociemba Solver' : 'Fix validation errors first'}
                >
                  <Wand2 size={15} />
                  <span>Solve with Kociemba</span>
                </button>
              )}
            </div>
          </div>

          {/* Kociemba 54-Char Facelet String */}
          <div className="inspector-card">
            <div className="inspector-card-header">
              <h4>KOCIEMBA 54-CHAR FACELET STRING</h4>
              <span className="inspector-sublabel">Order: U R F D L B</span>
            </div>

            <textarea
              className="editor-io-textarea"
              value={ioText}
              onChange={(e) => {
                setIoText(e.target.value);
                setIoMessage(null);
              }}
              placeholder="Paste 54-char facelet string..."
              rows={2}
            />

            <div className="editor-io-actions">
              <button className="btn-io" onClick={handleImport}>
                <Upload size={13} />
                <span>Paste / Import</span>
              </button>
              <button className="btn-io" onClick={handleCopyString}>
                {copiedString ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
                <span>Copy String</span>
              </button>
              {ioMessage && (
                <span className={`io-feedback-text ${ioMessage.type}`}>
                  {ioMessage.text}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorView;
