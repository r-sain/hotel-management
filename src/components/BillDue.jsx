import { paiseToINRShort } from '../lib/money.js'

// Compact bill-due indicator. Negative = advance paid (shows green "advance").
export default function BillDue({ guest }) {
  const due = guest.bill_due
  if (due > 0) {
    return (
      <span className="badge badge-due" title={guest.bill_due_note || ''}>
        Due {paiseToINRShort(due)}
      </span>
    )
  }
  if (due < 0) {
    return <span className="badge badge-advance">Advance {paiseToINRShort(-due)}</span>
  }
  return <span className="badge badge-clear">Cleared</span>
}
