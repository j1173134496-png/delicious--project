#!/usr/bin/env node

/** Offline model and migration invariant smoke. */
const assert = require('assert')
const storage = require('../miniprogram/services/storageService')
const { createDefaultUser } = require('../miniprogram/models/user')
const { createDefaultCat } = require('../miniprogram/models/cat')
const { createMessage } = require('../miniprogram/models/chat')
const { createRecipe } = require('../miniprogram/models/recipe')
const { createPhoto } = require('../miniprogram/models/photo')
const { createFeedback } = require('../miniprogram/models/feedback')
const { dateString } = require('../miniprogram/utils/dateUtil')

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }

async function main() {
  storage.clear()
  const today = dateString(new Date())
  const user = createDefaultUser({ userId: 42, nickname: '昵称'.repeat(30), signature: '签名'.repeat(40), birthday: '2999-01-01', anniversaryDate: '2999-01-01', gender: 'unknown', inviteCode: 'bad' })
  check(typeof user.userId === 'string' && user.userId.length > 0, 'user id is always a non-empty string')
  check(user.nickname.length <= 20 && user.signature.length <= 60 && user.birthday === '' && user.anniversaryDate === today, 'user text and future date bounds are deterministic')
  check(user.gender === '' && user.inviteCode === '', 'unknown user enum values fall back safely')

  const cat = createDefaultCat({ level: 'bad', exp: NaN, feedCount: -2, chatCount: '4.8', mood: NaN, hunger: 999, todayFeedCount: 99 })
  check(cat.level === 1 && cat.exp === 0 && cat.feedCount === 0 && cat.chatCount === 4 && cat.mood === 0 && cat.hunger === 100 && cat.todayFeedCount === 3, 'cat counters and percentages stay finite and bounded')
  const message = createMessage({ messageId: '', content: 'x'.repeat(800), isRead: 'false', type: 'unknown', createdAt: NaN })
  check(message.messageId && message.content.length <= 500 && message.isRead === false && message.type === 'text', 'message input has id, text and boolean invariants')
  const recipe = createRecipe({ recipeId: '', name: '菜谱', category: 'unknown', rating: NaN, photos: ['emoji:🍲', 'emoji:🍲'], likes: ['u', 'u'] })
  check(recipe.recipeId && recipe.category === 'custom' && recipe.rating === 0 && recipe.photos.length === 1 && recipe.likes.length === 1, 'recipe category, rating, photo and like invariants hold')
  const photo = createPhoto({ photoId: '', imagePath: '???', date: '2999-01-01', month: 'wrong' })
  check(photo.photoId && photo.imagePath === 'emoji:🖼️' && photo.date === today && photo.month === today.slice(0, 7), 'photo bad path and future date fall back with consistent month')
  const feedback = createFeedback({ feedbackId: '', category: 'unknown', content: '内容', contact: 'c'.repeat(100) })
  check(feedback.feedbackId && feedback.category === 'other' && feedback.contact.length <= 60 && feedback.status === 'saved_local', 'feedback enum and contact bounds hold')

  storage.set(storage.KEYS.META, { schemaVersion: 3, schemaName: '1.2', initializedAt: 123 })
  storage.set(storage.KEYS.USER, { userId: '', nickname: '保留资料'.repeat(10), birthday: '2999-01-01' })
  storage.set(storage.KEYS.CAT, { level: 'bad', feedCount: -1, mood: NaN, todayFeedCount: 99 })
  storage.set(storage.KEYS.CHATS, [
    { messageId: 'same', content: '短', createdAt: 1 },
    { messageId: 'same', content: '更完整的消息', createdAt: 2 },
    null,
    { messageId: '', content: '' }
  ])
  storage.set(storage.KEYS.CARE_EVENTS, [{ eventId: 'care', tag: '难过', createdAt: 1 }, { eventId: 'care', tag: '', createdAt: 2 }])
  storage.set(storage.KEYS.RECIPES, [{ recipeId: 'recipe', name: '旧菜谱', category: 'unknown', rating: 99, photos: ['bad-path'] }, { recipeId: 'recipe', name: '更新菜谱', category: 'dessert', createdAt: 2 }])
  storage.set(storage.KEYS.PHOTOS, [{ photoId: 'photo', imagePath: 'local://one', date: today, month: 'wrong' }, { photoId: 'photo', imagePath: 'local://one', date: today, month: 'wrong' }, { imagePath: '' }])
  storage.set(storage.KEYS.FEEDBACK, [{ feedbackId: 'feedback', category: 'unknown', content: '反馈内容', createdAt: 1 }, { feedbackId: '', category: 'bug', content: '' }])
  const first = storage.initialize()
  check(first.migrated && first.schemaVersion === 4 && first.schemaName === '1.3', 'legacy fixture migrates without a schema bump')
  check(first.deduped >= 3 && first.dropped >= 2 && Object.keys(first.dropReasons).length > 0, 'migration reports deduped, dropped and reason diagnostics')
  const firstSnapshot = JSON.stringify({ user: storage.get(storage.KEYS.USER, {}), cat: storage.get(storage.KEYS.CAT, {}), chats: storage.list(storage.KEYS.CHATS), care: storage.list(storage.KEYS.CARE_EVENTS), recipes: storage.list(storage.KEYS.RECIPES), photos: storage.list(storage.KEYS.PHOTOS), feedback: storage.list(storage.KEYS.FEEDBACK), meta: storage.get(storage.KEYS.META, {}) })
  const second = storage.initialize()
  const secondSnapshot = JSON.stringify({ user: storage.get(storage.KEYS.USER, {}), cat: storage.get(storage.KEYS.CAT, {}), chats: storage.list(storage.KEYS.CHATS), care: storage.list(storage.KEYS.CARE_EVENTS), recipes: storage.list(storage.KEYS.RECIPES), photos: storage.list(storage.KEYS.PHOTOS), feedback: storage.list(storage.KEYS.FEEDBACK), meta: storage.get(storage.KEYS.META, {}) })
  check(!second.migrated && second.deduped === 0 && second.dropped === 0 && firstSnapshot === secondSnapshot, 'second initialize is idempotent including timestamps and diagnostics')
  check(storage.get(storage.KEYS.USER, {}).nickname.length <= 20 && storage.get(storage.KEYS.USER, {}).birthday === '', 'legacy user remains safe after migration')
  check(storage.list(storage.KEYS.RECIPES)[0].category === 'custom' && storage.list(storage.KEYS.RECIPES)[0].photos[0] === 'emoji:🖼️', 'recipe duplicate selection keeps the fuller record and bad path fallback is deterministic')
  check(storage.list(storage.KEYS.PHOTOS)[0].month === today.slice(0, 7), 'photo month is derived from normalized date')
  check(storage.list(storage.KEYS.CHATS).length === 1 && storage.list(storage.KEYS.CHATS)[0].content === '更完整的消息', 'duplicate chat keeps the more complete record')

  console.log('SMOKE_INVARIANTS=PASS')
  console.log(`INVARIANT_ASSERTIONS=${assertions}`)
  console.log(`REPAIRED=${first.repaired} DEDUPED=${first.deduped} DROPPED=${first.dropped} FAILED=${first.failed}`)
}

main().catch((error) => {
  console.error(`SMOKE_INVARIANTS_FAIL ${error.message}`)
  process.exitCode = 1
})
