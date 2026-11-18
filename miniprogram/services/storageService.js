const { clone, now, clamp } = require('../utils/util')
const { createDefaultUser } = require('../models/user')
const { createDefaultCat } = require('../models/cat')
const { createMessage } = require('../models/chat')
const { createRecipe } = require('../models/recipe')
const { createPhoto } = require('../models/photo')
const { createFeedback } = require('../models/feedback')
const { today, isValidDate, isFutureDate, normalizeDate } = require('../utils/dateUtil')
const { LIMITS } = require('../utils/limits')

const PREFIX = 'batiao:'
const SCHEMA_VERSION = 4
const SCHEMA_NAME = '1.3'
const KEYS = {
  META: 'meta', USER: 'user', COUPLE: 'couple', CAT: 'cat', CHATS: 'chats', CARE_EVENTS: 'careEvents', RECIPES: 'recipes', PHOTOS: 'photos', SETTINGS: 'settings', INVITE: 'invite', FEEDBACK: 'feedback'
}
const DEFAULT_SETTINGS = { emotionCareEnabled: true, notificationsEnabled: true, albumSignature: '把平凡日子过成我们的纪念日' }
const memory = {}
const diagnostics = { lastError: null, lastOperation: '', writeFailures: 0, fileFailures: 0 }
let fileSequence = 0

function fullKey(key) { return `${PREFIX}${key}` }
function isObject(value) { return value !== null && typeof value === 'object' && !Array.isArray(value) }
function hasWxStorage() { return typeof wx !== 'undefined' && wx.getStorageSync && wx.setStorageSync }
function storageFailure(operation, key, error, fallbackCode) {
  const rawMessage = error && (error.errMsg || error.message) ? (error.errMsg || error.message) : String(error || '')
  const text = rawMessage.toLowerCase()
  const code = /quota|exceed|storage full|space|容量|空间/.test(text) ? 'storage_quota' : (fallbackCode || (operation === 'storage.remove' ? 'storage_remove_failed' : 'storage_write_failed'))
  const message = code === 'storage_quota' ? '本地空间不足，请先清理旧记录' : (operation === 'storage.remove' ? '本地记录删除失败，请重试' : '本地记录保存失败，请重试')
  diagnostics.lastError = { operation, key, code, message }
  diagnostics.lastOperation = operation
  if (operation === 'storage.remove') diagnostics.removeFailures = (diagnostics.removeFailures || 0) + 1
  else diagnostics.writeFailures += 1
  return diagnostics.lastError
}
function readRaw(key) {
  if (hasWxStorage()) {
    try { return wx.getStorageSync(fullKey(key)) } catch (error) { console.warn('[storage] read failed', error) }
  }
  return memory[key]
}
function writeRaw(key, value) {
  const nextValue = clone(value)
  if (hasWxStorage()) {
    try { wx.setStorageSync(fullKey(key), clone(nextValue)); memory[key] = nextValue; return { ok: true, key, value: clone(nextValue) } } catch (error) {
      return { ok: false, key, value: clone(value), error: storageFailure('storage.write', key, error) }
    }
  }
  memory[key] = nextValue
  return { ok: true, key, value: clone(nextValue), mode: 'memory' }
}
function deleteRaw(key) {
  if (hasWxStorage() && wx.removeStorageSync) {
    try { wx.removeStorageSync(fullKey(key)); delete memory[key]; return { ok: true, key } } catch (error) {
      return { ok: false, key, error: storageFailure('storage.remove', key, error) }
    }
  }
  if (hasWxStorage()) return { ok: false, key, error: storageFailure('storage.remove', key, new Error('removeStorageSync unavailable'), 'storage_remove_failed') }
  delete memory[key]
  return { ok: true, key, mode: 'memory' }
}
function has(key) {
  const value = readRaw(key)
  return value !== undefined && value !== null && value !== ''
}
function get(key, fallback) {
  const value = readRaw(key)
  return value === undefined || value === null ? clone(fallback) : clone(value)
}
function set(key, value) { writeRaw(key, value); return clone(value) }
function setChecked(key, value) {
  const capacity = checkStorageCapacity(key, value)
  if (!capacity.ok) {
    diagnostics.lastError = { operation: 'storage.write', key, code: capacity.code, message: capacity.message }
    diagnostics.lastOperation = 'storage.write'
    diagnostics.writeFailures += 1
    return { ok: false, key, value: clone(value), error: diagnostics.lastError }
  }
  const result = writeRaw(key, value)
  return { ok: result.ok, key, value: clone(value), error: result.ok ? null : result.error, mode: result.mode }
}
function removeChecked(key) {
  const result = deleteRaw(key)
  return { ok: result.ok, key, error: result.ok ? null : result.error, mode: result.mode }
}
function remove(key) { removeChecked(key) }
function list(key) { const value = get(key, []); return Array.isArray(value) ? value : [] }
function clearChecked() {
  const removedKeys = []
  const failedKeys = []
  const errors = []
  Object.keys(KEYS).forEach((name) => {
    const key = KEYS[name]
    const result = removeChecked(key)
    if (result.ok) removedKeys.push(key)
    else { failedKeys.push(key); errors.push({ key, error: result.error }) }
  })
  return { ok: failedKeys.length === 0, removedKeys, failedKeys, errors }
}
function clear() { return clearChecked() }

