import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api, photoUrl } from '../lib/api.js';
import { paiseToRupeeString, rupeesToPaise } from '../lib/money.js';
import { nowLocal } from '../lib/datetime.js';
import PhotoField from '../components/PhotoField.jsx';
import BillBreakdown, {
  computeBreakdown,
} from '../components/BillBreakdown.jsx';

const emptyForm = () => ({
  name: '',
  phone: '',
  room_no: '',
  no_of_persons: '1',
  checkin_at: nowLocal(),
  checkout_at: '',
  rent_paid: '',
  last_bill_amount: '',
  gst_included: true,
  gst_rate: '5',
  bill_due_manual: '',
  bill_due_note: '',
  bill_status: 'due',
  facePhoto: null, // unsaved data URL
  idPhoto: null,
});

export default function GuestForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [occupiedRooms, setOccupiedRooms] = useState([]);
  const [existing, setExisting] = useState(null);

  // Load the guest (edit mode) + occupied rooms once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const inHouse = await api.listGuests({ status: 'checked-in' });
        if (cancelled) return;
        setOccupiedRooms(inHouse.map(g => ({ id: g.id, room: g.room_no })));
        if (isEdit) {
          const g = await api.getGuest(id);
          if (cancelled) return;
          setExisting(g);
          const gstRate = Number(g.gst_rate) || 0;
          setForm({
            name: g.name,
            phone: g.phone || '',
            room_no: g.room_no,
            no_of_persons: String(g.no_of_persons),
            checkin_at: g.checkin_at,
            checkout_at: g.checkout_at || '',
            rent_paid: paiseToRupeeString(g.rent_paid),
            last_bill_amount: paiseToRupeeString(g.last_bill_amount),
            gst_included: Boolean(g.gst_included),
            gst_rate: String(gstRate || 5),
            bill_due_manual:
              g.bill_due_manual != null
                ? paiseToRupeeString(g.bill_due_manual)
                : '',
            bill_due_note: g.bill_due_note || '',
            bill_status: g.bill_status === 'paid' ? 'paid' : 'due',
            facePhoto: null,
            idPhoto: null,
          });
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));

  const roomConflict = useMemo(() => {
    const room = form.room_no.trim().toUpperCase();
    if (!room) return null;
    return occupiedRooms.find(
      r => r.room.toUpperCase() === room && r.id !== Number(id),
    );
  }, [form.room_no, occupiedRooms, id]);

  const breakdown = useMemo(() => {
    const enteredAmount = rupeesToPaise(form.last_bill_amount) ?? 0;
    const totalAmount = Math.round(
      enteredAmount * (form.gst_included ? 1.05 : 1),
    );

    return computeBreakdown({
      amount: enteredAmount,
      gstIncluded: form.gst_included,
      gstRate: form.gst_included ? 5 : 0,
      rentPaid:
        form.bill_status === 'paid'
          ? totalAmount
          : (rupeesToPaise(form.rent_paid) ?? 0),
      manualDue:
        form.bill_due_manual.trim() === ''
          ? null
          : rupeesToPaise(form.bill_due_manual),
      billStatus: form.bill_status,
    });
  }, [
    form.last_bill_amount,
    form.gst_included,
    form.rent_paid,
    form.bill_due_manual,
    form.bill_status,
  ]);

  const save = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const enteredAmount = rupeesToPaise(form.last_bill_amount) ?? 0;
      const body = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        room_no: form.room_no.trim(),
        no_of_persons: Number(form.no_of_persons),
        checkin_at: form.checkin_at,
        checkout_at: form.checkout_at || null,
        rent_paid: breakdown.paid / 100,
        last_bill_amount: enteredAmount / 100,
        gst_included: form.gst_included,
        gst_rate: form.gst_included ? 5 : 0,
        bill_status: form.bill_status,
        bill_due_manual:
          form.bill_due_manual.trim() === ''
            ? null
            : rupeesToPaise(form.bill_due_manual) / 100,
        bill_due_note: form.bill_due_note.trim() || null,
      };
      const guest = isEdit
        ? await api.updateGuest(id, body)
        : await api.createGuest(body);
      if (form.facePhoto)
        await api.uploadPhoto(guest.id, 'face', form.facePhoto);
      if (form.idPhoto) await api.uploadPhoto(guest.id, 'id', form.idPhoto);
      navigate(`/guests/${guest.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page page-narrow">
      <div className="page-head">
        <h1>{isEdit ? `Edit guest — ${existing?.name || ''}` : 'New guest'}</h1>
        <Link to={isEdit ? `/guests/${id}` : '/'} className="btn btn-ghost">
          ← Back
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card form-card" onSubmit={save}>
        {/* Identity */}
        <section className="form-section">
          <h2>Guest details</h2>
          <div className="form-grid">
            <label className="field field-span-2">
              <span className="field-label">Full name *</span>
              <input
                className="input"
                value={form.name}
                onChange={set('name')}
                placeholder="Guest name"
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Phone number</span>
              <input
                className="input"
                type="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="e.g. +91 98765 43210"
              />
            </label>
            <label className="field">
              <span className="field-label">Room no. *</span>
              <input
                className="input"
                value={form.room_no}
                onChange={set('room_no')}
                placeholder="e.g. 104"
                required
              />
              {roomConflict && (
                <span className="field-warn">
                  ⚠ Room {roomConflict.room} is occupied by {roomConflict.name}
                </span>
              )}
            </label>
            <label className="field">
              <span className="field-label">No. of persons *</span>
              <input
                className="input"
                type="number"
                min="1"
                max="50"
                value={form.no_of_persons}
                onChange={set('no_of_persons')}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Check-in date &amp; time *</span>
              <input
                className="input"
                type="datetime-local"
                value={form.checkin_at}
                onChange={set('checkin_at')}
                required
              />
            </label>
            <label className="field">
              <span className="field-label">Check-out date &amp; time</span>
              <input
                className="input"
                type="datetime-local"
                value={form.checkout_at}
                onChange={set('checkout_at')}
              />
            </label>
          </div>
        </section>

        {/* Bill */}
        <section className="form-section">
          <h2>Bill &amp; GST</h2>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Bill amount (₹)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.last_bill_amount}
                onChange={set('last_bill_amount')}
                onWheel={e => e.target.blur()}
                placeholder="0"
              />
            </label>
            <label className="field">
              <span className="field-label">Bill due amount (₹)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.bill_due_manual}
                onChange={set('bill_due_manual')}
                onWheel={e => e.target.blur()}
                placeholder="Enter due amount"
                disabled={form.bill_status !== 'due'}
              />
            </label>
            <div className="field">
              <span className="field-label">Last bill</span>
              <div className="toggle-row">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.gst_included}
                    onChange={e =>
                      setForm(f => ({ ...f, gst_included: e.target.checked }))
                    }
                  />
                  <span>
                    <strong>With GST</strong>
                  </span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={!form.gst_included}
                    onChange={e =>
                      setForm(f => ({ ...f, gst_included: !e.target.checked }))
                    }
                  />
                  <span>
                    <strong>Without GST</strong>
                  </span>
                </label>
              </div>
            </div>

            <div className="field">
              <span className="field-label">Bill status</span>
              <div className="toggle-row">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.bill_status === 'due'}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        bill_status: e.target.checked ? 'due' : 'paid',
                      }))
                    }
                  />
                  <span>
                    <strong>Due</strong>
                  </span>
                </label>
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={form.bill_status === 'paid'}
                    onChange={e =>
                      setForm(f => ({
                        ...f,
                        bill_status: e.target.checked ? 'paid' : 'due',
                      }))
                    }
                  />
                  <span>
                    <strong>Paid</strong>
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="breakdown-box">
            <BillBreakdown
              bill={{
                amount: rupeesToPaise(form.last_bill_amount) ?? 0,
                gstIncluded: form.gst_included,
                gstRate: form.gst_included ? 5 : 0,
                rentPaid: rupeesToPaise(form.rent_paid) ?? 0,
                manualDue:
                  form.bill_due_manual.trim() === ''
                    ? null
                    : rupeesToPaise(form.bill_due_manual),
                billStatus: form.bill_status,
              }}
              showDue
            />
          </div>

          <div className="form-grid">
            <label className="field field-span-2">
              <span className="field-label">Note</span>
              <input
                className="input"
                value={form.bill_due_note}
                onChange={set('bill_due_note')}
                placeholder="e.g. part payment, advance paid, etc."
              />
            </label>
          </div>
        </section>

        {/* Documents */}
        <section className="form-section">
          <h2>Documents</h2>
          <div className="photo-grid">
            <PhotoField
              label="Customer photo"
              allowCamera={false}
              allowUpload
              value={form.facePhoto}
              savedUrl={existing ? photoUrl(existing, 'face') : null}
              onChange={v => setForm(f => ({ ...f, facePhoto: v }))}
            />
            <PhotoField
              label="ID proof document"
              allowCamera={false}
              allowUpload
              value={form.idPhoto}
              savedUrl={existing ? photoUrl(existing, 'id') : null}
              onChange={v => setForm(f => ({ ...f, idPhoto: v }))}
            />
          </div>
          <p className="muted small">Upload PDF documents only.</p>
        </section>

        <div className="form-footer">
          <Link to={isEdit ? `/guests/${id}` : '/'} className="btn btn-ghost">
            Cancel
          </Link>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Check in guest'}
          </button>
        </div>
      </form>
    </div>
  );
}
