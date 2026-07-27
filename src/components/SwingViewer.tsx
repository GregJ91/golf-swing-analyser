import { useEffect, useRef, useState } from 'react'
import { detectPose, loadPoseLandmarker } from '../pose/PoseProcessor'
import { LANDMARK } from '../pose/landmarkIndices'
import { lowVisibilityLandmarks } from '../swing/landmarkVisibility'
import { suggestKeyFrames } from '../swing/keyFrameDetection'
import type { TrajectorySample } from '../swing/keyFrameDetection'
import { KEY_FRAME_POSITIONS } from '../types'
import type { KeyFrame, KeyFramePosition, PoseLandmarks } from '../types'

const POSE_CONNECTIONS: Array<[number, number]> = [
  [LANDMARK.LEFT_SHOULDER, LANDMARK.RIGHT_SHOULDER],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_ELBOW],
  [LANDMARK.LEFT_ELBOW, LANDMARK.LEFT_WRIST],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_ELBOW],
  [LANDMARK.RIGHT_ELBOW, LANDMARK.RIGHT_WRIST],
  [LANDMARK.LEFT_SHOULDER, LANDMARK.LEFT_HIP],
  [LANDMARK.RIGHT_SHOULDER, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_HIP, LANDMARK.RIGHT_HIP],
  [LANDMARK.LEFT_HIP, LANDMARK.LEFT_KNEE],
  [LANDMARK.LEFT_KNEE, LANDMARK.LEFT_ANKLE],
  [LANDMARK.RIGHT_HIP, LANDMARK.RIGHT_KNEE],
  [LANDMARK.RIGHT_KNEE, LANDMARK.RIGHT_ANKLE],
]

const SCAN_FPS = 15

// Rejects if the browser never fires 'seeked' — without the timeout, one
// swallowed event would leave the scanner stuck at "Scanning…" forever with
// no way to recover.
function seekTo(video: HTMLVideoElement, timeSeconds: number, timeoutMs = 4000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      video.removeEventListener('seeked', onSeeked)
      reject(new Error('Video seek timed out'))
    }, timeoutMs)
    const onSeeked = () => {
      clearTimeout(timer)
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = timeSeconds
  })
}

interface SwingViewerProps {
  videoUrl: string
  onComplete: (keyFrames: KeyFrame[]) => void
}

