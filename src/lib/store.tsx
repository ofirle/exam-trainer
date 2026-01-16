import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { AppState, Question, ExamSession, ExamMode } from './types';
import { loadState, saveState, resetStateSync, loadStateAsync } from './storage';
import {
  updateStateOnAnswer,
  pickNextQuestionId,
  createExamSession,
  getQuestionProgress,
  consumeFocusQueue,
  setFocusQueue,
} from './algorithm';
import { isSupabaseConfigured } from './supabase';
import {
  recordAnswer,
  upsertQuestionProgress,
  addRecentQuestion,
  createExamSessionInDb,
  recordExamAnswer,
  updateExamSession,
  consumeFocusQueueInDb,
  setFocusQueueInDb,
} from './database';
import questionsData from '../data/questions.json';

const initialQuestions: Question[] = questionsData as Question[];

interface StoreContextType {
  state: AppState;
  questions: Question[];
  categories: string[];
  isLoading: boolean;
  isSynced: boolean;
  // Training
  currentQuestionId: number | null;
  loadNextQuestion: () => void;
  submitAnswer: (questionId: number, selectedIndex: number, isCorrect: boolean, selectedOptionKey: string, correctOptionKey: string) => void;
  // Exam
  activeExam: ExamSession | null;
  startExam: (mode: ExamMode) => void;
  submitExamAnswer: (questionId: number, selectedIndex: number, isCorrect: boolean, selectedOptionKey: string, correctOptionKey: string) => void;
  skipExamQuestion: () => void;
  finishExam: () => void;
  // Focus queue
  startFocusTraining: (questionIds: number[]) => void;
  clearFocusQueue: () => void;
  // Actions
  resetProgress: () => void;
  getQuestionById: (id: number) => Question | undefined;
  updateQuestion: (question: Question) => void;
}

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => loadState());
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null);
  const [activeExam, setActiveExam] = useState<ExamSession | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured());
  const [isSynced, setIsSynced] = useState(!isSupabaseConfigured());

  // Compute categories from questions
  const categories = Array.from(new Set(questions.map((q) => q.category).filter(Boolean)));

  // Persist state changes
  useEffect(() => {
    saveState(state);
  }, [state]);

  // Load state from database on mount (async)
  useEffect(() => {
    console.log('[Store] Checking Supabase config...');
    if (!isSupabaseConfigured()) {
      console.log('[Store] Supabase not configured, using localStorage only');
      return;
    }

    console.log('[Store] Loading state from database...');
    loadStateAsync()
      .then((dbState) => {
        console.log('[Store] Loaded from database:', dbState);
        setState(dbState);
        setIsSynced(true);
      })
      .catch((error) => {
        console.error('[Store] Failed to load from database:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  // Load active exam from state on mount
  useEffect(() => {
    const activeSession = Object.values(state.examSessions).find(
      (session) => !session.finished
    );
    if (activeSession) {
      setActiveExam(activeSession);
    }
  }, []);

  const loadNextQuestion = useCallback(() => {
    const nextId = pickNextQuestionId(questions, state);
    setCurrentQuestionId(nextId);

    // If we pulled from focus queue, consume it
    if (state.focusQueue && state.focusQueue.length > 0 && state.focusQueue[0] === nextId) {
      setState((prev) => consumeFocusQueue(prev));
      consumeFocusQueueInDb();
    }
  }, [state]);

  const submitAnswer = useCallback(
    (questionId: number, _selectedIndex: number, isCorrect: boolean, selectedOptionKey: string, correctOptionKey: string) => {
      setState((prev) => updateStateOnAnswer(prev, questionId, isCorrect));

      // Record to database async (outside setState to avoid duplicate calls in Strict Mode)
      if (isSupabaseConfigured()) {
        // Get updated progress after state update
        const progress = getQuestionProgress(state, questionId);
        const updatedProgress = {
          ...progress,
          seenCount: progress.seenCount + 1,
          wrongCount: isCorrect ? progress.wrongCount : progress.wrongCount + 1,
          correctStreak: isCorrect ? progress.correctStreak + 1 : 0,
        };
        upsertQuestionProgress(questionId, updatedProgress);
        recordAnswer(questionId, selectedOptionKey, correctOptionKey, isCorrect, 'training');
        addRecentQuestion(questionId);
      }
    },
    [state]
  );

  const startExam = useCallback(
    (mode: ExamMode) => {
      const session = createExamSession(questions, state, mode);
      setActiveExam(session);
      setState((prev) => ({
        ...prev,
        examSessions: {
          ...prev.examSessions,
          [session.id]: session,
        },
      }));

      // Create exam session in database
      if (isSupabaseConfigured()) {
        createExamSessionInDb(session.id, mode, session.questionIds);
      }
    },
    [state]
  );

  const submitExamAnswer = useCallback(
    (questionId: number, selectedIndex: number, isCorrect: boolean, selectedOptionKey: string, correctOptionKey: string) => {
      if (!activeExam) return;

      // Calculate counts before state update
      const correctCount = Object.values(activeExam.answers).filter((a) => a.isCorrect).length + (isCorrect ? 1 : 0);
      const wrongCount = Object.values(activeExam.answers).filter((a) => !a.isCorrect).length + (isCorrect ? 0 : 1);
      const isFinished = activeExam.currentIndex + 1 >= activeExam.questionIds.length;

      const updatedSession: ExamSession = {
        ...activeExam,
        answers: {
          ...activeExam.answers,
          [questionId]: { selectedIndex, isCorrect },
        },
        currentIndex: activeExam.currentIndex + 1,
        finished: isFinished,
      };

      setActiveExam(updatedSession);

      // Update global progress
      setState((prev) => {
        const updatedState = updateStateOnAnswer(prev, questionId, isCorrect);
        return {
          ...updatedState,
          examSessions: {
            ...updatedState.examSessions,
            [activeExam.id]: updatedSession,
          },
        };
      });

      // Record to database (outside setState to avoid duplicate calls in Strict Mode)
      if (isSupabaseConfigured()) {
        const progress = getQuestionProgress(state, questionId);
        const updatedProgress = {
          ...progress,
          seenCount: progress.seenCount + 1,
          wrongCount: isCorrect ? progress.wrongCount : progress.wrongCount + 1,
          correctStreak: isCorrect ? progress.correctStreak + 1 : 0,
        };
        upsertQuestionProgress(questionId, updatedProgress);
        recordExamAnswer(activeExam.id, questionId, selectedIndex, selectedOptionKey, correctOptionKey, isCorrect);

        // Update exam session counts
        const scorePercentage = isFinished
          ? Math.round((correctCount / activeExam.questionIds.length) * 100)
          : undefined;
        updateExamSession(activeExam.id, {
          correctCount,
          wrongCount,
          isFinished,
          scorePercentage,
        });
      }
    },
    [activeExam, state]
  );

  const skipExamQuestion = useCallback(() => {
    if (!activeExam) return;

    setState((prev) => {
      const isFinished = activeExam.currentIndex + 1 >= activeExam.questionIds.length;
      const skippedCount = activeExam.questionIds.length - Object.keys(activeExam.answers).length;

      const updatedSession: ExamSession = {
        ...activeExam,
        currentIndex: activeExam.currentIndex + 1,
        finished: isFinished,
      };

      setActiveExam(updatedSession);

      // Update database
      if (isSupabaseConfigured() && isFinished) {
        const correctCount = Object.values(activeExam.answers).filter((a) => a.isCorrect).length;
        const scorePercentage = Math.round((correctCount / activeExam.questionIds.length) * 100);
        updateExamSession(activeExam.id, {
          skippedCount,
          isFinished: true,
          scorePercentage,
        });
      }

      return {
        ...prev,
        examSessions: {
          ...prev.examSessions,
          [activeExam.id]: updatedSession,
        },
      };
    });
  }, [activeExam]);

  const finishExam = useCallback(() => {
    if (activeExam && !activeExam.finished && isSupabaseConfigured()) {
      const correctCount = Object.values(activeExam.answers).filter((a) => a.isCorrect).length;
      const wrongCount = Object.values(activeExam.answers).filter((a) => !a.isCorrect).length;
      const skippedCount = activeExam.questionIds.length - Object.keys(activeExam.answers).length;
      const scorePercentage = Math.round((correctCount / activeExam.questionIds.length) * 100);

      updateExamSession(activeExam.id, {
        correctCount,
        wrongCount,
        skippedCount,
        isFinished: true,
        scorePercentage,
      });
    }
    setActiveExam(null);
  }, [activeExam]);

  const startFocusTraining = useCallback((questionIds: number[]) => {
    setState((prev) => setFocusQueue(prev, questionIds));
    if (isSupabaseConfigured()) {
      setFocusQueueInDb(questionIds);
    }
  }, []);

  const clearFocusQueue = useCallback(() => {
    setState((prev) => setFocusQueue(prev, []));
    if (isSupabaseConfigured()) {
      setFocusQueueInDb([]);
    }
  }, []);

  const resetProgress = useCallback(() => {
    const newState = resetStateSync();
    setState(newState);
    setCurrentQuestionId(null);
    setActiveExam(null);
  }, []);

  const getQuestionById = useCallback((id: number) => {
    return questions.find((q) => q.id === id);
  }, [questions]);

  const updateQuestion = useCallback((updatedQuestion: Question) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
    );
  }, []);

  const value: StoreContextType = {
    state,
    questions,
    categories,
    isLoading,
    isSynced,
    currentQuestionId,
    loadNextQuestion,
    submitAnswer,
    activeExam,
    startExam,
    submitExamAnswer,
    skipExamQuestion,
    finishExam,
    startFocusTraining,
    clearFocusQueue,
    resetProgress,
    getQuestionById,
    updateQuestion,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

export const useStore = (): StoreContextType => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};

// Helper hook to get progress for a specific question
export const useQuestionProgress = (questionId: number) => {
  const { state } = useStore();
  return getQuestionProgress(state, questionId);
};
