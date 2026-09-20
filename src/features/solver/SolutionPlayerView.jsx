/**
 * SolutionPlayerView.jsx — React Presentation Component for Solution Playback.
 * Governed by DESIGN.md & Stitch Visual Reference (media_1789896645222.png).
 *
 * Displays:
 *  - Step counter + completion badge + live state tag
 *  - Full progress bar
 *  - Algorithm scrubbing rail with clickable chips and completed checkmarks
 *  - Target instruction card with natural-language turn description and next-up preview
 *  - Playback controls: Restart, Prev, Play/Pause, Next
 *  - Speed pills (0.5x, 1x, 1.5x, 2x) and keyboard shortcuts hint
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Lightbulb,
  CheckCircle2,
  Check,
  X,
  ExternalLink,
  Compass
} from 'lucide-react';
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
 *   onClose?: () => void,
 *   onOpenInSimulator?: () => void
 * }} props
 */
export function SolutionPlayerView({
  controller,
  compact = false,
  onClose,
  onOpenInSimulator
}) {
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
  useEffect(() => {
    const track = trackRef.current;
    const chip  = activeChipRef.current;
    if (!track || !chip) return;

    const trackRect = track.getBoundingClientRect();
    const chipRect  = chip.getBoundingClientRect();

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

  // ── Keyboard Shortcuts ───────────────────────────────────────
  useEffect(() => {
    const handlePlayerKeyDown = (e) => {
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
          <CheckCircle2 size={28} />
          <span>Already Solved — No moves required.</span>
          {onClose && (
            <button
              className="solution-close-btn"
              onClick={onClose}
              aria-label="Close solution player"
              title="Close solution player (Escape)"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Next move preview
  const nextMoveUpcoming = moves[currentIndex + 1] ? moves[currentIndex + 1].notation : null;

  return (
    <div
      className={`solution-player ${compact ? 'solution-player--compact' : ''}`}
      role="region"
      aria-label="Solution Player"
    >
      {/* Header & Status (Stitch Reference) */}
      <div className="solution-player-header">
        <div className="solution-header-left">
          <div className="solution-step-counter">
            <span>Move {progress.current} of {progress.total}</span>
            <span className="solution-percent-badge">{progress.percent}%</span>
          </div>

          <span className={`solution-status-tag ${status}`}>
            <span className={`status-tag-dot ${status}`} />
            {status === 'playing'
              ? 'Playing'
              : status === 'paused'
              ? 'Paused'
              : status === 'completed'
              ? 'Solved'
              : 'Ready'}
          </span>
        </div>

        <div className="solution-header-right">
          {onOpenInSimulator && !compact && (
            <button
              className="solution-open-sim-btn"
              onClick={onOpenInSimulator}
              title="Open and animate solution in 3D Simulator"
            >
              <ExternalLink size={13} />
              <span>Open Solution in 3D Simulator</span>
            </button>
          )}

          {onClose && (
            <button
              className="solution-close-btn"
              onClick={onClose}
              aria-label="Close solution player"
              title="Close solution player (Escape)"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar Track */}
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

      {/* Algorithm Scrubbing Rail (Stitch Reference) */}
      <div className="solution-rail-wrapper">
        <div className="solution-rail-header">
          <span className="solution-rail-label">ALGORITHM SCRUBBING RAIL</span>
          <span className="solution-rail-hint">Click any chip to jump to step</span>
        </div>

        <div
          className="solution-move-track"
          ref={trackRef}
          tabIndex={0}
          aria-label="Solution moves sequence"
        >
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
                <span className="chip-notation">{move.notation}</span>
                {isFinished && <Check size={10} className="chip-check-icon" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Target Instruction Card (Stitch Reference) */}
      <div className={`solution-hint-card ${isCompleted ? 'completed' : ''}`}>
        <div className="solution-hint-left">
          <div className="solution-hint-icon">
            {isCompleted ? <CheckCircle2 size={18} /> : <Compass size={18} />}
          </div>
          <div className="solution-hint-body">
            <span className="solution-hint-label">
              {isCompleted ? 'Solution Complete' : 'Target Instruction / Next Move'}
            </span>
            <span className="solution-hint-desc">
              {isCompleted
                ? 'Cube is solved. No remaining moves.'
                : nextHint.description || `Turn face ${nextHint.notation}`}
            </span>
          </div>
        </div>

        {!isCompleted && nextMoveUpcoming && (
          <div className="solution-next-preview">
            <span className="next-preview-label">NEXT UP:</span>
            <span className="next-preview-badge">{nextMoveUpcoming}</span>
          </div>
        )}
      </div>

      {/* Playback Controls Bar (Stitch Reference) */}
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
            <RotateCcw size={14} />
          </button>

          {/* Previous Step */}
          <button
            className="player-btn"
            onClick={handleStepBackward}
            disabled={!canStepBackward}
            aria-label="Step backward to previous move"
            title="Step backward (Left Arrow)"
          >
            <SkipBack size={14} />
          </button>

          {/* Play / Pause Toggle */}
          <button
            className={`player-btn ${isPlaying ? 'player-btn-pause' : 'player-btn-play'}`}
            onClick={handleTogglePlay}
            disabled={isCompleted && !isPlaying}
            aria-label={isPlaying ? 'Pause solution autoplay' : 'Play solution automatically'}
            title={isPlaying ? 'Pause autoplay (Space)' : 'Play autoplay (Space)'}
          >
            {isPlaying ? <Pause size={15} /> : <Play size={15} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          {/* Next Step */}
          <button
            className="player-btn"
            onClick={handleStepForward}
            disabled={!canStepForward}
            aria-label="Step forward to next move"
            title="Step forward (Right Arrow)"
          >
            <SkipForward size={14} />
          </button>
        </div>

        {/* Speed Selector Pills */}
        <div className="solution-speed-selector" role="group" aria-label="Playback speed">
          <span className="speed-group-label">SPEED</span>
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

        {/* Keyboard hints footer */}
        <div className="solution-keyboard-hints">
          <span>Left/Right: Step • Space: Play/Pause • R: Restart</span>
        </div>
      </div>
    </div>
  );
}

export default SolutionPlayerView;
