/**
 * SolutionPlayerView.jsx — React Presentation Component for Solution Playback.
 *
 * Displays:
 *  - Move track with completed, current, and upcoming highlighting
 *  - Auto-scrolling active move chip
 *  - Progress count and progress bar
 *  - Hint panel with natural-language turn directions
 *  - Playback controls: Restart, Previous, Play/Pause, Next
 *  - Playback speed pills (0.5x, 1x, 1.5x, 2x)
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Lightbulb, CheckCircle2, X } from 'lucide-react';
import './solutionPlayer.css';

const SPEED_PRESETS = [
  { label: '0.5x', ms: 800 },
  { label: '1x',   ms: 500 },
  { label: '1.5x', ms: 350 },
  { label: '2x',   ms: 200 },
];

/**
 * @param {{
 *   controller: import('./SolutionPlayerController.js').SolutionPlayerController,
 *   compact?: boolean,
 *   onClose?: () => void
 * }} props
 */
export function SolutionPlayerView({ controller, compact = false, onClose }) {
  const [playerState, setPlayerState] = useState(() => controller.getState());
  const activeChipRef = useRef(null);
  const trackRef = useRef(null);

  // ── Subscribe to controller state changes ────────────────────
  useEffect(() => {
    const unsubscribe = controller.subscribe((state) => {
      setPlayerState({ ...state });
    });

    return () => {
      unsubscribe();
      controller.pause();
    };
  }, [controller]);

  // ── Auto-scroll active move chip into view (scoped to track) ─
  // Never call scrollIntoView — that can propagate up the ancestor chain
  // and cause visible viewport repaints / blink during autoplay.
  // Instead, compute the chip offset relative to the track and call
  // scrollBy only on the track element itself.
  useEffect(() => {
    const track = trackRef.current;
    const chip  = activeChipRef.current;
    if (!track || !chip) return;

    const trackRect = track.getBoundingClientRect();
    const chipRect  = chip.getBoundingClientRect();

    // Distance needed to bring chip to horizontal center of track
    const chipCenter  = chipRect.left + chipRect.width / 2;
    const trackCenter = trackRect.left + trackRect.width / 2;
    const delta = chipCenter - trackCenter;

    track.scrollBy({ left: delta, behavior: 'smooth' });
  }, [playerState.currentIndex]);

  const {
    moves,
    currentIndex,
    status,
    isPlaying,
    isCompleted,
    canStepForward,
    canStepBackward,
    canRestart,
    progress,
    nextHint,
    playbackSpeed,
  } = playerState;

  // ── Action Handlers ──────────────────────────────────────────
  const handleStepForward = useCallback(() => {
    controller.stepForward();
  }, [controller]);

  const handleStepBackward = useCallback(() => {
    controller.stepBackward();
  }, [controller]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
  }, [controller, isPlaying]);

  const handleRestart = useCallback(() => {
    controller.restart();
  }, [controller]);

  const handleSpeedSelect = useCallback(
    (speedMs) => {
      controller.setPlaybackSpeed(speedMs);
    },
    [controller]
  );

  // ── Solution Player Keyboard Shortcuts ───────────────────────
  useEffect(() => {
    const handlePlayerKeyDown = (e) => {
      // Ignore when focused inside form inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        controller.stepForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        controller.stepBackward();
      } else if (e.code === 'Space') {
        e.preventDefault();
        const state = controller.getState();
        if (state.isPlaying) {
          controller.pause();
        } else if (!state.isCompleted) {
          controller.play();
        }
      } else if (e.key.toLowerCase() === 'r' && !e.metaKey && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        // Only trigger restart when 'r' is pressed without modifiers (which could be cube face R)
        // Check if user is trying to restart
        e.preventDefault();
        controller.restart();
      } else if (e.key === 'Escape') {
        if (onClose) {
          e.preventDefault();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handlePlayerKeyDown);
    return () => {
      window.removeEventListener('keydown', handlePlayerKeyDown);
    };
  }, [controller, onClose]);

  // ── Handle Empty Solution ────────────────────────────────────
  if (!moves || moves.length === 0) {
    return (
      <div className="solution-player">
        <div className="solution-empty-state">
          <CheckCircle2 size={32} />
          <span>Already Solved — No moves required.</span>
          {onClose && (
            <button
              className="solution-close-btn"
              onClick={onClose}
              aria-label="Close solution player"
              title="Close solution player (Escape)"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Render Normal Solution Player ────────────────────────────
  return (
    <div className={`solution-player ${compact ? 'solution-player--compact' : ''}`} role="region" aria-label="Solution Player">
      {/* Header & Step Counter */}
      <div className="solution-player-header">
        <div className="solution-header-left">
          <div className="solution-step-counter">
            <span>
              Move {progress.current} of {progress.total}
            </span>
            <span className="solution-percent-badge">{progress.percent}%</span>
          </div>

          <span className={`solution-status-tag ${status}`}>
            {status === 'playing'
              ? '▶ Playing'
              : status === 'paused'
              ? '⏸ Paused'
              : status === 'completed'
              ? '✓ Solved'
              : 'Ready'}
          </span>
        </div>

        {onClose && (
          <button
            className="solution-close-btn"
            onClick={onClose}
            aria-label="Close solution player"
            title="Close solution player (Escape)"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div
        className="solution-progress-track"
        role="progressbar"
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="solution-progress-fill"
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {/* Horizontal Move Rail */}
      <div className="solution-move-track-container">
        <div className="solution-move-track" ref={trackRef} tabIndex={0} aria-label="Solution moves sequence">
          {moves.map((move, idx) => {
            const isFinished = idx < currentIndex;
            const isCurrent = idx === currentIndex;
            const isUpcoming = idx > currentIndex;

            let chipClass = 'solution-chip';
            if (isFinished) chipClass += ' completed';
            else if (isCurrent) chipClass += ' current';
            else chipClass += ' upcoming';

            return (
              <div
                key={idx}
                ref={isCurrent ? activeChipRef : null}
                className={chipClass}
                aria-current={isCurrent ? 'step' : undefined}
                role="button"
                tabIndex={0}
                onClick={() => controller.skipTo(idx)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    controller.skipTo(idx);
                  }
                }}
                title={`Jump to Move ${idx + 1}: ${move.notation}`}
              >
                <span className="chip-num">{idx + 1}</span>
                <span>{move.notation}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hint Card */}
      <div className={`solution-hint-card ${isCompleted ? 'completed' : ''}`}>
        <div className="solution-hint-left">
          <div className="solution-hint-icon">
            {isCompleted ? <CheckCircle2 size={20} /> : <Lightbulb size={20} />}
          </div>
          <div className="solution-hint-body">
            <span className="solution-hint-label">
              {isCompleted ? 'Solution Complete' : 'Next Move'}
            </span>
            <span className="solution-hint-desc">
              {isCompleted
                ? 'Cube is solved. No remaining moves.'
                : nextHint.description}
            </span>
          </div>
        </div>

        {!isCompleted && nextHint.notation && (
          <span className="solution-hint-badge">{nextHint.notation}</span>
        )}
      </div>

      {/* Playback Controls Bar */}
      <div className="solution-controls-bar">
        <div className="solution-main-buttons">
          {/* Restart */}
          <button
            className="player-btn"
            onClick={handleRestart}
            disabled={!canRestart}
            aria-label="Restart solution from beginning"
            title="Restart solution (rewind to 0)"
          >
            <RotateCcw size={16} />
            <span>Restart</span>
          </button>

          {/* Previous / Undo Step */}
          <button
            className="player-btn"
            onClick={handleStepBackward}
            disabled={!canStepBackward}
            aria-label="Step backward to previous move"
            title="Step backward (undo)"
          >
            <SkipBack size={16} />
            <span>Prev</span>
          </button>

          {/* Play / Pause Toggle */}
          <button
            className={`player-btn ${isPlaying ? 'player-btn-pause' : 'player-btn-play'}`}
            onClick={handleTogglePlay}
            disabled={isCompleted && !isPlaying}
            aria-label={isPlaying ? 'Pause solution autoplay' : 'Play solution automatically'}
            title={isPlaying ? 'Pause autoplay' : 'Play autoplay'}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Next Step */}
          <button
            className="player-btn"
            onClick={handleStepForward}
            disabled={!canStepForward}
            aria-label="Step forward to next move"
            title="Step forward (next move)"
          >
            <span>Next</span>
            <SkipForward size={16} />
          </button>
        </div>

        {/* Speed Selector Pills */}
        <div className="solution-speed-selector" role="group" aria-label="Playback speed">
          {SPEED_PRESETS.map((preset) => {
            const isActive = playbackSpeed === preset.ms;
            return (
              <button
                key={preset.label}
                className={`speed-pill ${isActive ? 'active' : ''}`}
                onClick={() => handleSpeedSelect(preset.ms)}
                aria-pressed={isActive}
                aria-label={`Playback speed ${preset.label}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default SolutionPlayerView;
