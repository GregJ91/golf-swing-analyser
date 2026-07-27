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

  async function handleAnalysisComplete(keyFrames: KeyFrame[]) {
    const keyFramesWithAngles = keyFrames.map((frame) => ({
      ...frame,
      angles: calculateAngles(frame.landmarks),
    }))
    const metrics = calculateSwingMetrics(keyFrames)
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
    setVideoUrl(null)
    setActiveSession(null)
    setSaveError(null)
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
        <SwingViewer videoUrl={videoUrl} onComplete={handleAnalysisComplete} />
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
