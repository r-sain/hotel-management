import { useRef } from 'react';

// File input for a guest: upload a PDF document.
// value = unsaved data URL (set after file pick). savedUrl = the
// currently stored file, shown while `value` is empty.
export default function PhotoField({
  label,
  allowUpload = true,
  value = null,
  savedUrl = null,
  onChange,
}) {
  const fileRef = useRef(null);
  const preview = value || savedUrl;
  const isPdf =
    preview?.startsWith('data:application/pdf') ||
    preview?.toLowerCase().endsWith('.pdf');

  const onFilePicked = e => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const isAllowedType =
      file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

    if (!isAllowedType) {
      alert('Please upload a PDF file only.');
      e.target.value = '';
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('File is larger than 8 MB. Please choose a smaller file.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="photo-field">
      <span className="field-label">{label}</span>
      <div className="photo-field-body">
        <div className="photo-status">
          {preview ? (
            isPdf ? (
              <span className="photo-status-text">PDF attached</span>
            ) : (
              <span className="photo-status-text">File selected</span>
            )
          ) : (
            <span className="photo-status-text photo-status-empty">
              No PDF selected
            </span>
          )}
        </div>
        <div className="photo-actions">
          {allowUpload && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                hidden
                onChange={onFilePicked}
              />
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => fileRef.current?.click()}
              >
                Choose PDF…
              </button>
            </>
          )}
          {value && (
            <button
              type="button"
              className="btn btn-ghost btn-danger-text"
              onClick={() => onChange(null)}
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
