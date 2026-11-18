const { generateId, now, safeText } = require('../utils/util')
const { dateString, monthKey, isValidDate, isFutureDate, normalizeDate } = require('../utils/dateUtil')

function createPhoto(input) {
  const source = input || {}
  const date = isValidDate(source.date) && !isFutureDate(source.date) ? normalizeDate(source.date, dateString(new Date())) : dateString(new Date())
  const rawPath = safeText(source.imagePath, 500)
  // Keep URI metadata from older records for diagnostics and cleanup. The
  // presenter decides whether a path is safe to render; it must not be
  // treated as a loadable image merely because it has a URI scheme.
  const imagePath = rawPath && (/^(?:[a-z][a-z0-9+.-]*:|\/|[A-Za-z]:[\\/])/i.test(rawPath) ? rawPath : 'emoji:🖼️')
  return {
    photoId: safeText(source.photoId, 100) || generateId('photo'),
    coupleId: safeText(source.coupleId || 'local-couple', 80),
    imagePath,
    description: safeText(source.description || '', 200),
    date,
    month: monthKey(date),
    tags: Array.isArray(source.tags) ? source.tags.map((tag) => safeText(tag, 20)).filter(Boolean).slice(0, 6) : [],
    uploadedBy: safeText(source.uploadedBy, 80),
    createdAt: Number.isFinite(Number(source.createdAt)) && Number(source.createdAt) > 0 ? Number(source.createdAt) : now()
  }
}

module.exports = { createPhoto }
