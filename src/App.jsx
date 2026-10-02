import { Link, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard.jsx'
import GuestForm from './pages/GuestForm.jsx'
import GuestDetail from './pages/GuestDetail.jsx'
import BillInvoice from './pages/BillInvoice.jsx'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Link to="/" className="brand">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span className="brand-text">
            <strong>Shalimar</strong>
            <small>Hotel Management</small>
          </span>
        </Link>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/guests/new" element={<GuestForm />} />
          <Route path="/guests/:id" element={<GuestDetail />} />
          <Route path="/guests/:id/bill" element={<BillInvoice />} />
          <Route path="/guests/:id/edit" element={<GuestForm />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  )
}
