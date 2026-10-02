import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const rootDir = path.resolve(__dirname, '..')
const dataDir = path.join(rootDir, 'data')
const uploadsDir = path.join(rootDir, 'uploads')

fs.mkdirSync(dataDir, { recursive: true })
fs.mkdirSync(uploadsDir, { recursive: true })

export const db = new Database(path.join(dataDir, 'shalimar.db'))
db.pragma('journal_mode = WAL')

db.exec(`
CREATE TABLE IF NOT EXISTS guests (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  name              TEXT NOT NULL,
  room_no           TEXT NOT NULL,
  no_of_persons     INTEGER NOT NULL DEFAULT 1,
  checkin_at        TEXT NOT NULL,
  checkout_at       TEXT,
  status            TEXT NOT NULL DEFAULT 'checked-in',
  rent_paid         INTEGER NOT NULL DEFAULT 0,      -- paise
  last_bill_amount  INTEGER NOT NULL DEFAULT 0,      -- paise
  gst_included      INTEGER NOT NULL DEFAULT 1,
  gst_rate          REAL NOT NULL DEFAULT 5,
  bill_due_manual   INTEGER,
  bill_due_note     TEXT,
  face_photo        TEXT,
  id_photo          TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
`)

// ---------- Seed 5 dummy guests on first run ----------
const { n } = db.prepare('SELECT COUNT(*) AS n FROM guests').get()
if (n === 0) {
  const insert = db.prepare(`
    INSERT INTO guests
      (name, room_no, no_of_persons, checkin_at, checkout_at, status,
       rent_paid, last_bill_amount, gst_included, gst_rate, bill_due_manual)
    VALUES
      (@name, @room_no, @no_of_persons, @checkin_at, @checkout_at, @status,
       @rent_paid, @last_bill_amount, @gst_included, @gst_rate, @bill_due_manual)
  `)
  db.transaction((rows) => rows.forEach((r) => insert.run(r)))([
    {
      name: 'Ramesh Kumar', room_no: '101', no_of_persons: 2,
      checkin_at: '2026-09-28T11:30', checkout_at: null, status: 'checked-in',
      rent_paid: 200000, last_bill_amount: 360000, gst_included: 1, gst_rate: 5,
      bill_due_manual: null,
    },
    {
      name: 'Priya Sharma', room_no: '102', no_of_persons: 1,
      checkin_at: '2026-09-29T14:00', checkout_at: null, status: 'checked-in',
      rent_paid: 100000, last_bill_amount: 120000, gst_included: 0, gst_rate: 5,
      bill_due_manual: null,
    },
    {
      name: 'Amit Patel', room_no: '201', no_of_persons: 3,
      checkin_at: '2026-09-25T10:15', checkout_at: null, status: 'checked-in',
      rent_paid: 500000, last_bill_amount: 480000, gst_included: 1, gst_rate: 5,
      bill_due_manual: null,
    },
    {
      name: 'Sunita Devi', room_no: '103', no_of_persons: 2,
      checkin_at: '2026-09-30T09:00', checkout_at: null, status: 'checked-in',
      rent_paid: 0, last_bill_amount: 150000, gst_included: 1, gst_rate: 5,
      bill_due_manual: null,
    },
    {
      name: 'Vikram Singh', room_no: '202', no_of_persons: 1,
      checkin_at: '2026-09-20T12:00', checkout_at: '2026-09-27T11:00',
      status: 'checked-out',
      rent_paid: 720000, last_bill_amount: 720000, gst_included: 1, gst_rate: 5,
      bill_due_manual: null,
    },
  ])
  console.log('Seeded 5 dummy guests')
}
