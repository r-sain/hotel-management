import { useRef, useState } from 'react'
import WebcamCapture from './WebcamCapture.jsx'

// Photo input for a guest: preview + capture via webcam and/or upload a file.
// value = unsaved data URL (set after capture / file pick). savedUrl = the
// currently stored photo, shown while `value` is empty.
export default function PhotoField({
  label,
  allowCamera = true,
  allowUpload = false,
  value = null,
  savedUrl = null,
  onChange,
}) {
  const fileRef = useRef(null)
  const [mode, setMode] = useState(allowCamera ? 'camera' : 'upload')

  const preview = value || savedUrl

  const onFilePicked = (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > 8 * 1024 * 1024) {
      alert('Image is larger than 8 MB. Please choose a smaller image.')
      e.target.value = ''
      return
    }
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const switchMode = (m) => {
    setMode(m)
  }

  return (
    <div className="photo-field">
      <span className="field-label">{label}</span>
      <div className="photo-field-body">
        <div className="photo-preview">
          {preview ? (
            <img src={preview} alt={label} />
          ) : (
            <div className="photo-empty">No photo</div>
          )}
          {preview && value && <span className="photo-new-tag">New</span>}
        </div>
        <div className="photo-actions">
          {allowCamera && allowUpload && (
            <div className="seg" role="tablist">
              <button
                type="button"
                className={`seg-btn ${mode === 'camera' ? 'active' : ''}`}
                onClick={() => switchMode('camera')}
              >
                Camera
              </button>
              <button
                type="button"
                className={`seg-btn ${mode === 'upload' ? 'active' : ''}`}
                onClick={() => switchMode('upload')}
              >
                Upload
              </button>
            </div>
          )}
          {allowCamera && mode === 'camera' && (
            <WebcamCapture onCapture={(dataUrl) => onChange(dataUrl)} />
          )}
          {allowUpload && mode === 'upload' && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onFilePicked}
              />
              <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                Choose image…
              </button>
            </>
          )}
          {value && (
            <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => onChange(null)}>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
