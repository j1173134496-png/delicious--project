#!/usr/bin/env node

/**
 * Headless page smoke for the native mini program.
 *
 * This intentionally uses only Node built-ins and a small wx/Page recorder.
 * It proves page branches and Service synchronization without pretending to
 * verify WeChat's renderer, share sheet, permissions, keyboard, gestures, or
 * file system implementation.
 */
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const storage = require('../miniprogram/services/storageService')
const userService = require('../miniprogram/services/userService')
const catService = require('../miniprogram/services/catService')
const chatService = require('../miniprogram/services/chatService')
const recipeService = require('../miniprogram/services/recipeService')
const albumService = require('../miniprogram/services/albumService')
const feedbackService = require('../miniprogram/services/feedbackService')
const { dateString } = require('../miniprogram/utils/dateUtil')
const { APP_VERSION, LOCAL_MODE_NAME } = require('../miniprogram/utils/appMeta')
const { LIMITS } = require('../miniprogram/utils/limits')

const ROOT = path.resolve(__dirname, '..')
const originalSetTimeout = global.setTimeout
const scheduledTimers = []
let assertionCount = 0

function check(condition, message) { assertionCount += 1; assert.ok(condition, message) }

function clone(value) {
  if (value === undefined || value === null) return value
  return JSON.parse(JSON.stringify(value))
}

function assignPath(target, key, value) {
  const parts = String(key).split('.')
  let cursor = target
  parts.slice(0, -1).forEach((part) => {
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {}
    cursor = cursor[part]
  })
  cursor[parts[parts.length - 1]] = clone(value)
}

function makePage(definition) {
  const page = Object.assign({}, definition)
  page.data = clone(definition.data || {})
  page.setData = (patch, callback) => {
    Object.keys(patch || {}).forEach((key) => assignPath(page.data, key, patch[key]))
    if (typeof callback === 'function') callback()
  }
  return page
}

function loadPage(relativePath) {
  let definition = null
  const previousPage = global.Page
  global.Page = (config) => { definition = config }
  const absolutePath = path.join(ROOT, relativePath)
  delete require.cache[require.resolve(absolutePath)]
  require(absolutePath)
  if (previousPage) global.Page = previousPage
  else delete global.Page
  check(definition, `${relativePath} registers a Page definition`)
  return makePage(definition)
}

function loadComponent(relativePath) {
  let definition = null
  const hadComponent = Object.prototype.hasOwnProperty.call(global, 'Component')
  const previousComponent = global.Component
  const absolutePath = path.join(ROOT, relativePath)
  const resolvedPath = require.resolve(absolutePath)
  const previousModule = require.cache[resolvedPath]
  global.Component = (config) => { definition = config }
  delete require.cache[resolvedPath]
  try {
    require(resolvedPath)
  } finally {
    if (previousModule) require.cache[resolvedPath] = previousModule
    else delete require.cache[resolvedPath]
    if (hadComponent) global.Component = previousComponent
    else delete global.Component
  }
  check(definition, `${relativePath} registers a Component definition`)
  return definition
}

