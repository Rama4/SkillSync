# SkillSync Mobile App

A React Native mobile app for offline-first learning with flashcard-style content delivery.

## Features

✅ **Offline-First Architecture**

- SQLite database for local storage
- Reads content from local Documents folder
- Works completely offline with local files

✅ **Learning Content**

- Flashcard-style lesson sections
- Markdown rendering with syntax highlighting
- Progress tracking through lessons

✅ **Modern UI**

- Dark theme optimized for learning
- Intuitive navigation between topics and lessons
- Progress indicators and section navigation

## Tech Stack

- **Framework**: React Native CLI (no Expo)
- **Language**: TypeScript
- **Database**: SQLite (react-native-sqlite-storage)
- **Markdown**: react-native-markdown-display
- **Navigation**: React Navigation v7
- **Target**: Android 10+ (SDK 29)

## Project Structure

```
src/
├── components/          # Reusable UI components
├── screens/            # App screens (Home, Topic, Lesson, Settings)
├── services/           # Database and sync services
├── types/              # TypeScript type definitions
└── navigation/         # Navigation configuration
└── utils/              # File system utils, constants
```

## Getting Started

### Prerequisites

- Node.js 18+
- React Native CLI
- Android Studio & SDK
- Android device/emulator with Android 10+

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start Metro bundler:

```bash
npm start
```

3. Run on Android:

```bash
npm run android
```

### First Time Setup

1. **Prepare Content**: Place your learning content in your phone's Download folder (configure in `mobile-app\src\utils\constants.ts`):

   ```
   Download/SkillSync/data/
   ├── topics.json (optional - lists available topics)
   └── deep-learning/
       ├── topic.json
       └── lessons/
           ├── lesson1.json
           ├── lesson2.json
           └── ...
   ```

2. **Load Content**:
   - Open the app
   - Go to Settings
   - Tap "Load All Content" to import from local files
   - Navigate back to Home to see available topics

## Configuration

### Data Source

The app reads content from your phone's local Download folder:

- **Path**: `Download/SkillSync/data/`
- **Topics**: Auto-discovered from folder names or `topics.json`
- **Structure**: Each topic has its own folder with `topic.json` and `lessons/` subfolder

### File Structure

```
Download/SkillSync/data/
├── topics.json (optional)
├── deep-learning/
│   ├── topic.json
│   └── lessons/
│       ├── backpropagation-explained.json
│       ├── introduction-to-neural-networks.json
│       └── convolutional-neural-networks.json
└── your-topic/
    ├── topic.json
    └── lessons/
        └── your-lesson.json
```

## Usage

### Learning Flow

1. **Home Screen**: Browse available topics
2. **Topic Screen**: View lessons in a topic
3. **Lesson Screen**: Navigate through sections in flashcard style
4. **Settings Screen**: Manage content sync and app data

### Offline Mode

- App works completely offline with local files
- No internet required - reads from Documents folder
- All content cached locally in SQLite database for fast access

### Content Management

- **Load All Content**: Import all topics and lessons from Documents folder
- **Check for Updates**: Compare file timestamps vs database
- **Clear All Data**: Remove all cached content from database (files remain)

## Development

### Adding New Content

1. Create topic folder in `Download/SkillSync/data/your-topic/`
2. Add `topic.json` with metadata
3. Add lesson files in `lessons/` subfolder
4. Use "Load All Content" in Settings to import new content

### Building for Release

```bash
npm run build:apk
```

## Troubleshooting

### Common Issues

1. **SQLite errors**: Ensure react-native-sqlite-storage is properly linked
2. **File not found errors**: Verify files are in Download/SkillSync/data/ folder
3. **Permission errors**: Ensure app has file system permissions
4. **Markdown rendering**: Verify content format matches expected structure

### Logs

Check Metro logs and device logs for debugging:

```bash
npx react-native log-android
```

## License

MIT License - see LICENSE file for details.
