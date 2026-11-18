function pad(value) {
  return String(value).padStart(2, '0')
}

function parseDate(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime())
  }
  if (typeof value === 'number') {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return null
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const parts = text.split('-').map(Number)
      const date = new Date(parts[0], parts[1] - 1, parts[2])
      if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return null
      return date
    }
    const date = new Date(text)
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

function toDate(value) {
  return parseDate(value) || new Date()
}

function isValidDate(value) {
  return Boolean(parseDate(value))
}

function isFutureDate(value, reference) {
  const date = parseDate(value)
  if (!date) return false
  const base = toDate(reference || new Date())
  date.setHours(0, 0, 0, 0)
  base.setHours(0, 0, 0, 0)
  return date.getTime() > base.getTime()
}

function dateString(value) {
  const date = toDate(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function monthKey(value) {
  const date = toDate(value)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

function monthLabel(value) {
  const date = toDate(value)
  return `${date.getFullYear()}年${date.getMonth() + 1}月`
}

function daysBetween(start, end) {
  const from = toDate(start)
  const to = toDate(end)
  from.setHours(0, 0, 0, 0)
  to.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 86400000))
}

function daysSince(value) {
  return daysBetween(value, new Date())
}

function isToday(value) {
  return dateString(value) === dateString(new Date())
}

function today() {
  return dateString(new Date())
}

function normalizeDate(value, fallback) {
  if (!isValidDate(value)) return fallback || today()
  return dateString(value)
}

module.exports = {
  pad,
  parseDate,
  toDate,
  isValidDate,
  isFutureDate,
  dateString,
  monthKey,
  monthLabel,
  daysBetween,
  daysSince,
  isToday,
  today,
  normalizeDate
}
