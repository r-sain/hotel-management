import { paiseToINR } from '../lib/money.js';

// Live GST + bill-due breakdown.
// `bill` = { amount (paise, as entered), gstIncluded (bool), gstRate (%),
//            rentPaid (paise), manualDue (paise|null) }
export function computeBreakdown({
  amount = 0,
  gstIncluded,
  gstRate = 0,
  rentPaid = 0,
  manualDue = null,
}) {
  let base;
  let total;
  if (gstIncluded) {
    total = amount;
    base = Math.round(total / (1 + (gstRate || 0) / 100));
  } else {
    base = amount;
    total = Math.round(base * (1 + (gstRate || 0) / 100));
  }
  const autoDue = total - rentPaid;
  return {
    base,
    gst: total - base,
    total,
    autoDue,
    due: manualDue !== null && manualDue !== undefined ? manualDue : autoDue,
    dueSource:
      manualDue !== null && manualDue !== undefined ? 'manual' : 'auto',
  };
}

export default function BillBreakdown({ bill, showDue = true }) {
  const d = computeBreakdown(bill);
  return (
    <div className="breakdown">
      <div className="breakdown-title">
        Bill breakdown{' '}
        {bill.gstIncluded
          ? '(entered with GST)'
          : '(entered without GST — GST added)'}
      </div>
      <dl className="breakdown-grid">
        <dt>Base amount</dt>
        <dd>{paiseToINR(d.base)}</dd>
        <dt>GST @ {bill.gstRate}%</dt>
        <dd>{paiseToINR(d.gst)}</dd>
        <dt>Bill total</dt>
        <dd className="strong">{paiseToINR(d.total)}</dd>
        <dt>Bill paid</dt>
        <dd>{paiseToINR(bill.rentPaid)}</dd>
      </dl>
      {showDue && (
        <div
          className={`due-line ${d.due > 0 ? 'due-positive' : d.due < 0 ? 'due-negative' : 'due-zero'}`}
        >
          <span>Bill due{d.dueSource === 'manual' ? ' (manual)' : ''}</span>
          <strong>
            {d.due < 0 ? `Advance ${paiseToINR(-d.due)}` : paiseToINR(d.due)}
          </strong>
        </div>
      )}
    </div>
  );
}
