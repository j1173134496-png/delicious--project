const storage = require('./storageService')
const userService = require('./userService')
const catService = require('./catService')
const { createMessage } = require('../models/chat')
const { reply } = require('../utils/aiChat')
const emotionDetector = require('../utils/emotionDetector')
const { now, safeText, generateId } = require('../utils/util')
const { LIMITS } = require('../utils/limits')

let lastError = null
function ensure() { storage.initialize() }
function list() { ensure(); return storage.list(storage.KEYS.CHATS) }
function addMessage(input) {
  const messages = storage.list(storage.KEYS.CHATS)
  const requestedId = input && input.messageId
  if (requestedId) {
    const existing = messages.find((message) => message.messageId === requestedId)
    if (existing) return existing
  }
  if (messages.length >= LIMITS.CHAT_MESSAGES) {
    lastError = { code: 'chat_limit', message: '聊天记录已达到上限，请先清理旧记录' }
    return null
  }
  const message = createMessage(input)
  const result = storage.setChecked(storage.KEYS.CHATS, messages.concat(message))
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '消息保存失败，请重试' })
  return result.ok ? message : null
}
function ensureWelcomeMessage() {
  if (list().length) return list()
  const current = userService.getCurrentUser()
  addMessage({ senderId: 'batiao', receiverId: current.userId, content: '喵~ 欢迎回来！我是八条，今天也陪你和 Ta 收集一点小幸福吧 💕', type: 'system', isRead: true })
  return list()
}
function normalizeCareTag(tag) { return safeText(tag, 40).toLowerCase() }
function normalizeCareEvent(event) {
  const tag = normalizeCareTag(event && event.tag)
  const createdAt = Number(event && event.createdAt) > 0 ? Number(event.createdAt) : now()
  const eventId = safeText(event && event.eventId, 100) || `care_${createdAt.toString(36)}_${generateId('event').split('_').pop()}`
  return Object.assign({}, event || {}, { eventId, tag, createdAt })
}
function careError(result, fallback) {
  return result && result.error ? result.error : { code: 'storage_write_failed', message: fallback }
}
function hasRecentCare(tag) {
  const cutoff = now() - 86400000
  const normalizedTag = normalizeCareTag(tag)
  const source = storage.list(storage.KEYS.CARE_EVENTS).map(normalizeCareEvent).filter((event) => event.tag && event.createdAt >= cutoff)
  const result = storage.setChecked(storage.KEYS.CARE_EVENTS, source)
  if (!result.ok) {
    lastError = careError(result, '关怀记录清理失败，请重试')
    return { ok: false, reason: 'care_event_cleanup_failed', error: lastError, recent: false, pendingEvent: null }
  }
  lastError = null
  const matching = source.filter((event) => event.tag === normalizedTag)
  const pendingEvent = matching.find((event) => event.deliveryState === 'pending') || null
  return { ok: true, recent: matching.some((event) => event.deliveryState !== 'pending'), pendingEvent }
}
function recordCareEvent(tag) {
  const event = normalizeCareEvent({ eventId: generateId('care'), tag, createdAt: now(), deliveryState: 'pending' })
  const events = storage.list(storage.KEYS.CARE_EVENTS).map(normalizeCareEvent)
  if (events.length >= LIMITS.CARE_EVENTS) {
    lastError = { code: 'care_limit', message: '关怀记录已达到上限，请先清理旧记录' }
    return { ok: false, reason: 'care_limit', error: lastError, event: null }
  }
  const result = storage.setChecked(storage.KEYS.CARE_EVENTS, events.concat(event))
  if (!result.ok) {
    lastError = careError(result, '关怀记录保存失败，请重试')
    return { ok: false, reason: 'care_event_write_failed', error: lastError, event: null }
  }
  lastError = null
  return { ok: true, event }
}
function removeCareEvent(eventId) {
  const events = storage.list(storage.KEYS.CARE_EVENTS).filter((event) => event.eventId !== eventId)
  const result = storage.setChecked(storage.KEYS.CARE_EVENTS, events)
  if (!result.ok) {
    lastError = careError(result, '关怀记录回滚失败，请重试')
    return { ok: false, error: lastError }
  }
  lastError = null
  return { ok: true }
}
function markCareEventSent(eventId) {
  const events = storage.list(storage.KEYS.CARE_EVENTS).map((event) => event.eventId === eventId ? Object.assign({}, event, { deliveryState: 'sent' }) : event)
  const result = storage.setChecked(storage.KEYS.CARE_EVENTS, events)
  if (!result.ok) {
    lastError = careError(result, '关怀记录状态保存失败，请重试')
    return { ok: false, error: lastError }
  }
  lastError = null
  return { ok: true }
}
function snapshotState() {
  return { messages: storage.list(storage.KEYS.CHATS), cat: catService.getCat(), careEvents: storage.list(storage.KEYS.CARE_EVENTS) }
}
function restoreState(snapshot) {
  const failedKeys = []
  const errors = []
  ;[
    [storage.KEYS.CHATS, snapshot.messages],
    [storage.KEYS.CAT, snapshot.cat],
    [storage.KEYS.CARE_EVENTS, snapshot.careEvents]
  ].forEach(([key, value]) => {
    let result
    try { result = storage.setChecked(key, value) } catch (error) { result = { ok: false, error: { code: 'storage_write_failed', message: error.message || String(error) } } }
    if (!result || !result.ok) { failedKeys.push(key); errors.push({ key, error: result && result.error ? result.error : { code: 'storage_write_failed', message: '本地记录恢复失败，请重试' } }) }
  })
  return { ok: failedKeys.length === 0, failedKeys, errors }
}
function failedTransaction(snapshot, reason, message, extra) {
  const rollback = restoreState(snapshot)
  const pending = !rollback.ok
  lastError = { code: pending ? 'chat_transaction_pending' : (reason || 'storage_write_failed'), message: pending ? '聊天记录恢复未完成，请重试' : (message || '聊天记录保存失败，请重试'), failedKeys: rollback.failedKeys, errors: rollback.errors, retryable: true }
  return Object.assign({ ok: false, reason: lastError.code, message: lastError.message, pending, failedKeys: rollback.failedKeys, rollback, careMessage: null, careStatus: pending ? 'pending' : 'failed', messages: list() }, extra || {})
}
function sendMessage(content) {
  const text = safeText(content, 500)
  if (!text) return { ok: false, reason: 'empty', message: '先写点想和八条说的话吧~', messages: list() }
  const current = userService.getCurrentUser()
  const couple = userService.getCouple()
  const emotion = emotionDetector.detect(text)
  const settings = userService.getSettings()
  const careEnabled = Boolean(emotion.detected && settings.emotionCareEnabled && settings.notificationsEnabled && couple.partner)
  const snapshot = snapshotState()
  let recent = { ok: true, recent: false, pendingEvent: null }
  if (careEnabled) {
    recent = hasRecentCare(emotion.tag)
    if (!recent.ok) {
      lastError = recent.error || { code: recent.reason || 'care_event_cleanup_failed', message: '关怀记录清理失败，请重试' }
      return { ok: false, reason: recent.reason || 'care_event_cleanup_failed', message: lastError.message, careMessage: null, careStatus: 'failed', emotion, cat: snapshot.cat, transition: null, messages: list(), pending: false, failedKeys: [] }
    }
  }
  const needsCareMessage = careEnabled && !recent.recent
  const requiredMessages = 2 + (needsCareMessage ? 1 : 0)
  if (snapshot.messages.length + requiredMessages > LIMITS.CHAT_MESSAGES) {
    lastError = { code: 'chat_limit', message: '聊天记录已达到上限，请先清理旧记录', requiredMessages, currentCount: snapshot.messages.length, retryable: true }
    const restored = restoreState(snapshot)
    if (!restored.ok) return failedTransaction(snapshot, 'chat_limit', '聊天记录已达到上限，请先清理旧记录', { emotion, cat: snapshot.cat, transition: null })
    return { ok: false, reason: 'chat_limit', code: 'chat_limit', message: lastError.message, careMessage: null, careStatus: 'failed', emotion, cat: snapshot.cat, transition: null, messages: list() }
  }
  if (needsCareMessage && !recent.pendingEvent && snapshot.careEvents.length >= LIMITS.CARE_EVENTS) {
    lastError = { code: 'care_limit', message: '关怀记录已达到上限，请先清理旧记录', retryable: true }
    const restored = restoreState(snapshot)
    if (!restored.ok) return failedTransaction(snapshot, 'care_limit', lastError.message, { emotion, cat: snapshot.cat, transition: null })
    return { ok: false, reason: 'care_limit', code: 'care_limit', message: lastError.message, careMessage: null, careStatus: 'failed', emotion, cat: snapshot.cat, transition: null, messages: list() }
  }
  const userMessage = addMessage({ coupleId: couple.coupleId, senderId: current.userId, receiverId: 'batiao', content: text, type: 'text', isRead: true })
  if (!userMessage) return failedTransaction(snapshot, getLastError() && getLastError().code, getLastError() && getLastError().message, { emotion, cat: snapshot.cat, transition: null })
  const context = list()
  const botMessage = addMessage({ coupleId: couple.coupleId, senderId: 'batiao', receiverId: current.userId, content: reply(text, context), type: 'text', isRead: true })
  if (!botMessage) return failedTransaction(snapshot, getLastError() && getLastError().code, getLastError() && getLastError().message, { emotion, cat: snapshot.cat, transition: null })
  const catResult = catService.recordChat()
  if (catResult && catResult.ok === false) return failedTransaction(snapshot, catResult.reason || 'storage_write_failed', catResult.message || '状态保存失败，请重试', { emotion, cat: snapshot.cat, transition: null })
  const cat = catResult && catResult.cat ? catResult.cat : catResult
  const transition = catResult && catResult.transition ? catResult.transition : null
  let careMessage = null
  let careEventId = ''
  let careStatus = 'none'
  if (careEnabled) {
    if (recent.recent) {
      careStatus = 'deduped'
    } else {
      const recorded = recent.pendingEvent ? { ok: true, event: recent.pendingEvent } : recordCareEvent(emotion.tag)
      if (!recorded || !recorded.ok) return failedTransaction(snapshot, recorded && recorded.reason ? recorded.reason : 'care_event_write_failed', recorded && recorded.error ? recorded.error.message : '关怀记录保存失败，请重试', { careMessage: null, careStatus: 'failed', emotion, cat: snapshot.cat, transition: null })
      const event = recorded.event || recorded.pendingEvent
      careEventId = event.eventId
      careMessage = addMessage({ coupleId: couple.coupleId, senderId: 'batiao', receiverId: couple.partner.userId, content: emotionDetector.careMessage(emotion.tag), type: 'emotion_care', emotionTag: emotion.tag, isRead: false })
      if (!careMessage) {
        return failedTransaction(snapshot, 'care_message_write_failed', '关怀消息保存失败，请重试', { careMessage: null, careEventId, careStatus: 'failed', emotion, cat: snapshot.cat, transition: null })
      }
      const finalized = markCareEventSent(careEventId)
      if (!finalized.ok) return failedTransaction(snapshot, 'care_event_finalize_failed', finalized.error.message, { careMessage: null, careEventId, careStatus: 'failed', emotion, cat: snapshot.cat, transition: null })
      careStatus = 'sent'
    }
  }
  return { ok: true, userMessage, botMessage, careMessage, careEventId, careStatus, emotion, cat, transition, messages: list() }
}
function markAllRead() {
  const messages = list().map((message) => Object.assign({}, message, { isRead: true }))
  const result = storage.setChecked(storage.KEYS.CHATS, messages)
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '消息保存失败，请重试' })
  return result.ok ? messages : list()
}
function clearMessages() {
  const chats = storage.setChecked(storage.KEYS.CHATS, [])
  const care = storage.setChecked(storage.KEYS.CARE_EVENTS, [])
  if (!chats.ok || !care.ok) { lastError = (!chats.ok && chats.error) || (!care.ok && care.error) || { code: 'storage_write_failed', message: '聊天清除失败，请重试' }; return list() }
  lastError = null
  return ensureWelcomeMessage()
}
function getLastError() { return lastError }

module.exports = { list, addMessage, ensureWelcomeMessage, sendMessage, markAllRead, clearMessages, getLastError }
