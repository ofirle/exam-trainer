// LocalStorage key for reviewed questions
const REVIEWED_KEY = 'examTrainerReviewedQuestions';

// Get all reviewed question IDs
export const getReviewedQuestions = (): Set<number> => {
  try {
    const stored = localStorage.getItem(REVIEWED_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored));
  } catch {
    return new Set();
  }
};

// Check if a question is reviewed
export const isQuestionReviewed = (questionId: number): boolean => {
  return getReviewedQuestions().has(questionId);
};

// Mark a question as reviewed
export const markQuestionReviewed = (questionId: number): void => {
  const reviewed = getReviewedQuestions();
  reviewed.add(questionId);
  localStorage.setItem(REVIEWED_KEY, JSON.stringify([...reviewed]));
};

// Unmark a question as reviewed
export const unmarkQuestionReviewed = (questionId: number): void => {
  const reviewed = getReviewedQuestions();
  reviewed.delete(questionId);
  localStorage.setItem(REVIEWED_KEY, JSON.stringify([...reviewed]));
};

// Toggle review status
export const toggleQuestionReviewed = (questionId: number): boolean => {
  const isReviewed = isQuestionReviewed(questionId);
  if (isReviewed) {
    unmarkQuestionReviewed(questionId);
  } else {
    markQuestionReviewed(questionId);
  }
  return !isReviewed;
};

// Get count of reviewed questions
export const getReviewedCount = (): number => {
  return getReviewedQuestions().size;
};

// Clear all reviewed status
export const clearAllReviewed = (): void => {
  localStorage.removeItem(REVIEWED_KEY);
};
