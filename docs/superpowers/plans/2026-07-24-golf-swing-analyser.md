# Golf Swing Analyser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a phone-browser web app that overlays a pose skeleton on a recorded/uploaded golf swing video, lets the user mark four key frames (address, top of backswing, impact, finish), and computes body angles plus TPI-based power/fault metrics (tempo ratio, X-Factor, hip sway, early extension, head movement) benchmarked against pro ranges.

**Architecture:** Single-page web app (Vite + React + TypeScript), no backend. On-device pose detection via MediaPipe Pose Landmarker (Tasks Vision, WASM). Pure-function modules compute angles and swing metrics from landmark data; results are persisted to IndexedDB. Installable as a PWA.

**Tech Stack:** Vite, React 18, TypeScript, `@mediapipe/tasks-vision`, `idb`, `vite-plugin-pwa`, Vitest, `fake-indexeddb`.

## Global Constraints

- No backend/server — all processing and storage is client-side (per spec: Architecture).
- Targets modern mobile Safari/Chrome only — no legacy browser support needed (per spec: Error handling).
- Source video is never persisted to storage — only key-frame snapshot images, landmarks, angles, and metrics are saved (per spec: Data flow, step 5).
- Four key frame positions only: `address`, `top`, `impact`, `finish` (per spec: Scope).
- Angle/metric computation code (`AngleCalculator`, `SwingMetrics`) must be pure functions with no UI or storage dependency, unit tested with known landmark fixtures (per spec: Testing).

---

## File Structure

```
golf-swing-analyser/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  vitest.config.ts
  src/
    main.tsx
    App.tsx
    App.css
    types.ts                     # shared domain types
    pose/
      landmarkIndices.ts         # MediaPipe BlazePose landmark index constants
      PoseProcessor.ts           # MediaPipe PoseLandmarker wrapper
    swing/
      geometry.ts                # shared vector/angle math helpers
      AngleCalculator.ts         # pure angle functions
      AngleCalculator.test.ts
      SwingMetrics.ts            # pure power/fault metric functions
      SwingMetrics.test.ts
    storage/
      SessionStore.ts            # IndexedDB wrapper (idb)
      SessionStore.test.ts
    components/
      VideoInput.tsx             # record/upload video
      SwingViewer.tsx            # video + canvas overlay + scrub + mark
      SessionSummary.tsx         # display saved session
      HistoryList.tsx            # stub list of saved sessions
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/App.css`

**Interfaces:**
- Produces: a working Vite dev server (`npm run dev`) rendering `App`, and a working Vitest runner (`npm test`).

- [ ] **Step 1: Scaffold the Vite React-TS project**

Run:
```bash
npm create vite@latest . -- --template react-ts
```
When prompted about a non-empty directory (git repo + docs/ exist), choose to continue/ignore existing files.

- [ ] **Step 2: Install runtime and dev dependencies**

Run:
```bash
npm install
npm install idb @mediapipe/tasks-vision@0.10.14
npm install -D vitest @vitest/ui fake-indexeddb vite-plugin-pwa jsdom
```

- [ ] **Step 3: Add Vitest config**

Create `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Add a test script to package.json**

Modify `package.json` — add to `"scripts"`:
```json
"test": "vitest run"
```

- [ ] **Step 5: Replace default App with a minimal placeholder**

Replace contents of `src/App.tsx`:
```tsx
import './App.css'

function App() {
  return (
    <div className="app">
      <h1>Golf Swing Analyser</h1>
    </div>
  )
}

