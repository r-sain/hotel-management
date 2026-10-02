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
          setForm({
            name: g.name,
            room_no: g.room_no,
            no_of_persons: String(g.no_of_persons),
            checkin_at: g.checkin_at,
            checkout_at: g.checkout_at || '',
            rent_paid: paiseToRupeeString(g.rent_paid),
            last_bill_amount: paiseToRupeeString(g.last_bill_amount),
            gst_included: Boolean(g.gst_included),
            gst_rate: String(g.gst_rate),
            bill_due_manual:
              g.bill_due_manual != null
                ? paiseToRupeeString(g.bill_due_manual)
                : '',
            bill_due_note: g.bill_due_note || '',
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

  const breakdown = useMemo(
    () =>
      computeBreakdown({
        amount: rupeesToPaise(form.last_bill_amount) ?? 0,
        gstIncluded: form.gst_included,
        gstRate: Number(form.gst_rate) || 0,
        rentPaid: rupeesToPaise(form.rent_paid) ?? 0,
        manualDue:
          form.bill_due_manual.trim() === ''
            ? null
            : rupeesToPaise(form.bill_due_manual),
      }),
    [
      form.last_bill_amount,
      form.gst_included,
      form.gst_rate,
      form.rent_paid,
      form.bill_due_manual,
    ],
  );

  const save = async e => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        room_no: form.room_no.trim(),
        no_of_persons: Number(form.no_of_persons),
        checkin_at: form.checkin_at,
        checkout_at: form.checkout_at || null,
        rent_paid: (rupeesToPaise(form.rent_paid) ?? 0) / 100,
        last_bill_amount: (rupeesToPaise(form.last_bill_amount) ?? 0) / 100,
        gst_included: form.gst_included,
        gst_rate: Number(form.gst_rate) || 0,
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
              <span className="field-label">Bill paid (₹)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.rent_paid}
                onChange={set('rent_paid')}
                placeholder="0"
              />
            </label>
            <label className="field">
              <span className="field-label">Bill amount (₹)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.last_bill_amount}
                onChange={set('last_bill_amount')}
                placeholder="0"
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
                    Entered <strong>with GST</strong>
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
            <label className="field">
              <span className="field-label">GST rate (%)</span>
              <input
                className="input"
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={form.gst_rate}
                onChange={set('gst_rate')}
              />
            </label>
          </div>

          <div className="breakdown-box">
            <BillBreakdown
              bill={{
                amount: rupeesToPaise(form.last_bill_amount) ?? 0,
                gstIncluded: form.gst_included,
                gstRate: Number(form.gst_rate) || 0,
                rentPaid: rupeesToPaise(form.rent_paid) ?? 0,
                manualDue:
                  form.bill_due_manual.trim() === ''
                    ? null
                    : rupeesToPaise(form.bill_due_manual),
              }}
              showDue
            />
          </div>

          <div className="form-grid">
            <label className="field">
              <span className="field-label">
                Manual bill due (₹) — optional override
              </span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.bill_due_manual}
                onChange={set('bill_due_manual')}
                placeholder={`Auto: ${breakdown.due >= 0 ? '' : ''}${(breakdown.autoDue / 100).toLocaleString('en-IN')}`}
              />
            </label>
            <label className="field">
              <span className="field-label">Note</span>
              <input
                className="input"
                value={form.bill_due_note}
                onChange={set('bill_due_note')}
                placeholder="e.g. part payment promised on Saturday"
              />
            </label>
          </div>
        </section>

        {/* Photos */}
        <section className="form-section">
          <h2>Photos</h2>
          <div className="photo-grid">
            <PhotoField
              label="Customer photo (webcam)"
              allowCamera
              allowUpload={false}
              value={form.facePhoto}
              savedUrl={existing ? photoUrl(existing, 'face') : null}
              onChange={v => setForm(f => ({ ...f, facePhoto: v }))}
            />
            <PhotoField
              label="ID proof photo"
              allowCamera
              allowUpload
              value={form.idPhoto}
              savedUrl={existing ? photoUrl(existing, 'id') : null}
              onChange={v => setForm(f => ({ ...f, idPhoto: v }))}
            />
          </div>
          <p className="muted small">
            The camera needs a secure context — it works on{' '}
            <code>localhost</code> or over HTTPS.
          </p>
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
