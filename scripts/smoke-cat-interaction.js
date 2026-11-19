#!/usr/bin/env node

// Headless contract smoke for the cat component, page gesture guard and
// derived experience progress. This does not claim to verify WeChat's native
// longpress/tap dispatch or renderer behavior.
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const storage = require('../miniprogram/services/storageService')
const catService = require('../miniprogram/services/catService')
const { getExperienceProgress, getFormAsset } = require('../miniprogram/models/cat')

const ROOT = path.resolve(__dirname, '..')
let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function clone(value) { return value === undefined ? value : JSON.parse(JSON.stringify(value)) }
function assignPath(target, key, value) {
  const parts = String(key).split('.')
  let cursor = target
  parts.slice(0, -1).forEach((part) => { if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {}; cursor = cursor[part] })
  cursor[parts[parts.length - 1]] = clone(value)
}

function loadComponent(relativePath) {
  let definition
  const previous = global.Component
  global.Component = (config) => { definition = config }
  const file = path.resolve(ROOT, relativePath)
  delete require.cache[require.resolve(file)]
  require(file)
  if (previous) global.Component = previous
  else delete global.Component
  check(definition, `${relativePath} registers a component definition`)
  return definition
}

function loadPage(relativePath) {
  let definition
  const previous = global.Page
  global.Page = (config) => { definition = config }
  const file = path.resolve(ROOT, relativePath)
  delete require.cache[require.resolve(file)]
  require(file)
  if (previous) global.Page = previous
  else delete global.Page
  check(definition, `${relativePath} registers a page definition`)
  const page = Object.assign({}, definition)
  page.data = clone(definition.data || {})
  page.setDataCalls = 0
  page.setData = (patch) => {
    page.setDataCalls += 1
    Object.keys(patch || {}).forEach((key) => assignPath(page.data, key, patch[key]))
  }
  return page
}

function resetStorage() {
  storage.clear()
  storage.initialize()
}

