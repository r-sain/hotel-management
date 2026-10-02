# Shalimar — Hotel Management

A guest-register app for a small hotel: check guests in/out, track room
occupancy, bill with GST, capture customer photos, and print a bill / invoice.

## Stack
- **Frontend:** React 19 + Vite, react-router-dom
- **Backend:** Express + better-sqlite3 (SQLite)
- **Photos:** stored under `uploads/<guestId>/`, served at `/uploads`

## Getting started
```bash
npm install
npm run dev
```
`dev` runs both the Vite frontend (port 5173) and the API server
(port 3001) together. Vite proxies `/api` and `/uploads` to the server.

The SQLite database lives in `data/shalimar.db` and is created on first run
(with 5 demo guests). Photos are written to `uploads/`.

## Scripts
- `npm run dev` — frontend + API together
- `npm run dev:server` — API only (port 3001)
- `npm run build` — build the frontend to `dist/`
- `npm start` — run the API server (serves `dist/` if present)
- `npm run lint` — ESLint

## Pages
- `/` — guest register (search, filters, stats)
- `/guests/new` — check in a new guest
- `/guests/:id` — guest detail (checkout, re-open, delete)
- `/guests/:id/edit` — edit a guest
- `/guests/:id/bill` — editable bill + printable invoice (PDF via browser print)

## Notes
- All money is stored as integers in **paise**; dates are local strings in
  `YYYY-MM-DDTHH:mm`.
- Default GST rate is **5%**, overridable per guest.
