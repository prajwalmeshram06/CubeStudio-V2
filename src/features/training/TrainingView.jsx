/**
 * TrainingView.jsx — Unified Training & Learning Hub for CubeStudio V2.
 *
 * Supports:
 * - 9-Lesson Guided Beginner Curriculum (Phase 6A)
 * - Move, Notation, and Sequence Drills (Phase 6B)
 * - CFOP Algorithm Mastery (Cross, F2L, 2-Look OLL, 2-Look PLL) (Phase 6B)
 * - Training Analytics, Mistake Intelligence & Progress Dashboard (Phase 6B)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Lock,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Layers,
  BarChart2
} from 'lucide-react';
import { SimulatorView } from '../simulator/SimulatorView.jsx';
import { TrainingController, LESSON_PHASES } from './TrainingController.js';
import { BEGINNER_CURRICULUM_TITLE } from './curriculum.js';
import { MoveTrainerPanel } from './trainers/MoveTrainerPanel.jsx';
import { AlgorithmTrainerPanel } from './trainers/AlgorithmTrainerPanel.jsx';
import { TrainingStatsDashboard } from './trainers/TrainingStatsDashboard.jsx';
import './training.css';

export const TRAINING_TABS = Object.freeze({
  CURRICULUM: 'curriculum',
  MOVE_TRAINER: 'move_trainer',
  CFOP_TRAINER: 'cfop_trainer',
  DASHBOARD: 'dashboard'
});

export function TrainingView() {
  const [activeTab, setActiveTab] = useState(TRAINING_TABS.CURRICULUM);
  const [simulatorController, setSimulatorController] = useState(null);

  // Lesson engine for Beginner Curriculum
  const engineRef = useRef(null);
  if (!engineRef.current) {
    engineRef.current = new TrainingController();
  }

  const [lessonViewState, setLessonViewState] = useState(() => engineRef.current.getState());
  const [selectedLessonId, setSelectedLessonId] = useState(null);

  useEffect(() => {
    const unsubscribe = engineRef.current.subscribe(setLessonViewState);
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
    setSimulatorController(simulator);
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

  const completedCount = lessonViewState.curriculum.filter((item) => item.completed).length;
  const totalCount = lessonViewState.curriculum.length;
  const progressPercent = Math.round((completedCount / (totalCount || 1)) * 100);

  return (
    <div className="training-view-container">
      {/* Top Hub Navigation Bar */}
      <div className="training-hub-nav">
        <button
          className={`hub-nav-btn ${activeTab === TRAINING_TABS.CURRICULUM ? 'active' : ''}`}
          onClick={() => setActiveTab(TRAINING_TABS.CURRICULUM)}
        >
          <GraduationCap size={16} />
          <span>Beginner Curriculum</span>
        </button>
        <button
          className={`hub-nav-btn ${activeTab === TRAINING_TABS.MOVE_TRAINER ? 'active' : ''}`}
          onClick={() => setActiveTab(TRAINING_TABS.MOVE_TRAINER)}
        >
          <Sparkles size={16} />
          <span>Move &amp; Notation Trainer</span>
        </button>
        <button
          className={`hub-nav-btn ${activeTab === TRAINING_TABS.CFOP_TRAINER ? 'active' : ''}`}
          onClick={() => setActiveTab(TRAINING_TABS.CFOP_TRAINER)}
        >
          <Layers size={16} />
          <span>CFOP &amp; Algorithms</span>
        </button>
        <button
          className={`hub-nav-btn ${activeTab === TRAINING_TABS.DASHBOARD ? 'active' : ''}`}
          onClick={() => setActiveTab(TRAINING_TABS.DASHBOARD)}
        >
          <BarChart2 size={16} />
          <span>Progress &amp; Intelligence</span>
        </button>
      </div>

      {/* TAB 1: BEGINNER CURRICULUM */}
      {activeTab === TRAINING_TABS.CURRICULUM && (
        <>
          {(!selectedLessonId || lessonViewState.phase === LESSON_PHASES.NOT_STARTED) ? (
            <div className="training-shell">
              <header className="training-hero">
                <div className="training-kicker">
                  <GraduationCap size={15} />
                  <span>Beginner Training System</span>
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
                {lessonViewState.curriculum.map((item) => (
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
          ) : (
            <div className="training-lesson-layout">
              <div className="training-cube-pane">
                <SimulatorView
                  key="training-simulator"
                  variant="training"
                  initialCubeState={lessonViewState.startState}
                  onControllerReady={handleControllerReady}
                />
              </div>

              <aside className="training-panel">
                <button type="button" className="training-back" onClick={closeLesson}>
                  <ChevronLeft size={14} /> <span>Curriculum Overview</span>
                </button>

                <div className="training-lesson-header">
                  <span className="training-lesson-kicker">Lesson {lessonViewState.lesson?.order}</span>
                  <h2>{lessonViewState.lesson?.title}</h2>
                  <span className="training-phase-tag">{lessonViewState.phase.replace(/_/g, ' ')}</span>
                </div>

                <section className="training-section">
                  <h3>Objective</h3>
                  <p>{lessonViewState.lesson?.objective}</p>
                </section>

                {(lessonViewState.phase === LESSON_PHASES.INTRO || lessonViewState.phase === LESSON_PHASES.EXPLANATION) && (
                  <section className="training-section">
                    <h3>Explanation</h3>
                    <p>{lessonViewState.lesson?.explanation}</p>
                  </section>
                )}

                {lessonViewState.phase === LESSON_PHASES.PRACTICE && (
                  <section className="training-section">
                    <h3>Instruction</h3>
                    <p>{lessonViewState.step?.instruction || lessonViewState.lesson?.instructions}</p>
                    {lessonViewState.lesson?.algorithms?.length > 0 && (
                      <div className="training-alg-card">
                        <span className="alg-card-label">ALGORITHM</span>
                        <p className="training-alg">{lessonViewState.lesson.algorithms[0]}</p>
                      </div>
                    )}
                  </section>
                )}

                {lessonViewState.feedback && (
                  <div className={`training-feedback is-${lessonViewState.feedback.type}`}>
                    {lessonViewState.feedback.message}
                  </div>
                )}

                {lessonViewState.phase === LESSON_PHASES.PRACTICE && (
                  <section className="training-section">
                    <h3>Hint</h3>
                    <p>{lessonViewState.hint || 'Request a hint if you need a nudge. Later hints become more specific.'}</p>
                    <button
                      type="button"
                      className="training-hint-btn"
                      onClick={() => engineRef.current.requestHint()}
                    >
                      <Lightbulb size={14} />
                      <span>{lessonViewState.hintLevel === 0 ? 'Request Hint' : `Hint ${Math.min(lessonViewState.hintLevel + 1, 3)}`}</span>
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
                    disabled={lessonViewState.phase === LESSON_PHASES.PRACTICE || lessonViewState.phase === LESSON_PHASES.DEMO}
                    onClick={() => engineRef.current.continuePhase()}
                  >
                    <span>{lessonViewState.phase === LESSON_PHASES.COMPLETED ? 'Next lesson' : 'Next'}</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {/* TAB 2: MOVE & NOTATION TRAINER */}
      {activeTab === TRAINING_TABS.MOVE_TRAINER && (
        <div className="training-lesson-layout">
          <div className="training-cube-pane">
            <SimulatorView
              key="trainer-simulator-move"
              variant="training"
              onControllerReady={handleControllerReady}
            />
          </div>
          <aside className="training-panel trainer-side-panel">
            <MoveTrainerPanel
              simulatorController={simulatorController}
            />
          </aside>
        </div>
      )}

      {/* TAB 3: CFOP & ALGORITHMS TRAINER */}
      {activeTab === TRAINING_TABS.CFOP_TRAINER && (
        <div className="training-lesson-layout">
          <div className="training-cube-pane">
            <SimulatorView
              key="trainer-simulator-alg"
              variant="training"
              onControllerReady={handleControllerReady}
            />
          </div>
          <aside className="training-panel trainer-side-panel">
            <AlgorithmTrainerPanel
              simulatorController={simulatorController}
            />
          </aside>
        </div>
      )}

      {/* TAB 4: PROGRESS & INTELLIGENCE DASHBOARD */}
      {activeTab === TRAINING_TABS.DASHBOARD && (
        <div className="training-dashboard-wrapper">
          <TrainingStatsDashboard />
        </div>
      )}
    </div>
  );
}

export default TrainingView;
