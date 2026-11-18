const storage = require('./storageService')
const { createDefaultUser, normalizeUser } = require('../models/user')
const { now, randomCode, safeText } = require('../utils/util')
const { daysSince, normalizeDate, isValidDate, isFutureDate, today } = require('../utils/dateUtil')

const DEFAULT_SETTINGS = { emotionCareEnabled: true, notificationsEnabled: true, albumSignature: '把平凡日子过成我们的纪念日' }
let lastError = null

function ensure() { storage.initialize() }
function getCurrentUser() { ensure(); return normalizeUser(storage.get(storage.KEYS.USER, createDefaultUser())) }
function saveUser(value) {
  const previous = storage.get(storage.KEYS.USER, createDefaultUser())
  const user = normalizeUser(value); user.updatedAt = now()
  const result = storage.setChecked(storage.KEYS.USER, user)
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '资料保存失败，请重试' })
  return result.ok ? user : normalizeUser(previous)
}
function updateUser(patch) { return saveUser(Object.assign({}, getCurrentUser(), patch || {})) }
function getCouple() { ensure(); const fallback = { coupleId: 'local-couple', partner: null, anniversaryDate: today() }; const couple = storage.get(storage.KEYS.COUPLE, fallback); const date = isValidDate(couple.anniversaryDate) && !isFutureDate(couple.anniversaryDate) ? normalizeDate(couple.anniversaryDate, today()) : fallback.anniversaryDate; return Object.assign({}, fallback, couple, { anniversaryDate: date }) }
function saveCouple(value) {
  const current = getCouple(); const source = Object.assign({}, current, value || {})
  const anniversaryDate = isValidDate(source.anniversaryDate) && !isFutureDate(source.anniversaryDate) ? normalizeDate(source.anniversaryDate, current.anniversaryDate) : current.anniversaryDate
  const couple = Object.assign({}, source, { anniversaryDate, updatedAt: now() })
  const result = storage.setChecked(storage.KEYS.COUPLE, couple)
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '绑定资料保存失败，请重试' })
  return result.ok ? couple : current
}
function generateInviteCode() {
  const current = getCurrentUser()
  let code = randomCode(6)
  while (code === current.inviteCode) code = randomCode(6)
  updateUser({ inviteCode: code })
  if (lastError) return current.inviteCode || ''
  const result = storage.setChecked(storage.KEYS.INVITE, { code, createdAt: now() })
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '邀请码保存失败，请重试' })
  return code
}
function getInviteCode() { return getCurrentUser().inviteCode || generateInviteCode() }
function validateInviteCode(value) { return /^[A-Z0-9]{6}$/.test(String(value || '').trim().toUpperCase()) }
function bindPartner(inputCode) {
  const code = String(inputCode || '').trim().toUpperCase()
  const current = getCurrentUser()
  const couple = getCouple()
  if (!validateInviteCode(code)) return { ok: false, code: 'invalid_format', message: '请输入 6 位字母或数字邀请码' }
  if (current.coupleId && couple.partner) return { ok: false, code: 'already_bound', message: '你们已经绑定啦' }
  if (code === current.inviteCode) return { ok: false, code: 'self_bind', message: '不能绑定自己的邀请码' }
  const partner = { userId: `partner_${code.toLowerCase()}`, nickname: 'Ta', avatar: '🌷', signature: '和你一起收集小幸福' }
  saveCouple({ coupleId: 'local-couple', partner, anniversaryDate: couple.anniversaryDate || current.anniversaryDate })
  if (lastError) return { ok: false, code: lastError.code || 'storage_write_failed', message: lastError.message || '绑定资料保存失败，请重试' }
  saveUser(Object.assign({}, current, { coupleId: partner.userId }))
  if (lastError) {
    // Best-effort rollback keeps a failed bind from being reported as success.
    const error = lastError
    saveCouple(couple)
    lastError = error
    return { ok: false, code: error.code || 'storage_write_failed', message: error.message || '绑定资料保存失败，请重试' }
  }
  return { ok: true, partner, couple: getCouple() }
}
function unbindPartner() {
  const current = getCurrentUser(); const couple = getCouple()
  saveCouple({ partner: null })
  if (lastError) return { ok: false, code: lastError.code || 'storage_write_failed', message: lastError.message || '解除绑定失败，请重试' }
  saveUser(Object.assign({}, current, { coupleId: null }))
  if (lastError) { const error = lastError; saveCouple(couple); lastError = error; return { ok: false, code: error.code || 'storage_write_failed', message: error.message || '解除绑定失败，请重试' } }
  return { ok: true, couple: getCouple() }
}
function getAnniversaryDate() { const couple = getCouple(); return couple.anniversaryDate || getCurrentUser().anniversaryDate }
function setAnniversaryDate(value) {
  const previous = getAnniversaryDate()
  if (!isValidDate(value) || isFutureDate(value)) return { ok: false, code: 'invalid_anniversary', date: previous, message: '纪念日需要是有效的过去或今天' }
  const date = normalizeDate(value, previous)
  saveCouple({ anniversaryDate: date })
  if (lastError) return { ok: false, code: lastError.code || 'storage_write_failed', date: previous, message: lastError.message || '纪念日保存失败，请重试' }
  const user = updateUser({ anniversaryDate: date })
  if (lastError) { const error = lastError; saveCouple({ anniversaryDate: previous }); lastError = error; return { ok: false, code: error.code || 'storage_write_failed', date: previous, message: error.message || '纪念日保存失败，请重试' } }
  return { ok: true, date, user }
}
function getTogetherDays() { return daysSince(getAnniversaryDate()) + 1 }
function getSettings() { ensure(); return Object.assign({}, DEFAULT_SETTINGS, storage.get(storage.KEYS.SETTINGS, {})) }
function updateSettings(patch) {
  const previous = getSettings(); const settings = Object.assign({}, previous, patch || {})
  const result = storage.setChecked(storage.KEYS.SETTINGS, settings)
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '设置保存失败，请重试' })
  return result.ok ? settings : previous
}
async function clearLocalData() {
  const recipes = storage.list(storage.KEYS.RECIPES)
  const photos = storage.list(storage.KEYS.PHOTOS)
  const currentUser = getCurrentUser()
  const paths = []
  if (currentUser.avatar && String(currentUser.avatar).indexOf('emoji:') !== 0) paths.push(currentUser.avatar)
  recipes.forEach((recipe) => (recipe.photos || []).forEach((path) => paths.push(path)))
  photos.forEach((photo) => paths.push(photo.imagePath))
  const uniquePaths = Array.from(new Set(paths.filter((path) => storage.isManagedImagePath(path))))
  const results = await Promise.all(uniquePaths.map((path) => Promise.resolve().then(() => storage.removeImageChecked(path)).then((result) => Object.assign({ path }, result || { ok: false })).catch((error) => ({ path, ok: false, code: 'file_remove_failed', message: error.message || String(error) }))))
  const failedFiles = results.filter((item) => !item.ok).map((item) => ({ path: item.path, code: item.code || 'file_remove_failed', message: item.message || '本地图片清理失败' }))
  if (failedFiles.length) return { ok: false, cleanedFiles: results.filter((item) => item.ok).map((item) => item.path), failedFiles, failedKeys: [], clearErrors: [], migration: null, retryable: true, user: null }
  const cleared = storage.clearChecked()
  const migration = cleared.ok ? storage.initialize() : null
  const failedKeys = cleared.failedKeys || []
  return { ok: Boolean(failedKeys.length === 0 && migration && migration.ok !== false), cleanedFiles: results.filter((item) => item.ok).map((item) => item.path), failedFiles: [], failedKeys, clearErrors: cleared.errors || [], migration, retryable: failedKeys.length > 0, user: cleared.ok ? getCurrentUser() : null }
}
function updateSignature(value) { return updateSettings({ albumSignature: safeText(value, 60) }) }
function getLastError() { return lastError }

module.exports = { getCurrentUser, saveUser, updateUser, getCouple, generateInviteCode, getInviteCode, validateInviteCode, bindPartner, unbindPartner, getAnniversaryDate, setAnniversaryDate, getTogetherDays, getSettings, updateSettings, clearLocalData, updateSignature, getLastError }
