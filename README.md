# Exam Trainer

A browser-based exam preparation application built with React, TypeScript, and Ant Design. Features intelligent question selection using spaced repetition based on answer count (not time).

## Features

- **Training Mode**: Infinite practice with immediate feedback. Questions resurface based on your performance.
- **Exam Simulation**: Take 50-question exams in random or weakness-focused mode.
- **Statistics Dashboard**: Track mastery progress, coverage, and identify weak areas.
- **Smart Algorithm**: Questions you answer incorrectly resurface more frequently until mastered.
- **Local Storage**: All progress is saved in your browser.
- **Export/Import**: Backup and restore your progress as JSON.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Project Structure

```
src/
├── data/
│   └── questions.json      # Question bank (replace with your questions)
├── lib/
│   ├── types.ts            # TypeScript type definitions
│   ├── constants.ts        # Algorithm configuration
│   ├── storage.ts          # LocalStorage persistence
│   ├── algorithm.ts        # Question selection & update logic
│   └── store.tsx           # React context/state management
├── components/
│   └── QuestionCard.tsx    # Reusable question display component
├── pages/
│   ├── Training.tsx        # Training mode page
│   ├── Exam.tsx            # Exam simulation page
│   └── Stats.tsx           # Statistics & progress page
├── App.tsx                 # Main layout
├── router.tsx              # Route configuration
└── main.tsx                # Entry point
```

## Question Bank Format

Replace `src/data/questions.json` with your questions. Format:

```json
[
  {
    "id": 1,
    "text": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctOptionIndex": 2,
    "explanation": "Optional explanation for the correct answer",
    "category": "Optional category name"
  }
]
```

**Notes:**
- `id`: Unique number for each question
- `options`: Array of any length (typically 4)
- `correctOptionIndex`: Zero-based index of the correct option
- `explanation` and `category` are optional

## LocalStorage

Progress is saved to LocalStorage under the key: `examTrainerState.v1`

The state includes:
- `globalCounter`: Total questions answered
- `progressById`: Per-question statistics (seen count, wrong count, streak, etc.)
- `recentIds`: Recently shown questions (prevents immediate repeats)
- `examSessions`: Active and historical exam sessions
- `focusQueue`: Questions queued for focused practice

## Algorithm

The spaced repetition algorithm uses **answer count** (not time) for scheduling:

### Configuration (in `src/lib/constants.ts`)

```typescript
MASTER_STREAK: 3          // Consecutive correct answers to master a question
WRONG_INTERVAL: 7         // Questions until wrong answer resurfaces
INTERVAL_BY_STREAK: {     // Questions until correct answer resurfaces
  1: 15,                  // After 1st correct
  2: 40,                  // After 2nd correct
  3: 120,                 // After 3rd correct (mastered)
  4: 250                  // After 4th+ correct
}
RECENT_BLOCK_SIZE: 5      // Prevent immediate repeats
SELECTION_POLICY_DUE_PROB: 0.7  // Probability of selecting due questions
```

### How It Works

1. **After wrong answer**: Question is scheduled to appear after 7 more questions
2. **After correct answer**: Interval increases based on streak (15 → 40 → 120 → 250)
3. **Question selection**: Prioritizes due questions (70% chance), then new/low-seen
4. **Mastery**: A question is "mastered" after 3 consecutive correct answers

## Data Management

### Export Progress
1. Go to Statistics page
2. Click "Export Progress"
3. Save the JSON file

### Import Progress
1. Go to Statistics page
2. Click "Import Progress"
3. Select a previously exported JSON file
4. Page will refresh with imported data

### Reset Progress
1. Go to Statistics page
2. Click "Reset All Progress"
3. Confirm the action

**Warning**: Reset cannot be undone. Export your progress first if needed.

## Exam Modes

### Random Mode
Questions are selected uniformly at random from all available questions. Good for general practice and testing overall knowledge.

### Weak Areas Mode
Prioritizes questions with:
- Higher wrong count
- Lower correct streak
- Questions that are currently "due"
- Unseen questions

Best for targeted improvement before an actual exam.

## Tech Stack

- React 18
- TypeScript
- Vite
- Ant Design 5
- React Router 6

## License

MIT
