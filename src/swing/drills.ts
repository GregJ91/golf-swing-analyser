import type { MetricResult, SwingMetricsResult } from '../types'

export interface Drill {
  name: string
  // Which metric/direction this drill addresses.
  metric: keyof SwingMetricsResult
  direction: 'below' | 'above'
  // Plain-language description of the fault it fixes.
  fixes: string
  steps: string[]
  reps: string
}

// One drill per fault direction — standard, widely-taught drills that need no
// equipment beyond a wall, a chair, or an alignment stick.
export const DRILLS: Drill[] = [
  {
    name: 'Three-to-one count',
    metric: 'tempoRatio',
    direction: 'below',
    fixes: 'A rushed backswing — taking the club back too fast relative to your downswing.',
    steps: [
      'Set up to a ball and count evenly in your head: "one-two-three" for the backswing, "one" for the downswing.',
      'Swing at half effort until the count feels natural, then build back to full speed keeping the same ratio.',
      'If you lose the count, slow everything down rather than just the backswing.',
    ],
    reps: '10 slow swings, then 5 full-speed, every practice session',
  },
  {
    name: 'Pause-at-the-top',
    metric: 'tempoRatio',
    direction: 'above',
    fixes: 'Snatching the club down from the top — a slow backswing followed by a violent downswing usually means the transition is rushed.',
    steps: [
      'Swing to the top and hold for a full second — long enough to feel where your hands and weight are.',
      'Start the downswing from the ground up: feel your lead hip begin the move before your arms.',
      'Gradually shrink the pause to a smooth, unhurried change of direction.',
    ],
    reps: '10 pause swings before every range session',
  },
  {
    name: 'Step drill',
    metric: 'xFactorDeg',
    direction: 'below',
    fixes: 'Limited shoulder-hip separation — turning hips and shoulders together, which costs you stored power.',
    steps: [
      'Set up with your feet together, then swing to the top while stepping your lead foot out toward the target.',
      'The step forces your lower body to stay quiet and lead, while your upper back keeps coiling against it.',
      'Feel the stretch across your torso at the top — that stretch is the X-Factor.',
    ],
    reps: '10 swings, hitting balls at half speed once it feels stable',
  },
  {
    name: 'Connected turn',
    metric: 'xFactorDeg',
    direction: 'above',
    fixes: 'Over-rotation — separation so large it becomes hard to time and hard on your back.',
    steps: [
      'Place a glove or headcover under your trail armpit and keep it there through the backswing.',
      'Let your hips turn a little more freely than usual so the coil is shared, not all in your spine.',
      'Stop the backswing when your lead shoulder reaches your chin.',
    ],
    reps: '10 swings with the glove before hitting balls',
  },
  {
    name: 'Trail-hip wall drill',
    metric: 'hipSwayNormalized',
    direction: 'above',
    fixes: 'Swaying — sliding your hips away from the target during the backswing instead of coiling around them.',
    steps: [
      'Set up with your trail hip a hand-width from a wall (wall on your trail side).',
      'Make backswings without bumping the wall: the hip should turn behind you, not slide into it.',
      'Feel your weight load into the inside of your trail foot, not the outside.',
    ],
    reps: '15 slow rehearsals daily — no ball needed',
  },
  {
    name: 'Chair drill',
    metric: 'earlyExtensionDeg',
    direction: 'above',
    fixes: 'Early extension — your hips thrusting toward the ball through impact, standing you up out of your posture.',
    steps: [
      'Set up with your backside just touching a chair back or wall.',
      'Swing to impact keeping contact with the chair the whole way — your trail glute stays back as you rotate.',
      'If you lose contact, slow down and exaggerate keeping your bend from address.',
    ],
    reps: '15 slow swings daily, then check with a fresh video',
  },
  {
    name: 'Steady-eyes drill',
    metric: 'headMovementNormalized',
    direction: 'above',
    fixes: 'Head drift — moving your head noticeably during the swing, which makes consistent contact much harder.',
    steps: [
      'Pick out one dimple (or blade of grass) under the ball and lock your eyes on it.',
      'Swing at 75% keeping that exact spot in focus until after the ball is gone.',
      'Imagine your head stays inside a small box from address to impact — moving within it is fine, leaving it is not.',
    ],
    reps: '10 focused swings at the start of every bucket',
  },
]

export function drillFor(metric: keyof SwingMetricsResult, direction: 'below' | 'above'): Drill | null {
  return DRILLS.find((d) => d.metric === metric && d.direction === direction) ?? null
}

export interface Fault {
  key: keyof SwingMetricsResult
  metric: MetricResult
  // How far outside the benchmark zone, as a fraction of the zone's width —
  // lets faults with different units be ranked against each other.
  severity: number
  direction: 'below' | 'above'
}

// Ranks the out-of-range metrics worst-first so the summary can lead with the
// single most important thing to fix.
export function prioritizeFaults(
  metrics: SwingMetricsResult,
  keys: Array<keyof SwingMetricsResult>,
): Fault[] {
  return keys
    .map((key) => {
      const metric = metrics[key]
      const span = metric.benchmarkMax - metric.benchmarkMin || 1
      const overshoot =
        metric.value < metric.benchmarkMin
          ? metric.benchmarkMin - metric.value
          : metric.value > metric.benchmarkMax
            ? metric.value - metric.benchmarkMax
            : 0
      return {
        key,
        metric,
        severity: overshoot / span,
        direction: (metric.value < metric.benchmarkMin ? 'below' : 'above') as 'below' | 'above',
      }
    })
    .filter((fault) => fault.severity > 0)
    .sort((a, b) => b.severity - a.severity)
}
