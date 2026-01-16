// Database types for Supabase schema
export interface Database {
  public: {
    Tables: {
      user_state: {
        Row: {
          id: string;
          device_id: string;
          global_counter: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          global_counter?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          global_counter?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      question_progress: {
        Row: {
          id: string;
          device_id: string;
          question_id: number;
          seen_count: number;
          wrong_count: number;
          correct_streak: number;
          due_after: number;
          last_seen_at_counter: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          question_id: number;
          seen_count?: number;
          wrong_count?: number;
          correct_streak?: number;
          due_after?: number;
          last_seen_at_counter?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          question_id?: number;
          seen_count?: number;
          wrong_count?: number;
          correct_streak?: number;
          due_after?: number;
          last_seen_at_counter?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      answer_history: {
        Row: {
          id: string;
          device_id: string;
          question_id: number;
          selected_option_key: string;
          correct_option_key: string;
          is_correct: boolean;
          mode: 'training' | 'exam';
          exam_session_id: string | null;
          answered_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          question_id: number;
          selected_option_key: string;
          correct_option_key: string;
          is_correct: boolean;
          mode: 'training' | 'exam';
          exam_session_id?: string | null;
          answered_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          question_id?: number;
          selected_option_key?: string;
          correct_option_key?: string;
          is_correct?: boolean;
          mode?: 'training' | 'exam';
          exam_session_id?: string | null;
          answered_at?: string;
        };
      };
      exam_sessions: {
        Row: {
          id: string;
          device_id: string;
          mode: 'random' | 'weak';
          question_ids: number[];
          total_questions: number;
          correct_count: number;
          wrong_count: number;
          skipped_count: number;
          score_percentage: number | null;
          started_at: string;
          finished_at: string | null;
          is_finished: boolean;
        };
        Insert: {
          id?: string;
          device_id: string;
          mode: 'random' | 'weak';
          question_ids: number[];
          total_questions: number;
          correct_count?: number;
          wrong_count?: number;
          skipped_count?: number;
          score_percentage?: number | null;
          started_at?: string;
          finished_at?: string | null;
          is_finished?: boolean;
        };
        Update: {
          id?: string;
          device_id?: string;
          mode?: 'random' | 'weak';
          question_ids?: number[];
          total_questions?: number;
          correct_count?: number;
          wrong_count?: number;
          skipped_count?: number;
          score_percentage?: number | null;
          started_at?: string;
          finished_at?: string | null;
          is_finished?: boolean;
        };
      };
      exam_answers: {
        Row: {
          id: string;
          exam_session_id: string;
          question_id: number;
          selected_index: number;
          selected_option_key: string;
          is_correct: boolean;
          answered_at: string;
        };
        Insert: {
          id?: string;
          exam_session_id: string;
          question_id: number;
          selected_index: number;
          selected_option_key: string;
          is_correct: boolean;
          answered_at?: string;
        };
        Update: {
          id?: string;
          exam_session_id?: string;
          question_id?: number;
          selected_index?: number;
          selected_option_key?: string;
          is_correct?: boolean;
          answered_at?: string;
        };
      };
      recent_questions: {
        Row: {
          id: string;
          device_id: string;
          question_id: number;
          shown_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          question_id: number;
          shown_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          question_id?: number;
          shown_at?: string;
        };
      };
      focus_queue: {
        Row: {
          id: string;
          device_id: string;
          question_id: number;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          device_id: string;
          question_id: number;
          position: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          device_id?: string;
          question_id?: number;
          position?: number;
          created_at?: string;
        };
      };
    };
  };
}
