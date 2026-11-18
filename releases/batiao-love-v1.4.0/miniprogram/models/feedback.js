const { generateId, now, safeText } = require('../utils/util')

const FEEDBACK_CATEGORIES = [
  { key: 'bug', label: '问题反馈' },
  { key: 'feature', label: '功能建议' },
  { key: 'experience', label: '体验感受' },
  { key: 'other', label: '其他' }
]

function createFeedback(input) {
  const source = input || {}
  const categories = FEEDBACK_CATEGORIES.map((item) => item.key)
  const category = categories.indexOf(source.category) >= 0 ? source.category : 'other'
  return {
    feedbackId: safeText(source.feedbackId, 100) || generateId('feedback'),
    category: safeText(category, 20),
    content: safeText(source.content || '', 500),
    contact: safeText(source.contact || '', 60),
    createdAt: Number.isFinite(Number(source.createdAt)) && Number(source.createdAt) > 0 ? Number(source.createdAt) : now(),
    status: 'saved_local'
  }
}

module.exports = { FEEDBACK_CATEGORIES, createFeedback }
