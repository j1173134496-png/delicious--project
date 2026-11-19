#!/usr/bin/env node

/**
 * Offline PNG and source-package budget audit.
 * Uses only Node built-ins so it can run without npm or WeChat DevTools.
 */
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')

const ROOT = path.resolve(__dirname, '..')
const MINI = path.join(ROOT, 'miniprogram')
const CAT_PREFIX = 'assets/batiao/'
const MAX_CAT_BYTES = 450 * 1024
const MAX_CAT_TOTAL = Math.floor(1.6 * 1024 * 1024)
const MAX_MINI_BYTES = 2 * 1024 * 1024
const MAX_CAT_DIMENSION = 640
const LARGE_UNREFERENCED_BYTES = 64 * 1024
const errors = []
const warnings = []

function rel(filePath) {
  return path.relative(ROOT, filePath) || '.'
}

function fail(message) {
  errors.push(message)
  console.error(`ERROR ${message}`)
}

function warn(message) {
  warnings.push(message)
  console.warn(`WARN ${message}`)
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    fail(`${rel(filePath)} cannot be read as JSON: ${error.message}`)
    return null
  }
}

function listFiles(directory) {
  if (!fs.existsSync(directory)) return []
  const result = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name)
    if (entry.isDirectory()) result.push(...listFiles(filePath))
    else result.push(filePath)
  }
  return result
}

function normalizeReference(reference) {
  if (typeof reference !== 'string') return ''
  return reference.replace(/^\//, '')
}

function collectReferences() {
  const references = new Set()
  const catReferences = new Set()
  const { CAT_STATES, FORM_META, getFormAsset } = require(path.join(MINI, 'models/cat.js'))
  const forms = Object.values(FORM_META)
  if (forms.length !== 4 || new Set(forms.map((form) => form.imagePath)).size !== 4) fail('FORM_META must expose four unique default sprites')
  const register = (reference) => {
    const normalized = normalizeReference(reference)
    if (!reference || !reference.startsWith(`/${CAT_PREFIX}`) || !/^assets\/batiao\/[\w-]+\/[\w-]+\.png$/.test(normalized)) fail(`invalid FORM_META asset path: ${reference}`)
    references.add(normalized)
    catReferences.add(normalized)
  }
  forms.forEach((form) => {
    register(form.imagePath)
    Object.keys(CAT_STATES).forEach((state) => {
      const asset = getFormAsset(form.key, state)
      if (form.key === 'baby' && !asset.hasDedicatedAsset) fail(`Lv.1 is missing its ${state} asset`)
      register(asset.imagePath)
    })
    if (form.avatarPath) register(form.avatarPath)
  })
  if (!FORM_META.baby.avatarPath) fail('Lv.1 must expose a chat avatar')

  const app = readJson(path.join(MINI, 'app.json'))
  const tabbar = app && app.tabBar && Array.isArray(app.tabBar.list) ? app.tabBar.list : []
  tabbar.forEach((item) => {
    ;['iconPath', 'selectedIconPath'].forEach((key) => {
      if (item && item[key]) references.add(normalizeReference(item[key]))
    })
  })

  const sourceFiles = listFiles(MINI).filter((filePath) => /\.(js|json|wxml|wxss)$/.test(filePath))
  const sourceText = sourceFiles.map((filePath) => fs.readFileSync(filePath, 'utf8')).join('\n')
  return { references, catReferences, sourceText }
}

function parsePng(filePath) {
  const bytes = fs.readFileSync(filePath)
  const signature = Buffer.from('\x89PNG\r\n\x1a\n', 'binary')
  if (bytes.length < 33 || !bytes.subarray(0, 8).equals(signature)) return null
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  const colorType = bytes[25]
  return {
    bytes: bytes.length,
    width,
    height,
    colorType,
    alpha: colorType === 6,
    hash: crypto.createHash('sha256').update(bytes).digest('hex')
  }
}

function main() {
  if (!fs.existsSync(MINI)) fail('miniprogram directory is missing')
  const { references, catReferences, sourceText } = collectReferences()
  const pngs = listFiles(MINI).filter((filePath) => path.extname(filePath).toLowerCase() === '.png')
  const hashes = new Map()
  let catTotal = 0
  let miniTotal = 0

  listFiles(MINI).forEach((filePath) => {
    const stat = fs.statSync(filePath)
    if (stat.isFile() && stat.size > 0) miniTotal += stat.size
  })

  pngs.forEach((filePath) => {
    const relative = path.relative(MINI, filePath).split(path.sep).join('/')
    const parsed = parsePng(filePath)
    if (!parsed) {
      fail(`${relative} is not a readable PNG`)
      return
    }
    const isCat = catReferences.has(relative)
    const referenced = references.has(relative) || sourceText.includes(relative) || sourceText.includes(`/${relative}`)
    console.log(`ASSET path=${relative} bytes=${parsed.bytes} dimensions=${parsed.width}x${parsed.height} alpha=${parsed.alpha ? 'yes' : 'no'} sha256=${parsed.hash} referenced=${referenced ? 'yes' : 'no'}`)
    if (!referenced && parsed.bytes > LARGE_UNREFERENCED_BYTES) fail(`${relative} is an unreferenced large asset (${parsed.bytes} bytes)`)
    if (!parsed.alpha) fail(`${relative} is not RGBA (PNG color type ${parsed.colorType})`)
    if (hashes.has(parsed.hash)) fail(`${relative} duplicates ${hashes.get(parsed.hash)} (sha256 ${parsed.hash})`)
    else hashes.set(parsed.hash, relative)
    if (isCat) {
      catTotal += parsed.bytes
      if (parsed.bytes > MAX_CAT_BYTES) fail(`${relative} exceeds ${MAX_CAT_BYTES} byte per-form budget`)
      if (Math.max(parsed.width, parsed.height) > MAX_CAT_DIMENSION) fail(`${relative} exceeds ${MAX_CAT_DIMENSION}px long-edge budget (${parsed.width}x${parsed.height})`)
    }
  })

  catReferences.forEach((relative) => {
    if (!fs.existsSync(path.join(MINI, relative))) fail(`FORM_META references missing ${relative}`)
  })
  if (catTotal > MAX_CAT_TOTAL) fail(`cat form assets total ${catTotal} exceeds ${MAX_CAT_TOTAL} byte budget`)
  if (miniTotal > MAX_MINI_BYTES) fail(`miniprogram non-empty files total ${miniTotal} exceeds ${MAX_MINI_BYTES} byte budget`)
  console.log(`ASSET_CAT_COUNT=${catReferences.size}`)
  console.log(`ASSET_CAT_BYTES=${catTotal}`)
  console.log(`ASSET_MINIPROGRAM_BYTES=${miniTotal}`)
  console.log(`ASSET_BUDGET_BYTES=${MAX_CAT_TOTAL}`)
  console.log(`ASSET_PACKAGE_BUDGET_BYTES=${MAX_MINI_BYTES}`)
  console.log(`ASSET_CAT_REMAINING_BYTES=${Math.max(0, MAX_CAT_TOTAL - catTotal)}`)
  console.log(`ASSET_MINIPROGRAM_REMAINING_BYTES=${Math.max(0, MAX_MINI_BYTES - miniTotal)}`)
  console.log(`ASSET_ERRORS=${errors.length}`)
  console.log(`ASSET_WARNINGS=${warnings.length}`)
  if (errors.length) process.exitCode = 1
}

main()