export function SwingViewer({ videoUrl, onComplete }: SwingViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The latest detected pose lives in a ref so the ~60fps detection loop doesn't
  // re-render the component on every frame; `hasPose` only flips on found/lost
  // transitions (React skips re-renders when a primitive state value is unchanged).
  const poseRef = useRef<PoseLandmarks | null>(null)
  // MediaPipe's VIDEO mode needs a strictly increasing timestamp across ALL
  // detect calls, so the render loop and the scanner share this one counter.
  const detectionTsRef = useRef(0)
  const scanningRef = useRef(false)
  const [modelReady, setModelReady] = useState(false)
  const [hasPose, setHasPose] = useState(false)
  const [markedFrames, setMarkedFrames] = useState<KeyFrame[]>([])
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [scanMessage, setScanMessage] = useState<string | null>(null)

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
      // While a scan owns the video (seeking + detecting), the live loop stays
      // alive but idle so the two never interleave detect calls.
      if (scanningRef.current || (video!.paused && lastProcessedTime === video!.currentTime)) {
        rafId = requestAnimationFrame(renderFrame)
        return
      }
      lastProcessedTime = video!.currentTime

      // video.currentTime jumps backward whenever the user scrubs, which would
      // violate MediaPipe's monotonic-timestamp requirement and throw — and an
      // uncaught throw here would permanently kill the loop. Use the shared
      // counter and treat a throw as "no pose this frame".
      detectionTsRef.current += 1
      let pose: PoseLandmarks | null
      try {
        pose = detectPose(video!, detectionTsRef.current)
      } catch {
        pose = null
      }
      poseRef.current = pose
      setHasPose(Boolean(pose))
      const ctx = canvas!.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvas!.width, canvas!.height)
        if (pose) {
          // Brighter than the surface tracer green — this draws over video
          // content, not the app surface.
          ctx.fillStyle = '#a3e635'
          ctx.strokeStyle = '#a3e635'
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

  function buildKeyFrame(position: KeyFramePosition, pose: PoseLandmarks): KeyFrame | null {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return null

    const snapshotCanvas = document.createElement('canvas')
    snapshotCanvas.width = canvas.width
    snapshotCanvas.height = canvas.height
    const ctx = snapshotCanvas.getContext('2d')
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)

    // MediaPipe landmarks are normalized independently by video width (x) and height (y).
    // On non-square (e.g. portrait phone) video these two axes have different physical pixel
    // scales, which distorts any angle math mixing both axes. Convert to true pixel
    // coordinates here (both axes share the same physical scale) before storing, so
    // downstream angle/metric calculations aren't skewed by aspect ratio.
    const scaledLandmarks: PoseLandmarks = pose.map((point) => ({
      ...point,
      x: point.x * canvas.width,
      y: point.y * canvas.height,
    }))

    const lowVisibility = lowVisibilityLandmarks(pose)
    return {
      position,
      timestampMs: video.currentTime * 1000,
      landmarks: scaledLandmarks,
      snapshotImage: snapshotCanvas.toDataURL('image/jpeg', 0.8),
      ...(lowVisibility.length > 0 ? { lowVisibility } : {}),
    }
  }

  function markCurrentFrame(position: KeyFramePosition) {
    const pose = poseRef.current
    if (!pose) return
    const keyFrame = buildKeyFrame(position, pose)
    if (!keyFrame) return
    setMarkedFrames((frames) => [...frames.filter((frame) => frame.position !== position), keyFrame])
  }

  async function ensureFiniteDuration(video: HTMLVideoElement): Promise<number> {
    // Chrome quirk: MediaRecorder-produced webm blobs report duration Infinity
    // until you seek past the end once.
    if (!isFinite(video.duration)) {
      await seekTo(video, 1e10)
    }
    return video.duration
  }

  async function detectAt(video: HTMLVideoElement, timeSeconds: number): Promise<PoseLandmarks | null> {
    await seekTo(video, timeSeconds)
    detectionTsRef.current += 1
    try {
      return detectPose(video, detectionTsRef.current)
    } catch {
      return null
    }
  }

  async function suggestFrames() {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || scanning) return

    setScanning(true)
    scanningRef.current = true
    setScanMessage(null)
    setScanProgress(0)
    try {
      video.pause()
      const duration = await ensureFiniteDuration(video)
      if (!isFinite(duration) || duration <= 0) {
        setScanMessage("Couldn't read the video's length — mark frames manually.")
        return
      }

      const samples: TrajectorySample[] = []
      const step = 1 / SCAN_FPS
      for (let t = 0; t < duration; t += step) {
        const pose = await detectAt(video, t)
        if (pose) {
          const leftWrist = pose[LANDMARK.LEFT_WRIST]
          const rightWrist = pose[LANDMARK.RIGHT_WRIST]
          const leftShoulder = pose[LANDMARK.LEFT_SHOULDER]
          const rightShoulder = pose[LANDMARK.RIGHT_SHOULDER]
          samples.push({
            timeMs: t * 1000,
            wrist: {
              x: ((leftWrist.x + rightWrist.x) / 2) * canvas.width,
              y: ((leftWrist.y + rightWrist.y) / 2) * canvas.height,
            },
            shoulderWidth: Math.hypot(
              (rightShoulder.x - leftShoulder.x) * canvas.width,
              (rightShoulder.y - leftShoulder.y) * canvas.height,
            ),
          })
        }
        setScanProgress(Math.min(99, Math.round((t / duration) * 100)))
      }

      const suggested = suggestKeyFrames(samples)
      if (!suggested) {
        setScanMessage("Couldn't detect a full swing in this clip — mark the frames manually.")
        return
      }

      const frames: KeyFrame[] = []
      for (const position of KEY_FRAME_POSITIONS) {
        const pose = await detectAt(video, suggested[position] / 1000)
        if (pose) {
          const frame = buildKeyFrame(position, pose)
          if (frame) frames.push(frame)
        }
      }
      setMarkedFrames(frames)
      setScanMessage(
        frames.length === KEY_FRAME_POSITIONS.length
          ? 'Suggested all four frames — scrub to each to check, re-mark anything that looks off, then finish.'
          : 'Suggested some frames but not all — mark the rest manually.',
      )
      await seekTo(video, suggested.address / 1000)
    } catch {
      setScanMessage('Scanning failed — mark the frames manually.')
    } finally {
      scanningRef.current = false
      setScanning(false)
      setScanProgress(0)
    }
  }

  // Impact lasts one or two frames, and the native scrub bar is too coarse to land
  // on it. Step in 1/60s increments: exact single frames on 60fps recordings, half
  // frames (two taps per frame) on 30fps ones.
  function stepFrame(direction: 1 | -1) {
    const video = videoRef.current
    if (!video) return
    video.pause()
    const next = video.currentTime + direction / 60
    video.currentTime = Math.min(Math.max(next, 0), video.duration || next)
  }

  const allMarked = KEY_FRAME_POSITIONS.every((pos) =>
    markedFrames.some((frame) => frame.position === pos),
  )

  return (
    <div className="swing-viewer">
      <div className="video-canvas-wrapper">
        <video
          ref={videoRef}
          src={videoUrl}
          controls
          playsInline
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
      {modelReady && !scanning && !hasPose && (
        <p className="warning-text">No pose detected in this frame.</p>
      )}
      <div className="frame-step-buttons">
        <button onClick={() => stepFrame(-1)} disabled={scanning}>
          ◀ frame
        </button>
        <button onClick={() => stepFrame(1)} disabled={scanning}>
          frame ▶
        </button>
        <button onClick={suggestFrames} disabled={!modelReady || scanning}>
          {scanning ? `Scanning… ${scanProgress}%` : 'Suggest key frames'}
        </button>
      </div>
      {scanMessage && <p className="view-note">{scanMessage}</p>}
      <div className="mark-buttons">
        {KEY_FRAME_POSITIONS.map((position) => {
          const marked = markedFrames.find((frame) => frame.position === position)
          return (
            <button
              key={position}
              onClick={() => markCurrentFrame(position)}
              disabled={scanning || !hasPose}
            >
              {marked
                ? `${position} ✓ ${(marked.timestampMs / 1000).toFixed(2)}s (re-mark)`
                : `Mark as ${position}`}
            </button>
          )
        })}
      </div>
      {markedFrames
        .filter((frame) => frame.lowVisibility && frame.lowVisibility.length > 0)
        .map((frame) => (
          <p key={frame.position} className="warning-text">
            {frame.position}: {frame.lowVisibility!.join(', ')} partly out of frame — consider
            re-marking or re-filming with your whole body visible.
          </p>
        ))}
      <button
        className="finish-button"
        disabled={scanning || !allMarked}
        onClick={() => onComplete(markedFrames)}
      >
        Finish &amp; save
      </button>
    </div>
  )
}
