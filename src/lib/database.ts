import { supabase, isSupabaseConfigured, getDeviceId } from './supabase';
import type { AppState, QuestionProgress, ExamMode, Question, QuestionOption } from './types';
import { CONFIG } from './constants';

// ============================================================================
// Questions Operations
// ============================================================================

export const fetchAllQuestions = async (): Promise<Question[]> => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching questions:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    question: row.question,
    options: row.options as QuestionOption[],
    answer: row.answer,
    category: row.category || '',
    subCategory: row.sub_category,
    tags: row.tags || [],
    image: row.image || undefined,
    images: row.images || undefined,
  }));
};

export const fetchQuestion = async (questionId: number): Promise<Question | null> => {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (error) {
    console.error('Error fetching question:', error);
    return null;
  }

  return data ? {
    id: data.id,
    question: data.question,
    options: data.options as QuestionOption[],
    answer: data.answer,
    category: data.category || '',
    subCategory: data.sub_category,
    tags: data.tags || [],
    image: data.image || undefined,
    images: data.images || undefined,
  } : null;
};

export const updateQuestion = async (question: Question): Promise<boolean> => {
  if (!supabase) return false;

  const { error } = await supabase
    .from('questions')
    .update({
      question: question.question,
      options: question.options,
      answer: question.answer,
      category: question.category,
      sub_category: question.subCategory,
      tags: question.tags,
      image: question.image || null,
      images: question.images || null,
    })
    .eq('id', question.id);

  if (error) {
    console.error('Error updating question:', error);
    return false;
  }

  return true;
};

export const upsertQuestions = async (questions: Question[]): Promise<boolean> => {
  if (!supabase) return false;

  const rows = questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    answer: q.answer,
    category: q.category,
    sub_category: q.subCategory,
    tags: q.tags,
    image: q.image || null,
    images: q.images || null,
  }));

  const { error } = await supabase
    .from('questions')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('Error upserting questions:', error);
    return false;
  }

  return true;
};

export const getQuestionsCount = async (): Promise<number> => {
  if (!supabase) return 0;

  const { count, error } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('Error counting questions:', error);
    return 0;
  }

  return count || 0;
};

// ============================================================================
// User State Operations
// ============================================================================

export const fetchUserState = async (): Promise<{ globalCounter: number } | null> => {
  if (!supabase) return null;
  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('user_state')
    .select('global_counter')
    .eq('device_id', deviceId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching user state:', error);
    return null;
  }

  return data ? { globalCounter: data.global_counter } : null;
};

export const upsertUserState = async (globalCounter: number): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  const { error } = await supabase
    .from('user_state')
    .upsert(
      { device_id: deviceId, global_counter: globalCounter },
      { onConflict: 'device_id' }
    );

  if (error) {
    console.error('Error upserting user state:', error);
  }
};

// ============================================================================
// Question Progress Operations
// ============================================================================

export const fetchAllQuestionProgress = async (): Promise<Record<number, QuestionProgress>> => {
  if (!supabase) return {};
  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('question_progress')
    .select('*')
    .eq('device_id', deviceId);

  if (error) {
    console.error('Error fetching question progress:', error);
    return {};
  }

  const progressById: Record<number, QuestionProgress> = {};
  for (const row of data || []) {
    progressById[row.question_id] = {
      seenCount: row.seen_count,
      wrongCount: row.wrong_count,
      correctStreak: row.correct_streak,
      dueAfter: row.due_after,
      lastSeenAtCounter: row.last_seen_at_counter,
      dontKnowCount: row.dont_know_count || 0,
      skipCount: row.skip_count || 0,
    };
  }

  return progressById;
};

export const upsertQuestionProgress = async (
  questionId: number,
  progress: QuestionProgress
): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  const { error } = await supabase
    .from('question_progress')
    .upsert(
      {
        device_id: deviceId,
        question_id: questionId,
        seen_count: progress.seenCount,
        wrong_count: progress.wrongCount,
        correct_streak: progress.correctStreak,
        due_after: progress.dueAfter,
        last_seen_at_counter: progress.lastSeenAtCounter,
        dont_know_count: progress.dontKnowCount || 0,
        skip_count: progress.skipCount || 0,
      },
      { onConflict: 'device_id,question_id' }
    );

  if (error) {
    console.error('Error upserting question progress:', error);
  }
};

// ============================================================================
// Answer History Operations
// ============================================================================

export const recordAnswer = async (
  questionId: number,
  selectedOptionKey: string,
  correctOptionKey: string,
  isCorrect: boolean,
  mode: 'training' | 'exam',
  examSessionId?: string
): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  const { error } = await supabase.from('answer_history').insert({
    device_id: deviceId,
    question_id: questionId,
    selected_option_key: selectedOptionKey,
    correct_option_key: correctOptionKey,
    is_correct: isCorrect,
    mode,
    exam_session_id: examSessionId || null,
  });

  if (error) {
    console.error('Error recording answer:', error);
  }
};

