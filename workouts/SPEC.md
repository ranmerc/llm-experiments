# Workout Web App - Specification Document

## 1. Introduction

This document specifies the requirements for an offline-first Progressive Web App (PWA) that allows users to create, save, and follow custom workout schedules. The app will use vanilla HTML/CSS/JavaScript with IndexedDB for local data storage.

## 2. Scope of Work

### In Scope:

- Workout schedule creation interface
- Exercise management (add/remove/reorder exercises)
- Workout execution with rep-based timing
- IndexedDB persistence for schedules
- PWA functionality for offline use
- Responsive design for mobile/desktop
- Export/import workout schedules as JSON files

### Out of Scope:

- User accounts or cloud synchronization
- Social sharing features
- Advanced analytics or workout history
- Integration with wearable devices
- Audio guidance during workouts

## 3. Data Model

All data stored locally in IndexedDB within a database named "workoutDB" containing one object store: "workoutSchedules".

### Exercise Object

```javascript
{
  id: string (UUID or timestamp-based),
  name: string,           // Exercise name (e.g., "Push-ups")
  breakTime: number,      // Seconds between repetitions
  sets: number,           // Total sets to perform
  reps: number            // Repetitions per set
}
```

### Workout Schedule Object

```javascript
{
  id: string (UUID or timestamp-based),
  name: string,           // Schedule name (e.g., "Upper Body Day")
  exercises: Exercise[],  // Array of exercise objects
  createdAt: ISO timestamp,
  updatedAt: ISO timestamp
}
```

## 4. Feature Specifications

### 4.1 Workout Builder Interface

#### Schedule Creation

- Form input for schedule name
- Dynamic exercise list with ability to:
  - Add new exercise (name, break time, sets, reps fields)
  - Remove exercise from list
  - Reorder exercises via drag-and-drop
  - Edit existing exercise details
- Validation: All fields required for exercise to be valid
- Save button persists schedule to IndexedDB

#### Schedule Management

- List view of all saved schedules
- Ability to load a schedule for editing
- Delete schedule option (with confirmation)
- Duplicate schedule functionality
- Export schedule to JSON file
- Import schedule from JSON file

### 4.2 Workout Execution Flow

When user selects a schedule to start:

#### Initialization

1. App validates schedule has at least one exercise
2. Resets workout state (current set=1, current rep=1, current exercise index=0)
3. Displays first exercise of first set

#### Rep-Based Timing Mechanism

For each exercise repetition:

1. **Active Rep Phase**:
   - Display: Exercise name, current set/rep progress
   - Large "Done" button prominent in UI
   - User performs the exercise movement
   - When finished, user clicks "Done" button
2. **Break Phase** (triggered by "Done" click):
   - Break timer starts immediately (duration = exercise.breakTime)
   - UI shows countdown timer
   - Visual indication (color change, pulse) during break
   - Optional: Soft audio cue when break ends
3. **Transition**:
   - When break timer reaches zero:
     - If more reps in current set: increment rep counter, show next rep
     - If all reps in current set complete:
       - If more sets remain: increment set counter, reset rep to 1
       - If all sets complete: show workout completion screen

#### Progress Tracking

- Clear display of: "Set X/Y, Rep Z/W"
- Visual progress bar for overall workout completion
- Current exercise name prominently displayed
- During break: "Breaking... SS seconds remaining" display

#### Controls

- Primary "Done" button (large, tappable) for ending reps
- Pause button (optional) to temporarily halt workout
- Stop button (with confirmation) to end workout early
- Back button to return to schedule list

### 4.3 Export/Import Functionality

#### Export Feature

- Each workout schedule can be exported as a JSON file
- Export option available in the three-dot menu for each schedule
- JSON file includes:
  - Schedule metadata (name, timestamps)
  - Complete exercise list with all properties
  - Export format version for future compatibility
- File naming convention: `{schedule-name}.workout.json`
- Uses browser's download functionality to save file locally

#### Import Feature

- Import button on home page to load JSON workout files
- File input accepts `.workout.json` files
- Validates imported JSON structure before adding
- Generates new IDs for imported schedule to avoid conflicts
- Shows confirmation with schedule details before saving
- Handles duplicate names by appending "(Imported)" suffix

#### JSON Format

