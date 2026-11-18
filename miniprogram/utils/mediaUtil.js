function isImagePath(value) {
  const text = String(value || '').trim()
  if (!text || text.indexOf('emoji:') === 0) return false
  // Only paths that the mini program can load from its local file space may
  // reach an <image>.  URI values from migrations are kept in metadata, but
  // network/data/blob and unknown schemes must always use the placeholder.
  if (/^(?:https?|data|blob):/i.test(text)) return false
  if (/^[A-Za-z]:[\\/]/.test(text)) return true
  if (/^[a-z][a-z0-9+.-]*:/i.test(text)) return /^(?:local|wxfile|file|temp|tmp):/i.test(text)
  return /^\//.test(text)
}

function withImageFlag(item, pathKey) {
  const source = item || {}
  const key = pathKey || 'imagePath'
  return Object.assign({}, source, { hasImage: isImagePath(source[key]) })
}

function markImageError(items, index) {
  const next = Array.isArray(items) ? items.slice() : []
  const position = Number(index)
  if (next[position]) next[position] = Object.assign({}, next[position], { hasImage: false })
  return next
}

module.exports = { isImagePath, withImageFlag, markImageError }
