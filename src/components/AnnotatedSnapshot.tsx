import { useEffect, useRef, useState } from 'react'
import { LANDMARK } from '../pose/landmarkIndices'
import { POSE_CONNECTIONS } from '../pose/poseConnections'
import { midpoint } from '../swing/geometry'
import { alignGhostLandmarks } from '../swing/ghostAlignment'
import type { AngleResults, PoseLandmarks } from '../types'

const TRACER = '#a3e635'
const SAND = '#ecdcb8'
const GHOST = '#edefe8'

interface AnnotatedSnapshotProps {
  snapshotImage: string
  landmarks: PoseLandmarks
  alt: string
  // Draw labelled spine/shoulder/hip angle lines.
  angles?: AngleResults
  // Draw this second skeleton (from another session) aligned onto the frame.
  ghostLandmarks?: PoseLandmarks
}

function isNormalized(landmarks: PoseLandmarks): boolean {
  if (landmarks.length === 0) return false
  const maxCoord = Math.max(...landmarks.map((p) => Math.max(p.x, p.y)))
  return maxCoord <= 1.5
}

// Landmarks are stored in source-video pixel coordinates, which match the
// snapshot's natural dimensions. (Very early sessions stored normalized 0-1
// coordinates — detect and upscale those so they still render.)
function toImageSpace(landmarks: PoseLandmarks, width: number, height: number): PoseLandmarks {
  if (isNormalized(landmarks)) {
    return landmarks.map((p) => ({ ...p, x: p.x * width, y: p.y * height }))
  }
  return landmarks
}

function Skeleton({ landmarks, stroke, width, dashed }: { landmarks: PoseLandmarks; stroke: string; width: number; dashed?: boolean }) {
  return (
    <g stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeDasharray={dashed ? `${width * 2} ${width * 2}` : undefined}>
      {POSE_CONNECTIONS.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={landmarks[a].x} y1={landmarks[a].y} x2={landmarks[b].x} y2={landmarks[b].y} />
      ))}
    </g>
  )
}

export function AnnotatedSnapshot({ snapshotImage, landmarks, alt, angles, ghostLandmarks }: AnnotatedSnapshotProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null)

  // A cached image can finish loading before React attaches the onLoad
  // listener, in which case dims would never be set and the overlay would
  // silently not render — check for an already-complete image after mount.
  useEffect(() => {
    const img = imgRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      setDims({ w: img.naturalWidth, h: img.naturalHeight })
    }
  }, [snapshotImage])

  const scaled = dims ? toImageSpace(landmarks, dims.w, dims.h) : null

  // A pixel-space ghost needs no denormalizing — the alignment's uniform
  // scale absorbs any camera-distance difference. A legacy normalized ghost
  // would need ITS OWN video's dimensions (which we don't have) to
  // denormalize without warping, so degrade to no ghost rather than a
  // distorted one.
  const alignableGhost = ghostLandmarks && !isNormalized(ghostLandmarks) ? ghostLandmarks : undefined

  return (
    <div className="annotated-snapshot">
      <img
        ref={imgRef}
        src={snapshotImage}
        alt={alt}
        onLoad={(event) => {
          const img = event.currentTarget
          setDims({ w: img.naturalWidth, h: img.naturalHeight })
        }}
      />
      {dims && scaled && (
        <svg viewBox={`0 0 ${dims.w} ${dims.h}`} aria-hidden="true">
          {alignableGhost && (
            <>
              <Skeleton
                landmarks={alignGhostLandmarks(alignableGhost, scaled)}
                stroke={GHOST}
                width={dims.w * 0.008}
                dashed
              />
              <Skeleton landmarks={scaled} stroke={TRACER} width={dims.w * 0.008} />
            </>
          )}
          {angles && !alignableGhost && <AngleAnnotations landmarks={scaled} angles={angles} w={dims.w} />}
        </svg>
      )}
    </div>
  )
}

function AngleAnnotations({ landmarks, angles, w }: { landmarks: PoseLandmarks; angles: AngleResults; w: number }) {
  const leftShoulder = landmarks[LANDMARK.LEFT_SHOULDER]
  const rightShoulder = landmarks[LANDMARK.RIGHT_SHOULDER]
  const leftHip = landmarks[LANDMARK.LEFT_HIP]
  const rightHip = landmarks[LANDMARK.RIGHT_HIP]
  const shoulderMid = midpoint(leftShoulder, rightShoulder)
  const hipMid = midpoint(leftHip, rightHip)

  const strokeW = w * 0.008
  const fontSize = w * 0.045
  const labelStyle = {
    fontSize,
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600 as const,
    paintOrder: 'stroke' as const,
    stroke: '#0f1511',
    strokeWidth: fontSize * 0.22,
    strokeLinejoin: 'round' as const,
  }

  return (
    <g>
      {/* spine */}
      <line x1={hipMid.x} y1={hipMid.y} x2={shoulderMid.x} y2={shoulderMid.y} stroke={TRACER} strokeWidth={strokeW} strokeLinecap="round" />
      <text x={(hipMid.x + shoulderMid.x) / 2 + fontSize * 0.4} y={(hipMid.y + shoulderMid.y) / 2} fill={TRACER} style={labelStyle}>
        {angles.spineTiltDeg.toFixed(0)}°
      </text>
      {/* shoulder line */}
      <line x1={leftShoulder.x} y1={leftShoulder.y} x2={rightShoulder.x} y2={rightShoulder.y} stroke={SAND} strokeWidth={strokeW} strokeLinecap="round" />
      <text x={Math.max(leftShoulder.x, rightShoulder.x) + fontSize * 0.3} y={shoulderMid.y - fontSize * 0.4} fill={SAND} style={labelStyle}>
        {angles.shoulderLineAngleDeg.toFixed(0)}°
      </text>
      {/* hip line */}
      <line x1={leftHip.x} y1={leftHip.y} x2={rightHip.x} y2={rightHip.y} stroke={SAND} strokeWidth={strokeW} strokeLinecap="round" />
      <text x={Math.max(leftHip.x, rightHip.x) + fontSize * 0.3} y={hipMid.y + fontSize * 0.4} fill={SAND} style={labelStyle}>
        {angles.hipLineAngleDeg.toFixed(0)}°
      </text>
    </g>
  )
}
