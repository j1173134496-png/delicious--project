const { now, clamp } = require('../utils/util')

const FORM_BY_LEVEL = { 1: 'baby', 2: 'genki', 3: 'jk', 4: 'bride' }
const FORM_META = {
  baby: { key: 'baby', level: 1, name: '小奶猫', emoji: '🐱', imagePath: '/assets/batiao/lv1-baby/idle.png', assets: { idle: 'idle.png' }, placeholder: '奶黄色猫咪占位' },
  genki: { key: 'genki', level: 2, name: '元气猫', emoji: '😺', imagePath: '/assets/batiao/lv2-genki/idle.png', assets: { idle: 'idle.png' }, placeholder: '元气猫咪占位' },
  jk: { key: 'jk', level: 3, name: 'JK 猫猫', emoji: '🐱', imagePath: '/assets/batiao/lv3-jk/idle.png', assets: { idle: 'idle.png' }, placeholder: 'JK 猫咪占位' },
  bride: { key: 'bride', level: 4, name: '花嫁猫', emoji: '👰', imagePath: '/assets/batiao/lv4-bride/idle.png', assets: { idle: 'idle.png' }, placeholder: '花嫁猫咪占位' }
}
const FORM_NAMES = Object.keys(FORM_META).reduce((result, key) => { result[key] = FORM_META[key].name; return result }, {})
const SLEEPING_STATE_KEY = 'sleep' + 'ing'
const CAT_STATES = {
  idle: { key: 'idle', label: '陪伴中', animationClass: 'cat-display--idle', assetKey: 'idle' },
  happy: { key: 'happy', label: '开心', animationClass: 'cat-display--happy', assetKey: 'happy' },
  eating: { key: 'eating', label: '吃得香', animationClass: 'cat-display--eating', assetKey: 'eating' },
  sad: { key: 'sad', label: '需要安慰', animationClass: 'cat-display--sad', assetKey: 'sad' },
  [SLEEPING_STATE_KEY]: { key: SLEEPING_STATE_KEY, label: '睡梦中', animationClass: 'cat-display--sleeping', assetKey: SLEEPING_STATE_KEY }
}
const STATE_DURATIONS = { happy: 1600, eating: 1200 }
const STATE_PRIORITY = ['eating', 'happy', 'sad', 'sleeping', 'idle']
const SAD_MOOD_THRESHOLD = 35
const SAD_HUNGER_THRESHOLD = 25
const NIGHT_WINDOW = { startHour: 22, endHour: 7 }
const LEVEL_RULES = {
  1: { feed: 30, chat: 50 },
  2: { feed: 100, unlockedRecipes: 10 },
  3: { anniversaryDays: 365 }
}
const EXPERIENCE_NEED = 100

function getExperienceProgress(value) {
  const raw = Number(value)
  const total = Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0
  const current = Math.min(EXPERIENCE_NEED, total)
  const remaining = Math.max(0, EXPERIENCE_NEED - current)
  return { current, need: EXPERIENCE_NEED, remaining, percent: Math.round((current / EXPERIENCE_NEED) * 100), total }
}

function createDefaultCat(input) {
  const source = input || {}
  const rawLevel = Number(source.level)
  const level = Number.isFinite(rawLevel) ? clamp(Math.floor(rawLevel), 1, 4) : 1
  const integer = (value, fallback) => {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : fallback
  }
  const safeInteger = (value, fallback) => Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : fallback
  const rawState = typeof source.stateKey === 'string' ? source.stateKey.trim().toLowerCase() : 'idle'
  const stateKey = CAT_STATES[rawState] ? rawState : 'idle'
  return {
    coupleId: typeof source.coupleId === 'string' && source.coupleId.trim() ? source.coupleId.trim().slice(0, 80) : 'local-couple',
    name: String(source.name || '八条').trim().slice(0, 20) || '八条',
    level,
    exp: integer(source.exp, 0),
    feedCount: integer(source.feedCount, 0),
    chatCount: integer(source.chatCount, 0),
    mood: clamp(source.mood === undefined ? 78 : source.mood, 0, 100),
    hunger: clamp(source.hunger === undefined ? 65 : source.hunger, 0, 100),
    currentForm: FORM_BY_LEVEL[level],
    stateKey,
    stateSince: safeInteger(source.stateSince, 0),
    stateUntil: safeInteger(source.stateUntil, 0),
    lastFeedTime: safeInteger(source.lastFeedTime, 0),
    todayFeedCount: clamp(integer(source.todayFeedCount, 0), 0, 3),
    createdAt: Number.isFinite(Number(source.createdAt)) && Number(source.createdAt) > 0 ? Number(source.createdAt) : now(),
    updatedAt: now()
  }
}

