/**
 * CubeStudio V2 - Simulator View
 * React presentation component providing the interactive 3D Rubik's Cube simulator.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CubeScene } from '../../cube/rendering/CubeScene.js';
import { CubeRenderer } from '../../cube/rendering/CubeRenderer.js';
import { SimulatorController } from './SimulatorController.js';
import { RotateCcw, RotateCw, Shuffle, RefreshCw, Compass, Edit3 } from 'lucide-react';
import './simulator.css';

export function SimulatorView({ initialCubeState, onOpenEditor }) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const sceneRef = useRef(null);

  const [simState, setSimState] = useState({
    isSolved: true,
    moveCount: 0,
    canUndo: false,
    canRedo: false,
    lastMove: null,
    isBusy: false,
    animationSpeed: 200
  });

  const [modifier, setModifier] = useState(''); // '' (CW), "'" (prime), '2' (double)

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Initialize Scene & Renderer
    const scene = new CubeScene({ container: containerRef.current });
    const renderer = new CubeRenderer();
    scene.add(renderer.getMesh());

    // 2. Initialize Controller
    const controller = new SimulatorController({
      renderer,
      animationSpeed: 200
    });

    if (initialCubeState) {
      controller.cubeState = initialCubeState.clone();
      controller.history.clear(controller.cubeState);
      renderer.syncWithState(controller.cubeState);
    }

    sceneRef.current = scene;
    controllerRef.current = controller;

    // Subscribe to state updates
    const unsubscribe = controller.subscribe((state) => {
      setSimState({ ...state });
    });

    // 3. Global Keyboard Shortcuts Handler
    const handleKeyDown = (e) => {
      // Ignore inputs in text fields
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      const key = e.key.toLowerCase();

      // Undo: z or Cmd+Z / Ctrl+Z
      if ((e.metaKey || e.ctrlKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          controller.redo();
        } else {
          controller.undo();
        }
        return;
      }

      // Redo: Cmd+Y / Ctrl+Y
      if ((e.metaKey || e.ctrlKey) && key === 'y') {
        e.preventDefault();
        controller.redo();
        return;
      }

      // Scramble: Space
      if (e.code === 'Space') {
        e.preventDefault();
        controller.scramble(20, false);
        return;
      }

      // Reset: Escape
      if (e.key === 'Escape') {
        e.preventDefault();
        controller.reset();
        return;
      }

      // Cube Face Turns: U, D, L, R, F, B
      if (['u', 'd', 'l', 'r', 'f', 'b'].includes(key)) {
        e.preventDefault();
        const face = key.toUpperCase();
        let moveNotation = face;
        if (e.shiftKey) {
          moveNotation = `${face}'`;
        } else if (e.altKey) {
          moveNotation = `${face}2`;
        }
        controller.applyMove(moveNotation);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      unsubscribe();
      scene.dispose();
      renderer.dispose();
    };
  }, []);

  const handleFaceClick = (face) => {
    if (!controllerRef.current) return;
    const notation = `${face}${modifier}`;
    controllerRef.current.applyMove(notation);
    // Reset modifier after use
    setModifier('');
  };

  const handleSpeedChange = (e) => {
    const speed = parseInt(e.target.value, 10);
    controllerRef.current?.setAnimationSpeed(speed);
  };

  return (
    <div className="simulator-container">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="viewport-container" />

      {/* Floating Header Bar */}
      <div className="simulator-header">
        <div className="brand-section">
          <span className="brand-title">CubeStudio V2</span>
          <span className={`badge ${simState.isSolved ? 'badge-solved' : 'badge-scrambled'}`}>
            {simState.isSolved ? 'Solved' : 'Scrambled'}
          </span>
        </div>

        <div className="stats-bar">
          <div className="stat-item">
            <span className="stat-label">Moves</span>
            <span className="stat-value">{simState.moveCount}</span>
          </div>
          {simState.lastMove && (
            <div className="stat-item">
              <span className="stat-label">Last</span>
              <span className="stat-value">{simState.lastMove}</span>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="keyboard-hint">
        <span className="kbd">U D L R F B</span> turns <span className="kbd">Shift</span> prime <span className="kbd">Space</span> scramble
      </div>

      {/* Speed Control Overlay */}
      <div className="speed-control">
        <span>Speed:</span>
        <select value={simState.animationSpeed} onChange={handleSpeedChange}>
          <option value={0}>Instant (0ms)</option>
          <option value={100}>Fast (100ms)</option>
          <option value={200}>Normal (200ms)</option>
          <option value={350}>Smooth (350ms)</option>
        </select>
      </div>

      {/* Floating Interactive Toolbar */}
      <div className="simulator-toolbar">
        {/* Face Buttons */}
        <div className="face-buttons-bar">
          <button
            className={`btn btn-modifier ${modifier === "'" ? 'btn-active' : ''}`}
            onClick={() => setModifier(modifier === "'" ? '' : "'")}
            title="Prime turn (counter-clockwise)"
          >
            '
          </button>
          <button
            className={`btn btn-modifier ${modifier === '2' ? 'btn-active' : ''}`}
            onClick={() => setModifier(modifier === '2' ? '' : '2')}
            title="Double turn (180 degrees)"
          >
            2
          </button>
          {['U', 'D', 'L', 'R', 'F', 'B'].map((face) => (
            <button
              key={face}
              className="btn btn-face"
              onClick={() => handleFaceClick(face)}
              title={`Turn face ${face}${modifier}`}
            >
              {face}
            </button>
          ))}
        </div>

        {/* Action Controls */}
        <div className="action-buttons-bar">
          <button
            className="btn"
            onClick={() => controllerRef.current?.scramble(20)}
            title="Generate random WCA scramble (Space)"
          >
            <Shuffle size={16} />
            <span>Scramble</span>
          </button>

          <button
            className="btn"
            disabled={!simState.canUndo}
            onClick={() => controllerRef.current?.undo()}
            title="Undo move (Cmd+Z)"
          >
            <RotateCcw size={16} />
            <span>Undo</span>
          </button>

          <button
            className="btn"
            disabled={!simState.canRedo}
            onClick={() => controllerRef.current?.redo()}
            title="Redo move (Cmd+Y)"
          >
            <RotateCw size={16} />
            <span>Redo</span>
          </button>

          <button
            className="btn"
            onClick={() => controllerRef.current?.reset()}
            title="Reset to solved state (Escape)"
          >
            <RefreshCw size={16} />
            <span>Reset</span>
          </button>

          <button
            className="btn"
            onClick={() => sceneRef.current?.resetCamera()}
            title="Reset camera view"
          >
            <Compass size={16} />
            <span>View</span>
          </button>

          {onOpenEditor && (
            <button
              className="btn"
              onClick={() => onOpenEditor(controllerRef.current?.cubeState.clone())}
              title="Open current state in 2D Manual Editor"
            >
              <Edit3 size={16} />
              <span>Editor</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
