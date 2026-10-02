import { useEffect, useRef, useState } from 'react'

// Live webcam preview with a "capture" button that returns a JPEG data URL.
// `onCapture(dataUrl)` is called on a successful snap. Camera is stopped
// automatically on unmount or when the user clicks Stop.
export default function WebcamCapture({ onCapture }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [starting, setStarting] = useState(false)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')

  const stop = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setActive(false)
  }

  const start = async () => {
    setError('')
    setStarting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) videoRef.current.srcObject = stream
      setActive(true)
    } catch (e) {
      const name = e && e.name
      if (name === 'NotAllowedError') setError('Camera permission denied. Allow access and try again.')
      else if (name === 'NotFoundError') setError('No camera was found on this device.')
      else if (name === 'NotReadableError') setError('Camera is in use by another app. Close it and try again.')
      else setError('Could not start the camera. ' + (e.message || ''))
    } finally {
      setStarting(false)
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    stop()
    onCapture(dataUrl)
  }

  // Clean up the stream when the component unmounts.
  useEffect(() => {
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="webcam">
      <div className="webcam-frame">
        {active ? (
          <video ref={videoRef} autoPlay playsInline muted className="webcam-video" />
        ) : (
          <div className="webcam-placeholder">
            <span className="webcam-icon" aria-hidden="true">📷</span>
            <p>{error ? '' : 'Camera preview'}</p>
          </div>
        )}
        {active && (
          <button type="button" className="btn btn-primary webcam-capture" onClick={capture}>
            ● Capture
          </button>
        )}
      </div>
      {error && <p className="field-error webcam-error">{error}</p>}
      {!active && !error && (
        <button type="button" className="btn btn-ghost" onClick={start} disabled={starting}>
          {starting ? 'Starting…' : 'Start camera'}
        </button>
      )}
      {active && (
        <button type="button" className="btn btn-ghost" onClick={stop}>
          Stop camera
        </button>
      )}
    </div>
  )
}
