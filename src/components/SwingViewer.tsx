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
    let lastProcessedTime: number | null = null
    function renderFrame() {
      if (video!.paused && lastProcessedTime === video!.currentTime) {
        rafId = requestAnimationFrame(renderFrame)
        return
      }
      lastProcessedTime = video!.currentTime

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
