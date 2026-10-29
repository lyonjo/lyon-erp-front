/** Consistent billed rental-day calculation, including allowed extra hours. */
export function billableRentalDays(startDate, startTime, endDate, endTime, additionalHours = 0) {
  if (!startDate || !startTime || !endDate || !endTime) return 0
  const start = new Date(`${String(startDate).slice(0, 10)}T${String(startTime).slice(0, 5)}`)
  const end = new Date(`${String(endDate).slice(0, 10)}T${String(endTime).slice(0, 5)}`)
  const seconds = Math.round((end.getTime() - start.getTime()) / 1000)
  if (!Number.isFinite(seconds) || seconds <= 0) return 0
  const allowed = Math.min(24, Math.max(0, Number(additionalHours) || 0))
  const days = Math.floor(seconds / 86400)
  const remainder = seconds % 86400
  return Math.max(1, days + (remainder > allowed * 3600 ? 1 : 0))
}
