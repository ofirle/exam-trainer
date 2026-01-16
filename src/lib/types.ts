// Question option type
export interface QuestionOption {
  key: string;
  text: string;
}

// Question types
export interface Question {
  id: number;
  question: string;
  options: QuestionOption[];
  category: string;
  subCategory: string | null;
  tags: string[];
  answer: string; // key of the correct option (e.g., "א", "ב")
  image?: string; // optional image file path
}

// Progress tracking for each question
export interface QuestionProgress {
  seenCount: number;
  wrongCount: number;
  correctStreak: number;
  dueAfter: number; // eligible when dueAfter <= globalCounter
  lastSeenAtCounter: number;
}

// Exam session types
export type ExamMode = 'random' | 'weak';

export interface ExamAnswer {
  selectedIndex: number;
  isCorrect: boolean;
}

export interface ExamSession {
  id: string;
  createdAt: number;
  mode: ExamMode;
  questionIds: number[]; // length 50, unique
  currentIndex: number; // 0..50
  answers: Record<number, ExamAnswer>; // key is questionId
  finished: boolean;
}

// Main application state
export interface AppState {
  version: 1;
  globalCounter: number;
  recentIds: number[];
  progressById: Record<number, QuestionProgress>;
  examSessions: Record<string, ExamSession>;
  focusQueue?: number[]; // Optional: for "Practice wrong answers" feature
}

// Algorithm configuration
export interface AlgorithmConfig {
  MASTER_STREAK: number;
  WRONG_INTERVAL: number;
  INTERVAL_BY_STREAK: Record<number, number>;
  RECENT_BLOCK_SIZE: number;
  SELECTION_POLICY_DUE_PROB: number;
  EXAM_QUESTION_COUNT: number;
}
