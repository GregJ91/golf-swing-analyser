# Golf Swing Analyser — Design (v1: Pose Overlay + Key Angles)

## Purpose
A personal tool to analyse golf swing mechanics from video. Record or upload a
swing clip on a phone, see a pose skeleton overlaid on the video, mark the key
swing positions, and get measured body angles at each position. Session
history and trend tracking across swings is an explicit fast-follow (phase 2),
not part of this build.

## Who / where
Single user (the owner), used on a phone browser at the range or at home.

## Scope
**In scope (v1):**
- Record video via phone camera, or upload an existing video file
- On-device pose detection with a skeleton overlay synced to video playback
- Manual marking of four key frames: Address, Top of Backswing, Impact, Finish
- Computed angles at each marked frame: spine tilt, shoulder rotation, hip
  rotation, lead-arm angle, knee flex
- Save a session's key-frame snapshots + landmarks + angles to local storage
- View a saved session's results (images + angles)

**Out of scope (v1, planned for phase 2):**
- Trend charts / comparison across sessions over time
- Automatic key-frame detection (address/top/impact found by heuristics
  instead of manual marking)
- Club and ball flight data (requires different hardware/sensors)
- Multi-user support, accounts, sharing

## Architecture
Single-page web app, no backend — everything runs client-side in the phone
browser. Built as an installable PWA (works offline after first load, no
server costs).

- **Frontend**: Vite + React + TypeScript
- **Pose detection**: MediaPipe Pose Landmarker (Tasks Vision), on-device via
  WebAssembly — 33-landmark body pose model
- **Storage**: IndexedDB (via the `idb` library) — stores session metrics,
  not raw video

```
Capture/Upload → Video element
      │
      ▼
PoseLandmarker (MediaPipe, on-device)
      │
      ▼
Canvas overlay (skeleton on video)
      │
      ▼
Key-frame marking (user scrubs & tags)
      │
      ▼
Angle calculations (spine/hip/shoulder/arm/knee)
      │
      ▼
IndexedDB (session + metrics storage)
```

## Components

- **`VideoInput`** — records video via `getUserMedia` + `MediaRecorder`, or
  accepts a file upload. Produces a local video Blob URL. Falls back to
  upload-only if camera/mic permission is denied.
- **`PoseProcessor`** — wraps the MediaPipe PoseLandmarker. Runs detection
  per displayed frame (via `requestVideoFrameCallback`), not the whole video
  upfront. Emits landmark coordinates for the current frame, or a "no pose
  detected" signal.
- **`SwingViewer`** — video player with a canvas overlay drawn in sync, a
  scrub bar, and controls to mark the current frame as Address / Top of
  Backswing / Impact / Finish. Marking is blocked on frames with no detected
  pose.
- **`AngleCalculator`** — pure functions taking landmark coordinates for a
  marked frame and returning: spine tilt, shoulder rotation, hip rotation,
  lead-arm angle, knee flex. No UI dependency — unit tested in isolation.
- **`SessionStore`** — wraps IndexedDB (`idb`). Saves a session as:
  `{ date, keyFrames: { position, snapshotImage, landmarks, angles }[] }`.
  Does not store the source video.
- **`SessionSummary`** — displays a completed session: key-frame snapshots
  side by side with their angle values.
- **`HistoryList`** — stub for phase 2: a plain list of saved sessions by
  date. Full trend charts are deferred, but the data model already supports
  them.

## Data flow
1. Record or upload a swing video → local Blob URL (in-memory only).
2. Video loads into `SwingViewer`; `PoseProcessor` detects pose on-demand as
   frames are displayed.
3. User scrubs to a position and taps "mark as..." — captures that frame's
   landmarks and a snapshot image.
4. Once all four key frames are marked, `AngleCalculator` computes angles for
   each.
5. User taps "Save session" → `SessionStore` persists the key-frame data to
   IndexedDB. The source video is discarded after saving.
6. `SessionSummary` renders the saved result. `HistoryList` will later read
   all saved sessions for phase-2 trends.

## Error handling
- **No pose detected** on a frame (bad framing/lighting): inline warning on
  that frame; marking it as a key position is blocked until a pose is found.
- **Camera/mic permission denied**: fall back to file upload with an
  explanatory message.
- **Browser lacks WASM/getUserMedia support**: show a compatibility notice.
  Targeting modern mobile Safari/Chrome only — no legacy browser support
  needed for a personal tool.
- **IndexedDB write failure**: show a toast; let the user retry or discard
  the session.

## Testing
- `AngleCalculator`: unit tests with known landmark coordinates asserting
  expected angle outputs — the highest-value tests since this is pure logic.
- `SessionStore`: tests against `fake-indexeddb` for save/read round-trips.
- Camera capture, MediaPipe integration, and canvas rendering: verified
  manually on-device (phone browser), since these are inherently visual and
  hardware-dependent — not meaningfully unit-testable.