```json
{
  "version": "1.0",
  "type": "workout-schedule",
  "schedule": {
    "name": "Schedule Name",
    "exercises": [
      {
        "name": "Exercise Name",
        "breakTime": 30,
        "sets": 3,
        "reps": 10
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 4.4 User Interface Requirements

#### Mobile-First Design

- Minimum touch target size: 48x48px
- Vertical scrolling for exercise lists
- Large, readable timers and counters
- Minimal data entry forms optimized for touch

#### Visual Feedback

- Distinct colors for active rep vs break phases
- Animated progress indicators
- Exercise completion celebrations (optional)
- Clear visual hierarchy

#### Accessibility

- ARIA labels for dynamic content
- Keyboard navigable controls
- Sufficient color contrast (WCAG AA)
- Screen reader announcements for phase transitions

## 5. User Flows

### 5.1 Creating a New Workout Schedule

1. User navigates to app (installed PWA or browser)
2. Clicks "+ New Schedule" button
3. Enters schedule name in header field
4. Clicks "+ Add Exercise" to create first exercise row
5. Fills in: exercise name, break time (seconds), sets, reps
6. Repeats steps 4-5 for additional exercises
7. Uses drag handles to reorder exercises as desired
8. Clicks "Save Schedule" button
9. App validates and saves to IndexedDB
10. User sees confirmation and returns to schedule list

### 5.2 Executing a Workout

1. From schedule list, user taps a schedule name
2. App validates schedule data
3. Workout execution screen loads showing:
   - Exercise name: [First exercise]
   - Progress: Set 1/1, Rep 1/[reps]
   - Large "Done" button
4. User performs first rep
5. When finished, user clicks "Done"
6. Break timer starts: [exercise.breakTime] seconds counting down
7. When break ends, next rep starts automatically
8. After completing all reps in a set:
   - Brief set completion indicator
   - Next set begins (if applicable)
9. When all sets complete:
   - Workout finished screen shows
   - Option to repeat workout or return to list

### 5.3 Managing Saved Schedules

1. User views schedule list on main screen
2. Each schedule shows: name, exercise count, last modified date
3. Swipe left (or tap menu) reveals options: Edit, Delete, Duplicate, Export
4. Edit: Loads schedule into builder for modification
5. Delete: Shows confirmation before removing from IndexedDB
6. Duplicate: Creates copy with "(Copy)" appended to name
7. Export: Downloads schedule as JSON file to user's device

### 5.4 Importing a Workout Schedule

1. User clicks "Import" button on home page
2. File picker opens for selecting JSON file
3. User selects a `.workout.json` file
4. App validates file format and structure
5. Shows preview of schedule name and exercise count
6. User confirms import
7. App generates new IDs and saves to IndexedDB
8. Schedule appears in the list with "(Imported)" suffix if name conflicts

## 6. Technical Architecture

### 6.1 Core Technologies

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Data Storage**: IndexedDB via wrapper functions
- **PWA**: Service Worker, Web App Manifest
- **Offline**: Cache-first strategy for static assets

### 6.2 Key Components

- **idb-helper.js**: Encapsulates all IndexedDB operations
  - Database initialization and versioning
  - CRUD operations for workout schedules
  - Transaction handling
- **app.js**: Main application controller
  - DOM event handling
  - Workout builder UI logic
  - Workout execution state machine
  - UI update functions
  - PWA service worker registration
- **service-worker.js**:
  - Install/cache static assets
  - Fetch event handling (cache-first)
  - Activate/cleanup old caches
- **manifest.json**: PWA metadata for installation
  - Name, icons, theme colors
  - Display: standalone
  - Start URL: /index.html

### 6.3 State Management

Application state maintained in JavaScript objects:

- `currentSchedule`: The schedule being viewed/edited
- `workoutState`: During execution (current set, rep, exercise index, phase)
- `uiState`: Builder mode vs execution mode, active panels

## 7. Development Phases

### Phase 1: Foundation (Est. 20-30% effort)

- Set up project structure
- Implement basic HTML/CSS layout
- Create IndexedDB helper with CRUD operations
- Implement service worker and manifest
- Verify PWA offline functionality

### Phase 2: Workout Builder (Est. 30-40% effort)

- Build schedule creation form
- Implement exercise field management (add/remove/reorder)
- Add drag-and-drop functionality (HTML5 Drag and Drop API)
- Implement save/load to/from IndexedDB
- Add validation and error handling

### Phase 3: Workout Execution (Est. 30-40% effort)

- Develop workout execution state machine
- Implement rep/break timing logic
- Build exercise execution UI
- Add progress tracking and visual feedback
- Implement pause/stop functionality
- Add workout completion handling

### Phase 4: Polish & Testing (Est. 10-20% effort)

- Refine UI/UX for various screen sizes
- Add accessibility features
- Test across browsers (Chrome, Firefox, Safari)
- Verify PWA installation on Android/iOS
- Test edge cases (interruptions, low battery, etc.)

## 8. Non-Functional Requirements

### Performance

- App loads in < 3 seconds on 3G
- UI responds to user input within 100ms
- IndexedDB operations complete without blocking UI

### Reliability

- All data persisted safely to IndexedDB
- Graceful handling of storage quota exceeded
- Service worker updates without breaking existing functionality

### Security

- No external dependencies that could introduce vulnerabilities
- Input validation to prevent XSS
- Secure context required for service worker (HTTPS or localhost)

### Maintainability

- Modular code structure
- Clear separation of concerns
- Comprehensive inline documentation
- Consistent coding style (ESLint configuration recommended)