function sameValue(left, right) {
  try { return JSON.stringify(left) === JSON.stringify(right) } catch (error) { return false }
}

function estimateStorageBytes(value) {
  try { return JSON.stringify(value === undefined ? null : value).length * 2 } catch (error) { return 0 }
}

function checkStorageCapacity(key, value) {
  if (!hasWxStorage() || !wx.getStorageInfoSync) return { ok: true, mode: 'memory' }
  try {
    const info = wx.getStorageInfoSync()
    const oldValue = readRaw(key)
    const deltaKb = (estimateStorageBytes(value) - estimateStorageBytes(oldValue)) / 1024
    if (Number(info.limitSize) > 0 && Number(info.currentSize) + deltaKb > Number(info.limitSize)) return { ok: false, code: 'storage_quota', message: '本地空间不足，请先清理旧记录' }
    return { ok: true, mode: 'wx', deltaKb }
  } catch (error) {
    diagnostics.lastError = { operation: 'storage.info', message: error.message || String(error) }
    diagnostics.lastOperation = 'storage.info'
    return { ok: true, mode: 'unknown' }
  }
}

function canonicalValue(value) {
  if (Array.isArray(value)) return value.map(canonicalValue)
  if (isObject(value)) return Object.keys(value).sort().reduce((result, key) => { result[key] = canonicalValue(value[key]); return result }, {})
  return value
}

function stableHash(value) {
  const text = JSON.stringify(canonicalValue(value))
  let hash = 2166136261
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16777619) >>> 0
  return hash.toString(36)
}

function stableRecordId(source, idKey, prefix) {
  const candidate = isObject(source) ? Object.assign({}, source) : {}
  delete candidate[idKey]
  delete candidate.createdAt
  delete candidate.updatedAt
  delete candidate.date
  delete candidate.month
  delete candidate.unlockedDate
  const raw = source && source[idKey]
  const normalized = typeof raw === 'string' ? raw.trim() : ''
  return normalized || `${prefix}_${stableHash(candidate)}`
}

function recordScore(value) {
  if (!isObject(value)) return 0
  return Object.keys(value).reduce((score, key) => {
    const item = value[key]
    if (item === null || item === undefined || item === '') return score
    if (Array.isArray(item) && item.length === 0) return score
    return score + 1
  }, 0)
}

function recordTime(value) {
  if (!isObject(value)) return 0
  return Math.max(Number(value.updatedAt) || 0, Number(value.createdAt) || 0)
}

function chooseRecord(current, candidate) {
  const scoreDelta = recordScore(candidate) - recordScore(current)
  if (scoreDelta !== 0) return scoreDelta > 0 ? candidate : current
  const timeDelta = recordTime(candidate) - recordTime(current)
  if (timeDelta !== 0) return timeDelta > 0 ? candidate : current
  return JSON.stringify(canonicalValue(candidate)) > JSON.stringify(canonicalValue(current)) ? candidate : current
}

function normalizeIdRecord(source, idKey, prefix, normalizer, valid) {
  if (!isObject(source)) return null
  const id = stableRecordId(source, idKey, prefix)
  const candidate = normalizer(Object.assign({}, source, { [idKey]: id }))
  if (!isObject(candidate) || !candidate[idKey] || (valid && !valid(candidate, source))) return null
  return Object.assign({}, source, candidate, { [idKey]: id })
}

