import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Question } from './types';
import { fetchAllQuestions, upsertQuestions, updateQuestion } from './database';
import { isSupabaseConfigured } from './supabase';
import questionsJson from '../data/questions.json';

interface QuestionsContextType {
  questions: Question[];
  isLoading: boolean;
  isSeeding: boolean;
  updateQuestionInStore: (question: Question) => Promise<void>;
  seedDatabase: () => Promise<void>;
}

const QuestionsContext = createContext<QuestionsContextType | null>(null);

export const useQuestions = (): QuestionsContextType => {
  const context = useContext(QuestionsContext);
  if (!context) {
    throw new Error('useQuestions must be used within a QuestionsProvider');
  }
  return context;
};

interface QuestionsProviderProps {
  children: ReactNode;
}

export const QuestionsProvider: React.FC<QuestionsProviderProps> = ({ children }) => {
  const [questions, setQuestions] = useState<Question[]>(questionsJson as Question[]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  // Seed database with questions from JSON
  const seedDatabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return;

    setIsSeeding(true);
    try {
      const success = await upsertQuestions(questionsJson as Question[]);
      if (success) {
        console.log('Successfully seeded database with questions');
        // Reload from DB to confirm
        const dbQuestions = await fetchAllQuestions();
        if (dbQuestions.length > 0) {
          setQuestions(dbQuestions);
        }
      }
    } catch (error) {
      console.error('Error seeding database:', error);
    } finally {
      setIsSeeding(false);
    }
  }, []);

  // Load questions from database on mount (no auto-seeding)
  useEffect(() => {
    const loadQuestions = async () => {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      try {
        // Load from database if questions exist
        const dbQuestions = await fetchAllQuestions();
        if (dbQuestions.length > 0) {
          setQuestions(dbQuestions);
          console.log(`Loaded ${dbQuestions.length} questions from database`);
        } else {
          // Database is empty - use local JSON and log message
          console.log('Database empty, using local JSON questions. Use Import to load questions.');
        }
      } catch (error) {
        console.error('Error loading questions:', error);
        // Fall back to JSON on error
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, []);

  // Update a single question
  const updateQuestionInStore = useCallback(async (question: Question) => {
    // Update local state immediately
    setQuestions((prev) =>
      prev.map((q) => (q.id === question.id ? question : q))
    );

    // Persist to database
    if (isSupabaseConfigured()) {
      const success = await updateQuestion(question);
      if (!success) {
        console.error('Failed to persist question update to database');
      }
    }
  }, []);

  return (
    <QuestionsContext.Provider
      value={{
        questions,
        isLoading,
        isSeeding,
        updateQuestionInStore,
        seedDatabase,
      }}
    >
      {children}
    </QuestionsContext.Provider>
  );
};
