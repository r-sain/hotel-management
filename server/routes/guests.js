import { Router } from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { db, rootDir } from '../db.js'

const router = Router()
const uploadsDir = path.join(rootDir, 'uploads')

const PHOTO_KINDS = { face: 'face.jpg', id: 'id.jpg' }

function badRequest(res, msg) {
  return res.status(400).json({ error: msg })
}

function toPaise(value, field, { required = false, allowNull = false } = {}) {
  if (value === null || value === undefined || value === '') {
    if (allowNull) return null
    if (required) return { error: `${field} is required` }
    return 0
  }
  const num = Number(value)
  if (!Number.isFinite(num)) return { error: `${field} must be a number` }
  if (num < 0) return { error: `${field} cannot be negative` }
  return Math.round(num * 100)
}

// Add computed bill breakdown to a DB row
function withBill(row) {
  const rate = row.gst_rate || 0
  let base
  let total
  if (row.gst_included) {
    total = row.last_bill_amount
    base = Math.round(total / (1 + rate / 100))
  } else {
    base = row.last_bill_amount
    total = Math.round(base * (1 + rate / 100))
  }
  const autoDue = total - row.rent_paid
  return {
    ...row,
    base_amount: base,
    gst_amount: total - base,
    bill_total: total,
    bill_due: row.bill_due_manual !== null ? row.bill_due_manual : autoDue,
    bill_due_source: row.bill_due_manual !== null ? 'manual' : 'auto',
  }
}

function getGuest(id) {
  const row = db.prepare('SELECT * FROM guests WHERE id = ?').get(id)
  return row ? withBill(row) : null
}

function checkRoomFree(roomNo, exceptId = 0) {
  const occ = db
    .prepare("SELECT name FROM guests WHERE room_no = ? AND status = 'checked-in' AND id != ?")
    .get(roomNo, exceptId)
  return occ ? `Room ${roomNo} is already occupied by ${occ.name}. Choose another room.` : null
}

function parseGuestBody(body, { partial = false } = {}) {
  const out = {}
  const errors = []

  if (!partial || body.name !== undefined) {
    const name = String(body.name || '').trim()
    if (!name) errors.push('Name is required')
    else out.name = name
  }
  if (!partial || body.room_no !== undefined) {
    const room = String(body.room_no || '').trim()
    if (!room) errors.push('Room no. is required')
    else out.room_no = room
  }
  if (!partial || body.no_of_persons !== undefined) {
    const persons = Number(body.no_of_persons)
    if (!Number.isInteger(persons) || persons < 1 || persons > 50) {
      errors.push('No. of persons must be a whole number (1–50)')
    } else out.no_of_persons = persons
  }
  if (!partial || body.checkin_at !== undefined) {
    const ci = String(body.checkin_at || '').trim()
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(ci)) errors.push('Check-in date+time is required')
    else out.checkin_at = ci
  }
  if (body.checkout_at !== undefined) {
    const co = String(body.checkout_at || '').trim()
    out.checkout_at = co || null
  }
  for (const f of ['rent_paid', 'last_bill_amount']) {
    if (body[f] !== undefined || !partial) {
      const p = toPaise(body[f], f, { required: false, allowNull: true })
      if (p && p.error) errors.push(p.error)
      else out[f] = p === null ? 0 : p
    }
  }
  if (body.gst_included !== undefined || !partial) {
    out.gst_included = body.gst_included ? 1 : 0
  }
  if (body.gst_rate !== undefined || !partial) {
    const rate = Number(body.gst_rate ?? 5)
    if (!Number.isFinite(rate) || rate < 0 || rate > 50) errors.push('GST rate must be 0–50')
    else out.gst_rate = rate
  }
  if (body.bill_due_manual !== undefined || !partial) {
    const p = toPaise(body.bill_due_manual, 'Manual bill due', { allowNull: true })
    if (p && p.error) errors.push(p.error)
    else out.bill_due_manual = p
  }
  if (body.bill_due_note !== undefined || !partial) {
    out.bill_due_note = body.bill_due_note ? String(body.bill_due_note).trim() : null
  }
  return { out, errors }
}

