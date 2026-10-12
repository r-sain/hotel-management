import { paiseToINRShort } from '../lib/money.js';

// Compact bill-due indicator. Negative = advance paid (shows green "advance").
export default function BillDue({ guest }) {
  const status = guest.bill_status || 'due';
  const due = guest.bill_due;

  if (status === 'paid') {
    return <span className="badge badge-clear">Paid</span>;
  }

  if (due > 0) {
    return (
      <span className="badge badge-due" title={guest.bill_due_note || ''}>
        Due {paiseToINRShort(due)}
      </span>
    );
  }
  if (due < 0) {
    return (
      <span className="badge badge-advance">
        Advance {paiseToINRShort(-due)}
      </span>
    );
  }
  return <span className="badge badge-clear">Cleared</span>;
}
