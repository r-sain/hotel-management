// Dates are stored as local strings in "YYYY-MM-DDTHH:mm" (matches <input type="datetime-local">).

// Format for display: "28 Sep 2026, 11:30 am"
export function formatDateTime(value) {
  if (!value) return '—'
  const d = parse(value)
  if (!d) return value
  const date = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  return `${date}, ${time}`
}

// Just the time part: "11:30 am"
export function formatTime(value) {
  if (!value) return '—'
  const d = parse(value)
  if (!d) return value
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

// Human friendly duration between two values (e.g. "3d 4h")
export function duration(a, b) {
  const start = parse(a)
  const end = parse(b)
  if (!start || !end) return null
  let ms = Math.max(0, end - start)
  const days = Math.floor(ms / 86400000)
  ms -= days * 86400000
  const hours = Math.floor(ms / 3600000)
  ms -= hours * 3600000
  const mins = Math.floor(ms / 60000)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function parse(value) {
  // Treat "YYYY-MM-DDTHH:mm" as local time (no Z) so it renders as entered.
  const d = new Date(value)
  return isNaN(d.getTime()) ? null : d
}

// Current local datetime as "YYYY-MM-DDTHH:mm" for datetime-local inputs.
export function nowLocal() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}
