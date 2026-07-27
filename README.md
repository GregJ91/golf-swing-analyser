# Golf Swing Analyser

A phone-browser PWA for analysing golf swing mechanics from video. Everything
runs on-device — no backend, no video ever leaves your phone.

## What it does

1. Record a swing with your phone camera, or upload an existing clip.
2. A pose skeleton (MediaPipe Pose Landmarker, running in-browser via WASM) is
   overlaid on the video as you scrub.
3. Mark the four key positions: address, top of backswing, impact, finish.
4. Get measured body angles at each position plus swing metrics benchmarked
   against pro ranges:
   - **Tempo ratio** (backswing : downswing, benchmark ~3:1)
   - **X-Factor** (shoulder/hip separation at the top, ~30-50°)
   - **Hip sway** (lateral drift, address → top)
   - **Early extension** (loss of spine angle, address → impact)
   - **Head movement** (drift, address → impact)
5. Sessions are saved locally (IndexedDB) — snapshots, landmarks, and metrics
   only, never the video itself.

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