function hasTagNameSelector(wxss) {
  const tagName = /(?:^|[\s>+~])(?:view|text|image|button|navigator|scroll-view|swiper|block)(?=$|[\s>+~.#:]|\[)/
  return wxss.split('}').some((rule) => {
    const brace = rule.indexOf('{')
    if (brace < 0) return false
    return rule.slice(0, brace).split(',').some((selector) => tagName.test(selector.trim()))
  })
}

function makeWx(options) {
  const settings = options || {}
  const state = { navigations: [], titles: [], back: [], tabs: [], clipboard: [], toasts: [], modals: [], chooseImageCalls: 0, savedPhotos: [] }
  const wx = {
    setNavigationBarTitle(payload) { state.titles.push(payload.title) },
    canIUse(api) { return settings.canIUse === undefined ? true : (typeof settings.canIUse === 'function' ? settings.canIUse(api) : Boolean(settings.canIUse)) },
    navigateTo(payload) {
      state.navigations.push(payload.url)
      if (settings.navigationFail) return payload.fail && payload.fail({ errMsg: 'navigateTo:fail' })
      if (payload.success) payload.success({})
    },
    navigateBack(payload) {
      state.back.push(payload && payload.delta)
      if (settings.backFail) return payload && payload.fail && payload.fail({ errMsg: 'navigateBack:fail' })
      if (payload && payload.success) payload.success({})
    },
    switchTab(payload) {
      state.tabs.push(payload.url)
      if (settings.switchTabFail) return payload.fail && payload.fail({ errMsg: 'switchTab:fail' })
      if (payload.success) payload.success({})
    },
    setClipboardData(payload) {
      state.clipboard.push(payload.data)
      if (settings.clipboardFail) {
        if (payload.fail) payload.fail({ errMsg: settings.clipboardError || 'setClipboardData:fail' })
      } else if (payload.success) payload.success({})
      if (payload.complete) payload.complete({})
    },
    showToast(payload) { state.toasts.push(payload) },
    showModal(payload) {
      state.modals.push(payload)
      if (payload.success) payload.success(settings.modalResult || { confirm: true, cancel: false, content: payload.content || '' })
      if (payload.complete) payload.complete({})
    },
    chooseImage(payload) {
      state.chooseImageCalls += 1
      if (settings.chooseImageFail) {
        if (payload.fail) payload.fail({ errMsg: settings.chooseImageError || 'chooseImage:fail cancel' })
      } else if (payload.success) payload.success({ tempFilePaths: settings.tempFilePaths || ['local://headless-image'] })
      if (payload.complete) payload.complete({})
    },
    saveImageToPhotosAlbum(payload) {
      state.savedPhotos.push(payload.filePath)
      if (settings.saveImageFail) {
        if (payload.fail) payload.fail({ errMsg: settings.saveImageError || 'saveImageToPhotosAlbum:fail auth denied' })
      } else if (payload.success) payload.success({})
      if (payload.complete) payload.complete({})
    },
    stopPullDownRefresh() {}
  }
  global.wx = wx
  return state
}

function resetStorage() {
  storage.clear()
  storage.initialize()
}

function flushTimers() {
  // Treat callbacks scheduled during this batch as future ticks.
  scheduledTimers.splice(0).forEach((callback) => callback())
}

async function main() {
  let timerId = 0
  global.setTimeout = (callback) => { scheduledTimers.push(callback); return ++timerId }
  resetStorage()
  let wxState = makeWx()

  // Share → open → prefill → bind → unbind → profile/album refresh.
  const profile = loadPage('miniprogram/pages/profile/profile.js')
  profile.onShow()
  const catDisplayWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/cat-display/cat-display.wxml'), 'utf8')
  const chatWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/chat/chat.wxml'), 'utf8')
  const profileWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/profile/profile.wxml'), 'utf8')
  check(/aria-label="当前形态：\{\{formName\}\}，状态：\{\{stateText\}\}"/.test(profileWxml), 'profile cat visual has a readable aria label')
  const recipeUxWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/recipe/recipe.wxml'), 'utf8')
  const albumUxWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/album/album.wxml'), 'utf8')
  const bindUxWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/bind/bind.wxml'), 'utf8')
  const feedbackUxWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/feedback/feedback.wxml'), 'utf8')
  const settingsUxWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/settings/settings.wxml'), 'utf8')
  const navUxWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/nav-bar/nav-bar.wxml'), 'utf8')
  const loadingWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/loading/loading.wxml'), 'utf8')
  const loadingWxss = fs.readFileSync(path.join(ROOT, 'miniprogram/components/loading/loading.wxss'), 'utf8')
  const recipeCardWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/recipe-card/recipe-card.wxml'), 'utf8')
  const recipeCardWxss = fs.readFileSync(path.join(ROOT, 'miniprogram/components/recipe-card/recipe-card.wxss'), 'utf8')
  const photoCardWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/photo-card/photo-card.wxml'), 'utf8')
  const photoCardWxss = fs.readFileSync(path.join(ROOT, 'miniprogram/components/photo-card/photo-card.wxss'), 'utf8')
  const profileWxss = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/profile/profile.wxss'), 'utf8')
  check(/点击或长按/.test(catDisplayWxml) && /当前状态/.test(catDisplayWxml) && /bindtap="onPet"/.test(catDisplayWxml) && /bindlongpress="onPet"/.test(catDisplayWxml) && /assetFallback === 'emoji' \? '，显示 Emoji 占位'/.test(catDisplayWxml), 'cat display exposes readable gesture, state and image fallback copy')
  check(/<cat-display[^>]+bind:pet="onPet"/.test(chatWxml) && /bindtap="onPet"/.test(chatWxml), 'chat exposes both cat gesture and button entry points')
  check(/当前状态/.test(profileWxml) && /formImageFailed/.test(profileWxml) && /Emoji 占位/.test(profileWxml), 'profile reports cat state and failed media')
  check(/recipe-tab-state/.test(recipeUxWxml) && /当前分类/.test(recipeUxWxml) && /新增菜品/.test(recipeUxWxml), 'recipe tabs expose current state/count and a labeled add action')
  check(/照片预览/.test(albumUxWxml) && /长按照片可尝试保存到系统相册/.test(albumUxWxml) && /编辑签名/.test(albumUxWxml), 'album exposes labeled preview/save/signature actions')
  check(/不会自动绑定/.test(bindUxWxml) && /跨设备同步/.test(bindUxWxml) && /手动记录/.test(bindUxWxml) && /确认绑定/.test(bindUxWxml), 'bind page exposes local-only boundary and explicit confirmation copy')
  check(/本设备/.test(feedbackUxWxml) && /contentCount/.test(feedbackUxWxml) && /5[–-]500/.test(feedbackUxWxml) && /aria-label/.test(feedbackUxWxml), 'feedback page exposes local status, count and readable fields')
  check(/已开启/.test(settingsUxWxml) && /已关闭/.test(settingsUxWxml) && /清除当前设备/.test(settingsUxWxml), 'settings page exposes switch state and local clear boundary')
  check(/返回上一页/.test(navUxWxml) && /aria-label/.test(navUxWxml), 'navigation bar exposes a readable back action')
  check(/class="loading__dot"/.test(loadingWxml) && /class="loading__text"/.test(loadingWxml) && /\.loading > \.loading__dot \+ \.loading__text\s*\{[^}]*margin-left:\s*12rpx/.test(loadingWxss) && !hasTagNameSelector(loadingWxss), 'loading spacing uses node classes without component WXSS tag selectors')
  check(/class="recipe-cover__image"[^>]*binderror="onImageError"/.test(recipeCardWxml) && /class="recipe-placeholder-label">照片占位/.test(recipeCardWxml) && /class="lock-badge">待解锁/.test(recipeCardWxml) && /recipe-drawing__lock/.test(recipeCardWxss) && !hasTagNameSelector(recipeCardWxss), 'recipe card preserves a real cover, readable photo fallback and a distinct locked illustration')
  check(/class="photo-card__image"/.test(photoCardWxml) && /class="photo-placeholder__icon"/.test(photoCardWxml) && /class="photo-placeholder__caption"/.test(photoCardWxml) && /photo-placeholder__icon, \.photo-placeholder__caption\s*\{[^}]*font-size:\s*68rpx[^}]*opacity:\s*\.7/.test(photoCardWxss) && /photo-placeholder__caption\s*\{[^}]*font-size:\s*18rpx/.test(photoCardWxss) && !hasTagNameSelector(photoCardWxss), 'photo card class selectors preserve image and placeholder text styles without tag selectors')
  check(/class="profile-hero__avatar"/.test(profileWxml) && /\.profile-hero__avatar, \.profile-hero > \.edit-link\s*\{[^}]*flex-shrink:\s*0/.test(profileWxss) && /\.profile-hero__copy\s*\{[^}]*min-width:\s*0/.test(profileWxss) && /\.profile-signature\s*\{[^}]*min-width:\s*0[^}]*overflow:\s*hidden[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/.test(profileWxss), 'profile hero protects avatar/copy width and truncates the signature to one line')
  const avatarComponent = loadComponent('miniprogram/components/avatar/avatar.js')
  check(avatarComponent.properties.avatar.type === null, 'avatar component accepts null at its property boundary')
  let normalizedNullAvatar = null
  avatarComponent.observers.avatar.call({ data: { fallback: '' }, setData(patch) { normalizedNullAvatar = patch } }, null)
  check(normalizedNullAvatar && normalizedNullAvatar.imagePath === '' && normalizedNullAvatar.hasImage === false && normalizedNullAvatar.fallbackText === '🐰', 'avatar observer normalizes null to fallback without an image path')
  const profileShare = profile.onShareAppMessage()
  check(/^\/pages\/bind\/bind\?code=[A-Z0-9]{6}$/.test(profileShare.path), 'unbound profile share carries only a six-character code')
  const sharedCode = profileShare.path.split('=')[1]
  const bind = loadPage('miniprogram/pages/bind/bind.js')
  bind.onLoad({ code: sharedCode })
  check(bind.data.inputCode === sharedCode && !userService.getCouple().partner, 'valid invite query prefills without auto-binding')
  const invalidBind = loadPage('miniprogram/pages/bind/bind.js')
  invalidBind.onLoad({ inviteCode: 'bad' })
  check(invalidBind.data.inputCode === '' && invalidBind.data.inviteHint.indexOf('无效') >= 0 && !userService.getCouple().partner, 'invalid invite query stays editable and does not bind')
  bind.setData({ inputCode: sharedCode })
  bind.bind()
  check(!userService.getCouple().partner && bind.data.inviteHint, 'self invite code is rejected with inline guidance without binding')
  bind.onInput({ detail: { value: 'ABCD23' } })
  bind.bind()
  check(Boolean(userService.getCouple().partner) && bind.data.isBound, 'local bind succeeds after explicit confirmation')
  bind.onInput({ detail: { value: 'EFGH45' } })
  bind.bind()
  check(userService.getCouple().partner.userId === 'partner_abcd23', 'already-bound state rejects a second partner')
  profile.onShow()
  check(profile.data.isBound && profile.data.couple.partner, 'profile refreshes after bind')
  const album = loadPage('miniprogram/pages/album/album.js')
  album.onShow()
  check(album.data.isBound && album.data.togetherDays >= 1, 'album refreshes bound state')
  await bind.unbind()
  profile.onShow()
  album.onShow()
  check(!profile.data.isBound && !album.data.isBound && album.data.togetherDays === 0, 'unbind refreshes profile and album to empty state')

  // Settings routes and local feedback lifecycle.
  const settings = loadPage('miniprogram/pages/settings/settings.js')
  settings.onShow()
  check(settings.data.version === APP_VERSION && settings.data.localModeName === LOCAL_MODE_NAME, 'settings uses the shared app version and local mode metadata')
  settings.onEmotionChange({ detail: { value: true } })
  settings.onNotificationChange({ detail: { value: false } })
  check(settings.data.settings.emotionCareEnabled === true && settings.data.settings.notificationsEnabled === false, 'settings exposes updated local toggle states')
  settings.showAbout()
  settings.showPrivacy()
  settings.feedback()
  check(wxState.navigations.includes('/pages/about/about') && wxState.navigations.includes('/pages/privacy/privacy') && wxState.navigations.includes('/pages/feedback/feedback'), 'settings routes to three local pages')
  const originalClearLocalData = userService.clearLocalData
  userService.clearLocalData = async () => ({ ok: false, failedFiles: [{ path: 'local://failed-clear', code: 'file_remove_failed' }], failedKeys: [], user: null })
  await settings.clearData()
  userService.clearLocalData = originalClearLocalData
  check(settings.data.clearError.indexOf('图片清理失败') >= 0 && !settings.data.clearing, 'settings exposes a retryable clear failure without fake success')
  const about = loadPage('miniprogram/pages/about/about.js')
  check(about.data.version === APP_VERSION && about.data.localModeName === LOCAL_MODE_NAME && about.data.localModeCopy.indexOf('当前设备本地保存') >= 0, 'about exposes v1.4 local-only copy from appMeta')
  about.goFeedback()
  const privacy = loadPage('miniprogram/pages/privacy/privacy.js')
  privacy.goFeedback()
  const feedback = loadPage('miniprogram/pages/feedback/feedback.js')
  feedback.onShow()
  feedback.onContentInput({ detail: { value: '短' } })
  check(feedback.data.contentCount === 1, 'feedback keeps a readable live character count')
  feedback.submit()
  check(feedbackService.list().length === 0, 'short feedback is rejected without writing')
  feedback.onContentInput({ detail: { value: '希望反馈流程能保留我的建议' } })
  feedback.setData({ contact: 'local-contact' })
  feedback.submit()
  check(feedbackService.list().length === 1 && feedbackService.list()[0].status === 'saved_local', 'valid feedback saves locally with explicit status')
  feedback.copyRecord({ currentTarget: { dataset: { id: feedbackService.list()[0].feedbackId } } })
  check(wxState.clipboard.length === 1 && wxState.clipboard[0].indexOf('尚未发送到服务器') >= 0, 'feedback can be copied with unsent status')
  await userService.clearLocalData()
  check(feedbackService.list().length === 0, 'clearLocalData removes feedback records')

  // Profile progress fields and one-time upgrade feedback.
  resetStorage()
  wxState = makeWx()
  userService.setAnniversaryDate(dateString(new Date()))
  storage.set(storage.KEYS.CAT, { level: 2, feedCount: 100, chatCount: 0, mood: 40, hunger: 50, todayFeedCount: 0, lastFeedTime: 0 })
  const profileProgress = loadPage('miniprogram/pages/profile/profile.js')
  profileProgress.onShow()
  check(profileProgress.data.progress.nextFormName === 'JK 猫猫' && profileProgress.data.progress.unlockedRecipesRemaining === 10, 'profile exposes level 2 recipe progress')
  check(profileProgress.data.conditionRows.every((row) => row.remaining >= 0 && row.targetText), 'profile condition rows have non-negative remaining values')
  storage.set(storage.KEYS.CAT, { level: 3, feedCount: 100, chatCount: 100, mood: 40, hunger: 50, todayFeedCount: 0, lastFeedTime: 0 })
  profileProgress.onShow()
  check(profileProgress.data.progress.nextFormName === '花嫁猫' && profileProgress.data.progress.anniversaryRemaining === 365, 'profile exposes level 3 anniversary progress')
  const chat = loadPage('miniprogram/pages/chat/chat.js')
  chat.onLoad()
  check(/bindkeyboardheightchange="onKeyboardHeightChange"/.test(chatWxml) && /bindblur="onKeyboardBlur"/.test(chatWxml) && /keyboardHeight > 0/.test(chatWxml), 'chat input updates the keyboard layout class and clears it on blur')
  chat.onKeyboardHeightChange({ detail: { height: 300 } })
  check(chat.data.keyboardHeight === 300, 'positive keyboard height selects the compact chat layout')
  chat.onKeyboardBlur()
  check(chat.data.keyboardHeight === 0, 'blurring the chat input restores the room')
  chat.onKeyboardHeightChange({ detail: { height: 300 } })
  chat.onKeyboardHeightChange({ detail: { height: 0 } })
  check(chat.data.keyboardHeight === 0, 'zero height restores the room even without blur')
  chat.setData({ inputValue: '   ' })
  const messagesBeforeEmptySend = chatService.list().length
  chat.send()
  check(chatService.list().length === messagesBeforeEmptySend && /先写点/.test(wxState.toasts.at(-1).title), 'blank chat message is rejected without writing data')
  chat.setData({ inputValue: '今天也一起努力呀' })
  chat.send()
  check(chat.data.upgradeTip === '', 'chat does not show upgrade before anniversary')
  userService.setAnniversaryDate(dateString(new Date(Date.now() - 366 * 86400000)))
  storage.set(storage.KEYS.CAT, { level: 3, feedCount: 100, chatCount: 100, mood: 40, hunger: 50, todayFeedCount: 0, lastFeedTime: 0 })
  chat.setData({ inputValue: '纪念日快乐' })
  chat.send()
  check(chat.data.upgradeTip.indexOf('花嫁猫') >= 0, 'chat shows one visible upgrade message after transition')
  const upgradeToasts = wxState.toasts.filter((item) => String(item.title || '').indexOf('已升级为') === 0)
  check(upgradeToasts.length === 1, 'upgrade feedback is emitted once')
  chat.onShow()
  check(chat.data.upgradeTip.indexOf('花嫁猫') >= 0, 'chat onShow does not duplicate or erase upgrade feedback')

  // Form/empty-state branches and return synchronization.
  resetStorage()
  wxState = makeWx()
  const profileEdit = loadPage('miniprogram/pages/profile-edit/profile-edit.js')
  profileEdit.onLoad()
  profileEdit.setData({ 'form.nickname': '' })
  profileEdit.save()
  check(userService.getCurrentUser().nickname === '小主人', 'empty nickname keeps edit form and does not overwrite user')
  profileEdit.setData({ 'form.nickname': '离线用户', 'form.birthday': dateString(new Date(Date.now() - 86400000)) })
  await profileEdit.save()
  flushTimers()
  check(userService.getCurrentUser().nickname === '离线用户' && wxState.back.length >= 1, 'profile edit saves and returns')
  resetStorage()
  userService.updateUser({ avatar: 'local://current-avatar', nickname: '当前头像用户' })
  wxState = makeWx()
  const profileAvatar = loadPage('miniprogram/pages/profile-edit/profile-edit.js')
  profileAvatar.onLoad()
  profileAvatar.onShow()
  const originalAvatarSaveImageChecked = storage.saveImageChecked
  const originalAvatarRemoveImageChecked = storage.removeImageChecked
  const originalAvatarSetChecked = storage.setChecked
  const removedAvatarPaths = []
  let avatarSequence = 0
  storage.saveImageChecked = () => Promise.resolve({ ok: true, path: `local://pending-avatar-${++avatarSequence}` })
  storage.removeImageChecked = (filePath) => { removedAvatarPaths.push(filePath); return Promise.resolve({ ok: true, path: filePath }) }
  profileAvatar.pickAvatar()
  await new Promise((resolve) => originalSetTimeout(resolve, 0))
  check(profileAvatar.data.form.avatar === 'local://pending-avatar-1', 'profile avatar selection tracks a pending managed path')
  profileAvatar.pickAvatar()
  await new Promise((resolve) => originalSetTimeout(resolve, 0))
  check(removedAvatarPaths.indexOf('local://pending-avatar-1') >= 0 && profileAvatar.data.form.avatar === 'local://pending-avatar-2', 'profile avatar reselect cleans the previous pending path')
  profileAvatar.setData({ 'form.nickname': '' })
  await profileAvatar.save()
  check(removedAvatarPaths.indexOf('local://pending-avatar-2') >= 0 && userService.getCurrentUser().avatar === 'local://current-avatar', 'invalid profile save cleans pending avatar and preserves current avatar')
  profileAvatar.setData({ 'form.nickname': '写入失败用户' })
  profileAvatar.pickAvatar()
  await new Promise((resolve) => originalSetTimeout(resolve, 0))
  storage.setChecked = (key, value) => key === storage.KEYS.USER ? ({ ok: false, key, value, error: { code: 'storage_write_failed', message: '资料保存失败' } }) : originalAvatarSetChecked(key, value)
  await profileAvatar.save()
  storage.setChecked = originalAvatarSetChecked
  check(removedAvatarPaths.indexOf('local://pending-avatar-3') >= 0 && userService.getCurrentUser().avatar === 'local://current-avatar', 'profile storage write failure cleans pending avatar without deleting current avatar')
  profileAvatar.setData({ 'form.nickname': '页面离开用户' })
  profileAvatar.pickAvatar()
  await new Promise((resolve) => originalSetTimeout(resolve, 0))
  profileAvatar.onHide()
  await new Promise((resolve) => originalSetTimeout(resolve, 0))
  check(removedAvatarPaths.indexOf('local://pending-avatar-4') >= 0 && userService.getCurrentUser().avatar === 'local://current-avatar', 'profile hide cleanup removes an uncommitted avatar and keeps the current avatar')
  storage.saveImageChecked = originalAvatarSaveImageChecked
  storage.removeImageChecked = originalAvatarRemoveImageChecked
  storage.setChecked = originalAvatarSetChecked
  const albumEdit = loadPage('miniprogram/pages/album/album.js')
  albumEdit.onShow()
  check(!albumEdit.data.isBound && albumEdit.data.togetherDays === 0, 'empty album never implies first day')
  albumEdit.editSignature()
  albumEdit.onSignatureInput({ detail: { value: '页面内签名' } })
  albumEdit.saveSignature()
  check(userService.getSettings().albumSignature === '页面内签名' && !albumEdit.data.editingSignature, 'album signature draft saves and exits edit mode')
  const recipeAdd = loadPage('miniprogram/pages/recipe-add/recipe-add.js')
  recipeAdd.onLoad({})
  const beforeCreate = recipeService.list().length
  check(!recipeAdd.data.isEdit && recipeAdd.data.form.rating === 0 && wxState.titles.length === 0, 'new recipe uses native default title and starts at zero hearts')
  recipeAdd.pickRating({ currentTarget: { dataset: { rating: '3' } } })
  check(recipeAdd.data.form.rating === 3, 'rating selection exposes the numeric value for both hearts and label')
  await recipeAdd.save()
  check(recipeService.list().length === beforeCreate && wxState.toasts.at(-1).title === '请写下菜名', 'empty recipe name is rejected without saving')
  recipeAdd.setData({ 'form.name': 'headless 菜品' })
  await recipeAdd.save()
  flushTimers()
  const createdRecipe = recipeService.list().find((item) => item.name === 'headless 菜品')
  check(createdRecipe && !createdRecipe.isUnlocked && createdRecipe.rating === 3, 'recipe add saves without photos and keeps the rating')
  const editRecipe = loadPage('miniprogram/pages/recipe-add/recipe-add.js')
  editRecipe.onLoad({ id: createdRecipe.recipeId })
  check(editRecipe.data.isEdit && editRecipe.data.form.name === createdRecipe.name && editRecipe.data.form.rating === 3 && wxState.titles.at(-1) === '编辑菜品', 'recipe edit restores the form and sets the native title')
  const lockedRecipe = recipeService.create({ name: '锁定详情菜品', category: 'custom' })
  const recipeDetailWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/recipe-detail/recipe-detail.wxml'), 'utf8')
  check(/还没吃过哦/.test(recipeDetailWxml) && /补充照片解锁/.test(recipeDetailWxml) && /recipe\.isUnlocked/.test(recipeDetailWxml), 'recipe detail source exposes locked copy and unlock CTA')
  const lockedDetail = loadPage('miniprogram/pages/recipe-detail/recipe-detail.js')
  lockedDetail.onLoad({ id: lockedRecipe.recipeId })
  lockedDetail.onShow()
  check(!lockedDetail.data.recipe.isUnlocked && lockedDetail.data.photoItems.length === 0, 'locked recipe detail loads without photos and remains locked')
  lockedDetail.choosePhoto()
  await new Promise((resolve) => originalSetTimeout(resolve, 0))
  check(lockedDetail.data.recipe.isUnlocked && lockedDetail.data.photoItems.length === 1 && recipeService.get(lockedRecipe.recipeId).photos.length === 1, 'successful detail photo add reloads into unlocked state')

  const recipeGallery = loadPage('miniprogram/pages/recipe/recipe.js')
  recipeGallery.onLoad()
  recipeGallery.switchTab({ currentTarget: { dataset: { tab: 'unlocked' } } })
  check(recipeGallery.data.unlockedCount === 1 && recipeGallery.data.recipes.length === 1 && recipeGallery.data.recipes[0].recipeId === lockedRecipe.recipeId, 'newly unlocked recipe appears under the unlocked filter')
  recipeGallery.goAdd()
  check(wxState.navigations.at(-1) === '/pages/recipe-add/recipe-add', 'recipe gallery opens the existing add route')

  wxState = makeWx({ tempFilePaths: Array.from({ length: 10 }, (_, index) => `local://recipe-test-${index}`) })
  const editPhotos = loadPage('miniprogram/pages/recipe-add/recipe-add.js')
  editPhotos.onLoad({ id: lockedRecipe.recipeId })
  editPhotos.onShow()
  check(editPhotos.data.photoItems.length === 1 && editPhotos.data.photoItems[0].hasImage, 'edit presents an existing local image')
  editPhotos.choosePhoto()
  check(editPhotos.data.photos.length === 9 && editPhotos.data.photoItems.length === 9 && !editPhotos.data.choosingPhoto, 'photo selection stops at nine and clears busy state')
  editPhotos.choosePhoto()
  check(wxState.chooseImageCalls === 1 && wxState.toasts.at(-1).title.includes('最多添加 9 张'), 'photo limit does not reopen the picker')
  editPhotos.onPhotoError({ currentTarget: { dataset: { index: 0 } } })
  check(!editPhotos.data.photoItems[0].hasImage && editPhotos.data.photos.length === 9, 'failed thumbnail shows a placeholder without discarding photo metadata')

  resetStorage()
  wxState = makeWx()
  const failedDetailRecipe = recipeService.create({ name: '详情失败菜品', category: 'custom' })
  const failedDetail = loadPage('miniprogram/pages/recipe-detail/recipe-detail.js')
  failedDetail.onLoad({ id: failedDetailRecipe.recipeId })
  failedDetail.onShow()
  const originalRecipeSaveImageChecked = storage.saveImageChecked
  storage.saveImageChecked = () => Promise.resolve({ ok: false, code: 'file_save_failed', message: '图片保存失败' })
  failedDetail.choosePhoto()
  await new Promise((resolve) => originalSetTimeout(resolve, 0))
  storage.saveImageChecked = originalRecipeSaveImageChecked
  check(!failedDetail.data.addingPhoto && !recipeService.get(failedDetailRecipe.recipeId).isUnlocked && recipeService.get(failedDetailRecipe.recipeId).photos.length === 0, 'failed detail photo add resets busy and preserves locked recipe')

  resetStorage()
  wxState = makeWx()
  const rollbackAdd = loadPage('miniprogram/pages/recipe-add/recipe-add.js')
  rollbackAdd.onLoad({})
  rollbackAdd.setData({ 'form.name': '回滚空菜品', photos: ['local://rollback-photo'] })
  storage.saveImageChecked = () => Promise.resolve({ ok: false, code: 'file_save_failed', message: '图片保存失败' })
  await rollbackAdd.save()
  storage.saveImageChecked = originalRecipeSaveImageChecked
  check(!rollbackAdd.data.saving && !recipeService.list().some((item) => item.name === '回滚空菜品'), 'new recipe photo failure rolls back the empty recipe record')

  resetStorage()
  wxState = makeWx()
  const rollbackFailureAdd = loadPage('miniprogram/pages/recipe-add/recipe-add.js')
  rollbackFailureAdd.onLoad({})
  rollbackFailureAdd.setData({ 'form.name': '回滚失败菜品', photos: ['local://rollback-failure-photo'] })
  const originalRecipeSetChecked = storage.setChecked
  let recipeSetCalls = 0
  storage.setChecked = (key, value) => {
    if (key === storage.KEYS.RECIPES && ++recipeSetCalls >= 2) return { ok: false, key, value, error: { code: 'storage_write_failed', message: '菜谱记录保存失败' } }
    return originalRecipeSetChecked(key, value)
  }
  storage.saveImageChecked = () => Promise.resolve({ ok: false, code: 'file_save_failed', message: '图片保存失败' })
  await rollbackFailureAdd.save()
  storage.saveImageChecked = originalRecipeSaveImageChecked
  storage.setChecked = originalRecipeSetChecked
  check(rollbackFailureAdd.data.saving === false && recipeService.list().some((item) => item.name === '回滚失败菜品') && wxState.toasts[wxState.toasts.length - 1].title.indexOf('回滚失败') >= 0, 'recipe creation rollback failure remains visible and retryable')

  resetStorage()
  wxState = makeWx()
  const chatCapacityPage = loadPage('miniprogram/pages/chat/chat.js')
  chatCapacityPage.onShow()
  while (chatService.list().length < LIMITS.CHAT_MESSAGES) chatService.addMessage({ senderId: 'fixture-user', receiverId: 'batiao', content: `容量页面消息${chatService.list().length}`, type: 'text', isRead: true })
  const chatCapacityFirst = chatService.list()[0].messageId
  chatCapacityPage.setData({ inputValue: '页面容量拒绝' })
  chatCapacityPage.send()
  check(!chatCapacityPage.data.sending && chatService.list()[0].messageId === chatCapacityFirst && wxState.toasts[wxState.toasts.length - 1].title.indexOf('达到上限') >= 0, 'chat page shows an actionable capacity message and resets sending')
  const feedbackCapacityPage = loadPage('miniprogram/pages/feedback/feedback.js')
  feedbackCapacityPage.onShow()
  feedbackService.clear()
  for (let index = 0; index < LIMITS.FEEDBACK; index += 1) feedbackService.submit({ category: 'feature', content: `页面容量反馈${index}内容足够长` })
  feedbackCapacityPage.setData({ content: '页面反馈容量拒绝内容足够长' })
  feedbackCapacityPage.submit()
  check(!feedbackCapacityPage.data.submitting && feedbackService.list().length === LIMITS.FEEDBACK && wxState.toasts[wxState.toasts.length - 1].title.indexOf('达到上限') >= 0, 'feedback page shows an actionable capacity message and resets submitting')

  resetStorage()
  wxState = makeWx()
  const migratedRecipeHttps = ['https', '://example.invalid/recipe.png'].join('')
  const migratedRecipeData = ['data', ':image/png;base64,recipe'].join('')
  const migratedRecipe = { recipeId: 'legacy-media', name: '迁移媒体菜谱', category: 'custom', photos: [migratedRecipeHttps, migratedRecipeData, 'blob:recipe', 'unknown://recipe', 'local://recipe'], createdAt: 7, updatedAt: 7 }
  storage.set(storage.KEYS.RECIPES, storage.list(storage.KEYS.RECIPES).concat(migratedRecipe))
  storage.initialize()
  const recipeAddMigrated = loadPage('miniprogram/pages/recipe-add/recipe-add.js')
  recipeAddMigrated.onLoad({ id: 'legacy-media' })
  check(recipeAddMigrated.data.photos.length === 5 && recipeAddMigrated.data.photoItems.filter((item) => item.hasImage).length === 1, 'recipe add keeps migrated metadata but renders only local image paths')
  check(recipeAddMigrated.data.photoItems.filter((item) => !item.hasImage).every((item) => item.imagePath === ''), 'recipe add never passes blocked URI to an image source')
  const recipeDetailMissing = loadPage('miniprogram/pages/recipe-detail/recipe-detail.js')
  recipeDetailMissing.onLoad({ id: 'missing-recipe' })
  check(recipeDetailMissing.data.notFound && recipeDetailMissing.data.recipe.recipeId === '', 'missing recipe has recoverable empty state')
  recipeDetailMissing.goRecipe()
  check(wxState.tabs.includes('/pages/recipe/recipe'), 'missing recipe can return to recipe tab')
  const albumUpload = loadPage('miniprogram/pages/album-upload/album-upload.js')
  await albumUpload.save()
  check(albumService.total() === 0 && /先选择至少一张/.test(wxState.toasts.at(-1).title), 'empty album upload stops without writing records')
  albumUpload.chooseImage()
  check(albumUpload.data.images.length === 1, 'album upload records selected image')
  await albumUpload.save()
  flushTimers()
  check(albumService.total() === 1, 'album upload saves and returns once')
  albumEdit.onShow()
  const presentedPhotos = albumEdit.data.groups.reduce((all, group) => all.concat(group.photos), [])
  check(presentedPhotos.length === 1 && presentedPhotos[0].uploaderLabel === userService.getCurrentUser().nickname, 'album grid exposes a safe uploader label after upload')

  wxState = makeWx({ tempFilePaths: Array.from({ length: 10 }, (_, i) => `local://album-batch-${i}`) })
  const fullUpload = loadPage('miniprogram/pages/album-upload/album-upload.js')
  fullUpload.onShow()
  fullUpload.chooseImage()
  check(fullUpload.data.images.length === 9 && fullUpload.data.imageItems.length === 9, 'album batch and previews stop at nine images')
  fullUpload.chooseImage()
  check(wxState.chooseImageCalls === 1 && /最多 9/.test(wxState.toasts.at(-1).title), 'a full batch does not open the picker again')
  fullUpload.onImageError({ currentTarget: { dataset: { index: 0 } } })
  check(!fullUpload.data.imageItems[0].hasImage && fullUpload.data.imageItems[1].hasImage, 'a broken photo uses a placeholder without replacing adjacent previews')

  // Cancellation, permission, navigation, quota and file failure recovery.
  resetStorage()
  wxState = makeWx({ chooseImageFail: true })
  const cancelUpload = loadPage('miniprogram/pages/album-upload/album-upload.js')
  cancelUpload.onLoad()
  cancelUpload.chooseImage()
  check(!cancelUpload.data.choosingImage && wxState.toasts[wxState.toasts.length - 1].title === '已取消选择', 'choose image cancellation is visible and retryable')
  wxState = makeWx({ chooseImageFail: true, chooseImageError: 'chooseImage:fail auth denied' })
  const deniedUpload = loadPage('miniprogram/pages/album-upload/album-upload.js')
  deniedUpload.onLoad()
  deniedUpload.chooseImage()
  check(!deniedUpload.data.choosingImage && wxState.toasts[wxState.toasts.length - 1].title.indexOf('权限') >= 0, 'choose image permission denial is mapped')

  wxState = makeWx({ clipboardFail: true, clipboardError: 'setClipboardData:fail auth denied' })
  const bindCopy = loadPage('miniprogram/pages/bind/bind.js')
  bindCopy.onShow()
  bindCopy.copyCode()
  check(!bindCopy.data.copying && wxState.toasts[wxState.toasts.length - 1].title.indexOf('权限') >= 0, 'clipboard failure resets busy and explains permission')

  resetStorage()
  albumService.create({ imagePath: 'local://permission-photo', date: '2026-09-27' })
  wxState = makeWx({ saveImageFail: true })
  const deniedSave = loadPage('miniprogram/pages/album/album.js')
  deniedSave.onShow()
  const savedPhoto = albumService.list()[0]
  deniedSave.preview({ detail: { photoId: savedPhoto.photoId } })
  deniedSave.saveToAlbum({ detail: { photo: deniedSave.data.currentPhoto } })
  check(!deniedSave.data.savingToAlbum && wxState.toasts[wxState.toasts.length - 1].title.indexOf('权限') >= 0, 'save-to-album permission failure resets busy')

  wxState = makeWx({ navigationFail: true })
  const failedNavigation = loadPage('miniprogram/pages/settings/settings.js')
  failedNavigation.onShow()
  failedNavigation.showAbout()
  check(wxState.toasts[wxState.toasts.length - 1].title.indexOf('关于') >= 0, 'navigation failure leaves a retryable toast')

  resetStorage()
  wxState = makeWx()
  const failedFeedback = loadPage('miniprogram/pages/feedback/feedback.js')
  failedFeedback.onShow()
  const originalSetChecked = storage.setChecked
  storage.setChecked = () => ({ ok: false, error: { code: 'storage_quota', message: 'quota' } })
  failedFeedback.setData({ content: '这是一条会触发本地空间失败的反馈' })
  failedFeedback.submit()
  storage.setChecked = originalSetChecked
  check(!failedFeedback.data.submitting && feedbackService.list().length === 0, 'storage write failure resets feedback busy without fake success')

  resetStorage()
  wxState = makeWx()
  const failedFileUpload = loadPage('miniprogram/pages/album-upload/album-upload.js')
  failedFileUpload.onLoad()
  failedFileUpload.setData({ images: ['local://will-fail'] })
  const originalSaveImageChecked = storage.saveImageChecked
  storage.saveImageChecked = () => Promise.resolve({ ok: false, code: 'file_save_failed', message: '图片保存失败' })
  const originalConsoleError = console.error
  console.error = () => {}
  try {
    await failedFileUpload.save()
  } finally {
    console.error = originalConsoleError
  }
  storage.saveImageChecked = originalSaveImageChecked
  check(!failedFileUpload.data.saving && albumService.total() === 0 && wxState.toasts[wxState.toasts.length - 1].title.indexOf('图片处理失败') >= 0, 'file save failure rolls back metadata and resets busy')

  console.log('SMOKE_PAGES=PASS')
  console.log(`ASSERTIONS=${assertionCount}`)
  console.log(`LOCAL_FEEDBACK=${feedbackService.list().length}`)
}

main().catch((error) => {
  console.error(`SMOKE_PAGES=FAIL ${error.stack || error.message}`)
  process.exitCode = 1
}).finally(() => {
  global.setTimeout = originalSetTimeout
  delete global.wx
  delete global.Page
})
