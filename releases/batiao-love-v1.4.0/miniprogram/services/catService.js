const storage = require('./storageService')
const userService = require('./userService')
const recipeService = require('./recipeService')
const { createDefaultCat, FORM_BY_LEVEL, STATE_DURATIONS, getFormName, getFormMeta, getStateMeta, getLevelRule, getExperienceProgress, resolveCatState } = require('../models/cat')
const { now, clamp } = require('../utils/util')
const { isToday, daysSince } = require('../utils/dateUtil')

let lastError = null
function ensure() { storage.initialize() }
function withStateView(value, context) {
  const normalized = createDefaultCat(value)
  const state = resolveCatState(normalized, context)
  return Object.assign({}, normalized, state)
}
function getCat(context) { ensure(); return withStateView(storage.get(storage.KEYS.CAT, createDefaultCat()), context) }
function saveCat(value) {
  const cat = createDefaultCat(value); cat.updatedAt = now()
  const result = storage.setChecked(storage.KEYS.CAT, cat)
  lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '八条状态保存失败，请重试' })
  return result.ok ? withStateView(cat) : getCat()
}
function getLastError() { return lastError }

function makeTransition(previousState, nextCat, timestamp) {
  const nextState = resolveCatState(nextCat, { now: timestamp })
  return { previousState, nextState }
}

function beginTransientState(cat, stateKey, timestamp) {
  const duration = Number(STATE_DURATIONS[stateKey]) || 0
  return Object.assign({}, cat, { stateKey, stateSince: timestamp, stateUntil: timestamp + duration })
}

function getUnlockedRecipeCount() {
  try {
    return typeof recipeService.getUnlockedCount === 'function' ? recipeService.getUnlockedCount() : recipeService.list().filter((recipe) => recipe && recipe.isUnlocked).length
  } catch (error) {
    console.warn('[cat] recipe progress unavailable', error)
    return 0
  }
}

function conditionReady(rule, key, cat, togetherDays, unlockedRecipes) {
  if (key === 'feed') return !rule.feed || cat.feedCount >= rule.feed
  if (key === 'chat') return !rule.chat || cat.chatCount >= rule.chat
  if (key === 'recipes') return !rule.unlockedRecipes || unlockedRecipes >= rule.unlockedRecipes
  if (key === 'anniversary') return !rule.anniversaryDays || togetherDays >= rule.anniversaryDays
  return true
}

function maybeUpgrade(cat) {
  const next = createDefaultCat(cat)
  const originalLevel = next.level
  const unlockedRecipes = getUnlockedRecipeCount()
  const togetherDays = daysSince(userService.getAnniversaryDate())
  let transition = null
  while (next.level < 4) {
    const rule = getLevelRule(next.level)
    if (!rule) break
    const ready = ['feed', 'chat', 'recipes', 'anniversary'].every((key) => conditionReady(rule, key, next, togetherDays, unlockedRecipes))
    if (!ready) break
    const from = next.level
    next.level += 1
    next.currentForm = FORM_BY_LEVEL[next.level]
    next.exp = Math.max(0, next.exp - 100)
    next.mood = clamp(next.mood + 10, 0, 100)
    if (!transition) transition = { from, to: next.level, form: next.currentForm, formName: getFormName(next.currentForm) }
  }
  if (transition && transition.to !== next.level) {
    transition = { from: originalLevel, to: next.level, form: next.currentForm, formName: getFormName(next.currentForm) }
  }
  return { cat: next, transition }
}

function feed() {
  const cat = getCat()
  const todayCount = isToday(cat.lastFeedTime) ? cat.todayFeedCount : 0
  if (todayCount >= 3) return { ok: false, reason: 'daily_limit', message: '今天已经喂饱啦，明天再来吧~', cat }
  const actionAt = now()
  const previousState = resolveCatState(cat, { now: actionAt })
  const normalized = saveCat(beginTransientState(Object.assign({}, cat, {
    todayFeedCount: todayCount + 1,
    lastFeedTime: actionAt,
    feedCount: cat.feedCount + 1,
    exp: cat.exp + 10,
    hunger: clamp(cat.hunger + 18, 0, 100),
    mood: clamp(cat.mood + 8, 0, 100)
  }), 'eating', actionAt))
  if (lastError) return { ok: false, reason: lastError.code || 'storage_write_failed', message: lastError.message || '八条状态保存失败，请重试', cat }
  const upgraded = maybeUpgrade(normalized)
  const updated = saveCat(upgraded.cat)
  if (lastError) return { ok: false, reason: lastError.code || 'storage_write_failed', message: lastError.message || '八条状态保存失败，请重试', cat }
  return { ok: true, cat: updated, transition: upgraded.transition, stateTransition: makeTransition(previousState, updated, actionAt), previousState, nextState: resolveCatState(updated, { now: actionAt }), message: '八条吃得好开心，经验 +10 喵~' }
}

