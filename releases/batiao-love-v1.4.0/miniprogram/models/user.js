const { generateId, now, safeText } = require('../utils/util')
const { today, isValidDate, isFutureDate, normalizeDate } = require('../utils/dateUtil')

function stableText(value, fallback, limit) {
  const text = safeText(value, limit)
  return text || fallback
}

function userId(value) {
  const text = safeText(value, 80)
  return text || generateId('user')
}

function createDefaultUser(input) {
  const source = input || {}
  const timestamp = now()
  const birthday = isValidDate(source.birthday) && !isFutureDate(source.birthday) ? normalizeDate(source.birthday, '') : ''
  const anniversaryDate = isValidDate(source.anniversaryDate) && !isFutureDate(source.anniversaryDate) ? normalizeDate(source.anniversaryDate, today()) : today()
  const gender = ['male', 'female', 'other', ''].indexOf(source.gender) >= 0 ? source.gender : ''
  const inviteCode = /^[A-Z0-9]{6}$/.test(String(source.inviteCode || '').trim().toUpperCase()) ? String(source.inviteCode).trim().toUpperCase() : ''
  return {
    userId: userId(source.userId),
    openId: safeText(source.openId, 120),
    nickname: stableText(source.nickname, '小主人', 20),
    avatar: stableText(source.avatar, '🐰', 300),
    gender,
    birthday,
    signature: stableText(source.signature, '和八条一起记录每个心动瞬间', 60),
    coupleId: typeof source.coupleId === 'string' && source.coupleId.trim() ? source.coupleId.trim().slice(0, 80) : null,
    inviteCode,
    anniversaryDate,
    createdAt: Number.isFinite(Number(source.createdAt)) && Number(source.createdAt) > 0 ? Number(source.createdAt) : timestamp,
    updatedAt: Number.isFinite(Number(source.updatedAt)) && Number(source.updatedAt) > 0 ? Number(source.updatedAt) : timestamp
  }
}

function normalizeUser(value) {
  return createDefaultUser(value || {})
}

module.exports = { createDefaultUser, normalizeUser }