function normalizeCollection(raw, config) {
  const values = Array.isArray(raw) ? raw : []
  const byId = new Map()
  const order = []
  let dropped = 0
  let deduped = 0
  let failed = 0
  const dropReasons = {}
  const failedReasons = {}
  const addReason = (target, reason) => { target[reason] = (target[reason] || 0) + 1 }
  values.forEach((source) => {
    if (!isObject(source)) { dropped += 1; addReason(dropReasons, `${config.name}:invalid_record`); return }
    let candidate
    try { candidate = normalizeIdRecord(source, config.idKey, config.prefix, config.normalizer, config.valid) } catch (error) { failed += 1; addReason(failedReasons, `${config.name}:normalizer_failed`); return }
    if (!candidate) { dropped += 1; addReason(dropReasons, `${config.name}:invalid_fields`); return }
    const id = candidate[config.idKey]
    if (byId.has(id)) {
      deduped += 1
      const index = order.findIndex((item) => item[config.idKey] === id)
      order[index] = chooseRecord(order[index], candidate)
    } else {
      byId.set(id, true)
      order.push(candidate)
    }
  })
  let normalized = order
  if (config.limit && normalized.length > config.limit) {
    normalized = normalized.slice().sort((left, right) => recordTime(left) - recordTime(right)).slice(-config.limit)
    dropped += order.length - normalized.length
  }
  return { value: normalized, dropped, deduped, failed, dropReasons, failedReasons }
}

function normalizeUserValue(value) {
  const source = isObject(value) ? value : {}
  const candidate = createDefaultUser(source)
  candidate.createdAt = Number(source.createdAt) > 0 ? Number(source.createdAt) : candidate.createdAt
  candidate.updatedAt = Number(source.updatedAt) > 0 ? Number(source.updatedAt) : candidate.updatedAt
  return Object.assign({}, source, candidate)
}

function normalizeCoupleValue(value) {
  const source = isObject(value) ? value : {}
  const partnerSource = isObject(source.partner) ? source.partner : null
  const partner = partnerSource && String(partnerSource.userId || '').trim() ? Object.assign({}, partnerSource, { userId: String(partnerSource.userId).trim().slice(0, 80), nickname: String(partnerSource.nickname || 'Ta').trim().slice(0, 20) || 'Ta' }) : null
  const rawDate = source.anniversaryDate
  const anniversaryDate = isValidDate(rawDate) && !isFutureDate(rawDate) ? normalizeDate(rawDate, today()) : today()
  return Object.assign({}, source, {
    coupleId: source.coupleId || 'local-couple',
    partner,
    anniversaryDate,
    updatedAt: Number(source.updatedAt) > 0 ? Number(source.updatedAt) : now()
  })
}

function normalizeCatValue(value) {
  const source = isObject(value) ? value : {}
  const candidate = createDefaultCat(source)
  candidate.todayFeedCount = clamp(candidate.todayFeedCount, 0, 3)
  candidate.updatedAt = Number(source.updatedAt) > 0 ? Number(source.updatedAt) : candidate.updatedAt
  return Object.assign({}, source, candidate)
}

function normalizeSettingsValue(value) {
  const source = isObject(value) ? value : {}
  const toBoolean = (input, fallback) => {
    if (typeof input === 'boolean') return input
    if (input === 0 || input === '0' || input === 'false' || input === 'False' || input === 'no') return false
    if (input === 1 || input === '1' || input === 'true' || input === 'True' || input === 'yes') return true
    return fallback
  }
  return Object.assign({}, source, {
    emotionCareEnabled: toBoolean(source.emotionCareEnabled, DEFAULT_SETTINGS.emotionCareEnabled),
    notificationsEnabled: toBoolean(source.notificationsEnabled, DEFAULT_SETTINGS.notificationsEnabled),
    albumSignature: typeof source.albumSignature === 'string' ? source.albumSignature.slice(0, 60) : DEFAULT_SETTINGS.albumSignature
  })
}

function normalizeInviteValue(value) {
  const source = isObject(value) ? value : {}
  return Object.assign({}, source, { code: typeof source.code === 'string' ? source.code.slice(0, 6).toUpperCase() : '', createdAt: Number(source.createdAt) || 0 })
}

