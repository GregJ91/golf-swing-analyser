# Golf Swing Analyser

Personal phone-browser PWA that analyses golf swing mechanics from video, entirely
on-device. Single user (Greg, Samsung/Android Chrome). Live at
https://gregj91.github.io/golf-swing-analyser/ — repo github.com/GregJ91/golf-swing-analyser.

## Commands

- `npm run dev` — dev server (note: served under `/golf-swing-analyser/` because of `base`)
- `npm test` — Vitest, jsdom environment (52 tests as of 2026-07-27)
- `npm run build` — tsc + Vite + vite-plugin-pwa (generates sw.js/manifest)

## Deploy

Every push to `master` auto-deploys via `.github/workflows/deploy.yml` (tests, builds,
publishes to GitHub Pages). Verify with `gh run watch <id> --exit-status --compact` and
`curl` the live URL. The gh CLI token needs the `workflow` scope to push workflow-file
changes. Pages was enabled via API (`build_type=workflow`), not the workflow's own token.

## Architecture

- `src/swing/` — pure functions, all unit-tested with landmark fixtures: geometry,
  AngleCalculator, SwingMetrics, metricValidity, landmarkVisibility, keyFrameDetection,
  ghostAlignment, trendSeries, drills (+ prioritizeFaults/faultSeverity), followUp
- `src/pose/` — MediaPipe Pose Landmarker wrapper (PoseProcessor), landmark indices,
  POSE_CONNECTIONS (shared by all skeleton renderers)
- `src/storage/` — SessionStore (IndexedDB via `idb`, tested with fake-indexeddb), backup
- `src/components/` — React UI; **deliberately untested** (project convention: pure logic
  gets tests, visual/hardware code is verified manually on-device)
- `docs/superpowers/` — original design spec and implementation plan

## Non-obvious constraints (violating these reintroduces fixed bugs)

- **MediaPipe VIDEO mode needs strictly increasing timestamps across ALL detect calls.**
  Never feed `video.currentTime` (backward scrubs throw and can kill the render loop).
  SwingViewer uses a shared monotonic counter ref (`detectionTsRef`) for both the RAF
  loop and the key-frame scanner; detect calls are wrapped in try/catch.
- **Landmarks are stored in source-video PIXEL coordinates**, scaled in `buildKeyFrame`
  before storage. MediaPipe's normalized coords have different physical scales per axis
  on non-square video, which skews any angle mixing x and y.
- **Source video is never persisted** — only snapshots (JPEG data URLs), landmarks,
  angles, metrics.
- **Metric benchmark values are load-bearing calibration** (tempo 2.5–3.5, X-Factor
  30–50° widened for 2D error, sway ≤0.15, early extension ≤5°, head ≤0.1) — don't
  "improve" them casually.
- **Camera-view validity**: each metric is only shown for views it's trustworthy from
  (`metricValidity.ts`). `Session.view` undefined = legacy = face-on.
- `calculateSwingMetrics` throws on non-chronological address/top/impact — App catches
  it and keeps the user on the analyze stage (never let it dead-end the UI).
- MediaRecorder webm blobs report `duration: Infinity` in Chrome until you seek past the
  end once (`ensureFiniteDuration`).
- `@mediapipe/tasks-vision` is pinned exactly (0.10.14) to stay in lockstep with the
  version hardcoded in the CDN URLs in PoseProcessor.ts; those URLs are runtime-cached
  by the service worker (CacheFirst) so the PWA works offline.
- `SessionStore.test.ts` uses `clearAll()` (row clear), not `deleteDatabase()` — deleting
  a database with the singleton connection open hangs.

## Design system ("range at dusk")

Tokens in `src/index.css`: pine dark surfaces (#0f1511/#16201a/#1f2d24), chalk text,
sand (#d9c7a0) = interactive accent, flag (#e4572e) = out-of-range/destructive only,
tracer green = DATA only (#6ba82c on surfaces — validated for the dark surface;
#a3e635 on top of video). Archivo (display/labels, wide-tracked caps) + IBM Plex Mono
(all numerals), both bundled via @fontsource for offline. Signature element: metric
gauge rows (value dot vs benchmark zone band). Chart colors were validated with the
dataviz skill's palette validator (dark-mode lightness band is OKLCH L 0.48–0.67).
