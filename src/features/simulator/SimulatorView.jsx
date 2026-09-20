/**
 * CubeStudio V2 - Simulator View
 * React presentation component providing the interactive 3D Rubik's Cube simulator.
 * Governed by DESIGN.md & Stitch Visual Specifications.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CubeScene } from '../../cube/rendering/CubeScene.js';
import { CubeRenderer } from '../../cube/rendering/CubeRenderer.js';
import { SimulatorController } from './SimulatorController.js';
import { RotateCcw, RotateCw, Shuffle, RefreshCw, Compass, Edit3, Wand2, Sparkles, ChevronDown } from 'lucide-react';
import { SolutionPlayerController } from '../solver/SolutionPlayerController.js';
import { SolutionPlayerView } from '../solver/SolutionPlayerView.jsx';
import './simulator.css';

export function SimulatorView({
  initialCubeState,
  initialAlgorithm,
  solutionMoves,
  onOpenEditor,
  onOpenSolver,
  variant = 'full',
  onControllerReady
}) {
  const containerRef = useRef(null);
  const controllerRef = useRef(null);
  const sceneRef = useRef(null);
  const onControllerReadyRef = useRef(onControllerReady);
  const variantRef = useRef(variant);
  const [solutionPlayer, setSolutionPlayer] = useState(null);

  useEffect(() => {
    onControllerReadyRef.current = onControllerReady;
  }, [onControllerReady]);

  useEffect(() => {
    variantRef.current = variant;
  }, [variant]);

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

  // Keep a ref that always reflects whether a solution player is currently mounted.
  const solutionPlayerRef = useRef(null);
  useEffect(() => {
    solutionPlayerRef.current = solutionPlayer;
  }, [solutionPlayer]);

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

    const movesToPlay = solutionMoves || (Array.isArray(initialAlgorithm) ? initialAlgorithm : null);
    if (movesToPlay && movesToPlay.length > 0) {
      const player = new SolutionPlayerController({
        initialCubeState: initialCubeState ? initialCubeState.clone() : controller.cubeState.clone(),
        moves: movesToPlay,
        playbackSpeed: 450,
        simulatorController: controller,
      });
      setSolutionPlayer(player);
    } else if (typeof initialAlgorithm === 'string' && initialAlgorithm.length > 0) {
      setTimeout(() => {
        controller.applyAlgorithm(initialAlgorithm);
      }, 50);
    }

    sceneRef.current = scene;
    controllerRef.current = controller;
    onControllerReadyRef.current?.(controller);

    // ResizeObserver on the container so Three.js camera/renderer perfectly adapts
    const resizeObserver = new ResizeObserver(() => {
      scene.resize();
    });
    resizeObserver.observe(containerRef.current);

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

      // When Solution Player is active it owns Space (play/pause) and Escape (close).
      if (solutionPlayerRef.current) {
        if (e.code === 'Space' || e.key === 'Escape') return;
      }

      // Training owns scramble/reset; do not override lesson state from the keyboard.
      if (variantRef.current === 'training') {
        // Face turns still apply below.
      } else {
        // Scramble: Space (only when no solution player)
        if (e.code === 'Space') {
          e.preventDefault();
          controller.scramble(20, false);
          return;
        }

        // Reset: Escape (only when no solution player)
        if (e.key === 'Escape') {
          e.preventDefault();
          controller.reset();
          return;
        }
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
      resizeObserver.disconnect();
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
    <div className={`simulator-container ${solutionPlayer ? 'has-solution-player' : ''} ${variant === 'training' ? 'simulator-training' : ''}`}>
      {/* 3D WebGL Canvas Viewport */}
      <div className="simulator-viewport-wrapper">
        <div ref={containerRef} className="viewport-container" />

        {/* Floating Top Telemetry HUD (Stitch Reference) */}
        <div className="simulator-header">
          <div className="simulator-hud-pill">
            <div className="hud-status-item">
              <span className={`hud-dot ${simState.isSolved ? 'dot-solved' : 'dot-scrambled'}`} />
              <span className="hud-status-text">{simState.isSolved ? 'Solved State' : 'Scrambled'}</span>
            </div>

            <div className="hud-divider" />

            <div className="hud-item">
              <span className="hud-label">MOVES</span>
              <span className="hud-value">{simState.moveCount}</span>
            </div>

            {simState.lastMove && (
              <>
                <div className="hud-divider" />
                <div className="hud-item">
                  <span className="hud-label">LAST MOVE</span>
                  <span className="hud-badge-mono">{simState.lastMove}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Keyboard Shortcuts Hint (Bottom Left) */}
        <div className="keyboard-hint">
          {variant === 'training' ? (
            <>
              <span className="kbd">U D L R F B</span> turns <span className="kbd">Shift</span> prime
            </>
          ) : (
            <>
              <span className="kbd">Space</span> Scramble <span className="kbd-sep">•</span> <span className="kbd">Esc</span> Reset
            </>
          )}
        </div>

        {/* Speed Control Overlay (Bottom Right) */}
        <div className="speed-control">
          <span className="speed-label">SPEED:</span>
          <div className="speed-select-wrapper">
            <select
              value={simState.animationSpeed}
              onChange={handleSpeedChange}
              aria-label="Animation speed"
            >
              <option value={0}>Instant (0ms)</option>
              <option value={100}>Fast (100ms)</option>
              <option value={200}>Normal (200ms)</option>
              <option value={350}>Smooth (350ms)</option>
            </select>
            <ChevronDown size={12} className="speed-select-arrow" />
          </div>
        </div>

        {/* Floating Bottom Control Workbench (Stitch Reference) */}
        <div className="simulator-toolbar">
          {/* Face Buttons & Modifiers */}
          <div className="face-buttons-bar">
            <button
              className={`btn-modifier ${modifier === "'" ? 'active' : ''}`}
              onClick={() => setModifier(modifier === "'" ? '' : "'")}
              title="Prime modifier: counter-clockwise (Shift + Face)"
              aria-label="Prime modifier"
            >
              '
            </button>
            <button
              className={`btn-modifier ${modifier === '2' ? 'active' : ''}`}
              onClick={() => setModifier(modifier === '2' ? '' : '2')}
              title="Double modifier: 180 degrees (Alt + Face)"
              aria-label="Double turn modifier"
            >
              2
            </button>

            <div className="toolbar-inner-divider" />

            {['U', 'D', 'L', 'R', 'F', 'B'].map((face) => (
              <button
                key={face}
                className="btn-face"
                onClick={() => handleFaceClick(face)}
                title={`Turn face ${face}${modifier}`}
                aria-label={`Turn face ${face}${modifier}`}
              >
                {face}
              </button>
            ))}
          </div>

          {/* Action Controls Bar */}
          <div className="action-buttons-bar">
            {variant !== 'training' && (
              <button
                className="btn-action"
                onClick={() => controllerRef.current?.scramble(20)}
                title="Generate random WCA scramble (Space)"
              >
                <Shuffle size={14} />
                <span>Scramble</span>
              </button>
            )}

            <button
              className="btn-action btn-icon-only"
              disabled={!simState.canUndo}
              onClick={() => controllerRef.current?.undo()}
              title="Undo move (Cmd+Z)"
              aria-label="Undo move"
            >
              <RotateCcw size={14} />
            </button>

            <button
              className="btn-action btn-icon-only"
              disabled={!simState.canRedo}
              onClick={() => controllerRef.current?.redo()}
              title="Redo move (Cmd+Y)"
              aria-label="Redo move"
            >
              <RotateCw size={14} />
            </button>

            <button
              className="btn-action btn-icon-only"
              onClick={() => sceneRef.current?.resetCamera()}
              title="Reset camera view"
              aria-label="Reset camera view"
            >
              <Compass size={14} />
            </button>

            {variant !== 'training' && (
              <button
                className="btn-action btn-icon-only"
                onClick={() => controllerRef.current?.reset()}
                title="Reset to solved state (Escape)"
                aria-label="Reset to solved state"
              >
                <RefreshCw size={14} />
              </button>
            )}

            {variant !== 'training' && onOpenEditor && (
              <button
                className="btn-action btn-action-editor"
                onClick={() => onOpenEditor(controllerRef.current?.cubeState.clone())}
                title="Open current state in 2D Manual Editor"
              >
                <Edit3 size={14} />
                <span>Open in Editor</span>
              </button>
            )}

            {variant !== 'training' && onOpenSolver && (
              <button
                className="btn-action btn-action-solve"
                onClick={() => onOpenSolver(controllerRef.current?.cubeState.clone())}
                title="Open current state in Kociemba Solver"
              >
                <Wand2 size={14} />
                <span>Solve Cube</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Docked Compact Solution Player below the 3D viewport */}
      {solutionPlayer && (
        <div className="simulator-solution-player-dock">
          <SolutionPlayerView
            controller={solutionPlayer}
            compact
            onClose={() => {
              solutionPlayer.pause();
              setSolutionPlayer(null);
            }}
          />
        </div>
      )}
    </div>
  );
}

export default SimulatorView;
