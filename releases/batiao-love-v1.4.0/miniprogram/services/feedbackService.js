const storage = require('./storageService')
const { FEEDBACK_CATEGORIES, createFeedback } = require('../models/feedback')
const { safeText } = require('../utils/util')
const { LIMITS } = require('../utils/limits')

const CATEGORY_KEYS = FEEDBACK_CATEGORIES.map((item) => item.key)
let lastError = null

function ensure() { storage.initialize() }
function list() { ensure(); return storage.list(storage.KEYS.FEEDBACK).sort((left, right) => Number(right.createdAt || 0) - Number(left.createdAt || 0)) }
function getCategoryOptions() { return FEEDBACK_CATEGORIES.slice() }
function validate(input) {
  const source = input || {}
  const category = safeText(source.category || '', 20)
  const content = String(source.content === undefined || source.content === null ? '' : source.content).trim()
  if (CATEGORY_KEYS.indexOf(category) < 0) return { ok: false, code: 'invalid_category', message: '请选择反馈类型' }
  if (content.length < 5) return { ok: false, code: 'content_too_short', message: '反馈内容至少写 5 个字' }
  if (content.length > 500) return { ok: false, code: 'content_too_long', message: '反馈内容最多 500 个字' }
  const contact = safeText(source.contact || '', 60)
  return { ok: true, category, content, contact }
}
function submit(input) {
  ensure()
  const checked = validate(input)
  if (!checked.ok) return checked
  const existing = storage.list(storage.KEYS.FEEDBACK)
  if (input && input.feedbackId && existing.some((record) => record.feedbackId === input.feedbackId)) return { ok: false, code: 'duplicate_feedback', message: '这条反馈已经保存过了' }
  if (existing.length >= LIMITS.FEEDBACK) {
    lastError = { code: 'feedback_limit', message: '反馈记录已达到上限，请先清理旧记录' }
    return { ok: false, code: 'feedback_limit', message: lastError.message, retryable: true }
  }
  const record = createFeedback(checked)
  const records = existing.concat(record)
  const result = storage.setChecked(storage.KEYS.FEEDBACK, records)
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '反馈保存失败，请重试' })
  if (!result.ok) return { ok: false, code: lastError.code || 'storage_write_failed', message: lastError.message || '反馈保存失败，请重试' }
  return { ok: true, record, message: '已记录在本设备，尚未发送到服务器' }
}
function clear() { ensure(); const result = storage.setChecked(storage.KEYS.FEEDBACK, []); lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '反馈清除失败，请重试' }); return result.ok ? [] : list() }
function formatForCopy(record) {
  const item = record || {}
  const category = FEEDBACK_CATEGORIES.find((option) => option.key === item.category)
  const label = category ? category.label : '其他'
  const time = item.createdAt ? new Date(item.createdAt).toLocaleString() : ''
  const contact = item.contact ? `\n联系方式：${item.contact}` : ''
  return `八条与你意见反馈\n类型：${label}\n内容：${item.content || ''}${contact}\n时间：${time}\n状态：仅保存在本设备，尚未发送到服务器`
}

function getLastError() { return lastError }

module.exports = { list, getCategoryOptions, validate, submit, clear, formatForCopy, getLastError }