export const fetchAnswerHistory = async (questionId?: number): Promise<
  Array<{
    questionId: number;
    selectedOptionKey: string;
    correctOptionKey: string;
    isCorrect: boolean;
    mode: 'training' | 'exam';
    answeredAt: string;
  }>
> => {
  if (!supabase) return [];
  const deviceId = getDeviceId();

  let query = supabase
    .from('answer_history')
    .select('*')
    .eq('device_id', deviceId)
    .order('answered_at', { ascending: false });

  if (questionId !== undefined) {
    query = query.eq('question_id', questionId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching answer history:', error);
    return [];
  }

  return (data || []).map((row) => ({
    questionId: row.question_id,
    selectedOptionKey: row.selected_option_key,
    correctOptionKey: row.correct_option_key,
    isCorrect: row.is_correct,
    mode: row.mode,
    answeredAt: row.answered_at,
  }));
};

// ============================================================================
// Exam Session Operations
// ============================================================================

export const createExamSessionInDb = async (
  id: string,
  mode: ExamMode,
  questionIds: number[]
): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  const { error } = await supabase.from('exam_sessions').insert({
    id,
    device_id: deviceId,
    mode,
    question_ids: questionIds,
    total_questions: questionIds.length,
  });

  if (error) {
    console.error('Error creating exam session:', error);
  }
};

export const updateExamSession = async (
  sessionId: string,
  updates: {
    correctCount?: number;
    wrongCount?: number;
    skippedCount?: number;
    scorePercentage?: number;
    isFinished?: boolean;
  }
): Promise<void> => {
  if (!supabase) return;

  const updateData: Record<string, unknown> = {};
  if (updates.correctCount !== undefined) updateData.correct_count = updates.correctCount;
  if (updates.wrongCount !== undefined) updateData.wrong_count = updates.wrongCount;
  if (updates.skippedCount !== undefined) updateData.skipped_count = updates.skippedCount;
  if (updates.scorePercentage !== undefined) updateData.score_percentage = updates.scorePercentage;
  if (updates.isFinished !== undefined) {
    updateData.is_finished = updates.isFinished;
    if (updates.isFinished) {
      updateData.finished_at = new Date().toISOString();
    }
  }

  const { error } = await supabase
    .from('exam_sessions')
    .update(updateData)
    .eq('id', sessionId);

  if (error) {
    console.error('Error updating exam session:', error);
  }
};

export const recordExamAnswer = async (
  examSessionId: string,
  questionId: number,
  selectedIndex: number,
  selectedOptionKey: string,
  correctOptionKey: string,
  isCorrect: boolean
): Promise<void> => {
  if (!supabase) return;

  // Insert into exam_answers
  const { error: examAnswerError } = await supabase.from('exam_answers').insert({
    exam_session_id: examSessionId,
    question_id: questionId,
    selected_index: selectedIndex,
    selected_option_key: selectedOptionKey,
    is_correct: isCorrect,
  });

  if (examAnswerError) {
    console.error('Error recording exam answer:', examAnswerError);
  }

  // Also record in answer_history for analytics
  await recordAnswer(
    questionId,
    selectedOptionKey,
    correctOptionKey,
    isCorrect,
    'exam',
    examSessionId
  );
};

export const fetchExamSessions = async (): Promise<
  Array<{
    id: string;
    mode: ExamMode;
    questionIds: number[];
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    skippedCount: number;
    scorePercentage: number | null;
    startedAt: string;
    finishedAt: string | null;
    isFinished: boolean;
  }>
> => {
  if (!supabase) return [];
  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('device_id', deviceId)
    .order('started_at', { ascending: false });

  if (error) {
    console.error('Error fetching exam sessions:', error);
    return [];
  }

  return (data || []).map((row) => ({
    id: row.id,
    mode: row.mode,
    questionIds: row.question_ids,
    totalQuestions: row.total_questions,
    correctCount: row.correct_count,
    wrongCount: row.wrong_count,
    skippedCount: row.skipped_count,
    scorePercentage: row.score_percentage,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    isFinished: row.is_finished,
  }));
};

export const fetchActiveExamSession = async (): Promise<{
  id: string;
  mode: ExamMode;
  questionIds: number[];
  answers: Record<number, { selectedIndex: number; isCorrect: boolean }>;
  currentIndex: number;
} | null> => {
  if (!supabase) return null;
  const deviceId = getDeviceId();

  // Fetch unfinished exam session
  const { data: sessionData, error: sessionError } = await supabase
    .from('exam_sessions')
    .select('*')
    .eq('device_id', deviceId)
    .eq('is_finished', false)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (sessionError && sessionError.code !== 'PGRST116') {
    console.error('Error fetching active exam session:', sessionError);
    return null;
  }

  if (!sessionData) return null;

  // Fetch answers for this session
  const { data: answersData, error: answersError } = await supabase
    .from('exam_answers')
    .select('*')
    .eq('exam_session_id', sessionData.id);

  if (answersError) {
    console.error('Error fetching exam answers:', answersError);
  }

  const answers: Record<number, { selectedIndex: number; isCorrect: boolean }> = {};
  for (const row of answersData || []) {
    answers[row.question_id] = {
      selectedIndex: row.selected_index,
      isCorrect: row.is_correct,
    };
  }

  return {
    id: sessionData.id,
    mode: sessionData.mode,
    questionIds: sessionData.question_ids,
    answers,
    currentIndex: Object.keys(answers).length + sessionData.skipped_count,
  };
};

