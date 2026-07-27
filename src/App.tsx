import { useEffect, useState } from 'react'
import './App.css'
import { VideoInput } from './components/VideoInput'
import { SwingViewer } from './components/SwingViewer'
import { SessionSummary } from './components/SessionSummary'
import { HistoryList } from './components/HistoryList'
import { ComparisonView } from './components/ComparisonView'
import { TrendCharts } from './components/TrendCharts'
import { listSessions, saveSession } from './storage/SessionStore'
import { calculateAngles } from './swing/AngleCalculator'
import { calculateSwingMetrics } from './swing/SwingMetrics'
import type { KeyFrame, Session, SwingView } from './types'

type Tab = 'new' | 'history'
type Stage = 'capture' | 'analyze' | 'summary'

function App() {
  const [tab, setTab] = useState<Tab>('new')
  const [stage, setStage] = useState<Stage>('capture')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [view, setView] = useState<SwingView>('face-on')
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [comparing, setComparing] = useState(false)

  function toggleCompare(id: string) {
    setCompareIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  useEffect(() => {
    if (tab === 'history') {
      listSessions().then(setSessions)
    }
  }, [tab])

  async function handleAnalysisComplete(keyFrames: KeyFrame[]) {
    // calculateSwingMetrics throws if the marked frames aren't in chronological
    // order (address < top < impact). Stay on the analyze stage so the user can
    // re-mark the offending frames rather than hitting a dead end.
    let metrics: Session['metrics']
    try {
      metrics = calculateSwingMetrics(keyFrames)
    } catch (error) {
      setAnalysisError(
        error instanceof Error
          ? `${error.message}. Re-mark the frames so they appear in that order in the video, then finish again.`
          : 'Could not compute swing metrics from these frames.',
      )
      return
    }
    setAnalysisError(null)

    const keyFramesWithAngles = keyFrames.map((frame) => ({
      ...frame,
      angles: calculateAngles(frame.landmarks),
    }))
    const session: Session = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date: new Date().toISOString(),
      view,
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
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(null)
    setActiveSession(null)
    setSaveError(null)
    setAnalysisError(null)
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
        <>
          <div className="view-picker">
            <span>Camera view:</span>
            <button className={view === 'face-on' ? 'active' : ''} onClick={() => setView('face-on')}>
              Face-on
            </button>
            <button
              className={view === 'down-the-line' ? 'active' : ''}
              onClick={() => setView('down-the-line')}
            >
              Down-the-line
            </button>
          </div>
          <VideoInput
            onVideoReady={(url) => {
              setVideoUrl(url)
              setStage('analyze')
            }}
          />
        </>
      )}

      {tab === 'new' && stage === 'analyze' && videoUrl && (
        <>
          {analysisError && <p className="error-text">{analysisError}</p>}
          <SwingViewer videoUrl={videoUrl} onComplete={handleAnalysisComplete} />
        </>
      )}

      {tab === 'new' && stage === 'summary' && activeSession && (
        <>
          {saveError && <p className="error-text">{saveError}</p>}
          <SessionSummary session={activeSession} />
        </>
      )}

      {tab === 'history' && !activeSession && comparing && compareIds.length === 2 && (
        <>
          <button onClick={() => setComparing(false)}>Back to list</button>
          <ComparisonView
            sessions={
              sessions.filter((s) => compareIds.includes(s.id)) as [Session, Session]
            }
          />
        </>
      )}

      {tab === 'history' && !activeSession && !comparing && (
        <>
          <TrendCharts sessions={sessions} />
          {compareIds.length === 2 && (
            <button className="finish-button" onClick={() => setComparing(true)}>
              Compare selected
            </button>
          )}
          <HistoryList
            sessions={sessions}
            onSelect={setActiveSession}
            onDeleted={() => {
              setCompareIds([])
              listSessions().then(setSessions)
            }}
            compareIds={compareIds}
            onToggleCompare={toggleCompare}
          />
        </>
      )}
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
