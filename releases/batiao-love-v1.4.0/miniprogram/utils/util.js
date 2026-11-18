const ALPHANUMERIC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function now() {
  return Date.now()
}

function generateId(prefix) {
  const head = prefix || 'id'
  return `${head}_${now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function clone(value) {
  if (value === undefined || value === null) return value
  return JSON.parse(JSON.stringify(value))
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function clamp(value, min, max) {
  const number = Number(value)
  if (Number.isNaN(number)) return min
  return Math.min(max, Math.max(min, number))
}

function truncate(value, maxLength) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  if (maxLength <= 1) return text.slice(0, maxLength)
  return `${text.slice(0, maxLength - 1)}…`
}

function randomCode(length) {
  const size = length || 6
  let code = ''
  for (let index = 0; index < size; index += 1) {
    code += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)]
  }
  return code
}

function formatTime(timestamp) {
  const date = new Date(timestamp || now())
  const pad = (number) => String(number).padStart(2, '0')
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function safeText(value, maxLength) {
  const text = String(value === undefined || value === null ? '' : value).trim()
  return maxLength ? truncate(text, maxLength) : text
}

function showToast(title, icon) {
  if (typeof wx !== 'undefined' && wx.showToast) {
    try { wx.showToast({ title: String(title), icon: icon || 'none' }) } catch (error) { console.warn('[ui] toast unavailable', error && error.message ? error.message : error) }
  }
}

function confirm(options) {
  const settings = options || {}
  if (typeof wx !== 'undefined' && wx.showModal) {
    return new Promise((resolve) => {
      try {
        wx.showModal({
          title: settings.title || '请确认',
          content: settings.content || '',
          confirmText: settings.confirmText || '确认',
          cancelText: settings.cancelText || '取消',
          success: (result) => resolve(Boolean(result.confirm)),
          fail: () => resolve(false)
        })
      } catch (error) { resolve(false) }
    })
  }
  return Promise.resolve(settings.defaultValue !== false)
}

function withUserId(userId) {
  return userId || 'local-user'
}

module.exports = {
  now,
  generateId,
  clone,
  isObject,
  clamp,
  truncate,
  randomCode,
  formatTime,
  safeText,
  showToast,
  confirm,
  withUserId
}