export default App
```

Replace contents of `src/App.css`:
```css
.app {
  max-width: 480px;
  margin: 0 auto;
  padding: 1rem;
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 6: Verify dev server and test runner both work**

Run: `npm run build`
Expected: build completes with no errors.

Run: `npm test`
Expected: "No test files found" message, exit code 0 (no tests written yet — this just confirms Vitest is wired up).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Vite React-TS project with Vitest and core dependencies"
```

---

### Task 2: Shared domain types and landmark indices

**Files:**
- Create: `src/types.ts`
- Create: `src/pose/landmarkIndices.ts`

**Interfaces:**
- Produces:
  - `Landmark { x: number; y: number; z: number; visibility?: number }`
  - `PoseLandmarks = Landmark[]` (33 entries, MediaPipe BlazePose topology)
  - `KeyFramePosition = 'address' | 'top' | 'impact' | 'finish'`
  - `MetricResult { value: number; benchmarkMin: number; benchmarkMax: number; inRange: boolean }`
  - `AngleResults { spineTiltDeg: number; shoulderLineAngleDeg: number; hipLineAngleDeg: number; leftArmAngleDeg: number; rightArmAngleDeg: number; leftKneeFlexDeg: number; rightKneeFlexDeg: number }`
  - `SwingMetricsResult { tempoRatio: MetricResult; xFactorDeg: MetricResult; hipSwayNormalized: MetricResult; earlyExtensionDeg: MetricResult; headMovementNormalized: MetricResult }`
  - `KeyFrame { position: KeyFramePosition; timestampMs: number; landmarks: PoseLandmarks; snapshotImage: string }`
  - `Session { id: string; date: string; keyFrames: (KeyFrame & { angles: AngleResults })[]; metrics: SwingMetricsResult }`
  - `LANDMARK` index constants (`NOSE`, `LEFT_SHOULDER`, etc.)

- [ ] **Step 1: Write the shared types file**

Create `src/types.ts`:
```ts
export interface Landmark {
  x: number
  y: number
  z: number
  visibility?: number
}

export type PoseLandmarks = Landmark[]

export type KeyFramePosition = 'address' | 'top' | 'impact' | 'finish'

export interface MetricResult {
  value: number
  benchmarkMin: number
  benchmarkMax: number
  inRange: boolean
}

export interface AngleResults {
  spineTiltDeg: number
  shoulderLineAngleDeg: number
  hipLineAngleDeg: number
  leftArmAngleDeg: number
  rightArmAngleDeg: number
  leftKneeFlexDeg: number
  rightKneeFlexDeg: number
}

export interface SwingMetricsResult {
  tempoRatio: MetricResult
  xFactorDeg: MetricResult
  hipSwayNormalized: MetricResult
  earlyExtensionDeg: MetricResult
  headMovementNormalized: MetricResult
}

export interface KeyFrame {
  position: KeyFramePosition
  timestampMs: number
  landmarks: PoseLandmarks
  snapshotImage: string
}

export interface SessionKeyFrame extends KeyFrame {
  angles: AngleResults
}

export interface Session {
  id: string
  date: string
  keyFrames: SessionKeyFrame[]
  metrics: SwingMetricsResult
}

export const KEY_FRAME_POSITIONS: KeyFramePosition[] = ['address', 'top', 'impact', 'finish']
```

- [ ] **Step 2: Write the landmark index constants**

Create `src/pose/landmarkIndices.ts`:
```ts
// Standard MediaPipe Pose (BlazePose) 33-point landmark indices.
// Reference: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
export const LANDMARK = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const
```

- [ ] **Step 3: Verify it compiles**

Run: `npm run build`
Expected: build completes with no errors (types file has no logic to test, just needs to typecheck).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/pose/landmarkIndices.ts
git commit -m "Add shared domain types and MediaPipe landmark index constants"
```

---

### Task 3: Geometry helpers and AngleCalculator

**Files:**
- Create: `src/swing/geometry.ts`
- Create: `src/swing/AngleCalculator.ts`
- Test: `src/swing/AngleCalculator.test.ts`

**Interfaces:**
- Consumes: `Landmark`, `PoseLandmarks`, `AngleResults` from `src/types.ts`; `LANDMARK` from `src/pose/landmarkIndices.ts`.
- Produces:
  - `midpoint(a: Landmark, b: Landmark): { x: number; y: number }`
  - `angleFromVerticalDeg(from: {x:number;y:number}, to: {x:number;y:number}): number`
  - `angleFromHorizontalDeg(from: {x:number;y:number}, to: {x:number;y:number}): number`
  - `angleBetweenVectorsDeg(a: {x:number;y:number}, b: {x:number;y:number}): number`
  - `calculateAngles(landmarks: PoseLandmarks): AngleResults`

- [ ] **Step 1: Write the geometry helpers (no test needed — exercised via AngleCalculator tests)**

Create `src/swing/geometry.ts`:
```ts
export interface Point2D {
  x: number
  y: number
}

export function midpoint(a: Point2D, b: Point2D): Point2D {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

// Image y grows downward, so "up" is -y. Returns degrees, 0 = perfectly vertical.
export function angleFromVerticalDeg(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return (Math.atan2(dx, -dy) * 180) / Math.PI
}

// Returns degrees, 0 = perfectly horizontal.
export function angleFromHorizontalDeg(from: Point2D, to: Point2D): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  return (Math.atan2(dy, dx) * 180) / Math.PI
}

// Angle at the vertex where vectors u and v meet, in degrees (0-180).
export function angleBetweenVectorsDeg(u: Point2D, v: Point2D): number {
  const dot = u.x * v.x + u.y * v.y
  const magU = Math.hypot(u.x, u.y)
  const magV = Math.hypot(v.x, v.y)
  const cos = Math.min(1, Math.max(-1, dot / (magU * magV)))
  return (Math.acos(cos) * 180) / Math.PI
}
```

- [ ] **Step 2: Write the failing AngleCalculator tests**

Create `src/swing/AngleCalculator.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calculateAngles } from './AngleCalculator'
import { LANDMARK } from '../pose/landmarkIndices'
import type { PoseLandmarks } from '../types'

function makeLandmarks(overrides: Record<number, { x: number; y: number }>): PoseLandmarks {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0, y: 0, z: 0 }))
  for (const [index, point] of Object.entries(overrides)) {
    landmarks[Number(index)] = { x: point.x, y: point.y, z: 0 }
  }
  return landmarks
}

describe('calculateAngles', () => {
  it('reports zero spine tilt when shoulders are directly above hips', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.2 },
      [LANDMARK.LEFT_HIP]: { x: 0.4, y: 0.5 },
      [LANDMARK.RIGHT_HIP]: { x: 0.6, y: 0.5 },
    })

    const result = calculateAngles(landmarks)

    expect(result.spineTiltDeg).toBeCloseTo(0, 1)
  })

  it('reports 90 degree shoulder line angle when shoulders are stacked vertically', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.5, y: 0.1 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.5, y: 0.3 },
      [LANDMARK.LEFT_HIP]: { x: 0.4, y: 0.5 },
      [LANDMARK.RIGHT_HIP]: { x: 0.6, y: 0.5 },
    })

    const result = calculateAngles(landmarks)

    expect(Math.abs(result.shoulderLineAngleDeg)).toBeCloseTo(90, 1)
  })

  it('reports 180 degree knee flex for a fully straight leg', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.1 },
      [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.1 },
      [LANDMARK.LEFT_HIP]: { x: 0.45, y: 0.5 },
      [LANDMARK.RIGHT_HIP]: { x: 0.55, y: 0.5 },
      [LANDMARK.LEFT_KNEE]: { x: 0.45, y: 0.75 },
      [LANDMARK.LEFT_ANKLE]: { x: 0.45, y: 1.0 },
    })

    const result = calculateAngles(landmarks)

    expect(result.leftKneeFlexDeg).toBeCloseTo(180, 1)
  })

  it('reports 90 degree knee flex for a right-angle bent knee', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_HIP]: { x: 0.45, y: 0.5 },
      [LANDMARK.LEFT_KNEE]: { x: 0.45, y: 0.75 },
      [LANDMARK.LEFT_ANKLE]: { x: 0.7, y: 0.75 },
    })

    const result = calculateAngles(landmarks)

    expect(result.leftKneeFlexDeg).toBeCloseTo(90, 1)
  })

  it('reports 180 degree arm angle for a straight, horizontal arm', () => {
    const landmarks = makeLandmarks({
      [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
      [LANDMARK.LEFT_ELBOW]: { x: 0.2, y: 0.2 },
      [LANDMARK.LEFT_WRIST]: { x: 0.0, y: 0.2 },
    })

    const result = calculateAngles(landmarks)

    expect(result.leftArmAngleDeg).toBeCloseTo(180, 1)
  })
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- AngleCalculator`
Expected: FAIL — `Cannot find module './AngleCalculator'`.

- [ ] **Step 4: Implement AngleCalculator**

Create `src/swing/AngleCalculator.ts`:
```ts
import type { AngleResults, PoseLandmarks } from '../types'
import { LANDMARK } from '../pose/landmarkIndices'
import { angleBetweenVectorsDeg, angleFromHorizontalDeg, angleFromVerticalDeg, midpoint } from './geometry'

function vectorBetween(from: { x: number; y: number }, to: { x: number; y: number }) {
  return { x: to.x - from.x, y: to.y - from.y }
}

function kneeFlexDeg(landmarks: PoseLandmarks, hipIdx: number, kneeIdx: number, ankleIdx: number): number {
  const hip = landmarks[hipIdx]
  const knee = landmarks[kneeIdx]
  const ankle = landmarks[ankleIdx]
  const thigh = vectorBetween(knee, hip)
  const shin = vectorBetween(knee, ankle)
  return angleBetweenVectorsDeg(thigh, shin)
}

function armAngleDeg(landmarks: PoseLandmarks, shoulderIdx: number, elbowIdx: number, wristIdx: number): number {
  const shoulder = landmarks[shoulderIdx]
  const elbow = landmarks[elbowIdx]
  const wrist = landmarks[wristIdx]
  const upperArm = vectorBetween(elbow, shoulder)
  const forearm = vectorBetween(elbow, wrist)
  return angleBetweenVectorsDeg(upperArm, forearm)
}

export function calculateAngles(landmarks: PoseLandmarks): AngleResults {
  const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER]
  const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER]
  const leftHip = landmarks[LANDMARK.LEFT_HIP]
  const rightHip = landmarks[LANDMARK.RIGHT_HIP]

  const shoulderMid = midpoint(leftShoulder, rightShoulder)
  const hipMid = midpoint(leftHip, rightHip)

  return {
    spineTiltDeg: angleFromVerticalDeg(hipMid, shoulderMid),
    shoulderLineAngleDeg: angleFromHorizontalDeg(leftShoulder, rightShoulder),
    hipLineAngleDeg: angleFromHorizontalDeg(leftHip, rightHip),
    leftArmAngleDeg: armAngleDeg(landmarks, LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_ELBOW, LANDMARK.LEFT_WRIST),
    rightArmAngleDeg: armAngleDeg(landmarks, LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST),
    leftKneeFlexDeg: kneeFlexDeg(landmarks, LANDMARK.LEFT_HIP, LANDMARK.LEFT_KNEE, LANDMARK.LEFT_ANKLE),
    rightKneeFlexDeg: kneeFlexDeg(landmarks, LANDMARK.RIGHT_HIP, LANDMARK.RIGHT_KNEE, LANDMARK.RIGHT_ANKLE),
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- AngleCalculator`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add src/swing/geometry.ts src/swing/AngleCalculator.ts src/swing/AngleCalculator.test.ts
git commit -m "Add geometry helpers and AngleCalculator with unit tests"
```

---

### Task 4: SwingMetrics

**Files:**
- Create: `src/swing/SwingMetrics.ts`
- Test: `src/swing/SwingMetrics.test.ts`

**Interfaces:**
- Consumes: `calculateAngles` from `src/swing/AngleCalculator.ts`; `midpoint` from `src/swing/geometry.ts`; `LANDMARK` from `src/pose/landmarkIndices.ts`; `KeyFrame`, `SwingMetricsResult`, `MetricResult` from `src/types.ts`.
- Produces: `calculateSwingMetrics(keyFrames: KeyFrame[]): SwingMetricsResult`. Assumes `keyFrames` contains exactly one entry for each of `address`, `top`, `impact`, `finish` (enforced by the caller, `SwingViewer`, in Task 8 — this function throws if a required position is missing).

- [ ] **Step 1: Write the failing SwingMetrics tests**

Create `src/swing/SwingMetrics.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { calculateSwingMetrics } from './SwingMetrics'
import { LANDMARK } from '../pose/landmarkIndices'
import type { KeyFrame, PoseLandmarks } from '../types'

function makeLandmarks(overrides: Record<number, { x: number; y: number }>): PoseLandmarks {
  const landmarks = Array.from({ length: 33 }, () => ({ x: 0.5, y: 0.5, z: 0 }))
  for (const [index, point] of Object.entries(overrides)) {
    landmarks[Number(index)] = { x: point.x, y: point.y, z: 0 }
  }
  return landmarks
}

const baseLandmarks = {
  [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
  [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.2 },
  [LANDMARK.LEFT_HIP]: { x: 0.4, y: 0.5 },
  [LANDMARK.RIGHT_HIP]: { x: 0.6, y: 0.5 },
  [LANDMARK.NOSE]: { x: 0.5, y: 0.1 },
}

function makeKeyFrame(position: KeyFrame['position'], timestampMs: number, overrides: Record<number, { x: number; y: number }> = {}): KeyFrame {
  return {
    position,
    timestampMs,
    landmarks: makeLandmarks({ ...baseLandmarks, ...overrides }),
    snapshotImage: '',
  }
}

describe('calculateSwingMetrics', () => {
  it('computes tempo ratio from address/top/impact timestamps', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.tempoRatio.value).toBeCloseTo(3, 1)
    expect(result.tempoRatio.inRange).toBe(true)
  })

  it('flags an out-of-range tempo ratio', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1700),
      makeKeyFrame('finish', 2000),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.tempoRatio.inRange).toBe(false)
  })

  it('computes X-Factor as the shoulder/hip line angle separation at top', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900, {
        [LANDMARK.LEFT_SHOULDER]: { x: 0.35, y: 0.25 },
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.65, y: 0.15 },
        [LANDMARK.LEFT_HIP]: { x: 0.42, y: 0.51 },
        [LANDMARK.RIGHT_HIP]: { x: 0.58, y: 0.49 },
      }),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.xFactorDeg.value).toBeGreaterThan(0)
  })

  it('reports zero hip sway and head movement when landmarks do not move', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.hipSwayNormalized.value).toBeCloseTo(0, 2)
    expect(result.hipSwayNormalized.inRange).toBe(true)
    expect(result.headMovementNormalized.value).toBeCloseTo(0, 2)
    expect(result.headMovementNormalized.inRange).toBe(true)
  })

  it('flags hip sway when the hip midpoint drifts laterally from address to top', () => {
    const keyFrames = [
      makeKeyFrame('address', 0),
      makeKeyFrame('top', 900, {
        [LANDMARK.LEFT_HIP]: { x: 0.7, y: 0.5 },
        [LANDMARK.RIGHT_HIP]: { x: 0.9, y: 0.5 },
      }),
      makeKeyFrame('impact', 1200),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.hipSwayNormalized.inRange).toBe(false)
  })

  it('flags early extension when spine tilt decreases sharply from address to impact', () => {
    const keyFrames = [
      makeKeyFrame('address', 0, {
        [LANDMARK.LEFT_SHOULDER]: { x: 0.35, y: 0.2 },
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.55, y: 0.2 },
      }),
      makeKeyFrame('top', 900),
      makeKeyFrame('impact', 1200, {
        [LANDMARK.LEFT_SHOULDER]: { x: 0.4, y: 0.2 },
        [LANDMARK.RIGHT_SHOULDER]: { x: 0.6, y: 0.2 },
      }),
      makeKeyFrame('finish', 1500),
    ]

    const result = calculateSwingMetrics(keyFrames)

    expect(result.earlyExtensionDeg.inRange).toBe(false)
  })

  it('throws if a required key frame position is missing', () => {
    const keyFrames = [makeKeyFrame('address', 0), makeKeyFrame('top', 900)]

    expect(() => calculateSwingMetrics(keyFrames)).toThrow()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- SwingMetrics`
Expected: FAIL — `Cannot find module './SwingMetrics'`.

- [ ] **Step 3: Implement SwingMetrics**

Create `src/swing/SwingMetrics.ts`:
```ts
import type { KeyFrame, KeyFramePosition, MetricResult, SwingMetricsResult } from '../types'
import { LANDMARK } from '../pose/landmarkIndices'
import { calculateAngles } from './AngleCalculator'
import { midpoint } from './geometry'

function findKeyFrame(keyFrames: KeyFrame[], position: KeyFramePosition): KeyFrame {
  const found = keyFrames.find((frame) => frame.position === position)
  if (!found) {
    throw new Error(`Missing required key frame: ${position}`)
  }
  return found
}

function metric(value: number, benchmarkMin: number, benchmarkMax: number): MetricResult {
  return { value, benchmarkMin, benchmarkMax, inRange: value >= benchmarkMin && value <= benchmarkMax }
}

function shoulderWidth(frame: KeyFrame): number {
  const left = frame.landmarks[LANDMARK.LEFT_SHOULDER]
  const right = frame.landmarks[LANDMARK.RIGHT_SHOULDER]
  return Math.hypot(right.x - left.x, right.y - left.y)
}

export function calculateSwingMetrics(keyFrames: KeyFrame[]): SwingMetricsResult {
  const address = findKeyFrame(keyFrames, 'address')
  const top = findKeyFrame(keyFrames, 'top')
  const impact = findKeyFrame(keyFrames, 'impact')

  // Tempo ratio: backswing duration : downswing duration. Pro benchmark ~3:1.
  const backswingMs = top.timestampMs - address.timestampMs
  const downswingMs = impact.timestampMs - top.timestampMs
  const tempoRatio = metric(backswingMs / downswingMs, 2.5, 3.5)

  // X-Factor: shoulder/hip line angle separation at the top of backswing. Pro benchmark ~30-50deg
  // (widened from the commonly cited 40-50deg to account for single-camera 2D measurement error).
  const topAngles = calculateAngles(top.landmarks)
  const xFactorDeg = metric(
    Math.abs(topAngles.shoulderLineAngleDeg - topAngles.hipLineAngleDeg),
    30,
    50,
  )

  // Hip sway: lateral hip-midpoint drift from address to top, normalized by shoulder width
  // (so it's independent of how far the camera is from the golfer). Minimal drift is the target.
  const addressHipMid = midpoint(address.landmarks[LANDMARK.LEFT_HIP], address.landmarks[LANDMARK.RIGHT_HIP])
  const topHipMid = midpoint(top.landmarks[LANDMARK.LEFT_HIP], top.landmarks[LANDMARK.RIGHT_HIP])
  const hipSwayNormalized = metric(
    Math.abs(topHipMid.x - addressHipMid.x) / shoulderWidth(address),
    0,
    0.15,
  )

  // Early extension: spine tilt should stay roughly constant from address to impact; a sharp
  // decrease (standing up) indicates the hips thrusting toward the ball.
  const addressAngles = calculateAngles(address.landmarks)
  const impactAngles = calculateAngles(impact.landmarks)
  const earlyExtensionDeg = metric(
    Math.abs(impactAngles.spineTiltDeg - addressAngles.spineTiltDeg),
    0,
    5,
  )

  // Head movement: lateral/vertical drift of the head from address to impact, normalized by
  // shoulder width. Minimal drift supports consistent contact.
  const addressNose = address.landmarks[LANDMARK.NOSE]
  const impactNose = impact.landmarks[LANDMARK.NOSE]
  const headMovementNormalized = metric(
    Math.hypot(impactNose.x - addressNose.x, impactNose.y - addressNose.y) / shoulderWidth(address),
    0,
    0.1,
  )

  return { tempoRatio, xFactorDeg, hipSwayNormalized, earlyExtensionDeg, headMovementNormalized }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- SwingMetrics`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/swing/SwingMetrics.ts src/swing/SwingMetrics.test.ts
git commit -m "Add SwingMetrics: tempo ratio, X-Factor, hip sway, early extension, head movement"
```

---

### Task 5: SessionStore (IndexedDB)

**Files:**
- Create: `src/storage/SessionStore.ts`
- Test: `src/storage/SessionStore.test.ts`

**Interfaces:**
- Consumes: `Session` from `src/types.ts`.
- Produces:
  - `saveSession(session: Session): Promise<void>`
  - `listSessions(): Promise<Session[]>` (sorted newest-first by `date`)
  - `getSession(id: string): Promise<Session | undefined>`
  - `deleteSession(id: string): Promise<void>`

- [ ] **Step 1: Write the failing SessionStore tests**

Create `src/storage/SessionStore.test.ts`:
```ts
import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { saveSession, listSessions, getSession, deleteSession } from './SessionStore'
import type { Session } from '../types'

function makeSession(id: string, date: string): Session {
  return {
    id,
    date,
    keyFrames: [],
    metrics: {
      tempoRatio: { value: 3, benchmarkMin: 2.5, benchmarkMax: 3.5, inRange: true },
      xFactorDeg: { value: 40, benchmarkMin: 30, benchmarkMax: 50, inRange: true },
      hipSwayNormalized: { value: 0.05, benchmarkMin: 0, benchmarkMax: 0.15, inRange: true },
      earlyExtensionDeg: { value: 2, benchmarkMin: 0, benchmarkMax: 5, inRange: true },
      headMovementNormalized: { value: 0.03, benchmarkMin: 0, benchmarkMax: 0.1, inRange: true },
    },
  }
}

describe('SessionStore', () => {
  beforeEach(async () => {
    indexedDB.deleteDatabase('golf-swing-analyser')
  })

  it('saves and retrieves a session by id', async () => {
    const session = makeSession('session-1', '2026-07-24T10:00:00.000Z')
    await saveSession(session)

    const found = await getSession('session-1')

    expect(found).toEqual(session)
  })

  it('lists sessions newest-first by date', async () => {
    await saveSession(makeSession('older', '2026-07-20T10:00:00.000Z'))
    await saveSession(makeSession('newer', '2026-07-24T10:00:00.000Z'))

    const sessions = await listSessions()

    expect(sessions.map((s) => s.id)).toEqual(['newer', 'older'])
  })

  it('deletes a session', async () => {
    await saveSession(makeSession('to-delete', '2026-07-24T10:00:00.000Z'))

    await deleteSession('to-delete')
    const found = await getSession('to-delete')

    expect(found).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- SessionStore`
Expected: FAIL — `Cannot find module './SessionStore'`.

- [ ] **Step 3: Implement SessionStore**

Create `src/storage/SessionStore.ts`:
```ts
import { openDB, type IDBPDatabase } from 'idb'
import type { Session } from '../types'

const DB_NAME = 'golf-swing-analyser'
const STORE_NAME = 'sessions'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase> | null = null

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      },
    })
  }
  return dbPromise
}

export async function saveSession(session: Session): Promise<void> {
  const db = await getDb()
  await db.put(STORE_NAME, session)
}

export async function getSession(id: string): Promise<Session | undefined> {
  const db = await getDb()
  return db.get(STORE_NAME, id)
}

export async function listSessions(): Promise<Session[]> {
  const db = await getDb()
  const all = await db.getAll(STORE_NAME)
  return all.sort((a: Session, b: Session) => b.date.localeCompare(a.date))
}

export async function deleteSession(id: string): Promise<void> {
  const db = await getDb()
  await db.delete(STORE_NAME, id)
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- SessionStore`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/storage/SessionStore.ts src/storage/SessionStore.test.ts
git commit -m "Add SessionStore IndexedDB wrapper with unit tests"
```

---

### Task 6: PoseProcessor (MediaPipe wrapper)

**Files:**
- Create: `src/pose/PoseProcessor.ts`

**Interfaces:**
- Consumes: `PoseLandmarks` from `src/types.ts`.
- Produces:
  - `loadPoseLandmarker(): Promise<void>` — must be called once before `detectPose`.
  - `detectPose(video: HTMLVideoElement, timestampMs: number): PoseLandmarks | null` — returns `null` if no pose is detected in the frame.

No automated test for this file — it wraps a third-party WASM/ML model and requires a real video element and browser APIs; verified manually in Task 8 where it's wired into `SwingViewer`.

- [ ] **Step 1: Implement PoseProcessor**

Create `src/pose/PoseProcessor.ts`:
```ts
import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'
import type { PoseLandmarks } from '../types'

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
const MODEL_ASSET_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'

let poseLandmarker: PoseLandmarker | null = null

export async function loadPoseLandmarker(): Promise<void> {
  if (poseLandmarker) return
  const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL)
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_ASSET_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
  })
}