async function main() {
  const originalSetTimeout = global.setTimeout
  const originalClearTimeout = global.clearTimeout
  const pending = []
  global.setTimeout = (callback) => { pending.push(callback); return pending.length }
  global.clearTimeout = () => {}
  try {
    const component = loadComponent('miniprogram/components/cat-display/cat-display.js')
    const componentEvents = []
    const componentInstance = {
      data: { imagePath: '' },
      triggerEvent(name, detail) { componentEvents.push({ name, detail }) },
      setData(patch) { this.data = Object.assign({}, this.data, patch) }
    }
    component.methods.onPet.call(componentInstance, { type: 'longpress' })
    component.methods.onPet.call(componentInstance, { type: 'tap' })
    check(componentEvents.length === 1 && componentEvents[0].detail.source === 'longpress', 'component suppresses tap emitted after the same longpress')
    componentInstance._lastPetAt = Date.now() - 1000
    component.methods.onPet.call(componentInstance, { type: 'tap' })
    check(componentEvents.length === 2 && componentEvents[1].detail.source === 'tap' && componentEvents[1].detail.token, 'component emits a token for a later intentional tap')

    resetStorage()
    const originalPet = catService.pet
    let petCalls = 0
    catService.pet = function wrappedPet() { petCalls += 1; return originalPet() }
    const chat = loadPage('miniprogram/pages/chat/chat.js')
    chat.onLoad()
    const firstToken = { type: 'longpress', detail: { source: 'longpress', token: 'fixture-gesture' } }
    chat.onPet(firstToken)
    chat.onPet({ type: 'tap', detail: { source: 'tap', token: 'fixture-followup' } })
    check(petCalls === 1, 'page guard writes one pet for a longpress followed by its tap')
    check(chat.data.cat.exp === 1 && chat.data.progress.experience.current === 1, 'one pet updates cat experience and visible progress')
    chat._lastPetAt = Date.now() - 1000
    chat.onPet({ type: 'tap', detail: { source: 'tap', token: 'fixture-second' } })
    check(petCalls === 2 && chat.data.cat.exp === 2, 'later intentional interaction remains available')
    chat.onHide()
    const setDataCalls = chat.setDataCalls
    chat.onPet({ type: 'tap', detail: { source: 'tap', token: 'hidden' } })
    check(petCalls === 2 && chat.setDataCalls === setDataCalls, 'hidden page ignores stale pet callbacks')
    chat.onShow()
    chat.onPet({ type: 'tap', detail: { source: 'tap', token: 'fixture-after-show' } })
    check(petCalls === 3, 'page reactivation permits a new interaction')
    catService.pet = originalPet

    resetStorage()
    const feedResult = catService.feed()
    check(feedResult.ok && feedResult.previousState && feedResult.nextState.stateKey === 'eating', 'feed emits one eating state transition')
    const chatResult = catService.recordChat()
    check(chatResult.ok !== false && chatResult.previousState && chatResult.nextState.stateKey === 'happy', 'chat emits one happy state transition')
    const expired = catService.getCat({ now: new Date('2026-10-13T14:00:00+08:00').getTime() + 5000 })
    check(expired.stateKey === 'idle', 'expired transient action returns to derived idle state')
    const profile = loadPage('miniprogram/pages/profile/profile.js')
    profile.loadData()
    check(profile.data.stateText === '开心' && /happy/.test(profile.data.formStateClass), 'profile reads the same persisted state view as chat')

    const zero = getExperienceProgress(-8)
    const mid = getExperienceProgress(42)
    const full = getExperienceProgress(100)
    const overflow = getExperienceProgress(148)
    check(zero.current === 0 && zero.remaining === 100 && zero.percent === 0, 'invalid experience normalizes to zero')
    check(mid.current === 42 && mid.need === 100 && mid.remaining === 58 && mid.percent === 42, 'experience progress exposes current, need, remaining and percent')
    check(full.current === 100 && full.remaining === 0 && full.percent === 100, 'experience progress reaches the segment boundary')
    check(overflow.current === 100 && overflow.total === 148 && overflow.percent === 100, 'overflow is bounded without changing stored total')

    const wxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/cat-display/cat-display.wxml'), 'utf8')
    const chatWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/chat/chat.wxml'), 'utf8')
    const profileWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/profile/profile.wxml'), 'utf8')
    const catWxss = fs.readFileSync(path.join(ROOT, 'miniprogram/components/cat-display/cat-display.wxss'), 'utf8')
    const idleAsset = getFormAsset('baby', 'idle')
    const fallbackAsset = getFormAsset('genki', 'happy')
    check(idleAsset.hasDedicatedAsset && idleAsset.fallback === 'state', 'idle state uses the dedicated idle asset')
    check(!fallbackAsset.hasDedicatedAsset && fallbackAsset.fallback === 'idle' && fallbackAsset.imagePath === getFormAsset('genki', 'idle').imagePath && /idle 素材/.test(fallbackAsset.fallbackText), 'missing state asset falls back to the same-form idle asset with an explicit reason')
    for (const state of ['idle', 'happy', 'eating', 'sad', 'sleeping']) {
      const asset = getFormAsset('baby', state)
      check(asset.hasDedicatedAsset && asset.imagePath.endsWith(`/${state}.png`), `Lv.1 uses dedicated ${state} art`)
    }
    component.observers['cat.currentForm, cat.stateKey, state'].call(componentInstance, 'baby', 'happy', 'happy')
    const happyImage = componentInstance.data.imagePath
    const imageError = (src) => component.methods.onImageError.call(componentInstance, { currentTarget: { dataset: { src } } })
    imageError(happyImage)
    check(componentInstance.data.imagePath === idleAsset.imagePath && componentInstance.data.hasImage && componentInstance.data.stateText === '开心', 'failed state image falls back to the idle sprite without changing the state')
    imageError(happyImage)
    check(componentInstance.data.hasImage, 'stale image error does not remove the fallback image')
    imageError(idleAsset.imagePath)
    check(!componentInstance.data.hasImage && componentInstance.data.assetFallback === 'emoji', 'failed idle sprite falls back to an emoji')

    // Keep canceled callbacks in the stub so they can be delivered out of order.
    const originalNow = Date.now
    let timestamp = new Date(2026, 10, 19, 14).getTime()
    Date.now = () => timestamp
    try {
      resetStorage()
      chat.onShow()
      chat.feed()
      const expiresAt = chat.data.cat.stateUntil
      const staleFeedTimer = pending.at(-1)
      check(chat.data.catState === 'eating' && expiresAt === timestamp + 1200, 'feeding renders the eating window')
      chat.onHide()
      timestamp += 200
      chat.onShow()
      const resumedFeedTimer = pending.at(-1)
      staleFeedTimer()
      check(pending.at(-1) === resumedFeedTimer && chat.data.catState === 'eating', 'returning resumes eating and ignores an old page callback')
      timestamp = expiresAt
      resumedFeedTimer()
      check(chat.data.catState === 'idle' && chat.data.cat.todayFeedCount === 1, 'resumed eating expires at the original deadline without feeding again')
      const dayTimer = pending.at(-1)
      timestamp = new Date(2026, 10, 19, 22).getTime()
      dayTimer()
      check(chat.data.catState === 'sleeping', 'foreground at the night boundary resolves a sleeping sprite')
      timestamp = new Date(2026, 10, 20, 7).getTime()
      pending.at(-1)()
      check(chat.data.catState === 'idle', 'morning refresh resolves the idle sprite')
    } finally {
      chat.onUnload()
      Date.now = originalNow
    }
    check(/bindtap="onPet"/.test(wxml) && /bindlongpress="onPet"/.test(wxml), 'cat display registers tap and longpress on one handler')
    check(/当前状态/.test(wxml) && /点击或长按/.test(wxml) && /Emoji 占位/.test(wxml), 'cat display exposes readable state, gesture and image fallback copy')
    check(/<cat-display[^>]+bind:pet="onPet"/.test(chatWxml) && /bindtap="onPet"/.test(chatWxml), 'chat keeps both the interactive cat and pet button')
    check(/当前状态/.test(profileWxml) && /formImageFailed/.test(profileWxml) && /Emoji 占位/.test(profileWxml), 'profile exposes the state and reports actual image failures')
    check(/aria-label="当前形态：\{\{formName\}\}，状态：\{\{stateText\}\}"/.test(profileWxml), 'profile cat image and emoji fallback expose a readable state label')
    check(/progress\.experience\.percent/.test(chatWxml) && /progress\.experience\.current/.test(chatWxml), 'chat renders experience progress and numbers')
    check(/progress\.experience\.percent/.test(profileWxml) && /progress\.experience\.current/.test(profileWxml), 'profile renders the same experience progress')
    check(/translate3d/.test(catWxss) && /perspective/.test(catWxss) && /cat-display--reduced/.test(catWxss), 'cat display exposes 2.5D and reduced-motion CSS fallbacks')

    console.log('SMOKE_CAT_INTERACTION=PASS')
    console.log(`CAT_ASSERTIONS=${assertions}`)
  } finally {
    global.setTimeout = originalSetTimeout
    global.clearTimeout = originalClearTimeout
  }
}

main().catch((error) => {
  console.error(`SMOKE_CAT_INTERACTION_FAIL ${error.message}`)
  process.exitCode = 1
})
