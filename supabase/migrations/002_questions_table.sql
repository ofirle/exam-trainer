-- Questions table - stores all exam questions
CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL,  -- Array of {key, text} objects
  answer TEXT NOT NULL,    -- Key of correct option (e.g., "א", "ב")
  category TEXT,
  sub_category TEXT,
  tags TEXT[],
  image TEXT,              -- Legacy single image support
  images TEXT[],           -- Multiple images support
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for category filtering
CREATE INDEX idx_questions_category ON questions(category);

-- Auto-update timestamp trigger
CREATE TRIGGER questions_updated_at
  BEFORE UPDATE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON questions FOR ALL USING (true);