export function detectPose(video: HTMLVideoElement, timestampMs: number): PoseLandmarks | null {
  if (!poseLandmarker) {
    throw new Error('loadPoseLandmarker() must resolve before calling detectPose()')
  }
  const result = poseLandmarker.detectForVideo(video, timestampMs)
  if (!result.landmarks || result.landmarks.length === 0) {
    return null
  }
  return result.landmarks[0].map((point) => ({
    x: point.x,
    y: point.y,
    z: point.z,
    visibility: point.visibility,
  }))
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/pose/PoseProcessor.ts
git commit -m "Add PoseProcessor wrapper around MediaPipe PoseLandmarker"
```

---

### Task 7: VideoInput component

**Files:**
- Create: `src/components/VideoInput.tsx`

**Interfaces:**
- Produces: `<VideoInput onVideoReady={(url: string) => void} />` — a component with a "Record" button (uses `getUserMedia` + `MediaRecorder`, falls back to a message if permission is denied) and an "Upload" file input (`accept="video/*"`). On success, calls `onVideoReady` with an object URL for the captured/uploaded video Blob.

No automated test — camera capture is a browser/hardware API; verified manually on-device per spec's Testing section.

- [ ] **Step 1: Implement VideoInput**

Create `src/components/VideoInput.tsx`:
```tsx
import { useRef, useState } from 'react'

interface VideoInputProps {
  onVideoReady: (url: string) => void
}

export function VideoInput({ onVideoReady }: VideoInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)

  async function startRecording() {
    setPermissionError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        onVideoReady(URL.createObjectURL(blob))
        streamRef.current?.getTracks().forEach((track) => track.stop())
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      setPermissionError('Camera access was denied. Use "Upload video" instead.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onVideoReady(URL.createObjectURL(file))
    }
  }

  return (
    <div className="video-input">
      {!isRecording ? (
        <button onClick={startRecording}>Record swing</button>
      ) : (
        <button onClick={stopRecording}>Stop recording</button>
      )}
      {permissionError && <p className="error-text">{permissionError}</p>}
      <label className="upload-label">
        Upload video
        <input type="file" accept="video/*" onChange={handleFileChange} />
      </label>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/VideoInput.tsx
git commit -m "Add VideoInput component for recording or uploading a swing video"
```

---

### Task 8: SwingViewer component (overlay, scrub, key-frame marking)

**Files:**
- Create: `src/components/SwingViewer.tsx`

**Interfaces:**
- Consumes: `loadPoseLandmarker`, `detectPose` from `src/pose/PoseProcessor.ts`; `KEY_FRAME_POSITIONS`, `KeyFrame`, `KeyFramePosition`, `PoseLandmarks` from `src/types.ts`; `LANDMARK` from `src/pose/landmarkIndices.ts`.
- Produces: `<SwingViewer videoUrl={string} onComplete={(keyFrames: KeyFrame[]) => void} />`. Renders the video with a synced canvas skeleton overlay, a scrub bar (native `<input type="range">` bound to `video.currentTime`), and one "Mark as {position}" button per remaining unmarked position. Calls `onComplete` once all four positions are marked, passing the four captured `KeyFrame`s.

- [ ] **Step 1: Implement SwingViewer**

Create `src/components/SwingViewer.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { detectPose, loadPoseLandmarker } from '../pose/PoseProcessor'
import { KEY_FRAME_POSITIONS } from '../types'
import type { KeyFrame, KeyFramePosition, PoseLandmarks } from '../types'

const POSE_CONNECTIONS: Array<[number, number]> = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
]

interface SwingViewerProps {
  videoUrl: string
  onComplete: (keyFrames: KeyFrame[]) => void
}

export function SwingViewer({ videoUrl, onComplete }: SwingViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [modelReady, setModelReady] = useState(false)
  const [currentPose, setCurrentPose] = useState<PoseLandmarks | null>(null)
  const [markedFrames, setMarkedFrames] = useState<KeyFrame[]>([])

  useEffect(() => {
    loadPoseLandmarker().then(() => setModelReady(true))
  }, [])

  useEffect(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !modelReady) return

    let rafId: number
    function renderFrame() {
      const pose = detectPose(video!, video!.currentTime * 1000)
      setCurrentPose(pose)
      const ctx = canvas!.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height)
        if (pose) {
          ctx.fillStyle = '#00ff00'
          ctx.strokeStyle = '#00ff00'
          for (const [a, b] of POSE_CONNECTIONS) {
            const pa = pose[a]
            const pb = pose[b]
            ctx.beginPath()
            ctx.moveTo(pa.x * canvas!.width, pa.y * canvas!.height)
            ctx.lineTo(pb.x * canvas!.width, pb.y * canvas!.height)
            ctx.stroke()
          }
          for (const point of pose) {
            ctx.beginPath()
            ctx.arc(point.x * canvas!.width, point.y * canvas!.height, 3, 0, 2 * Math.PI)
            ctx.fill()
          }
        }
      }
      rafId = requestAnimationFrame(renderFrame)
    }
    rafId = requestAnimationFrame(renderFrame)
    return () => cancelAnimationFrame(rafId)
  }, [modelReady])

  function markCurrentFrame(position: KeyFramePosition) {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !currentPose) return

    const snapshotCanvas = document.createElement('canvas')
    snapshotCanvas.width = canvas.width
    snapshotCanvas.height = canvas.height
    const ctx = snapshotCanvas.getContext('2d')
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

    const keyFrame: KeyFrame = {
      position,
      timestampMs: video.currentTime * 1000,
      landmarks: currentPose,
      snapshotImage: snapshotCanvas.toDataURL('image/jpeg', 0.8),
    }

    const updated = [...markedFrames.filter((frame) => frame.position !== position), keyFrame]
    setMarkedFrames(updated)

    if (KEY_FRAME_POSITIONS.every((pos) => updated.some((frame) => frame.position === pos))) {
      onComplete(updated)
    }
  }

  const remainingPositions = KEY_FRAME_POSITIONS.filter(
    (pos) => !markedFrames.some((frame) => frame.position === pos),
  )

  return (
    <div className="swing-viewer">
      <div className="video-canvas-wrapper">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          width={360}
          height={640}
          onLoadedMetadata={() => {
            if (canvasRef.current && videoRef.current) {
              canvasRef.current.width = videoRef.current.videoWidth
              canvasRef.current.height = videoRef.current.videoHeight
            }
          }}
        />
        <canvas ref={canvasRef} className="pose-overlay" />
      </div>
      {!modelReady && <p>Loading pose model...</p>}
      {modelReady && !currentPose && <p className="warning-text">No pose detected in this frame.</p>}
      <div className="mark-buttons">
        {remainingPositions.map((position) => (
          <button key={position} onClick={() => markCurrentFrame(position)} disabled={!currentPose}>
            Mark as {position}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SwingViewer.tsx
git commit -m "Add SwingViewer: pose overlay, scrubbing, and key-frame marking"
```

---

### Task 9: SessionSummary component

**Files:**
- Create: `src/components/SessionSummary.tsx`

**Interfaces:**
- Consumes: `Session`, `MetricResult` from `src/types.ts`.
- Produces: `<SessionSummary session={Session} />` — renders each key frame's snapshot with its angle values, plus a metrics panel showing each `SwingMetricsResult` entry against its benchmark range with an in-range/out-of-range indicator.

- [ ] **Step 1: Implement SessionSummary**

Create `src/components/SessionSummary.tsx`:
```tsx
import type { MetricResult, Session } from '../types'

function MetricRow({ label, metric, unit }: { label: string; metric: MetricResult; unit: string }) {
  return (
    <tr className={metric.inRange ? 'metric-ok' : 'metric-warning'}>
      <td>{label}</td>
      <td>
        {metric.value.toFixed(1)}
        {unit}
      </td>
      <td>
        {metric.benchmarkMin}-{metric.benchmarkMax}
        {unit}
      </td>
      <td>{metric.inRange ? 'OK' : 'Check this'}</td>
    </tr>
  )
}

export function SessionSummary({ session }: { session: Session }) {
  return (
    <div className="session-summary">
      <h2>Swing session — {new Date(session.date).toLocaleString()}</h2>

      <div className="key-frames">
        {session.keyFrames.map((frame) => (
          <div key={frame.position} className="key-frame-card">
            <h3>{frame.position}</h3>
            <img src={frame.snapshotImage} alt={`${frame.position} snapshot`} width={180} />
            <ul>
              <li>Spine tilt: {frame.angles.spineTiltDeg.toFixed(1)}°</li>
              <li>Shoulder line: {frame.angles.shoulderLineAngleDeg.toFixed(1)}°</li>
              <li>Hip line: {frame.angles.hipLineAngleDeg.toFixed(1)}°</li>
              <li>Left arm: {frame.angles.leftArmAngleDeg.toFixed(1)}°</li>
              <li>Right arm: {frame.angles.rightArmAngleDeg.toFixed(1)}°</li>
              <li>Left knee flex: {frame.angles.leftKneeFlexDeg.toFixed(1)}°</li>
              <li>Right knee flex: {frame.angles.rightKneeFlexDeg.toFixed(1)}°</li>
            </ul>
          </div>
        ))}
      </div>

      <table className="metrics-table">
        <thead>
          <tr>
            <th>Metric</th>
            <th>Value</th>
            <th>Pro benchmark</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <MetricRow label="Tempo ratio (backswing:downswing)" metric={session.metrics.tempoRatio} unit=":1" />
          <MetricRow label="X-Factor" metric={session.metrics.xFactorDeg} unit="°" />
          <MetricRow label="Hip sway" metric={session.metrics.hipSwayNormalized} unit="" />
          <MetricRow label="Early extension" metric={session.metrics.earlyExtensionDeg} unit="°" />
          <MetricRow label="Head movement" metric={session.metrics.headMovementNormalized} unit="" />
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/SessionSummary.tsx
git commit -m "Add SessionSummary component displaying angles and benchmarked metrics"
```

---

### Task 10: HistoryList component

**Files:**
- Create: `src/components/HistoryList.tsx`

**Interfaces:**
- Consumes: `listSessions` from `src/storage/SessionStore.ts`; `Session` from `src/types.ts`.
- Produces: `<HistoryList onSelect={(session: Session) => void} />` — loads all sessions on mount and renders them as a plain date-sorted list; clicking one calls `onSelect`. This is the phase-2 stub named in the spec — no trend charts yet.

- [ ] **Step 1: Implement HistoryList**

Create `src/components/HistoryList.tsx`:
```tsx
import { useEffect, useState } from 'react'
import { listSessions } from '../storage/SessionStore'
import type { Session } from '../types'

export function HistoryList({ onSelect }: { onSelect: (session: Session) => void }) {
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    listSessions().then(setSessions)
  }, [])

  if (sessions.length === 0) {
    return <p>No saved sessions yet.</p>
  }

  return (
    <ul className="history-list">
      {sessions.map((session) => (
        <li key={session.id}>
          <button onClick={() => onSelect(session)}>{new Date(session.date).toLocaleString()}</button>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build completes with no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/HistoryList.tsx
git commit -m "Add HistoryList stub for browsing saved sessions"
```

---

### Task 11: App wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Interfaces:**
- Consumes: `VideoInput`, `SwingViewer`, `SessionSummary`, `HistoryList` from `src/components/`; `saveSession` from `src/storage/SessionStore.ts`; `calculateAngles` from `src/swing/AngleCalculator.ts`; `calculateSwingMetrics` from `src/swing/SwingMetrics.ts`; `Session`, `SessionKeyFrame`, `KeyFrame` from `src/types.ts`.
- Produces: the full app flow — tab between "New analysis" and "History"; new analysis goes VideoInput → SwingViewer → auto-save via SessionStore → SessionSummary; History goes HistoryList → SessionSummary.

- [ ] **Step 1: Wire the full flow into App**

Replace contents of `src/App.tsx`:
```tsx
import { useState } from 'react'
import './App.css'
import { VideoInput } from './components/VideoInput'
import { SwingViewer } from './components/SwingViewer'
import { SessionSummary } from './components/SessionSummary'
import { HistoryList } from './components/HistoryList'
import { saveSession } from './storage/SessionStore'
import { calculateAngles } from './swing/AngleCalculator'
import { calculateSwingMetrics } from './swing/SwingMetrics'
import type { KeyFrame, Session } from './types'

type Tab = 'new' | 'history'
type Stage = 'capture' | 'analyze' | 'summary'

function App() {
  const [tab, setTab] = useState<Tab>('new')
  const [stage, setStage] = useState<Stage>('capture')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleAnalysisComplete(keyFrames: KeyFrame[]) {
    const keyFramesWithAngles = keyFrames.map((frame) => ({
      ...frame,
      angles: calculateAngles(frame.landmarks),
    }))
    const metrics = calculateSwingMetrics(keyFrames)
    const session: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: new Date().toISOString(),
      keyFrames: keyFramesWithAngles,
      metrics,
    }

    try {
      await saveSession(session)
      setSaveError(null)
    } catch {
      setSaveError('Could not save this session. You can still view the results below.')
    }

    setActiveSession(session)
    setStage('summary')
  }

  function startNewAnalysis() {
    setVideoUrl(null)
    setActiveSession(null)
    setSaveError(null)
    setStage('capture')
    setTab('new')
  }

  return (
    <div className="app">
      <h1>Golf Swing Analyser</h1>

      <nav className="tabs">
        <button className={tab === 'new' ? 'active' : ''} onClick={startNewAnalysis}>
          New analysis
        </button>
        <button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>
          History
        </button>
      </nav>

      {tab === 'new' && stage === 'capture' && (
        <VideoInput
          onVideoReady={(url) => {
            setVideoUrl(url)
            setStage('analyze')
          }}
        />
      )}

      {tab === 'new' && stage === 'analyze' && videoUrl && (
        <SwingViewer videoUrl={videoUrl} onComplete={handleAnalysisComplete} />
      )}

      {tab === 'new' && stage === 'summary' && activeSession && (
        <>
          {saveError && <p className="error-text">{saveError}</p>}
          <SessionSummary session={activeSession} />
        </>
      )}

      {tab === 'history' && !activeSession && <HistoryList onSelect={setActiveSession} />}
      {tab === 'history' && activeSession && (
        <>
          <button onClick={() => setActiveSession(null)}>Back to list</button>
          <SessionSummary session={activeSession} />
        </>
      )}
    </div>
  )
}

export default App
```

- [ ] **Step 2: Add styling for the new UI pieces**

Append to `src/App.css`:
```css
.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tabs button.active {
  font-weight: bold;
  text-decoration: underline;
}

.video-canvas-wrapper {
  position: relative;
  width: 360px;
}

.pose-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  width: 100%;
  height: 100%;
}

.mark-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.error-text {
  color: #b00020;
}

.warning-text {
  color: #a15c00;
}

.key-frames {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.metrics-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 1rem;
}

.metrics-table td, .metrics-table th {
  border: 1px solid #ccc;
  padding: 0.4rem;
  text-align: left;
}

.metric-warning {
  background: #fff3cd;
}
```

- [ ] **Step 3: Verify build and full test suite pass**

Run: `npm run build`
Expected: build completes with no errors.

Run: `npm test`
Expected: all previously written tests (AngleCalculator, SwingMetrics, SessionStore) still PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "Wire full app flow: capture, analyze, save, and view swing sessions"
```

---

### Task 12: PWA manifest and compatibility check

**Files:**
- Modify: `vite.config.ts`
- Modify: `src/main.tsx`

**Interfaces:**
- Produces: an installable PWA (manifest + service worker via `vite-plugin-pwa`), and a startup compatibility check that shows a clear message if the browser lacks required APIs (`getUserMedia`/WASM), per the spec's Error handling section.

- [ ] **Step 1: Add the PWA plugin to Vite config**

Modify `vite.config.ts` (read the existing file first, then add the plugin):
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Golf Swing Analyser',
        short_name: 'SwingAnalyser',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1b5e20',
        icons: [],
      },
    }),
  ],
})
```

- [ ] **Step 2: Add a startup compatibility check**

Modify `src/main.tsx` (read the existing file first, then wrap the render call):
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

function isBrowserCompatible(): boolean {
  return Boolean(navigator.mediaDevices?.getUserMedia && window.WebAssembly)
}

const rootElement = document.getElementById('root')!

if (!isBrowserCompatible()) {
  rootElement.innerHTML =
    '<p style="padding:1rem;font-family:system-ui">This browser is missing camera or WebAssembly support needed for pose detection. Please use an up-to-date mobile Safari or Chrome.</p>'
} else {
  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `npm run build`
Expected: build completes with no errors, and the build output includes a generated service worker/manifest from `vite-plugin-pwa`.

- [ ] **Step 4: Commit**

```bash
git add vite.config.ts src/main.tsx
git commit -m "Add PWA manifest and browser compatibility check"
```

---

## Self-Review Notes

- **Spec coverage:** Record/upload (Task 7), pose overlay (Task 8), key-frame marking (Task 8), angles (Task 3), swing metrics (Task 4), storage without raw video (Task 5, Task 11), session summary display (Task 9), history stub (Task 10), PWA/offline + compatibility notice (Task 12), error handling for no-pose/permission-denied/storage-failure (Tasks 7, 8, 11) — all spec sections are covered.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** `KeyFrame`/`SessionKeyFrame`/`Session`/`AngleResults`/`SwingMetricsResult`/`MetricResult` are defined once in Task 2 and reused verbatim (same field names) across Tasks 3, 4, 5, 8, 9, 10, 11 — checked for drift, none found.