// ============================================================================
// Recent Questions Operations
// ============================================================================

export const fetchRecentQuestionIds = async (): Promise<number[]> => {
  if (!supabase) return [];
  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('recent_questions')
    .select('question_id')
    .eq('device_id', deviceId)
    .order('shown_at', { ascending: false })
    .limit(CONFIG.RECENT_BLOCK_SIZE);

  if (error) {
    console.error('Error fetching recent questions:', error);
    return [];
  }

  return (data || []).map((row) => row.question_id);
};

export const addRecentQuestion = async (questionId: number): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  // Insert new recent question
  const { error } = await supabase.from('recent_questions').insert({
    device_id: deviceId,
    question_id: questionId,
  });

  if (error) {
    console.error('Error adding recent question:', error);
    return;
  }

  // Clean up old entries (keep only RECENT_BLOCK_SIZE)
  const { data: allRecent } = await supabase
    .from('recent_questions')
    .select('id')
    .eq('device_id', deviceId)
    .order('shown_at', { ascending: false });

  if (allRecent && allRecent.length > CONFIG.RECENT_BLOCK_SIZE) {
    const toDelete = allRecent.slice(CONFIG.RECENT_BLOCK_SIZE).map((r) => r.id);
    await supabase.from('recent_questions').delete().in('id', toDelete);
  }
};

// ============================================================================
// Focus Queue Operations
// ============================================================================

export const fetchFocusQueue = async (): Promise<number[]> => {
  if (!supabase) return [];
  const deviceId = getDeviceId();

  const { data, error } = await supabase
    .from('focus_queue')
    .select('question_id')
    .eq('device_id', deviceId)
    .order('position', { ascending: true });

  if (error) {
    console.error('Error fetching focus queue:', error);
    return [];
  }

  return (data || []).map((row) => row.question_id);
};

export const setFocusQueueInDb = async (questionIds: number[]): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  // Delete existing queue
  await supabase.from('focus_queue').delete().eq('device_id', deviceId);

  // Insert new queue
  if (questionIds.length > 0) {
    const rows = questionIds.map((qId, idx) => ({
      device_id: deviceId,
      question_id: qId,
      position: idx,
    }));

    const { error } = await supabase.from('focus_queue').insert(rows);

    if (error) {
      console.error('Error setting focus queue:', error);
    }
  }
};

export const consumeFocusQueueInDb = async (): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  // Get the first item
  const { data, error: fetchError } = await supabase
    .from('focus_queue')
    .select('id')
    .eq('device_id', deviceId)
    .order('position', { ascending: true })
    .limit(1)
    .single();

  if (fetchError || !data) return;

  // Delete the first item
  const { error: deleteError } = await supabase
    .from('focus_queue')
    .delete()
    .eq('id', data.id);

  if (deleteError) {
    console.error('Error consuming focus queue:', deleteError);
  }
};

// ============================================================================
// Full State Sync Operations
// ============================================================================

export const fetchFullState = async (): Promise<AppState | null> => {
  if (!isSupabaseConfigured()) return null;

  const [userState, progressById, recentIds, focusQueue] = await Promise.all([
    fetchUserState(),
    fetchAllQuestionProgress(),
    fetchRecentQuestionIds(),
    fetchFocusQueue(),
  ]);

  if (!userState && Object.keys(progressById).length === 0) {
    // No data in database
    return null;
  }

  return {
    version: 1,
    globalCounter: userState?.globalCounter || 0,
    recentIds,
    progressById,
    examSessions: {}, // Exam sessions are fetched separately when needed
    focusQueue,
  };
};

export const syncStateToDb = async (state: AppState): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  // Sync user state
  await upsertUserState(state.globalCounter);

  // Sync question progress (batch upsert would be better but keeping it simple)
  for (const [questionIdStr, progress] of Object.entries(state.progressById)) {
    await upsertQuestionProgress(parseInt(questionIdStr, 10), progress);
  }

  // Sync focus queue
  await setFocusQueueInDb(state.focusQueue || []);
};

export const clearAllUserData = async (): Promise<void> => {
  if (!supabase) return;
  const deviceId = getDeviceId();

  await Promise.all([
    supabase.from('user_state').delete().eq('device_id', deviceId),
    supabase.from('question_progress').delete().eq('device_id', deviceId),
    supabase.from('answer_history').delete().eq('device_id', deviceId),
    supabase.from('exam_sessions').delete().eq('device_id', deviceId),
    supabase.from('recent_questions').delete().eq('device_id', deviceId),
    supabase.from('focus_queue').delete().eq('device_id', deviceId),
  ]);
};
