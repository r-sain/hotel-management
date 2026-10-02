import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import './db.js'
import guestsRouter from './routes/guests.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const PORT = process.env.PORT || 3001

const app = express()
app.use(express.json({ limit: '12mb' }))

// API
app.use('/api/guests', guestsRouter)

// Photos
app.use('/uploads', express.static(path.join(rootDir, 'uploads')))

// Built frontend (production). In dev, Vite serves the UI and proxies /api + /uploads.
const distDir = path.join(rootDir, 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get(/^(?!\/(api|uploads)\/).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`Shalimar API server running at http://localhost:${PORT}`)
})
