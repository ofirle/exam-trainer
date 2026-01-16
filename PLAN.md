# Supabase Database Integration Plan

## Overview
Replace localStorage with Supabase database storage so training progress, exam results, and statistics persist in the cloud and sync across devices/platforms.

## Technical Context
- **Framework**: React 19 + TypeScript + Vite
- **UI Library**: Ant Design 6
- **Current Storage**: localStorage with key `examTrainerState.v1`
- **New Storage**: Supabase PostgreSQL

## Supabase Setup (Manual Steps)

### 1. Create Supabase Project
1. Go to https://supabase.com
2. Create new project
3. Note down:
   - Project URL: `https://xxxxx.supabase.co`
   - Anon public key: `eyJhbGciOiJS...`

### 2. Create Database Tables

Run this SQL in Supabase SQL Editor:

```sql
-- App state table (stores the main progress data)
CREATE TABLE app_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,
  version INTEGER DEFAULT 1,
  global_counter INTEGER DEFAULT 0,
  recent_ids INTEGER[] DEFAULT '{}',
  progress_by_id JSONB DEFAULT '{}',
  exam_sessions JSONB DEFAULT '{}',
  focus_queue INTEGER[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (optional for single user)
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single user, no auth)
CREATE POLICY "Allow all" ON app_state FOR ALL USING (true);

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_state_updated_at
  BEFORE UPDATE ON app_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

## Implementation

### 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

### 2. Create Supabase Client Config
**File**: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### 3. Create Environment Variables
**File**: `.env.local`

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Update Storage Module
**File**: `src/lib/storage.ts`

Replace localStorage functions with Supabase calls:
- `loadState()` → fetch from Supabase
- `saveState()` → upsert to Supabase
- Add device ID for identifying this browser/device
- Add offline fallback to localStorage

### 5. Update Store Provider
**File**: `src/lib/store.tsx`

- Make state loading async
- Add loading state
- Handle sync errors gracefully
- Debounce saves to avoid too many API calls

### 6. Add Loading State
**File**: `src/App.tsx`

- Show loading spinner while fetching initial state
- Handle connection errors

## Key Files to Modify/Create

1. `src/lib/supabase.ts` - New Supabase client
2. `src/lib/storage.ts` - Replace localStorage with Supabase
3. `src/lib/store.tsx` - Async state loading
4. `src/App.tsx` - Loading state handling
5. `.env.local` - Environment variables
6. `.env.example` - Template for env vars
7. `.gitignore` - Ensure .env.local is ignored

## Data Flow

1. App starts → Generate/load device ID
2. Fetch state from Supabase by device ID
3. If not found → Create new record with default state
4. User interacts → State updates locally
5. State changes → Debounced save to Supabase
6. On another device → Same device ID loads same data

## Device ID Strategy

For single user across devices, use a simple approach:
- Store a fixed device ID in localStorage: `examTrainer.deviceId`
- First time: generate UUID
- Or: Use a fixed ID you choose (simplest for single user)

## Offline Support

- Keep localStorage as fallback
- On load: try Supabase first, fall back to localStorage
- On save: save to both Supabase and localStorage
- Handle network errors gracefully

## Verification

1. Set up Supabase project and run SQL
2. Add environment variables
3. Run `npm run dev`
4. Complete some training
5. Check Supabase dashboard → Table has data
6. Open in incognito/another browser with same device ID
7. Verify progress is synced

## Future Enhancements

- Add real-time sync with Supabase subscriptions
- Add proper user authentication
- Add data export/import from Supabase
- Add conflict resolution for multi-device edits
