// Thin fetch wrapper around the Express API. All paths are relative so the
// Vite dev proxy (and prod static serve) work without any base-URL config.

async function request(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`
    const err = new Error(message)
    err.status = res.status
    err.data = data
    throw err
  }
  return data
}

const qs = (params) => {
  const s = new URLSearchParams()
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') s.set(k, v)
  })
  const str = s.toString()
  return str ? `?${str}` : ''
}

export const api = {
  listGuests: (params) => request(`/api/guests${qs(params)}`),
  getGuest: (id) => request(`/api/guests/${id}`),
  createGuest: (body) => request('/api/guests', { method: 'POST', body: JSON.stringify(body) }),
  updateGuest: (id, body) => request(`/api/guests/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  checkOut: (id, checkoutAt) =>
    request(`/api/guests/${id}/checkout`, { method: 'PATCH', body: JSON.stringify({ checkout_at: checkoutAt }) }),
  reopen: (id) => request(`/api/guests/${id}`, { method: 'PUT', body: JSON.stringify({ checkout_at: null, status: 'checked-in' }) }),
  removeGuest: (id) => request(`/api/guests/${id}`, { method: 'DELETE' }),
  uploadPhoto: (id, kind, dataUrl) =>
    request(`/api/guests/${id}/photos/${kind}`, { method: 'POST', body: JSON.stringify({ dataUrl }) }),
}

export function photoUrl(guest, kind) {
  const val = kind === 'face' ? guest.face_photo : guest.id_photo
  return val ? `/uploads/${val}` : null
}
