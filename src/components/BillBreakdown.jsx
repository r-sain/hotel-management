import { paiseToINR } from '../lib/money.js';

// Live GST + bill-due breakdown.
// `bill` = { amount (paise, as entered), gstIncluded (bool), gstRate (%),
//            manualDue (paise|null), billStatus }
export function computeBreakdown({
  amount = 0,
  gstIncluded,
  gstRate = 0,
  manualDue = null,
  billStatus = 'due',
}) {
  const base = amount;
  const total = gstIncluded
    ? Math.round(base * (1 + (gstRate || 0) / 100))
    : base;
  const gst = total - base;
  const sgst = Math.round(gst / 2);
  const hasManualDue = manualDue !== null && manualDue !== undefined;
  const due =
    billStatus === 'paid'
      ? 0
      : hasManualDue
        ? Math.min(total, Math.max(0, manualDue))
        : total;
  const paid = total - due;
  return {
    base,
    gst,
    sgst,
    cgst: gst - sgst,
    total,
    paid,
    due,
    dueSource:
      billStatus === 'paid'
        ? 'paid'
        : manualDue !== null && manualDue !== undefined
          ? 'manual'
          : 'auto',
  };
}

export default function BillBreakdown({ bill, showDue = true }) {
  const d = computeBreakdown({
    ...bill,
    billStatus: bill.billStatus || bill.bill_status || 'due',
  });
  const paidMode = (bill.billStatus || bill.bill_status || 'due') === 'paid';

  return (
    <div className="breakdown">
      <div className="breakdown-title">
        Bill breakdown{' '}
        {bill.gstIncluded ? '(entered with GST)' : '(entered without GST)'}
      </div>
      <dl className="breakdown-grid">
        <dt>Base amount</dt>
        <dd>{paiseToINR(d.base)}</dd>
        <div className="breakdown-tax-rows">
          <div>
            <span>SGST @ {(bill.gstRate / 2).toFixed(1)}%</span>
            <strong>{paiseToINR(d.sgst)}</strong>
          </div>
          <div>
            <span>CGST @ {(bill.gstRate / 2).toFixed(1)}%</span>
            <strong>{paiseToINR(d.cgst)}</strong>
          </div>
        </div>
        <dt>Bill total</dt>
        <dd className="strong">{paiseToINR(d.total)}</dd>
        <dt>Bill paid</dt>
        <dd>{paiseToINR(d.paid)}</dd>
      </dl>
      {showDue && (
        <div
          className={`due-line ${d.due > 0 ? 'due-positive' : d.due < 0 ? 'due-negative' : 'due-zero'}`}
        >
          <span>
            {paidMode
              ? 'Bill status'
              : `Bill due${d.dueSource === 'manual' ? ' (manual)' : ''}`}
          </span>
          <strong>
            {paidMode
              ? 'Paid'
              : d.due < 0
                ? `Advance ${paiseToINR(-d.due)}`
                : paiseToINR(d.due)}
          </strong>
        </div>
      )}
    </div>
  );
}
