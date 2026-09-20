/**
 * CubeStudio V2 - Training / Learn view
 * Curriculum browser + guided lesson practice using the existing 3D simulator.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Lock,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { SimulatorView } from '../simulator/SimulatorView.jsx';
import { TrainingController, LESSON_PHASES } from './TrainingController.js';
import { BEGINNER_CURRICULUM_TITLE } from './curriculum.js';
import './training.css';

function statusGlyph(status) {
  if (status === 'completed') return '✓';
  if (status === 'locked') return '🔒';
  return '→';
}

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

  if (!selectedLessonId || viewState.phase === LESSON_PHASES.NOT_STARTED) {
    return (
      <div className="training-shell">
        <header className="training-hero">
          <div className="training-kicker">
            <BookOpen size={16} />
            Training
          </div>
          <h1>{BEGINNER_CURRICULUM_TITLE}</h1>
          <p>
            Nine guided lessons that teach a complete beginner solve. Every drill uses the same
            CubeState engine as the 3D simulator — never a second cube.
          </p>
          <div className="training-progress-meta">
            {`${viewState.curriculum.filter((item) => item.completed).length} / ${viewState.curriculum.length} lessons complete`}
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
                <span className="training-lesson-index">
                  {statusGlyph(item.status)} {item.order}
                </span>
                <span className="training-lesson-copy">
                  <strong>{item.title}</strong>
                  <span>{item.objective}</span>
                </span>
                {item.status === 'locked' ? <Lock size={16} /> : item.status === 'completed' ? <Check size={16} /> : null}
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
          <ChevronLeft size={14} /> Curriculum
        </button>

        <p className="training-lesson-kicker">Lesson {lesson.order}</p>
        <h2>{lesson.title}</h2>
        <p className="training-phase">{phaseLabel}</p>

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
              <p className="training-alg">{lesson.algorithms[0]}</p>
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
            <button type="button" className="training-btn" onClick={() => engineRef.current.requestHint()}>
              <Lightbulb size={14} />
              {viewState.hintLevel === 0 ? 'Hint' : `Hint ${Math.min(viewState.hintLevel + 1, 3)}`}
            </button>
          </section>
        )}

        <div className="training-actions">
          <button type="button" className="training-btn" onClick={() => engineRef.current.previousPhase()}>
            <ChevronLeft size={14} /> Previous
          </button>
          <button type="button" className="training-btn" onClick={() => engineRef.current.resetStep()}>
            <RotateCcw size={14} /> Reset step
          </button>
          <button type="button" className="training-btn" onClick={() => engineRef.current.resetLesson()}>
            <RefreshCw size={14} /> Reset lesson
          </button>
          <button
            type="button"
            className="training-btn training-btn-primary"
            disabled={viewState.phase === LESSON_PHASES.PRACTICE || viewState.phase === LESSON_PHASES.DEMO}
            onClick={() => engineRef.current.continuePhase()}
          >
            {viewState.phase === LESSON_PHASES.COMPLETED ? 'Next lesson' : 'Next'}
            <ChevronRight size={14} />
          </button>
        </div>
      </aside>
    </div>
  );
}
