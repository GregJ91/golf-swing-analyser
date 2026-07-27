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
