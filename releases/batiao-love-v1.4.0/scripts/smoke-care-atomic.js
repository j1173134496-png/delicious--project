#!/usr/bin/env node

// Headless care-event transaction smoke. It exercises dedupe and each local
// write failure without claiming delivery to a real partner or notification.
const assert = require('assert')
const storage = require('../miniprogram/services/storageService')
const userService = require('../miniprogram/services/userService')
const chatService = require('../miniprogram/services/chatService')

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function failStorage(key, value, code) { return { ok: false, key, value, error: { code, message: code === 'storage_quota' ? '本地空间不足' : '关怀记录保存失败' } } }
function resetStorage() {
  delete global.wx
  storage.clear()
  storage.initialize()
  storage.set(storage.KEYS.COUPLE, { coupleId: 'local-couple', partner: { userId: 'partner-user', nickname: 'Ta' }, anniversaryDate: '2026-01-01' })
  userService.updateSettings({ emotionCareEnabled: true, notificationsEnabled: true })
  storage.set(storage.KEYS.CHATS, [])
  storage.set(storage.KEYS.CARE_EVENTS, [])
}

async function main() {
  resetStorage()
  const originalSetChecked = storage.setChecked

  const first = chatService.sendMessage('我很失望，这段原始吐槽不应进入关怀消息')
  check(first.ok && first.careMessage && first.careMessage.type === 'emotion_care' && first.careEventId && first.careStatus === 'sent', 'care event and generalized message commit with a stable event id')
  check(first.careMessage.content.indexOf('原始吐槽') < 0 && first.careMessage.content.indexOf('我很失望') < 0, 'care message stays generalized and contains no raw input')
  const storedFirstEvent = storage.list(storage.KEYS.CARE_EVENTS)[0]
  check(storedFirstEvent.eventId === first.careEventId && storedFirstEvent.deliveryState === 'sent', 'stored care event has eventId, tag, time and sent state')

  const duplicate = chatService.sendMessage('我还是很失望')
  check(duplicate.ok && !duplicate.careMessage && duplicate.careStatus === 'deduped', 'same tag is deduped within 24 hours')

  storage.set(storage.KEYS.CHATS, [])
  storage.set(storage.KEYS.CARE_EVENTS, [{ eventId: 'old-care', tag: '失望', createdAt: Date.now() - 86400001, deliveryState: 'sent' }])
  const afterWindow = chatService.sendMessage('过了一天我又失望了')
  check(afterWindow.ok && afterWindow.careMessage && afterWindow.careEventId !== 'old-care', 'same tag can send again after the 24 hour window')

  storage.set(storage.KEYS.CHATS, [])
  storage.set(storage.KEYS.CARE_EVENTS, [])
  storage.setChecked = (key, value) => key === storage.KEYS.CARE_EVENTS ? failStorage(key, value, 'storage_write_failed') : originalSetChecked(key, value)
  const cleanupFailure = chatService.sendMessage('我很孤独')
  check(!cleanupFailure.ok && cleanupFailure.reason === 'care_event_cleanup_failed' && !cleanupFailure.careMessage, 'care cleanup failure has stable failure semantics')
  check(storage.list(storage.KEYS.CHATS).length === 0, 'care cleanup failure writes no chat messages')
  storage.setChecked = originalSetChecked

  storage.set(storage.KEYS.CHATS, [])
  storage.set(storage.KEYS.CARE_EVENTS, [])
  let careWrites = 0
  storage.setChecked = (key, value) => {
    if (key === storage.KEYS.CARE_EVENTS) {
      careWrites += 1
      if (careWrites === 2) return failStorage(key, value, 'storage_quota')
    }
    return originalSetChecked(key, value)
  }
  const eventFailure = chatService.sendMessage('我很焦虑')
  check(!eventFailure.ok && eventFailure.reason === 'care_event_write_failed' && !eventFailure.careMessage, 'care event write failure does not report a delivered message')
  storage.setChecked = originalSetChecked
  check(storage.list(storage.KEYS.CHATS).length === 0 && storage.list(storage.KEYS.CARE_EVENTS).length === 0, 'care event write failure rolls back chat and event collections')

  storage.set(storage.KEYS.CHATS, [])
  storage.set(storage.KEYS.CARE_EVENTS, [])
  let botWrites = 0
  storage.setChecked = (key, value) => {
    if (key === storage.KEYS.CHATS && Array.isArray(value)) {
      botWrites += 1
      if (botWrites === 2) return failStorage(key, value, 'storage_write_failed')
    }
    return originalSetChecked(key, value)
  }
  const botFailure = chatService.sendMessage('回复写入失败也不能留下用户消息')
  check(!botFailure.ok && !botFailure.careMessage && storage.list(storage.KEYS.CHATS).length === 0, 'bot message failure rolls back the user message')
  storage.setChecked = originalSetChecked

  storage.set(storage.KEYS.CHATS, [])
  storage.set(storage.KEYS.CARE_EVENTS, [])
  let catWrites = 0
  storage.setChecked = (key, value) => {
    if (key === storage.KEYS.CAT) {
      catWrites += 1
      if (catWrites === 1) return failStorage(key, value, 'storage_write_failed')
    }
    return originalSetChecked(key, value)
  }
  const catFailure = chatService.sendMessage('猫状态写入失败也不能留下聊天')
  check(!catFailure.ok && !catFailure.careMessage && storage.list(storage.KEYS.CHATS).length === 0 && storage.list(storage.KEYS.CARE_EVENTS).length === 0, 'cat state failure rolls back both chat messages and care events')
  storage.setChecked = originalSetChecked

  const retry = chatService.sendMessage('失败后可以重试')
  check(retry.ok && retry.messages.length >= 2, 'chat transaction can retry after a local write failure')

  storage.set(storage.KEYS.CHATS, [])
  storage.set(storage.KEYS.CARE_EVENTS, [])
  storage.setChecked = (key, value) => {
    if (key === storage.KEYS.CHATS && Array.isArray(value) && value.some((message) => message && message.type === 'emotion_care')) return failStorage(key, value, 'storage_write_failed')
    return originalSetChecked(key, value)
  }
  const messageFailure = chatService.sendMessage('我有点委屈')
  check(!messageFailure.ok && messageFailure.reason === 'care_message_write_failed' && messageFailure.careStatus === 'failed' && !messageFailure.careMessage, 'care message failure rolls back the pending event and reports retry')
  storage.setChecked = originalSetChecked
  check(storage.list(storage.KEYS.CARE_EVENTS).length === 0, 'care message failure leaves no orphan event after rollback')

  console.log('SMOKE_CARE_ATOMIC=PASS')
  console.log(`CARE_ASSERTIONS=${assertions}`)
}

main().catch((error) => {
  console.error(`SMOKE_CARE_ATOMIC_FAIL ${error.message}`)
  process.exitCode = 1
})
