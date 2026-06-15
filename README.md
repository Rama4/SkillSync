# SkillSync 🧠⚡

A personalized learning platform with adaptive content delivery, progress tracking, and interactive quizzes.

## Features

- 📚 **Modular Lessons** - Learn at your own pace with structured content
- 📊 **Progress Tracking** - Track your learning journey with persistent progress
- ✅ **Interactive Quizzes** - Test your knowledge with immediate feedback
- 🎨 **Beautiful UI** - Modern, dark-themed interface with smooth animations
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
SkillSync/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── topic/[topicId]/   # Topic detail pages
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── Header.tsx
│   ├── TopicCard.tsx
│   ├── LessonContent.tsx
│   ├── Quiz.tsx
│   └── LessonSidebar.tsx
├── lib/                   # Utilities and types
│   ├── types.ts          # TypeScript types
│   ├── data.ts           # Data fetching functions
│   └── store.ts          # Zustand progress store
│   └── constants.ts      # constants (data temp location)
├── data/                  # Content data (JSON files)
│   └── deep-learning/    # Topic folder
│       ├── topic.json    # Topic metadata
│       └── lessons/      # Individual lessons
│           ├── introduction-to-neural-networks.json
│           ├── backpropagation-explained.json
│           └── convolutional-neural-networks.json
└── public/               # Static assets
```

## Adding New Content

### Create a New Topic

1. Create a folder in `data/` with your topic ID (e.g., `data/machine-learning/`). You can configure this path here: `lib\constants.ts`
2. Add a `topic.json` file with topic metadata:

```json
{
  "id": "machine-learning",
  "title": "Machine Learning",
  "description": "Your topic description",
  "icon": "🤖",
  "color": "#10B981",
  "lessons": [
    {
      "id": "lesson-1",
      "order": 1,
      "title": "Lesson Title",
      "duration": "15 min",
      "difficulty": "beginner"
    }
  ],
  "prerequisites": [],
  "tags": ["ai", "ml"],
  "lastUpdated": "2025-11-27"
}
```

3. Create a `lessons/` folder and add lesson JSON files

### Lesson JSON Structure

```json
{
  "id": "lesson-id",
  "title": "Lesson Title",
  "topic": "topic-id",
  "order": 1,
  "duration": "15 min",
  "difficulty": "beginner",
  "objectives": ["Objective 1", "Objective 2"],
  "sections": [
    {
      "id": "section-1",
      "type": "content",
      "title": "Section Title",
      "content": "Markdown content here..."
    }
  ],
  "quiz": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "Your question?",
      "options": ["A", "B", "C", "D"],
      "correctAnswer": 0,
      "explanation": "Explanation of the correct answer"
    }
  ],
  "keyTakeaways": ["Takeaway 1", "Takeaway 2"],
  "previousLesson": null,
  "nextLesson": "next-lesson-id",
  "resources": [
    {
      "title": "Resource Title",
      "url": "https://example.com",
      "type": "video"
    }
  ],
  "lastUpdated": "2025-11-27"
}
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Markdown**: react-markdown with remark-gfm
- **Icons**: Lucide React
- **Language**: TypeScript

## Pipeline

Discrete, idempotent steps you run on demand. Nothing auto-triggers anything else, and every step has a dry-run "plan" that previews what it would do.

### Setup (one-time)

1. Get a free Groq API key (no credit card) at [console.groq.com](https://console.groq.com).
2. Copy the env template and paste your key:

```bash
cp .env.local.example .env.local
# edit .env.local and set GROQ_API_KEY=gsk_...
```

3. Install deps if you haven't: `pnpm install`.

### Web UI

`pnpm dev`, then open [http://localhost:3000/pipeline](http://localhost:3000/pipeline).

Each step is a card with two buttons:

- **Plan** — read-only preview of what the step would do, with one row per work item. Zero side effects.
- **Run selected** — executes only the checked items, streaming progress live via SSE.

A scope picker at the top lets you target `all topics` or one specific `topic:<id>`.

### CLI

Same step registry, terminal driver. Useful for cron / Makefiles / quick checks.

```bash
pnpm pipeline list
pnpm pipeline plan transcribe-audio
pnpm pipeline plan transcribe-audio --scope topic:deep-learning
pnpm pipeline run  transcribe-audio --scope topic:deep-learning
pnpm pipeline run  transcribe-audio --items some-id,other-id
pnpm pipeline run  transcribe-audio --dry-run     # alias for plan
pnpm pipeline run  health-check
```

### Built-in steps

| Step | Category | What it does |
|---|---|---|
| `transcribe-audio` | process | Scans `data/**/notes/audio/*.{webm,mp3,m4a,wav,mp4,ogg}`, finds files without a `{noteId}.transcript.json` sidecar, transcribes them via Groq `whisper-large-v3-turbo`. Re-runs are no-ops. |
| `health-check` | maintenance | Read-only audit: orphan audio, missing transcripts, broken `note.audioFile` references, oversized files (>25 MB Groq limit), `topic.json` drift. Writes a snapshot to `data/_meta/health-report.json`. |

### Where output lives

- **Transcripts** -- `data/{topicId}/lessons/{lessonId}/notes/audio/{noteId}.transcript.json`, alongside each audio file. The existing Note JSON is not modified.
- **Idempotency manifest** -- `data/_meta/state.json`. Tracks `path|size|mtime` of each input so re-runs skip completed work.
- **Health report** -- `data/_meta/health-report.json` (overwritten on each `health-check` run).

### Adding a new step

One file in `lib/pipeline/steps/`, one import line in `lib/pipeline/steps/index.ts`. Implement `plan(scope)` and `run(scope, opts)` per the contract in `lib/pipeline/types.ts`. The web UI and CLI pick it up automatically.

## Future Enhancements

- [ ] AI-powered chatbot for questions (RAG over transcripts + lessons)
- [ ] Spaced repetition system
- [ ] Audio lessons (TTS)
- [ ] News aggregation
- [ ] Cloud sync for progress
- [ ] Mobile app (React Native)
- [ ] More pipeline steps: `ingest-url`, `compile-lesson`, `backup-git`, `reindex`

## License

MIT
