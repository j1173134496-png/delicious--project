#!/usr/bin/env node

const assert = require('assert')
const path = require('path')
const storage = require('../miniprogram/services/storageService')
const albumService = require('../miniprogram/services/albumService')
const catService = require('../miniprogram/services/catService')

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function clone(value) { return value === undefined ? value : JSON.parse(JSON.stringify(value)) }
function assignPath(target, key, value) {
  const parts = String(key).split('.')
  let cursor = target
  parts.slice(0, -1).forEach((part) => { if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {}; cursor = cursor[part] })
  cursor[parts[parts.length - 1]] = clone(value)
}
function loadPage(relativePath) {
  let definition
  const previous = global.Page
  global.Page = (config) => { definition = config }
  const file = path.resolve(__dirname, '..', relativePath)
  delete require.cache[require.resolve(file)]
  require(file)
  if (previous) global.Page = previous
  else delete global.Page
  const page = Object.assign({}, definition)
  page.data = clone(definition.data || {})
  page.setDataCalls = 0
  page.setData = (patch) => { page.setDataCalls += 1; Object.keys(patch || {}).forEach((key) => assignPath(page.data, key, patch[key])) }
  return page
}

async function main() {
  storage.clear()
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  const originalWx = global.wx
  const pending = new Map()
  let nextTimer = 0
  const toasts = []
  const navigations = []
  const originalSaveImages = albumService.saveImages
  // Keep callbacks in the queue after clearTimeout so token guards are tested
  // even when an embedding runtime cannot cancel a queued callback.
  global.setTimeout = (callback) => { const id = ++nextTimer; pending.set(id, callback); return id }
  global.clearTimeout = () => {}
  global.wx = {
    showToast(payload) { toasts.push(payload) },
    navigateBack(payload) { navigations.push(payload && payload.delta); if (payload && payload.success) payload.success({}) },
    canIUse() { return true }
  }
  const flushTimers = () => { const callbacks = Array.from(pending.values()); pending.clear(); callbacks.forEach((callback) => callback()) }

  try {
    const chatService = require('../miniprogram/services/chatService')
    const chat = loadPage('miniprogram/pages/chat/chat.js')
    chat.onLoad()
    const firstToastCount = toasts.length
    chat.send = chat.send.bind(chat)
    chat.setData({ inputValue: '隐藏后不应更新状态' })
    chat.send()
    const hiddenSetData = chat.setDataCalls
    const hiddenToast = toasts.length
    chat.onHide()
    flushTimers()
    check(chat.setDataCalls === hiddenSetData && toasts.length === hiddenToast, 'chat timers do not update or toast after onHide')
    check(chatService.list().length > 0, 'chat service write completed before lifecycle cancellation')

    chat.onShow()
    chat.setData({ sending: true, inputValue: '重复点击' })
    const beforeBlocked = chatService.list().length
    chat.send()
    check(chatService.list().length === beforeBlocked, 'busy guard prevents a repeated chat write')
    chat.setData({ sending: false, inputValue: '显示后应执行动画' })
    const activeSetData = chat.setDataCalls
    chat.send()
    flushTimers()
    check(chat.setDataCalls > activeSetData, 'active chat timers update the visible page')
    check(toasts.length >= firstToastCount, 'active chat interaction keeps its user feedback')

    storage.clear()
    storage.initialize()
    const fed = catService.feed()
    const statePage = loadPage('miniprogram/pages/chat/chat.js')
    statePage.onLoad()
    check(fed.ok && statePage.data.catState === 'eating', 'chat onLoad restores the persisted action state')
    statePage.onHide()
    statePage.onShow()
    check(statePage.data.catState === 'eating', 'chat onShow keeps cross-page state until the action expires')

    let resolveSave
    let saveCalls = 0
    albumService.saveImages = () => { saveCalls += 1; return new Promise((resolve) => { resolveSave = resolve }) }
    const upload = loadPage('miniprogram/pages/album-upload/album-upload.js')
    upload.onLoad()
    upload.onShow()
    upload.setData({ images: ['local://deferred'], date: '2026-09-27' })
    const uploadPromise = upload.save()
    upload.onHide()
    const uploadSetData = upload.setDataCalls
    const uploadToast = toasts.length
    resolveSave([{ photoId: 'p', imagePath: 'local://deferred' }])
    await uploadPromise
    flushTimers()
    check(saveCalls === 1, 'hidden upload still lets the Service operation finish once')
    check(upload.setDataCalls === uploadSetData && toasts.length === uploadToast, 'hidden upload skips stale success UI and navigation')
    albumService.saveImages = originalSaveImages

    const profile = loadPage('miniprogram/pages/profile-edit/profile-edit.js')
    profile.onLoad()
    profile.onShow()
    profile.setData({ 'form.nickname': '生命周期用户' })
    profile.save()
    const profileNav = navigations.length
    profile.onHide()
    flushTimers()
    check(navigations.length === profileNav, 'profile navigation timer is cancelled after hide')
    profile.onShow()
    check(!profile.data.saving && !profile.data.avatarSaving, 'page re-show resets lifecycle busy flags')

    console.log('SMOKE_LIFECYCLE=PASS')
    console.log(`LIFECYCLE_ASSERTIONS=${assertions}`)
  } finally {
    albumService.saveImages = originalSaveImages
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
    if (originalWx === undefined) delete global.wx
    else global.wx = originalWx
  }
}

main().catch((error) => {
  console.error(`SMOKE_LIFECYCLE_FAIL ${error.message}`)
  process.exitCode = 1
})