function pet() {
  const cat = getCat()
  const actionAt = now()
  const previousState = resolveCatState(cat, { now: actionAt })
  const updated = saveCat(beginTransientState(Object.assign({}, cat, { mood: clamp(cat.mood + 5, 0, 100), exp: cat.exp + 1 }), 'happy', actionAt))
  if (lastError) return { ok: false, reason: lastError.code || 'storage_write_failed', message: lastError.message || '八条状态保存失败，请重试', cat }
  const nextState = resolveCatState(updated, { now: actionAt })
  return { ok: true, cat: updated, stateTransition: makeTransition(previousState, updated, actionAt), previousState, nextState, message: '八条蹭了蹭你的手，心情变好啦 💕' }
}

function recordChat() {
  const cat = getCat()
  const actionAt = now()
  const previousState = resolveCatState(cat, { now: actionAt })
  const normalized = saveCat(beginTransientState(Object.assign({}, cat, { chatCount: cat.chatCount + 1, exp: cat.exp + 2, mood: clamp(cat.mood + 2, 0, 100) }), 'happy', actionAt))
  if (lastError) return Object.assign({}, cat, { cat, transition: null, ok: false, reason: lastError.code || 'storage_write_failed', message: lastError.message || '八条状态保存失败，请重试' })
  const upgraded = maybeUpgrade(normalized)
  const updated = saveCat(upgraded.cat)
  if (lastError) return Object.assign({}, cat, { cat, transition: null, ok: false, reason: lastError.code || 'storage_write_failed', message: lastError.message || '八条状态保存失败，请重试' })
  // Keep the historical top-level cat fields for existing callers and expose
  // the normalized object/transition for chatService and page feedback.
  return Object.assign({}, updated, { ok: true, cat: updated, transition: upgraded.transition, stateTransition: makeTransition(previousState, updated, actionAt), previousState, nextState: resolveCatState(updated, { now: actionAt }) })
}

function makeCondition(key, label, current, need) {
  const target = Math.max(0, Math.floor(Number(need) || 0))
  const value = Math.max(0, Math.floor(Number(current) || 0))
  const remaining = Math.max(0, target - value)
  return { key, label, current: value, need: target, remaining, ready: target === 0 || value >= target, percent: target ? Math.round(Math.min(1, value / target) * 100) : 100 }
}

function getProgress() {
  const cat = getCat()
  const state = resolveCatState(cat)
  const experience = getExperienceProgress(cat.exp)
  const currentMeta = getFormMeta(cat.currentForm)
  const rule = getLevelRule(cat.level)
  const togetherDays = daysSince(userService.getAnniversaryDate())
  const unlockedRecipes = getUnlockedRecipeCount()
  const feed = makeCondition('feed', '累计喂养', cat.feedCount, rule && rule.feed)
  const chat = makeCondition('chat', '累计聊天', cat.chatCount, rule && rule.chat)
  const recipes = makeCondition('recipes', '解锁菜品', unlockedRecipes, rule && rule.unlockedRecipes)
  const anniversary = makeCondition('anniversary', '在一起天数', togetherDays, rule && rule.anniversaryDays)
  const conditions = [feed, chat, recipes, anniversary].filter((condition) => condition.need > 0)
  const percent = conditions.length ? Math.min.apply(null, conditions.map((condition) => condition.percent)) : 100
  const base = {
    current: cat.level,
    currentLevel: cat.level,
    currentForm: cat.currentForm,
    formName: currentMeta.name,
    formEmoji: currentMeta.emoji,
    feedCount: cat.feedCount,
    chatCount: cat.chatCount,
    unlockedRecipes,
    anniversaryDays: togetherDays,
    feed,
    chat,
    recipes,
    anniversary,
    conditions,
    percent,
    mood: cat.mood,
    hunger: cat.hunger,
    todayFeedCount: cat.todayFeedCount,
    feedNeed: feed.need,
    feedRemaining: feed.remaining,
    chatNeed: chat.need,
    chatRemaining: chat.remaining,
    unlockedRecipesNeed: recipes.need,
    unlockedRecipesRemaining: recipes.remaining,
    anniversaryNeed: anniversary.need,
    anniversaryRemaining: anniversary.remaining,
    anniversaryReady: anniversary.ready,
    experience,
    experienceCurrent: experience.current,
    experienceNeed: experience.need,
    experienceRemaining: experience.remaining,
    experiencePercent: experience.percent
  }
  base.stateKey = state.stateKey
  base.stateText = state.stateText
  base.animationClass = state.animationClass
  base.assetKey = state.assetKey
  base.stateUntil = state.stateUntil
  if (!rule) return Object.assign(base, { next: null, nextLevel: null, nextForm: null, nextFormName: '', nextFormEmoji: '', complete: true })
  const nextLevel = cat.level + 1
  const nextForm = FORM_BY_LEVEL[nextLevel]
  const nextMeta = getFormMeta(nextForm)
  return Object.assign(base, { next: nextLevel, nextLevel, nextForm, nextFormName: nextMeta.name, nextFormEmoji: nextMeta.emoji, complete: false })
}

function reset() { const result = storage.removeChecked(storage.KEYS.CAT); if (!result.ok) { lastError = result.error; return getCat() } lastError = null; return getCat() }

module.exports = { getCat, saveCat, feed, pet, recordChat, getProgress, reset, getFormName, getFormMeta, getStateMeta, getLastError }
