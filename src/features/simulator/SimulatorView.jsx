/**
 * CubeStudio V2 - Simulator View
 * React presentation component providing the interactive 3D Rubik's Cube simulator.
 */

import React, { useEffect, useRef, useState } from 'react';
import { CubeScene } from '../../cube/rendering/CubeScene.js';
import { CubeRenderer } from '../../cube/rendering/CubeRenderer.js';
import { SimulatorController } from './SimulatorController.js';
import { RotateCcw, RotateCw, Shuffle, RefreshCw, Compass, Edit3, Wand2 } from 'lucide-react';
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
  // The keyboard handler closure reads from this ref so it never needs to be
  // re-registered when solutionPlayer state changes.
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
      // Yield those keys to SolutionPlayerView's handler.
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

        {/* Floating Header Bar */}
        <div className="simulator-header">
          <div className="brand-section">
            <span className="brand-title">{variant === 'training' ? 'Training' : 'CubeStudio V2'}</span>
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
          {variant === 'training' ? (
            <>
              <span className="kbd">U D L R F B</span> turns <span className="kbd">Shift</span> prime
            </>
          ) : (
            <>
              <span className="kbd">U D L R F B</span> turns <span className="kbd">Shift</span> prime <span className="kbd">Space</span> scramble
            </>
          )}
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

        {/* Floating Interactive Toolbar — ALWAYS rendered and accessible */}
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
            {variant !== 'training' && (
              <button
                className="btn"
                onClick={() => controllerRef.current?.scramble(20)}
                title="Generate random WCA scramble (Space)"
              >
                <Shuffle size={16} />
                <span>Scramble</span>
              </button>
            )}

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

            {variant !== 'training' && (
              <button
                className="btn"
                onClick={() => controllerRef.current?.reset()}
                title="Reset to solved state (Escape)"
              >
                <RefreshCw size={16} />
                <span>Reset</span>
              </button>
            )}

            <button
              className="btn"
              onClick={() => sceneRef.current?.resetCamera()}
              title="Reset camera view"
            >
              <Compass size={16} />
              <span>View</span>
            </button>

            {variant !== 'training' && onOpenEditor && (
              <button
                className="btn"
                onClick={() => onOpenEditor(controllerRef.current?.cubeState.clone())}
                title="Open current state in 2D Manual Editor"
              >
                <Edit3 size={16} />
                <span>Editor</span>
              </button>
            )}

            {variant !== 'training' && onOpenSolver && (
              <button
                className="btn"
                onClick={() => onOpenSolver(controllerRef.current?.cubeState.clone())}
                title="Open current state in Kociemba Solver"
              >
                <Wand2 size={16} />
                <span>Solve</span>
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

