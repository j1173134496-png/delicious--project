const { generateId, now, safeText } = require('../utils/util')

function createMessage(input) {
  const source = input || {}
  const isRead = source.isRead === true || source.isRead === 1 || source.isRead === '1' || source.isRead === 'true'
  const messageId = String(source.messageId || '').trim() || generateId('msg')
  const createdAt = Number(source.createdAt)
  return {
    messageId: messageId.slice(0, 100),
    coupleId: safeText(source.coupleId || 'local-couple', 80),
    senderId: safeText(source.senderId || 'batiao', 80),
    receiverId: safeText(source.receiverId, 80),
    content: safeText(source.content || '', 500),
    type: ['text', 'system', 'emotion_care'].indexOf(source.type) >= 0 ? source.type : 'text',
    emotionTag: safeText(source.emotionTag, 40),
    isRead,
    createdAt: Number.isFinite(createdAt) && createdAt > 0 ? createdAt : now()
  }
}

module.exports = { createMessage }
