-- Exam Trainer Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. User State - Global counters and settings per device
CREATE TABLE user_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  global_counter INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Question Progress - Per-question spaced repetition data
CREATE TABLE question_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  seen_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  correct_streak INTEGER DEFAULT 0,
  due_after INTEGER DEFAULT 0,
  last_seen_at_counter INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_id, question_id)
);

-- 3. Exam Sessions - Exam metadata (created before answer_history for FK)
CREATE TABLE exam_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('random', 'weak')),
  question_ids INTEGER[] NOT NULL,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  score_percentage INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  is_finished BOOLEAN DEFAULT false
);

-- 4. Answer History - Individual answer records for analytics
CREATE TABLE answer_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  selected_option_key TEXT NOT NULL,
  correct_option_key TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('training', 'exam')),
  exam_session_id UUID REFERENCES exam_sessions(id) ON DELETE SET NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Exam Answers - Answers within exam sessions
CREATE TABLE exam_answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_session_id UUID NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  selected_index INTEGER NOT NULL,
  selected_option_key TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(exam_session_id, question_id)
);

-- 6. Recent Questions - Recently shown questions for algorithm
CREATE TABLE recent_questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  shown_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Focus Queue - Focus training question IDs
CREATE TABLE focus_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(device_id, question_id)
);

-- Indexes for performance
CREATE INDEX idx_question_progress_device ON question_progress(device_id);
CREATE INDEX idx_question_progress_due ON question_progress(device_id, due_after);
CREATE INDEX idx_answer_history_device ON answer_history(device_id);
CREATE INDEX idx_answer_history_question ON answer_history(device_id, question_id);
CREATE INDEX idx_answer_history_wrong ON answer_history(device_id, is_correct) WHERE is_correct = false;
CREATE INDEX idx_answer_history_date ON answer_history(device_id, answered_at);
CREATE INDEX idx_exam_sessions_device ON exam_sessions(device_id);
CREATE INDEX idx_exam_sessions_date ON exam_sessions(device_id, started_at);
CREATE INDEX idx_exam_answers_session ON exam_answers(exam_session_id);
CREATE INDEX idx_exam_answers_wrong ON exam_answers(exam_session_id, is_correct) WHERE is_correct = false;
CREATE INDEX idx_recent_questions_device ON recent_questions(device_id, shown_at DESC);
CREATE INDEX idx_focus_queue_device ON focus_queue(device_id, position);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_state_updated_at
  BEFORE UPDATE ON user_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER question_progress_updated_at
  BEFORE UPDATE ON question_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (permissive for single user app)
ALTER TABLE user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE recent_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_queue ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anonymous access
CREATE POLICY "Allow all" ON user_state FOR ALL USING (true);
CREATE POLICY "Allow all" ON question_progress FOR ALL USING (true);
CREATE POLICY "Allow all" ON answer_history FOR ALL USING (true);
CREATE POLICY "Allow all" ON exam_sessions FOR ALL USING (true);
CREATE POLICY "Allow all" ON exam_answers FOR ALL USING (true);
CREATE POLICY "Allow all" ON recent_questions FOR ALL USING (true);
CREATE POLICY "Allow all" ON focus_queue FOR ALL USING (true);
