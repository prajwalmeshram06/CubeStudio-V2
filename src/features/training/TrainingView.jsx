/**
 * CubeStudio V2 - Training / Learn view
 * Curriculum browser + guided lesson practice using the existing 3D simulator.
 * Governed by DESIGN.md specifications.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Lock,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  GraduationCap
} from 'lucide-react';
import { SimulatorView } from '../simulator/SimulatorView.jsx';
import { TrainingController, LESSON_PHASES } from './TrainingController.js';
import { BEGINNER_CURRICULUM_TITLE } from './curriculum.js';
import './training.css';

export function TrainingView() {
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new TrainingController();
  }

  const [viewState, setViewState] = useState(() => engineRef.current.getState());
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe(setViewState);
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  const handleControllerReady = useCallback((simulator) => {
    engineRef.current.setSimulatorController(simulator);
    if (engineRef.current.lesson) {
      engineRef.current._syncSimulator(engineRef.current.lessonStartState);
    }
  }, []);

  const openLesson = (lessonId, unlocked) => {
    if (!unlocked) return;
    engineRef.current.startLesson(lessonId);
    setSelectedLessonId(lessonId);
  };

  const closeLesson = () => {
    engineRef.current.returnToCurriculum();
    setSelectedLessonId(null);
  };

  const completedCount = viewState.curriculum.filter((item) => item.completed).length;
  const totalCount = viewState.curriculum.length;
  const progressPercent = Math.round((completedCount / (totalCount || 1)) * 100);

  if (!selectedLessonId || viewState.phase === LESSON_PHASES.NOT_STARTED) {
    return (
      <div className="training-shell">
        <header className="training-hero">
          <div className="training-kicker">
            <GraduationCap size={15} />
            <span>Training &amp; Curriculum</span>
          </div>
          <h1>{BEGINNER_CURRICULUM_TITLE}</h1>
          <p>
            Nine guided lessons that teach a complete beginner solve. Every drill uses the same
            authoritative CubeState engine as the 3D simulator — never a second cube.
          </p>

          <div className="training-progress-bar-wrapper">
            <div className="training-progress-meta">
              <span>{`${completedCount} / ${totalCount} lessons complete`}</span>
              <span className="training-progress-pct">{progressPercent}%</span>
            </div>
            <div className="training-progress-track">
              <div className="training-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </header>

        <ol className="training-curriculum">
          {viewState.curriculum.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`training-lesson-card is-${item.status}`}
                disabled={item.status === 'locked'}
                onClick={() => openLesson(item.id, item.unlocked)}
              >
                <div className="training-lesson-index">
                  {item.status === 'completed' ? (
                    <CheckCircle2 size={18} className="lesson-status-icon completed" />
                  ) : item.status === 'locked' ? (
                    <Lock size={16} className="lesson-status-icon locked" />
                  ) : (
                    <span className="lesson-number">0{item.order}</span>
                  )}
                </div>

                <div className="training-lesson-copy">
                  <div className="lesson-title-row">
                    <strong>{item.title}</strong>
                    {item.status === 'completed' && <span className="lesson-badge-completed">Completed</span>}
                    {item.status === 'in_progress' && <span className="lesson-badge-current">In Progress</span>}
                  </div>
                  <span>{item.objective}</span>
                </div>

                <div className="training-lesson-arrow">
                  {item.status === 'locked' ? (
                    <Lock size={14} className="locked-icon" />
                  ) : (
                    <ArrowRight size={16} className="arrow-icon" />
                  )}
                </div>
              </button>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const lesson = viewState.lesson;
  const step = viewState.step;
  const phaseLabel = viewState.phase.replace(/_/g, ' ');

  return (
    <div className="training-lesson-layout">
      <div className="training-cube-pane">
        <SimulatorView
          key="training-simulator"
          variant="training"
          initialCubeState={viewState.startState}
          onControllerReady={handleControllerReady}
        />
      </div>

      <aside className="training-panel">
        <button type="button" className="training-back" onClick={closeLesson}>
          <ChevronLeft size={14} /> <span>Curriculum Overview</span>
        </button>

        <div className="training-lesson-header">
          <span className="training-lesson-kicker">Lesson {lesson.order}</span>
          <h2>{lesson.title}</h2>
          <span className="training-phase-tag">{phaseLabel}</span>
        </div>

        <section className="training-section">
          <h3>Objective</h3>
          <p>{lesson.objective}</p>
        </section>

        {(viewState.phase === LESSON_PHASES.INTRO || viewState.phase === LESSON_PHASES.EXPLANATION) && (
          <section className="training-section">
            <h3>Explanation</h3>
            <p>{lesson.explanation}</p>
          </section>
        )}

        {viewState.phase === LESSON_PHASES.PRACTICE && (
          <section className="training-section">
            <h3>Instruction</h3>
            <p>{step?.instruction || lesson.instructions}</p>
            {lesson.algorithms?.length > 0 && (
              <div className="training-alg-card">
                <span className="alg-card-label">ALGORITHM</span>
                <p className="training-alg">{lesson.algorithms[0]}</p>
              </div>
            )}
          </section>
        )}

        {viewState.feedback && (
          <div className={`training-feedback is-${viewState.feedback.type}`}>
            {viewState.feedback.message}
          </div>
        )}

        {viewState.phase === LESSON_PHASES.PRACTICE && (
          <section className="training-section">
            <h3>Hint</h3>
            <p>{viewState.hint || 'Request a hint if you need a nudge. Later hints become more specific.'}</p>
            <button
              type="button"
              className="training-hint-btn"
              onClick={() => engineRef.current.requestHint()}
            >
              <Lightbulb size={14} />
              <span>{viewState.hintLevel === 0 ? 'Request Hint' : `Hint ${Math.min(viewState.hintLevel + 1, 3)}`}</span>
            </button>
          </section>
        )}

        <div className="training-actions">
          <button
            type="button"
            className="training-btn"
            onClick={() => engineRef.current.previousPhase()}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            type="button"
            className="training-btn"
            onClick={() => engineRef.current.resetStep()}
          >
            <RotateCcw size={14} /> Reset step
          </button>
          <button
            type="button"
            className="training-btn"
            onClick={() => engineRef.current.resetLesson()}
          >
            <RefreshCw size={14} /> Reset lesson
          </button>
          <button
            type="button"
            className="training-btn training-btn-primary"
            disabled={viewState.phase === LESSON_PHASES.PRACTICE || viewState.phase === LESSON_PHASES.DEMO}
            onClick={() => engineRef.current.continuePhase()}
          >
            <span>{viewState.phase === LESSON_PHASES.COMPLETED ? 'Next lesson' : 'Next'}</span>
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </div>
  );
}

export default TrainingView;
