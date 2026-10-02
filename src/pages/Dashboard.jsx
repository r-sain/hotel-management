import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, photoUrl } from '../lib/api.js';
import { paiseToINR, paiseToINRShort } from '../lib/money.js';
import { formatDateTime, duration } from '../lib/datetime.js';
import StatusBadge from '../components/StatusBadge.jsx';
import BillDue from '../components/BillDue.jsx';

const FILTERS = [
  { key: '', label: 'All' },
  { key: 'checked-in', label: 'In-house' },
  { key: 'checked-out', label: 'Checked out' },
];

export default function Dashboard() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');

  const load = useCallback(
    async ({ showLoading = true } = {}) => {
      try {
        if (showLoading) setLoading(true);
        setError('');
        setGuests(await api.listGuests({ status: filter, search }));
      } catch (e) {
        setError(e.message);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [filter, search],
  );

  useEffect(() => {
    const t = setTimeout(load, 250); // debounce search typing
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(
      () => load({ showLoading: false }),
      15000,
    );
    return () => window.clearInterval(interval);
  }, [load]);

  const stats = useMemo(() => {
    const inHouse = guests.filter(g => g.status === 'checked-in');
    const dueTotal = inHouse.reduce(
      (sum, g) => sum + Math.max(0, g.bill_due),
      0,
    );
    return {
      inHouse: inHouse.length,
      rooms: new Set(inHouse.map(g => g.room_no)).size,
      dueTotal,
    };
  }, [guests]);

  return (
    <div className="page">
      <div className="page-head">
        <h1>Guest register</h1>
        <div className="page-head-actions">
          <input
            type="search"
            className="input search"
            placeholder="Search name or room…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Link to="/guests/new" className="btn btn-primary">
            + New guest
          </Link>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-value">{stats.inHouse}</span>
          <span className="stat-label">In-house guests</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{stats.rooms}</span>
          <span className="stat-label">Rooms occupied</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{paiseToINR(stats.dueTotal)}</span>
          <span className="stat-label">Total bill due</span>
        </div>
      </div>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button
            key={f.key}
            type="button"
            className={`tab ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {loading && <p className="muted loading">Loading…</p>}

      {!loading && guests.length === 0 && (
        <div className="empty-state">
          <p>No guests found.</p>
          <Link to="/guests/new" className="btn btn-primary">
            Add the first guest
          </Link>
        </div>
      )}

      {guests.length > 0 && (
        <div className="table-wrap">
          <table className="guest-table">
            <thead>
              <tr>
                <th>Guest</th>
                <th>Room</th>
                <th>Persons</th>
                <th>Check-in</th>
                <th>Check-out</th>
                <th>Stay</th>
                <th>Bill total</th>
                <th>Bill paid</th>
                <th>Status</th>
                <th>Due</th>
                <th aria-label="actions" />
              </tr>
            </thead>
            <tbody>
              {guests.map(g => (
                <tr key={g.id}>
                  <td>
                    <Link to={`/guests/${g.id}`} className="guest-link">
                      {g.face_photo ? (
                        <img
                          src={photoUrl(g, 'face')}
                          alt=""
                          className="avatar"
                        />
                      ) : (
                        <span className="avatar avatar-fallback">
                          {g.name.charAt(0)}
                        </span>
                      )}
                      <span>{g.name}</span>
                    </Link>
                  </td>
                  <td>
                    <span className="room-chip">{g.room_no}</span>
                  </td>
                  <td>{g.no_of_persons}</td>
                  <td>{formatDateTime(g.checkin_at)}</td>
                  <td>{formatDateTime(g.checkout_at)}</td>
                  <td>
                    {duration(
                      g.checkin_at,
                      g.checkout_at || new Date().toISOString(),
                    )}
                  </td>
                  <td>{paiseToINRShort(g.bill_total)}</td>
                  <td>{paiseToINRShort(g.rent_paid)}</td>
                  <td>
                    <StatusBadge status={g.status} />
                  </td>
                  <td>
                    <BillDue guest={g} />
                  </td>
                  <td>
                    <Link
                      to={`/guests/${g.id}`}
                      className="btn btn-ghost btn-sm"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