function normalizeChatRecord(source) {
  const messageId = stableRecordId(source, 'messageId', 'msg')
  return createMessage(Object.assign({}, source, { messageId, createdAt: Number(source.createdAt) > 0 ? Number(source.createdAt) : 1 }))
}

function normalizeCareEvent(source) {
  const eventId = stableRecordId(source, 'eventId', 'care')
  return Object.assign({}, source, { eventId, tag: String(source.tag || '').slice(0, 40), createdAt: Number(source.createdAt) > 0 ? Number(source.createdAt) : 0 })
}

function normalizeRecipeRecord(source) {
  const recipeId = stableRecordId(source, 'recipeId', 'recipe')
  const normalizePath = (item) => {
    const path = String(item || '').trim()
    if (!path) return ''
    return /^(?:[a-z][a-z0-9+.-]*:|\/|[A-Za-z]:[\\/])/i.test(path) ? path : 'emoji:🖼️'
  }
  const photos = Array.from(new Set((Array.isArray(source.photos) ? source.photos : []).map(normalizePath).filter(Boolean))).slice(0, 9)
  return createRecipe(Object.assign({}, source, { recipeId, photos, updatedAt: Number(source.updatedAt) > 0 ? Number(source.updatedAt) : Number(source.createdAt) || 0 }))
}

function normalizePhotoRecord(source) {
  const photoId = stableRecordId(source, 'photoId', 'photo')
  return createPhoto(Object.assign({}, source, { photoId, createdAt: Number(source.createdAt) > 0 ? Number(source.createdAt) : 1 }))
}

function normalizeFeedbackRecord(source) {
  const feedbackId = stableRecordId(source, 'feedbackId', 'feedback')
  return createFeedback(Object.assign({}, source, { feedbackId, createdAt: Number(source.createdAt) > 0 ? Number(source.createdAt) : 1 }))
}

function hasChatContent(candidate) { return Boolean(candidate && String(candidate.content || '').trim()) }
function hasCareTag(candidate) { return Boolean(candidate && String(candidate.tag || '').trim()) }
function hasRecipeName(candidate, source) { return Boolean(source && String(source.name || '').trim() && candidate && candidate.name) }
function hasPhotoPath(candidate, source) { return Boolean(source && String(source.imagePath || '').trim() && candidate && candidate.imagePath) }
function hasFeedbackContent(candidate, source) { return Boolean(source && String(source.content || '').trim() && candidate && candidate.content) }

