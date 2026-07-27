# Golf Swing Analyser

A phone-browser PWA for analysing golf swing mechanics from video. Everything
runs on-device — no backend, no video ever leaves your phone.

## What it does

1. Record a swing with your phone camera (60fps requested, live preview), or
   upload an existing clip. Tag it face-on or down-the-line — only metrics
   valid from that camera angle are shown.
2. A pose skeleton (MediaPipe Pose Landmarker, running in-browser via WASM) is
   overlaid on the video as you scrub (frame-by-frame stepping included).
3. Mark the four key positions — address, top of backswing, impact, finish —
   or let "Suggest key frames" find them from the wrist trajectory and adjust.
4. Get measured body angles at each position plus swing metrics benchmarked
   against pro ranges:
   - **Tempo ratio** (backswing : downswing, benchmark ~3:1)
   - **X-Factor** (shoulder/hip separation at the top, ~30-50°)
   - **Hip sway** (lateral drift, address → top)
   - **Early extension** (loss of spine angle, address → impact)
   - **Head movement** (drift, address → impact)
5. Out-of-range metrics come with coaching cues (chair drill, wall drill,
   tempo counting), and low-confidence landmarks are flagged so you know when
   a number can't be trusted.
6. Sessions are saved locally (IndexedDB) — snapshots, landmarks, and metrics
   only, never the video itself. History shows per-metric trend charts, any
   two sessions can be compared side by side, and everything can be exported/
   imported as JSON.

Live at https://gregj91.github.io/golf-swing-analyser/ (auto-deployed from
master via GitHub Actions).

## Running it

```bash
npm install
npm run dev       # local dev server
npm test          # unit tests (angle math, metrics, storage)
npm run build     # production build with PWA assets
```

Camera capture requires a secure context (HTTPS or localhost). To use the
camera from a phone on your network, serve the production build over HTTPS.

## Architecture

- `src/swing/` — pure functions: geometry, angle calculation, swing metrics
- `src/pose/` — MediaPipe Pose Landmarker wrapper
- `src/storage/` — IndexedDB session store
- `src/components/` — React UI (capture, viewer/marking, summary, history)

Design spec and implementation plan live in `docs/superpowers/`.
