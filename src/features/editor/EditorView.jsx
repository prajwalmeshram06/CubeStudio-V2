/**
 * CubeStudio V2 - Editor View
 * 2D Net Manual Cube Editor React Component.
 */

import React, { useState, useEffect, useRef } from 'react';
import { EditorController } from './EditorController.js';
import { FACES, FACE_COLORS, CENTER_STICKER_INDEX } from '../../cube/model/constants.js';
import { CheckCircle2, AlertTriangle, RotateCcw, RotateCw, RefreshCw, Trash2, ArrowRight, Download, Upload } from 'lucide-react';
import './editor.css';

export function EditorView({ initialCubeState, onLoadIntoSimulator }) {
  const controllerRef = useRef(null);
  const [editorState, setEditorState] = useState(null);
  const [ioText, setIoText] = useState('');
  const [ioMessage, setIoMessage] = useState(null);

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

  const handleSendToSimulator = () => {
    if (!validation.valid || !onLoadIntoSimulator) return;
    onLoadIntoSimulator(controllerRef.current.cubeState.clone());
  };

  // 2D Net Faces in order: U (top), L, F, R, B (middle), D (bottom)
  const renderFace = (face, posClass) => {
    const stickers = cubeState.getFace(face);
    return (
      <div key={face} className={`face-grid-wrapper ${posClass}`}>
        <span className="face-label">{face} ({FACE_COLORS[face]})</span>
        <div className="face-grid">
          {stickers.map((color, idx) => {
            const isCenter = idx === CENTER_STICKER_INDEX;
            return (
              <div
                key={idx}
                className={`sticker-cell bg-${color} ${isCenter ? 'center' : ''}`}
                onClick={() => handleStickerClick(face, idx)}
                title={isCenter ? `Center (${face})` : `Sticker ${face}${idx}: ${color} (Click to paint)`}
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
      {/* Header */}
      <div className="editor-header">
        <div className="editor-title-group">
          <h2>Manual Cube Editor</h2>
          <p>Click stickers to paint with active color or load state into simulator.</p>
        </div>

        {onLoadIntoSimulator && (
          <button
            className="btn btn-primary"
            disabled={!validation.valid}
            onClick={handleSendToSimulator}
            title={validation.valid ? 'Open this cube in the 3D Simulator' : 'Fix validation errors first'}
          >
            <span>Load into Simulator</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>

      {/* Live Validation Banner */}
      <div className={`validation-banner ${validation.valid ? 'valid' : 'invalid'}`}>
        <div className="validation-info">
          {validation.valid ? (
            <>
              <CheckCircle2 size={18} />
              <span>Cube configuration is valid and physically solvable.</span>
            </>
          ) : (
            <>
              <AlertTriangle size={18} />
              <span>{validation.error?.message}</span>
              {validation.error?.code && (
                <span className="validation-code">{validation.error.code}</span>
              )}
            </>
          )}
        </div>
      </div>

      {/* Color Palette */}
      <div className="palette-section">
        <span className="palette-label">Select Color Palette</span>
        <div className="palette-buttons">
          {FACES.map((face) => {
            const count = colorCounts[face] || 0;
            const isSelected = selectedColor === face;
            const countStatus = count === 9 ? 'exact' : 'error';
            return (
              <button
                key={face}
                className={`palette-btn ${isSelected ? 'selected' : ''}`}
                onClick={() => controllerRef.current?.setSelectedColor(face)}
                title={`Select ${FACE_COLORS[face]} (${face})`}
              >
                <div className={`color-swatch bg-${face}`} />
                <span className={`color-count ${countStatus}`}>{count}/9</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2D Cube Net Layout */}
      <div className="cube-net-container">
        {renderFace('U', 'pos-U')}
        {renderFace('L', 'pos-L')}
        {renderFace('F', 'pos-F')}
        {renderFace('R', 'pos-R')}
        {renderFace('B', 'pos-B')}
        {renderFace('D', 'pos-D')}
      </div>

      {/* Action Toolbar */}
      <div className="editor-toolbar">
        <button
          className="btn"
          disabled={!canUndo}
          onClick={() => controllerRef.current?.undo()}
          title="Undo sticker edit"
        >
          <RotateCcw size={16} />
          <span>Undo</span>
        </button>

        <button
          className="btn"
          disabled={!canRedo}
          onClick={() => controllerRef.current?.redo()}
          title="Redo sticker edit"
        >
          <RotateCw size={16} />
          <span>Redo</span>
        </button>

        <button
          className="btn"
          onClick={() => controllerRef.current?.resetToSolved()}
          title="Reset to standard solved cube"
        >
          <RefreshCw size={16} />
          <span>Reset Solved</span>
        </button>

        <button
          className="btn"
          onClick={() => controllerRef.current?.clear()}
          title="Clear all non-center stickers"
        >
          <Trash2 size={16} />
          <span>Clear Net</span>
        </button>
      </div>

      {/* Import / Export Section */}
      <div className="io-section">
        <span className="palette-label">Import / Export (Kociemba 54-char string)</span>
        <textarea
          value={ioText}
          onChange={(e) => {
            setIoText(e.target.value);
            setIoMessage(null);
          }}
          placeholder="Paste 54-char facelet string..."
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button className="btn" onClick={handleImport}>
            <Upload size={14} />
            <span>Import String</span>
          </button>
          <button
            className="btn"
            onClick={() => {
              navigator.clipboard.writeText(ioText);
              setIoMessage({ type: 'success', text: 'Copied to clipboard!' });
            }}
          >
            <Download size={14} />
            <span>Copy String</span>
          </button>
          {ioMessage && (
            <span style={{ fontSize: '0.8rem', color: ioMessage.type === 'success' ? '#4ade80' : '#f87171' }}>
              {ioMessage.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