function getFormName(form) {
  return getFormMeta(form).name
}

function getLevelRule(level) {
  return LEVEL_RULES[level] || null
}

function getFormMeta(form) {
  return FORM_META[form] || FORM_META.baby
}

function getStateMeta(state) {
  return CAT_STATES[state] || CAT_STATES.idle
}

function finiteTimestamp(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : fallback
}

function isNightHour(hour, window) {
  const startHour = Number(window && window.startHour)
  const endHour = Number(window && window.endHour)
  const start = Number.isInteger(startHour) && startHour >= 0 && startHour < 24 ? startHour : NIGHT_WINDOW.startHour
  const end = Number.isInteger(endHour) && endHour >= 0 && endHour < 24 ? endHour : NIGHT_WINDOW.endHour
  if (start === end) return false
  return start > end ? hour >= start || hour < end : hour >= start && hour < end
}

function resolveCatState(cat, context) {
  const source = cat && typeof cat === 'object' ? cat : {}
  const options = context && typeof context === 'object' ? context : {}
  const timestamp = finiteTimestamp(options.now, now())
  const stateKey = CAT_STATES[source.stateKey] ? source.stateKey : 'idle'
  const stateSince = finiteTimestamp(source.stateSince, 0)
  const stateUntil = finiteTimestamp(source.stateUntil, 0)
  const hasValidWindow = stateSince <= timestamp && stateUntil > timestamp
  let selected = null
  if (hasValidWindow && (stateKey === 'eating' || stateKey === 'happy')) selected = stateKey
  const mood = Number(source.mood)
  const hunger = Number(source.hunger)
  const lowMood = Number.isFinite(mood) && mood <= SAD_MOOD_THRESHOLD
  const lowHunger = Number.isFinite(hunger) && hunger <= SAD_HUNGER_THRESHOLD
  if (!selected && (lowMood || lowHunger)) selected = 'sad'
  if (!selected) {
    const date = new Date(timestamp)
    if (!Number.isNaN(date.getTime()) && isNightHour(date.getHours(), options.nightWindow)) selected = 'sleeping'
  }
  if (!selected) selected = 'idle'
  const meta = getStateMeta(selected)
  return {
    stateKey: meta.key,
    stateText: meta.label,
    animationClass: meta.animationClass,
    assetKey: meta.assetKey,
    stateUntil: selected === stateKey && hasValidWindow ? stateUntil : 0
  }
}

function getFormAsset(form, state) {
  const formMeta = getFormMeta(form)
  const stateMeta = getStateMeta(state)
  const idlePath = formMeta.imagePath || ''
  const basePath = idlePath.slice(0, idlePath.lastIndexOf('/') + 1)
  const stateFile = formMeta.assets && formMeta.assets[stateMeta.assetKey]
  const imagePath = stateFile ? `${basePath}${stateFile}` : idlePath
  const hasDedicatedAsset = Boolean(stateFile)
  return {
    formKey: formMeta.key,
    formName: formMeta.name,
    emoji: formMeta.emoji,
    stateKey: stateMeta.key,
    stateText: stateMeta.label,
    animationClass: stateMeta.animationClass,
    assetKey: stateMeta.assetKey,
    imagePath,
    hasImage: Boolean(imagePath),
    hasDedicatedAsset,
    fallback: hasDedicatedAsset ? 'state' : 'idle',
    fallbackReason: hasDedicatedAsset ? 'dedicated' : 'missing-state-asset',
    fallbackText: hasDedicatedAsset ? '当前使用 idle 素材' : '当前状态没有专用图片，使用 idle 素材和轻量动效'
  }
}

module.exports = { createDefaultCat, FORM_BY_LEVEL, FORM_META, FORM_NAMES, CAT_STATES, STATE_DURATIONS, STATE_PRIORITY, SAD_MOOD_THRESHOLD, SAD_HUNGER_THRESHOLD, NIGHT_WINDOW, LEVEL_RULES, EXPERIENCE_NEED, getExperienceProgress, getFormName, getFormMeta, getStateMeta, getFormAsset, getLevelRule, resolveCatState }
