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