function initialize() {
  const rawMeta = readRaw(KEYS.META)
  const previousVersion = isObject(rawMeta) ? Number(rawMeta.schemaVersion) || 0 : 0
  const repairedKeys = []
  const errors = []
  const counts = { repaired: 0, deduped: 0, dropped: 0, failed: 0, dropReasons: {}, failedReasons: {} }
  const mergeReasons = (target, source) => Object.keys(source || {}).forEach((key) => { target[key] = (target[key] || 0) + source[key] })
  const writeRepair = (key, value) => {
    try {
      const result = setChecked(key, value)
      if (!result.ok) throw new Error(result.error && result.error.message ? result.error.message : 'storage write failed')
      repairedKeys.push(key)
      counts.repaired += 1
    } catch (error) {
      counts.failed += 1
      errors.push({ key, message: error.message || String(error) })
    }
  }
  const ensureObject = (key, normalizer) => {
    const raw = readRaw(key)
    const candidate = normalizer(raw)
    if (!isObject(raw) || !sameValue(raw, candidate)) writeRepair(key, candidate)
  }
  const ensureCollection = (key, config) => {
    const raw = readRaw(key)
    const result = normalizeCollection(raw, config)
    counts.deduped += result.deduped
    counts.dropped += result.dropped
    counts.failed += result.failed
    mergeReasons(counts.dropReasons, result.dropReasons)
    mergeReasons(counts.failedReasons, result.failedReasons)
    if (!Array.isArray(raw) || !sameValue(raw, result.value)) writeRepair(key, result.value)
  }

  ensureObject(KEYS.USER, normalizeUserValue)
  ensureObject(KEYS.COUPLE, normalizeCoupleValue)
  ensureObject(KEYS.CAT, normalizeCatValue)
  ensureCollection(KEYS.CHATS, { name: 'chats', idKey: 'messageId', prefix: 'msg', normalizer: normalizeChatRecord, valid: hasChatContent, limit: LIMITS.CHAT_MESSAGES })
  ensureCollection(KEYS.CARE_EVENTS, { name: 'careEvents', idKey: 'eventId', prefix: 'care', normalizer: normalizeCareEvent, valid: hasCareTag, limit: LIMITS.CARE_EVENTS })
  ensureCollection(KEYS.RECIPES, { name: 'recipes', idKey: 'recipeId', prefix: 'recipe', normalizer: normalizeRecipeRecord, valid: hasRecipeName })
  ensureCollection(KEYS.PHOTOS, { name: 'photos', idKey: 'photoId', prefix: 'photo', normalizer: normalizePhotoRecord, valid: hasPhotoPath })
  ensureCollection(KEYS.FEEDBACK, { name: 'feedback', idKey: 'feedbackId', prefix: 'feedback', normalizer: normalizeFeedbackRecord, valid: hasFeedbackContent, limit: LIMITS.FEEDBACK })
  ensureObject(KEYS.SETTINGS, normalizeSettingsValue)
  ensureObject(KEYS.INVITE, normalizeInviteValue)

  const changed = previousVersion < SCHEMA_VERSION || counts.repaired > 0 || counts.deduped > 0 || counts.dropped > 0 || counts.failed > 0
  const baseMeta = Object.assign({}, isObject(rawMeta) ? rawMeta : {}, {
    schemaVersion: SCHEMA_VERSION,
    schemaName: SCHEMA_NAME,
    initializedAt: isObject(rawMeta) && Number(rawMeta.initializedAt) > 0 ? rawMeta.initializedAt : now()
  })
  if (changed) {
    baseMeta.migratedAt = now()
    baseMeta.migration = { from: previousVersion, to: SCHEMA_VERSION, repaired: counts.repaired, deduped: counts.deduped, dropped: counts.dropped, failed: counts.failed, dropReasons: clone(counts.dropReasons), failedReasons: clone(counts.failedReasons) }
  }
  if (!isObject(rawMeta) || !sameValue(rawMeta, baseMeta)) writeRepair(KEYS.META, baseMeta)
  return { initialized: true, ok: errors.length === 0, schemaVersion: SCHEMA_VERSION, schemaName: SCHEMA_NAME, migrated: changed, repaired: counts.repaired, repairedKeys, deduped: counts.deduped, dropped: counts.dropped, failed: counts.failed, dropReasons: clone(counts.dropReasons), failedReasons: clone(counts.failedReasons), errors }
}

function getStorageInfo() {
  if (typeof wx !== 'undefined' && wx.getStorageInfoSync) {
    try { return wx.getStorageInfoSync() } catch (error) { console.warn('[storage] info failed', error) }
  }
  return { keys: Object.keys(memory).map(fullKey), currentSize: 0, limitSize: 10240 }
}

function hasFileSystem() {
  return typeof wx !== 'undefined' && typeof wx.getFileSystemManager === 'function' && wx.env && wx.env.USER_DATA_PATH
}

function isManagedImagePath(filePath) {
  const text = String(filePath || '').trim()
  if (!text || text.indexOf('emoji:') === 0 || /^(?:https?:|data:|temp:|tmp:)/i.test(text)) return false
  if (hasFileSystem() && String(text).indexOf(String(wx.env.USER_DATA_PATH)) === 0) return true
  return /^(?:local:|wxfile:|file:)/i.test(text)
}

function uniqueFileName(fileName) {
  const base = String(fileName || 'batiao').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'batiao'
  fileSequence += 1
  return `${base}_${now()}_${fileSequence}`
}