// GET /api/guests?search=&status=
router.get('/', (req, res) => {
  const { search, status } = req.query
  let sql = 'SELECT * FROM guests WHERE 1=1'
  const params = []
  if (status === 'checked-in' || status === 'checked-out') {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (search) {
    sql += ' AND (name LIKE ? OR room_no LIKE ?)'
    params.push(`%${search}%`, `%${search}%`)
  }
  sql += " ORDER BY (status = 'checked-in') DESC, room_no COLLATE NOCASE, name COLLATE NOCASE"
  const rows = db.prepare(sql).all(...params).map(withBill)
  res.json(rows)
})

// GET /api/guests/:id
router.get('/:id', (req, res) => {
  const g = getGuest(req.params.id)
  if (!g) return res.status(404).json({ error: 'Guest not found' })
  res.json(g)
})

// POST /api/guests
router.post('/', (req, res) => {
  const { out, errors } = parseGuestBody(req.body || {})
  if (errors.length) return badRequest(res, errors.join(' '))
  const roomErr = checkRoomFree(out.room_no)
  if (roomErr) return res.status(409).json({ error: roomErr })
  const status = out.checkout_at ? 'checked-out' : 'checked-in'
  const info = db
    .prepare(`
      INSERT INTO guests
        (name, room_no, no_of_persons, checkin_at, checkout_at, status,
         rent_paid, last_bill_amount, gst_included, gst_rate,
         bill_due_manual, bill_due_note)
      VALUES
        (@name, @room_no, @no_of_persons, @checkin_at, @checkout_at, @status,
         @rent_paid, @last_bill_amount, @gst_included, @gst_rate,
         @bill_due_manual, @bill_due_note)
    `)
    .run({
      name: out.name,
      room_no: out.room_no,
      no_of_persons: out.no_of_persons,
      checkin_at: out.checkin_at,
      checkout_at: out.checkout_at || null,
      status,
      rent_paid: out.rent_paid ?? 0,
      last_bill_amount: out.last_bill_amount ?? 0,
      gst_included: out.gst_included ?? 1,
      gst_rate: out.gst_rate ?? 5,
      bill_due_manual: out.bill_due_manual ?? null,
      bill_due_note: out.bill_due_note ?? null,
    })
  res.status(201).json(getGuest(info.lastInsertRowid))
})

// PUT /api/guests/:id
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM guests WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'Guest not found' })
  const { out, errors } = parseGuestBody(req.body || {})
  if (errors.length) return badRequest(res, errors.join(' '))
  const room = out.room_no ?? existing.room_no
  const roomErr = checkRoomFree(room, existing.id)
  if (roomErr) return res.status(409).json({ error: roomErr })
  const next = { ...existing, ...out }
  const status = next.checkout_at ? 'checked-out' : 'checked-in'
  db.prepare(
    `
    UPDATE guests SET
      name = @name, room_no = @room_no, no_of_persons = @no_of_persons,
      checkin_at = @checkin_at, checkout_at = @checkout_at, status = @status,
      rent_paid = @rent_paid, last_bill_amount = @last_bill_amount,
      gst_included = @gst_included, gst_rate = @gst_rate,
      bill_due_manual = @bill_due_manual, bill_due_note = @bill_due_note,
      updated_at = datetime('now')
    WHERE id = @id
    `
  ).run({ ...next, status, id: existing.id, checkout_at: next.checkout_at || null })
  res.json(getGuest(existing.id))
})

function localNow() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// PATCH /api/guests/:id/checkout
router.patch('/:id/checkout', (req, res) => {
  const g = getGuest(req.params.id)
  if (!g) return res.status(404).json({ error: 'Guest not found' })
  const now = req.body?.checkout_at || localNow()
  db.prepare("UPDATE guests SET checkout_at = ?, status = 'checked-out', updated_at = datetime('now') WHERE id = ?")
    .run(now, g.id)
  res.json(getGuest(g.id))
})

// DELETE /api/guests/:id
router.delete('/:id', (req, res) => {
  const g = getGuest(req.params.id)
  if (!g) return res.status(404).json({ error: 'Guest not found' })
  db.prepare('DELETE FROM guests WHERE id = ?').run(g.id)
  try {
    fs.rmSync(path.join(uploadsDir, String(g.id)), { recursive: true, force: true })
  } catch {
    /* ignore leftover files */
  }
  res.status(204).end()
})

// POST /api/guests/:id/photos/:kind   body: { dataUrl: "data:image/jpeg;base64,..." }
router.post('/:id/photos/:kind', (req, res) => {
  const g = getGuest(req.params.id)
  if (!g) return res.status(404).json({ error: 'Guest not found' })
  const kind = req.params.kind
  const file = PHOTO_KINDS[kind]
  if (!file) return badRequest(res, 'Photo kind must be "face" or "id"')
  const dataUrl = req.body?.dataUrl
  if (typeof dataUrl !== 'string' || !/^data:image\/(jpeg|jpg|png);base64,/.test(dataUrl)) {
    return badRequest(res, 'Expected a base64 JPEG/PNG data URL in "dataUrl"')
  }
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64')
  if (bytes.length > 8 * 1024 * 1024) return badRequest(res, 'Photo is larger than 8 MB')
  const dir = path.join(uploadsDir, String(g.id))
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, file), bytes)
  const col = kind === 'face' ? 'face_photo' : 'id_photo'
  db.prepare(`UPDATE guests SET ${col} = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(`${g.id}/${file}`, g.id)
  res.json(getGuest(g.id))
})

export default router
