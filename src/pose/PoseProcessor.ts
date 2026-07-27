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
