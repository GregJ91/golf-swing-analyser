import type { PoseLandmarks } from '../types'
import { LANDMARK } from '../pose/landmarkIndices'

// Only the landmarks that feed angle/metric calculations matter here.
const CHECKED_LANDMARKS: Array<{ index: number; name: string }> = [
  { index: LANDMARK.NOSE, name: 'head' },
  { index: LANDMARK.LEFT_SHOULDER, name: 'left shoulder' },
  { index: LANDMARK.RIGHT_SHOULDER, name: 'right shoulder' },
  { index: LANDMARK.LEFT_ELBOW, name: 'left elbow' },
  { index: LANDMARK.RIGHT_ELBOW, name: 'right elbow' },
  { index: LANDMARK.LEFT_WRIST, name: 'left wrist' },
  { index: LANDMARK.RIGHT_WRIST, name: 'right wrist' },
  { index: LANDMARK.LEFT_HIP, name: 'left hip' },
  { index: LANDMARK.RIGHT_HIP, name: 'right hip' },
  { index: LANDMARK.LEFT_KNEE, name: 'left knee' },
  { index: LANDMARK.RIGHT_KNEE, name: 'right knee' },
  { index: LANDMARK.LEFT_ANKLE, name: 'left ankle' },
  { index: LANDMARK.RIGHT_ANKLE, name: 'right ankle' },
]

// MediaPipe visibility is 0-1; below ~0.5 the point is usually occluded or out
// of frame and its coordinates are largely guesswork.
const VISIBILITY_THRESHOLD = 0.5

// Returns the names of angle-relevant landmarks the model wasn't confident
// about. Landmarks without a visibility score are trusted (some backends omit it).
export function lowVisibilityLandmarks(landmarks: PoseLandmarks): string[] {
  return CHECKED_LANDMARKS.filter(({ index }) => {
    const visibility = landmarks[index]?.visibility
    return visibility !== undefined && visibility < VISIBILITY_THRESHOLD
  }).map(({ name }) => name)
}
