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

## Future Enhancements

- [ ] AI-powered chatbot for questions
- [ ] Spaced repetition system
- [ ] Audio lessons (TTS)
- [ ] News aggregation
- [ ] Cloud sync for progress
- [ ] Mobile app (React Native)

## License

MIT
