// Image value from the API -> usable URL
export const fileUrl = (v) => {
  if (!v) return ''
  if (typeof v === 'object') return v.url || ''
  return v
}

// "2026-10-14T00:00:00.000000Z" -> "2026-10-14" (what <input type="date"> needs)
export const toDate = (v) => (v ? String(v).slice(0, 10) : '')
