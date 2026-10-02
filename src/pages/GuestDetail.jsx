import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, photoUrl } from '../lib/api.js'
import { paiseToINR } from '../lib/money.js'
import { formatDateTime, duration } from '../lib/datetime.js'
import StatusBadge from '../components/StatusBadge.jsx'
import BillDue from '../components/BillDue.jsx'
import BillBreakdown from '../components/BillBreakdown.jsx'

export default function GuestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [guest, setGuest] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setError('')
      setGuest(await api.getGuest(id))
    } catch (e) {
      setError(e.message)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const act = async (fn) => {
    setBusy(true)
    try {
      setGuest(await fn())
    } catch (e) {
      alert(e.message)
    } finally {
      setBusy(false)
    }
  }

  const checkOut = () => {
    if (!confirm(`Check out ${guest.name} from room ${guest.room_no} right now?`)) return
    act(() => api.checkOut(id))
  }

  const reopen = () => {
    if (!confirm(`Re-open this booking? The check-out time will be cleared.`)) return
    act(() => api.reopen(id))
  }

  const remove = async () => {
    if (!confirm(`Delete ${guest.name}'s record? This cannot be undone.`)) return
    setBusy(true)
    try {
      await api.removeGuest(id)
      navigate('/')
    } catch (e) {
      alert(e.message)
      setBusy(false)
    }
  }

  if (error) return <div className="page"><div className="alert alert-error">{error}</div></div>
  if (!guest) return <div className="page"><p className="muted loading">Loading…</p></div>

  const face = photoUrl(guest, 'face')
  const idPhoto = photoUrl(guest, 'id')

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <h1>{guest.name}</h1>
        <div className="page-head-actions">
          <Link to={`/guests/${guest.id}/edit`} className="btn btn-ghost">Edit</Link>
          <Link to={`/guests/${guest.id}/bill`} className="btn btn-ghost">Bill / Invoice</Link>
          {guest.status === 'checked-in' ? (
            <button type="button" className="btn btn-primary" onClick={checkOut} disabled={busy}>
              Mark checked out
            </button>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={reopen} disabled={busy}>
              Re-open booking
            </button>
          )}
          <button type="button" className="btn btn-ghost btn-danger-text" onClick={remove} disabled={busy}>
            Delete
          </button>
        </div>
      </div>

      <div className="detail-grid">
        {/* Left: identity + photos */}
        <div className="card detail-identity">
          <div className="detail-headline">
            <div className="detail-room">{guest.room_no}</div>
            <div>
              <StatusBadge status={guest.status} />
              <div>
                <BillDue guest={guest} />
              </div>
            </div>
          </div>

          <dl className="detail-facts">
            <dt>Persons</dt>
            <dd>{guest.no_of_persons}</dd>
            <dt>Check-in</dt>
            <dd>{formatDateTime(guest.checkin_at)}</dd>
            <dt>Check-out</dt>
            <dd>{formatDateTime(guest.checkout_at)}</dd>
            <dt>Stay</dt>
            <dd>{duration(guest.checkin_at, guest.checkout_at || new Date().toISOString())}</dd>
          </dl>

          <div className="detail-photos">
            <figure>
              {face ? (
                <img src={face} alt="Customer" className="detail-photo" />
              ) : (
                <div className="detail-photo detail-photo-empty">No photo</div>
              )}
              <figcaption>Customer</figcaption>
            </figure>
            <figure>
              {idPhoto ? (
                <img src={idPhoto} alt="ID proof" className="detail-photo" />
              ) : (
                <div className="detail-photo detail-photo-empty">No photo</div>
              )}
              <figcaption>ID proof</figcaption>
            </figure>
          </div>
        </div>

        {/* Right: bill */}
        <div className="card detail-bill">
          <h2>Bill</h2>
          <BillBreakdown
            bill={{
              amount: guest.last_bill_amount,
              gstIncluded: Boolean(guest.gst_included),
              gstRate: guest.gst_rate,
              rentPaid: guest.rent_paid,
              manualDue: guest.bill_due_manual,
            }}
            showDue
          />
          {guest.bill_due_note && (
            <p className="bill-note">
              <strong>Note:</strong> {guest.bill_due_note}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
