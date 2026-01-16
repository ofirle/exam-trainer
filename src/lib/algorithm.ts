import type { Question, AppState, QuestionProgress, ExamMode, ExamSession } from './types';
import { CONFIG } from './constants';

// Get or create default progress for a question
export const getQuestionProgress = (
  state: AppState,
  questionId: number
): QuestionProgress => {
  return (
    state.progressById[questionId] || {
      seenCount: 0,
      wrongCount: 0,
      correctStreak: 0,
      dueAfter: 0,
      lastSeenAtCounter: 0,
    }
  );
};

// Check if a question is due
export const isDue = (progress: QuestionProgress, globalCounter: number): boolean => {
  return progress.dueAfter <= globalCounter;
};

// Check if a question is mastered
export const isMastered = (progress: QuestionProgress): boolean => {
  return progress.correctStreak >= CONFIG.MASTER_STREAK;
};

// Get interval based on streak
const getIntervalByStreak = (streak: number): number => {
  const maxKey = Math.max(...Object.keys(CONFIG.INTERVAL_BY_STREAK).map(Number));
  const key = Math.min(streak, maxKey);
  return CONFIG.INTERVAL_BY_STREAK[key] || CONFIG.INTERVAL_BY_STREAK[maxKey];
};

// Update state after answering a question
export const updateStateOnAnswer = (
  state: AppState,
  questionId: number,
  isCorrect: boolean
): AppState => {
  const newState = { ...state };
  newState.globalCounter += 1;

  const progress = getQuestionProgress(state, questionId);
  const updatedProgress: QuestionProgress = {
    ...progress,
    seenCount: progress.seenCount + 1,
    lastSeenAtCounter: newState.globalCounter,
  };

  if (isCorrect) {
    updatedProgress.correctStreak = progress.correctStreak + 1;
    const interval = getIntervalByStreak(updatedProgress.correctStreak);
    updatedProgress.dueAfter = newState.globalCounter + interval;
  } else {
    updatedProgress.wrongCount = progress.wrongCount + 1;
    updatedProgress.correctStreak = 0;
    updatedProgress.dueAfter = newState.globalCounter + CONFIG.WRONG_INTERVAL;
  }

  newState.progressById = {
    ...state.progressById,
    [questionId]: updatedProgress,
  };

  // Update recentIds
  const newRecentIds = [...state.recentIds, questionId].slice(-CONFIG.RECENT_BLOCK_SIZE);
  newState.recentIds = newRecentIds;

  return newState;
};

// Weighted random selection (roulette wheel)
const weightedRandomSelect = <T>(items: T[], weights: number[]): T => {
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  if (totalWeight === 0) {
    return items[Math.floor(Math.random() * items.length)];
  }

  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    random -= weights[i];
    if (random <= 0) {
      return items[i];
    }
  }

  return items[items.length - 1];
};

// Pick next question for training
export const pickNextQuestionId = (
  questions: Question[],
  state: AppState
): number => {
  const allIds = questions.map((q) => q.id);
  const { globalCounter, recentIds, focusQueue } = state;

  // Check focus queue first (from "Practice wrong answers")
  if (focusQueue && focusQueue.length > 0) {
    return focusQueue[0];
  }

  // Helper to exclude recent IDs unless it would leave no candidates
  const excludeRecent = (ids: number[]): number[] => {
    const filtered = ids.filter((id) => !recentIds.includes(id));
    return filtered.length > 0 ? filtered : ids;
  };

  // Determine candidate pools
  const dueIds: number[] = [];
  const newIds: number[] = [];
  const seenWithCounts: { id: number; seenCount: number }[] = [];

  for (const id of allIds) {
    const progress = getQuestionProgress(state, id);

    if (progress.seenCount === 0) {
      newIds.push(id);
    } else {
      seenWithCounts.push({ id, seenCount: progress.seenCount });
      if (isDue(progress, globalCounter)) {
        dueIds.push(id);
      }
    }
  }

  // Low seen: sort by seenCount ascending, take first 50
  const lowSeenIds = seenWithCounts
    .sort((a, b) => a.seenCount - b.seenCount)
    .slice(0, 50)
    .map((item) => item.id);

  // Exclude recent from pools
  const duePool = excludeRecent(dueIds);
  const newPool = excludeRecent(newIds);
  const lowSeenPool = excludeRecent(lowSeenIds);

  // Choose pool
  let candidateIds: number[];

  if (duePool.length > 0 && Math.random() < CONFIG.SELECTION_POLICY_DUE_PROB) {
    candidateIds = duePool;
  } else if (newPool.length > 0) {
    candidateIds = newPool;
  } else if (lowSeenPool.length > 0) {
    candidateIds = lowSeenPool;
  } else {
    candidateIds = excludeRecent(allIds);
  }

  // Score each candidate
  const scores: number[] = candidateIds.map((id) => {
    const progress = getQuestionProgress(state, id);
    const isQuestionDue = isDue(progress, globalCounter);

    const base = isQuestionDue ? 100 : 10;
    const weakness = Math.max(0, CONFIG.MASTER_STREAK - progress.correctStreak) * 30;
    const mistakes = progress.wrongCount * 15;
    const novelty = progress.seenCount === 0 ? 20 : 0;

    return base + weakness + mistakes + novelty;
  });

  // Select by weighted random
  return weightedRandomSelect(candidateIds, scores);
};