function saveImageChecked(tempPath, fileName) {
  if (!tempPath) return Promise.resolve({ ok: false, code: 'empty_path', path: '', message: '图片路径为空' })
  const source = String(tempPath)
  if (/^(?:https?:|data:)/i.test(source)) return Promise.resolve({ ok: false, code: 'unsupported_path', path: '', message: '远程图片不能保存到本地' })
  if (hasFileSystem()) {
    return new Promise((resolve) => {
      let manager
      try { manager = wx.getFileSystemManager() } catch (error) {
        diagnostics.lastError = { operation: 'file.save', path: source, message: error.message || String(error) }
        diagnostics.lastOperation = 'file.save'
        diagnostics.fileFailures += 1
        resolve({ ok: false, code: 'filesystem_unavailable', path: '', message: '本地文件系统不可用' })
        return
      }
      const target = `${wx.env.USER_DATA_PATH}/${uniqueFileName(fileName)}`
      if (!manager || typeof manager.saveFile !== 'function') {
        diagnostics.fileFailures += 1
        resolve({ ok: false, code: 'filesystem_unavailable', path: '', message: '本地文件系统不可用' })
        return
      }
      manager.saveFile({
        tempFilePath: source,
        filePath: target,
        success: (result) => resolve({ ok: true, path: result && result.savedFilePath ? result.savedFilePath : target, managed: true }),
        fail: (error) => {
          diagnostics.lastError = { operation: 'file.save', path: source, message: error && error.errMsg ? error.errMsg : 'saveFile failed' }
          diagnostics.lastOperation = 'file.save'
          diagnostics.fileFailures += 1
          resolve({ ok: false, code: 'file_save_failed', path: '', message: '图片保存失败' })
        }
      })
    })
  }
  return Promise.resolve({ ok: true, path: source, managed: isManagedImagePath(source), fallback: true })
}

function saveImage(tempPath, fileName) {
  return saveImageChecked(tempPath, fileName).then((result) => {
    if (result.ok) return result.path
    diagnostics.lastError = { operation: 'file.save', code: result.code, message: result.message }
    return ''
  })
}

function removeImageChecked(filePath) {
  const text = String(filePath || '').trim()
  if (!text || !isManagedImagePath(text)) return Promise.resolve({ ok: true, path: text, skipped: true })
  if (hasFileSystem()) {
    return new Promise((resolve) => {
      let manager
      try { manager = wx.getFileSystemManager() } catch (error) {
        diagnostics.lastError = { operation: 'file.remove', path: text, message: error.message || String(error) }
        diagnostics.lastOperation = 'file.remove'
        diagnostics.fileFailures += 1
        resolve({ ok: false, path: text, code: 'filesystem_unavailable', message: '本地文件系统不可用' })
        return
      }
      if (!manager || typeof manager.unlink !== 'function') {
        diagnostics.fileFailures += 1
        resolve({ ok: false, path: text, code: 'filesystem_unavailable', message: '本地文件系统不可用' })
        return
      }
      manager.unlink({
        filePath: text,
        success: () => resolve({ ok: true, path: text }),
        fail: (error) => {
          const rawMessage = String(error && (error.errMsg || error.message) || '').toLowerCase()
          if (/not[ _-]?found|no such file|enoent|不存在/.test(rawMessage)) {
            resolve({ ok: true, path: text, missing: true })
            return
          }
          diagnostics.lastError = { operation: 'file.remove', path: text, message: error && error.errMsg ? error.errMsg : 'unlink failed' }
          diagnostics.lastOperation = 'file.remove'
          diagnostics.fileFailures += 1
          resolve({ ok: false, path: text, code: 'file_remove_failed', message: '本地图片清理失败' })
        }
      })
    })
  }
  return Promise.resolve({ ok: true, path: text, fallback: true })
}

function removeImage(filePath) { return removeImageChecked(filePath).then((result) => result.ok) }

function fileExists(filePath) {
  if (!filePath || String(filePath).indexOf('emoji:') === 0) return Promise.resolve(Boolean(filePath))
  if (hasFileSystem()) {
    return new Promise((resolve) => {
      let manager
      try { manager = wx.getFileSystemManager() } catch (error) { resolve(false); return }
      if (!manager || typeof manager.access !== 'function') { resolve(false); return }
      manager.access({ path: filePath, success: () => resolve(true), fail: () => resolve(false) })
    })
  }
  return Promise.resolve(Boolean(filePath))
}

function getDiagnostics() { return clone(diagnostics) }

module.exports = { PREFIX, SCHEMA_VERSION, SCHEMA_NAME, KEYS, get, set, setChecked, has, remove, removeChecked, list, clear, clearChecked, initialize, getStorageInfo, saveImage, saveImageChecked, removeImage, removeImageChecked, fileExists, isManagedImagePath, getDiagnostics, hasFileSystem }
