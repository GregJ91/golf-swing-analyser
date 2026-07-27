import { useEffect, useRef, useState } from 'react'

interface VideoInputProps {
  onVideoReady: (url: string) => void
}

export function VideoInput({ onVideoReady }: VideoInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [permissionError, setPermissionError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const previewRef = useRef<HTMLVideoElement>(null)

  // The preview element only exists while recording, so attach the live stream
  // after that render rather than inside startRecording (where the ref is null).
  useEffect(() => {
    if (isRecording && previewRef.current && streamRef.current) {
      previewRef.current.srcObject = streamRef.current
    }
  }, [isRecording])

  // If the component unmounts mid-recording (user navigates away), nothing else
  // stops the recorder or releases the camera — the light would stay on until
  // the tab closes.
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  async function startRecording() {
    setPermissionError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // 60fps doubles the odds of a clean impact frame; browsers fall back
        // gracefully if the camera can't do it.
        video: { facingMode: 'environment', frameRate: { ideal: 60 } },
        audio: false,
      })
      streamRef.current = stream
      chunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' })
        onVideoReady(URL.createObjectURL(blob))
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
    } catch {
      setPermissionError('Camera access was denied. Use "Upload video" instead.')
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setIsRecording(false)
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      onVideoReady(URL.createObjectURL(file))
    }
  }

  return (
    <div className="video-input">
      {isRecording && <video ref={previewRef} className="camera-preview" autoPlay muted playsInline />}
      {!isRecording ? (
        <button onClick={startRecording}>Record swing</button>
      ) : (
        <button onClick={stopRecording}>Stop recording</button>
      )}
      {permissionError && <p className="error-text">{permissionError}</p>}
      <label className="upload-label">
        Upload video
        <input type="file" accept="video/*" onChange={handleFileChange} />
      </label>
    </div>
  )
}