// Sample N unique items using weighted random
const weightedSampleUnique = (
  ids: number[],
  weights: number[],
  count: number
): number[] => {
  const result: number[] = [];
  const remainingIds = [...ids];
  const remainingWeights = [...weights];

  while (result.length < count && remainingIds.length > 0) {
    const selected = weightedRandomSelect(remainingIds, remainingWeights);
    const index = remainingIds.indexOf(selected);

    result.push(selected);
    remainingIds.splice(index, 1);
    remainingWeights.splice(index, 1);
  }

  return result;
};

// Create exam session
export const createExamSession = (
  questions: Question[],
  state: AppState,
  mode: ExamMode
): ExamSession => {
  const allIds = questions.map((q) => q.id);
  const questionCount = Math.min(CONFIG.EXAM_QUESTION_COUNT, allIds.length);

  let selectedIds: number[];

  if (mode === 'random') {
    // Random uniform sampling
    const shuffled = [...allIds].sort(() => Math.random() - 0.5);
    selectedIds = shuffled.slice(0, questionCount);
  } else {
    // Weak mode: weight by wrongCount, lower streak, and due status
    const weights = allIds.map((id) => {
      const progress = getQuestionProgress(state, id);
      const dueBonus = isDue(progress, state.globalCounter) ? 50 : 0;
      const wrongBonus = progress.wrongCount * 20;
      const streakPenalty = progress.correctStreak * 10;
      const unseenBonus = progress.seenCount === 0 ? 30 : 0;

      return Math.max(1, 10 + dueBonus + wrongBonus - streakPenalty + unseenBonus);
    });

    selectedIds = weightedSampleUnique(allIds, weights, questionCount);
  }

  return {
    id: crypto.randomUUID(),
    createdAt: Date.now(),
    mode,
    questionIds: selectedIds,
    currentIndex: 0,
    answers: {},
    finished: false,
  };
};

// Remove question from focus queue
export const consumeFocusQueue = (state: AppState): AppState => {
  if (!state.focusQueue || state.focusQueue.length === 0) {
    return state;
  }

  return {
    ...state,
    focusQueue: state.focusQueue.slice(1),
  };
};

// Set focus queue (for "Practice wrong answers")
export const setFocusQueue = (state: AppState, questionIds: number[]): AppState => {
  return {
    ...state,
    focusQueue: questionIds,
  };
};

// Calculate stats from state
export interface Stats {
  totalQuestions: number;
  masteredCount: number;
  seenCount: number;
  unseenCount: number;
  totalAnswers: number;
  weakestQuestions: { id: number; wrongCount: number; correctStreak: number }[];
  recentlySeen: { id: number; lastSeenAtCounter: number }[];
}

export const calculateStats = (questions: Question[], state: AppState): Stats => {
  const allIds = questions.map((q) => q.id);

  let masteredCount = 0;
  let seenCount = 0;

  const questionsWithProgress: {
    id: number;
    wrongCount: number;
    correctStreak: number;
    seenCount: number;
    lastSeenAtCounter: number;
  }[] = [];

  for (const id of allIds) {
    const progress = getQuestionProgress(state, id);

    if (progress.seenCount > 0) {
      seenCount++;
      questionsWithProgress.push({
        id,
        wrongCount: progress.wrongCount,
        correctStreak: progress.correctStreak,
        seenCount: progress.seenCount,
        lastSeenAtCounter: progress.lastSeenAtCounter,
      });

      if (isMastered(progress)) {
        masteredCount++;
      }
    }
  }

  // Weakest: sort by wrongCount desc, then correctStreak asc
  const weakestQuestions = [...questionsWithProgress]
    .sort((a, b) => {
      if (b.wrongCount !== a.wrongCount) {
        return b.wrongCount - a.wrongCount;
      }
      return a.correctStreak - b.correctStreak;
    })
    .slice(0, 20)
    .map(({ id, wrongCount, correctStreak }) => ({ id, wrongCount, correctStreak }));

  // Recently seen: sort by lastSeenAtCounter desc
  const recentlySeen = [...questionsWithProgress]
    .sort((a, b) => b.lastSeenAtCounter - a.lastSeenAtCounter)
    .slice(0, 20)
    .map(({ id, lastSeenAtCounter }) => ({ id, lastSeenAtCounter }));

  return {
    totalQuestions: allIds.length,
    masteredCount,
    seenCount,
    unseenCount: allIds.length - seenCount,
    totalAnswers: state.globalCounter,
    weakestQuestions,
    recentlySeen,
  };
};
