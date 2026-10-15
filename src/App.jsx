import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import GuestForm from './pages/GuestForm.jsx';
import GuestDetail from './pages/GuestDetail.jsx';
import BillInvoice from './pages/BillInvoice.jsx';
import './App.css';

export default function App() {
  const isDashboard = useLocation().pathname === '/';

  return (
    <div className={`app${isDashboard ? ' app-dashboard' : ''}`}>
      <header className="app-header">
        <Link
          to="/"
          className="brand brand-stack"
          aria-label="Shalimar Lodge home"
        >
          <img
            src="/logopng.png"
            alt="Shalimar Lodge logo"
            className="brand-logo"
          />
          <span className="brand-text-wrap">
            <span className="brand-text brand-text-main">Shalimar</span>
            <span className="brand-text brand-text-sub">Hotel Management</span>
          </span>
        </Link>
      </header>
      <main className={`app-main${isDashboard ? ' dashboard-main' : ''}`}>
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
  );
}
