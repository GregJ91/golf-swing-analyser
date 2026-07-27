import type { PoseLandmarks } from '../types'
import { LANDMARK } from '../pose/landmarkIndices'
import { midpoint } from './geometry'

// Maps a ghost skeleton (from another video, with its own framing and camera
// distance) into the host frame's coordinate space so the two postures can be
// overlaid: translate so the hip midpoints coincide, scale by torso length
// (hip midpoint → shoulder midpoint). No rotation — postural differences ARE
// the signal, so only position and size are normalized away.
export function alignGhostLandmarks(ghost: PoseLandmarks, host: PoseLandmarks): PoseLandmarks {
  const ghostHipMid = midpoint(ghost[LANDMARK.LEFT_HIP], ghost[LANDMARK.RIGHT_HIP])
  const ghostShoulderMid = midpoint(ghost[LANDMARK.LEFT_SHOULDER], ghost[LANDMARK.RIGHT_SHOULDER])
  const hostHipMid = midpoint(host[LANDMARK.LEFT_HIP], host[LANDMARK.RIGHT_HIP])
  const hostShoulderMid = midpoint(host[LANDMARK.LEFT_SHOULDER], host[LANDMARK.RIGHT_SHOULDER])

  const ghostTorso = Math.hypot(ghostShoulderMid.x - ghostHipMid.x, ghostShoulderMid.y - ghostHipMid.y)
  const hostTorso = Math.hypot(hostShoulderMid.x - hostHipMid.x, hostShoulderMid.y - hostHipMid.y)
  const scale = ghostTorso > 0 ? hostTorso / ghostTorso : 1

  return ghost.map((point) => ({
    ...point,
    x: hostHipMid.x + (point.x - ghostHipMid.x) * scale,
    y: hostHipMid.y + (point.y - ghostHipMid.y) * scale,
  }))
}
