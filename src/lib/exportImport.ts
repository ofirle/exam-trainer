import type { Question, QuestionProgress } from './types';
import {
  fetchAllQuestions,
  fetchAllQuestionProgress,
  fetchUserState,
  fetchFocusQueue,
  upsertQuestions,
  clearAllUserData,
  upsertUserState,
  upsertQuestionProgress,
  setFocusQueueInDb,
} from './database';
import { isSupabaseConfigured, supabase } from './supabase';

// Export data structure
export interface ExportData {
  version: 1;
  exportedAt: string;
  questions: Question[];
  progress: {
    globalCounter: number;
    progressById: Record<number, QuestionProgress>;
    focusQueue: number[];
  };
}

// Validate export data structure
const validateExportData = (data: unknown): data is ExportData => {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  // Check version
  if (d.version !== 1) return false;

  // Check exportedAt
  if (typeof d.exportedAt !== 'string') return false;

  // Check questions array
  if (!Array.isArray(d.questions)) return false;
  for (const q of d.questions) {
    if (typeof q !== 'object' || q === null) return false;
    const question = q as Record<string, unknown>;
    if (typeof question.id !== 'number') return false;
    if (typeof question.question !== 'string') return false;
    if (!Array.isArray(question.options)) return false;
    if (typeof question.answer !== 'string') return false;
  }

  // Check progress object
  if (!d.progress || typeof d.progress !== 'object') return false;
  const progress = d.progress as Record<string, unknown>;
  if (typeof progress.globalCounter !== 'number') return false;
  if (!progress.progressById || typeof progress.progressById !== 'object') return false;
  if (!Array.isArray(progress.focusQueue)) return false;

  return true;
};

// Export all data (questions + progress)
export const exportAllData = async (): Promise<ExportData> => {
  const questions = await fetchAllQuestions();
  const progressById = await fetchAllQuestionProgress();
  const userState = await fetchUserState();
  const focusQueue = await fetchFocusQueue();

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    questions,
    progress: {
      globalCounter: userState?.globalCounter || 0,
      progressById,
      focusQueue,
    },
  };
};

// Download export data as JSON file
export const downloadExportData = async (): Promise<void> => {
  const data = await exportAllData();
  const dataStr = JSON.stringify(data, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `exam-trainer-export-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Import result type
export interface ImportResult {
  success: boolean;
  error?: string;
  questionsCount?: number;
  progressCount?: number;
}

// Import all data with rollback on failure
export const importAllData = async (data: unknown): Promise<ImportResult> => {
  // Validate data structure
  if (!validateExportData(data)) {
    return {
      success: false,
      error: 'Invalid export file format. Please ensure the file is a valid export from this application.',
    };
  }

  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      error: 'Database not configured. Cannot import data.',
    };
  }

  // Backup current data for rollback
  let backupQuestions: Question[] = [];
  let backupProgressById: Record<number, QuestionProgress> = {};
  let backupUserState: { globalCounter: number } | null = null;
  let backupFocusQueue: number[] = [];

  try {
    // Step 1: Backup current data
    backupQuestions = await fetchAllQuestions();
    backupProgressById = await fetchAllQuestionProgress();
    backupUserState = await fetchUserState();
    backupFocusQueue = await fetchFocusQueue();

    // Step 2: Clear all existing data
    await clearAllUserData();

    // Also clear questions table
    const { error: clearQuestionsError } = await supabase
      .from('questions')
      .delete()
      .gte('id', 0); // Delete all questions

    if (clearQuestionsError) {
      throw new Error(`Failed to clear questions: ${clearQuestionsError.message}`);
    }

    // Step 3: Insert new questions
    if (data.questions.length > 0) {
      const success = await upsertQuestions(data.questions);
      if (!success) {
        throw new Error('Failed to import questions');
      }
    }

    // Step 4: Insert new progress data
    await upsertUserState(data.progress.globalCounter);

    for (const [questionIdStr, progress] of Object.entries(data.progress.progressById)) {
      const questionId = parseInt(questionIdStr, 10);
      await upsertQuestionProgress(questionId, progress);
    }

    // Step 5: Set focus queue
    await setFocusQueueInDb(data.progress.focusQueue);

    return {
      success: true,
      questionsCount: data.questions.length,
      progressCount: Object.keys(data.progress.progressById).length,
    };
  } catch (error) {
    // Rollback on failure
    console.error('Import failed, rolling back:', error);

    try {
      // Clear failed import data
      await clearAllUserData();
      await supabase.from('questions').delete().gte('id', 0);

      // Restore backup
      if (backupQuestions.length > 0) {
        await upsertQuestions(backupQuestions);
      }

      if (backupUserState) {
        await upsertUserState(backupUserState.globalCounter);
      }

      for (const [questionIdStr, progress] of Object.entries(backupProgressById)) {
        const questionId = parseInt(questionIdStr, 10);
        await upsertQuestionProgress(questionId, progress);
      }

      await setFocusQueueInDb(backupFocusQueue);

      console.log('Rollback completed successfully');
    } catch (rollbackError) {
      console.error('Rollback failed:', rollbackError);
      return {
        success: false,
        error: `Import failed and rollback also failed. Data may be corrupted. Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }

    return {
      success: false,
      error: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}. Original data has been restored.`,
    };
  }
};
