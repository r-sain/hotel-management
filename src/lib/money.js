// All money values are stored as integers in paise on the server.
// Helpers convert between paise and rupees for display / input.

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

export function paiseToINR(paise = 0) {
  return inr.format((paise || 0) / 100)
}

// Compact format for badges / dense tables (no trailing .00)
export function paiseToINRShort(paise = 0) {
  const v = (paise || 0) / 100
  return '₹' + (Number.isInteger(v) ? v.toLocaleString('en-IN') : v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
}

// Convert a rupee input string ("1500", "1,500.50") to paise integer, or null if invalid.
export function rupeesToPaise(input) {
  if (input === '' || input === null || input === undefined) return null
  const cleaned = String(input).replace(/[^0-9.]/g, '')
  if (!cleaned) return null
  const num = Number(cleaned)
  if (Number.isNaN(num) || num < 0) return null
  return Math.round(num * 100)
}

// Inverse: integer paise -> plain rupee string for inputs ("3600", "1500.5")
export function paiseToRupeeString(paise = 0) {
  if (!paise) return ''
  const v = paise / 100
  return Number.isInteger(v) ? String(v) : v.toFixed(2)
}
