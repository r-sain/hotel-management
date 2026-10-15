import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, photoUrl } from '../lib/api.js';
import { paiseToINR, paiseToRupeeString, rupeesToPaise } from '../lib/money.js';
import {
  formatDateTime,
  duration,
  nowLocal,
  stayNights,
} from '../lib/datetime.js';
import { computeBreakdown } from '../components/BillBreakdown.jsx';
import StatusBadge from '../components/StatusBadge.jsx';

export default function BillInvoice() {
  const { id } = useParams();
  const [guest, setGuest] = useState(null);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable bill fields (kept as rupee strings, like GuestForm).
  const [form, setForm] = useState({
    rent_paid: '',
    rate_per_night: '',
    last_bill_amount: '',
    gst_included: true,
    gst_rate: '5',
    bill_due_manual: '',
    bill_due_note: '',
    bill_status: 'due',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const g = await api.getGuest(id);
        if (cancelled) return;
        setGuest(g);
        const gstRate = Number(g.gst_rate) || 0;
        setForm({
          rent_paid: paiseToRupeeString(g.rent_paid),
          rate_per_night: paiseToRupeeString(g.rate_per_night),
          last_bill_amount: paiseToRupeeString(g.last_bill_amount),
          gst_included: Boolean(g.gst_included),
          gst_rate: String(gstRate || 5),
          bill_due_manual:
            g.bill_due_manual != null
              ? paiseToRupeeString(g.bill_due_manual)
              : '',
          bill_due_note: g.bill_due_note || '',
          bill_status: g.bill_status === 'paid' ? 'paid' : 'due',
        });
      } catch (e) {
        if (!cancelled) {
          setNotFound(e.status === 404);
          setError(e.message);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
  }, [form]);

  const nights = stayNights(guest?.checkin_at, guest?.checkout_at);
  const set = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const setNightlyRate = e => {
    const value = e.target.value;
    const rate = rupeesToPaise(value);
    setForm(f => ({
      ...f,
      rate_per_night: value,
      ...(rate === null
        ? {}
        : { last_bill_amount: paiseToRupeeString(rate * nights) }),
    }));
  };

  const save = async e => {
    e.preventDefault();
    if (!guest) return;
    setError('');
    setSaving(true);
    setSaved(false);
    try {
      const enteredAmount = rupeesToPaise(form.last_bill_amount) ?? 0;

      // Send the full guest body (PUT requires the identity fields), with the
      // edited bill values. Money is sent in rupees; the API converts to paise.
      const body = {
        name: guest.name,
        room_no: guest.room_no,
        no_of_persons: guest.no_of_persons,
        checkin_at: guest.checkin_at,
        checkout_at: guest.checkout_at,
        rent_paid: breakdown.paid / 100,
        rate_per_night:
          rupeesToPaise(form.rate_per_night) === null
            ? null
            : rupeesToPaise(form.rate_per_night) / 100,
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
      const updated = await api.updateGuest(id, body);
      setGuest(updated);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (error)
    return (
      <div className="page">
        <div className="alert alert-error">{error}</div>
        {notFound && (
          <Link to="/" className="btn btn-ghost">
            ← Back to register
          </Link>
        )}
      </div>
    );

  if (!guest)
    return (
      <div className="page">
        <p className="muted loading">Loading…</p>
      </div>
    );

  const face = photoUrl(guest, 'face') || photoUrl(guest, 'id');
  const printDate = formatDateTime(nowLocal());

  return (
    <div className="page page-narrow bill-page">
      {/* Toolbar */}
      <div className="page-head bill-toolbar">
        <h1>Bill &amp; invoice</h1>
        <div className="page-head-actions">
          <Link to={`/guests/${guest.id}`} className="btn btn-ghost">
            ← Back
          </Link>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => window.print()}
          >
            Print / Save as PDF
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {saved && <div className="alert bill-saved">Bill saved.</div>}

      <div className="bill-layout">
        {/* Editor */}
        <form className="card form-card bill-editor" onSubmit={save}>
          <section className="form-section">
            <h2>Guest</h2>
            <dl className="detail-facts">
              <dt>Name</dt>
              <dd>{guest.name}</dd>
              <dt>Room</dt>
              <dd>{guest.room_no}</dd>
              <dt>Persons</dt>
              <dd>{guest.no_of_persons}</dd>
              <dt>Check-in</dt>
              <dd>{formatDateTime(guest.checkin_at)}</dd>
              <dt>Check-out</dt>
              <dd>{formatDateTime(guest.checkout_at)}</dd>
              <dt>Status</dt>
              <dd>
                <StatusBadge status={guest.status} />
              </dd>
            </dl>
          </section>

          <section className="form-section">
            <h2>Bill &amp; GST</h2>
            <div className="form-grid">
              <label className="field">
                <span className="field-label">Rate per night (₹)</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.rate_per_night}
                  onChange={setNightlyRate}
                  onWheel={e => e.target.blur()}
                  placeholder="e.g. 500"
                />
                <span className="muted small">
                  {nights} {nights === 1 ? 'night' : 'nights'}
                  {rupeesToPaise(form.rate_per_night) !== null &&
                    ` × ${paiseToINR(rupeesToPaise(form.rate_per_night))} = ${paiseToINR(rupeesToPaise(form.rate_per_night) * nights)} before GST`}
                </span>
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
              <label className="field">
                <span className="field-label">Note</span>
                <input
                  className="input"
                  value={form.bill_due_note}
                  onChange={set('bill_due_note')}
                  placeholder="e.g. part payment, advance paid, etc."
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
                        setForm(f => ({
                          ...f,
                          gst_included: !e.target.checked,
                        }))
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
          </section>

          <div className="form-footer">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save bill'}
            </button>
          </div>
        </form>

        {/* Printable invoice */}
        <section
          id="bill-invoice"
          className="bill-invoice"
          aria-label="Invoice"
        >
          <div className="invoice-head">
            <div className="invoice-brand">
              <img
                src="/logo.svg"
                alt="Shalimar Lodge logo"
                className="invoice-brand-logo"
              />
            </div>
            <div className="invoice-doc">
              <span className="invoice-doc-title">Bill / Tax Invoice</span>
              <span className="invoice-doc-meta">
                <div>
                  <span>Bill No.</span> #{guest.id}
                </div>
                <div>
                  <span>Date</span> {printDate}
                </div>
              </span>
            </div>
          </div>

          <div className="invoice-billedto">
            <div className="invoice-party">
              <span className="invoice-party-label">Billed to</span>
              <strong>{guest.name}</strong>
              <div className="invoice-party-meta">
                <span>Room {guest.room_no}</span>
                {guest.phone && (
                  <a href={`tel:${guest.phone}`}>{guest.phone}</a>
                )}
                <span>·</span>
                <span>
                  {guest.no_of_persons}{' '}
                  {guest.no_of_persons === 1 ? 'person' : 'persons'}
                </span>
              </div>
            </div>
            <dl className="invoice-stay">
              <div>
                <dt>Check-in</dt>
                <dd>{formatDateTime(guest.checkin_at)}</dd>
              </div>
              <div>
                <dt>Check-out</dt>
                <dd>{formatDateTime(guest.checkout_at)}</dd>
              </div>
              <div>
                <dt>Stay</dt>
                <dd>
                  {duration(
                    guest.checkin_at,
                    guest.checkout_at || new Date().toISOString(),
                  ) || '—'}
                </dd>
              </div>
              <div>
                <dt>Nights</dt>
                <dd>{nights}</dd>
              </div>
              {rupeesToPaise(form.rate_per_night) !== null && (
                <div>
                  <dt>Rate / night</dt>
                  <dd>
                    {paiseToINR(rupeesToPaise(form.rate_per_night))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {face &&
            (face.startsWith('data:application/pdf') ? (
              <a
                href={face}
                target="_blank"
                rel="noreferrer"
                className="invoice-photo invoice-photo-file"
              >
                Open guest photo and ID document
              </a>
            ) : (
              <div className="invoice-photo">
                <img src={face} alt={`Customer photo of ${guest.name}`} />
                <span>Guest</span>
              </div>
            ))}

          <table className="invoice-lines">
            <tbody>
              <tr>
                <td>Base amount</td>
                <td>{paiseToINR(breakdown.base)}</td>
              </tr>
              <tr className="invoice-tax-row">
                <td>SGST @ {(form.gst_included ? 5 : 0) / 2}%</td>
                <td>{paiseToINR(breakdown.sgst)}</td>
              </tr>
              <tr className="invoice-tax-row">
                <td>CGST @ {(form.gst_included ? 5 : 0) / 2}%</td>
                <td>{paiseToINR(breakdown.cgst)}</td>
              </tr>
              <tr>
                <td>Bill total</td>
                <td>{paiseToINR(breakdown.total)}</td>
              </tr>
              <tr>
                <td>Balance due</td>
                <td>{paiseToINR(Math.max(breakdown.due, 0))}</td>
              </tr>
            </tbody>
          </table>

          <div
            className={`invoice-due ${
              breakdown.due > 0
                ? 'due-positive'
                : breakdown.due < 0
                  ? 'due-negative'
                  : 'due-zero'
            }`}
          >
            <span>
              {breakdown.due < 0
                ? 'Advance paid'
                : breakdown.due > 0
                  ? 'Balance due'
                  : 'Balance'}
              {breakdown.dueSource === 'manual' ? ' (manual)' : ''}
            </span>
            <strong>
              {breakdown.due < 0
                ? paiseToINR(-breakdown.due)
                : paiseToINR(breakdown.due)}
            </strong>
          </div>

          {form.bill_due_note.trim() && (
            <div className="invoice-note">
              <span>Note</span>
              {form.bill_due_note.trim()}
            </div>
          )}

          <div className="invoice-foot">
            <div className="invoice-sign">
              <span>Authorised signature</span>
            </div>
            <div className="invoice-thanks">Thank you for your stay.</div>
          </div>
        </section>
      </div>
    </div>
  );
}
