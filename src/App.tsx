import { useState } from 'react'
import './App.css'
import { VideoInput } from './components/VideoInput'
import { SwingViewer } from './components/SwingViewer'
import { SessionSummary } from './components/SessionSummary'
import { HistoryList } from './components/HistoryList'
import { saveSession } from './storage/SessionStore'
import { calculateAngles } from './swing/AngleCalculator'
import { calculateSwingMetrics } from './swing/SwingMetrics'
import type { KeyFrame, Session } from './types'

type Tab = 'new' | 'history'
type Stage = 'capture' | 'analyze' | 'summary'

function App() {
  const [tab, setTab] = useState<Tab>('new')
  const [stage, setStage] = useState<Stage>('capture')
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

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
        <VideoInput
          onVideoReady={(url) => {
            setVideoUrl(url)
            setStage('analyze')
          }}
        />
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

      {tab === 'history' && !activeSession && <HistoryList onSelect={setActiveSession} />}
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
