#!/usr/bin/env node

/**
 * Offline structural audit for the native mini program.
 *
 * This deliberately uses only Node's built-in fs/path modules so it can run
 * before installing dependencies or opening WeChat DevTools.
 */
const fs = require('fs')
const path = require('path')
const childProcess = require('child_process')

const ROOT = path.resolve(__dirname, '..')
const MINI = path.join(ROOT, 'miniprogram')
const errors = []
const warnings = []

function rel(filePath) {
  return path.relative(ROOT, filePath) || '.'
}

function reportError(message) {
  errors.push(message)
  console.error(`ERROR ${message}`)
}

function reportWarning(message) {
  warnings.push(message)
  console.warn(`WARN  ${message}`)
}

function readJson(filePath, required = true) {
  if (!fs.existsSync(filePath)) {
    if (required) reportError(`${rel(filePath)} is missing`)
    return null
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    reportError(`${rel(filePath)} is not valid JSON: ${error.message}`)
    return null
  }
}

function ensureFile(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    reportError(`${label || rel(filePath)} points to missing file ${rel(filePath)}`)
    return false
  }
  return true
}

function resolveMiniReference(reference) {
  if (typeof reference !== 'string' || !reference || reference.includes('{{')) return null
  if (/^(https?:)?\/\//.test(reference) || reference.startsWith('data:')) return null
  if (reference.startsWith('/')) return path.join(MINI, reference.slice(1))
  return path.join(MINI, reference)
}

function checkPageSuite(pagePath) {
  const base = path.join(MINI, pagePath)
  ;['js', 'json', 'wxml', 'wxss'].forEach((extension) => ensureFile(`${base}.${extension}`, `${pagePath}.${extension}`))
}

function checkUsingComponents(jsonPath, value) {
  if (!value || typeof value !== 'object') return
  Object.entries(value).forEach(([name, reference]) => {
    const target = resolveMiniReference(reference)
    if (!target) {
      if (typeof reference === 'string' && /^(https?:)?\/\//.test(reference)) reportError(`${rel(jsonPath)} component ${name} uses remote URL ${reference}`)
      return
    }
    if (!ensureFile(`${target}.js`, `${rel(jsonPath)} component ${name}`) || !ensureFile(`${target}.json`, `${rel(jsonPath)} component ${name}`) || !ensureFile(`${target}.wxml`, `${rel(jsonPath)} component ${name}`)) {
      return
    }
    if (!fs.existsSync(`${target}.wxss`)) reportWarning(`${rel(jsonPath)} component ${name} has no wxss file`)
  })
}

function scanWxmlReferences(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const imagePattern = /<image\b[^>]*\bsrc=["']([^"']+)["']/g
  let match
  while ((match = imagePattern.exec(source))) {
    const reference = match[1]
    const target = resolveMiniReference(reference)
    if (!target) {
      if (/^(https?:)?\/\//.test(reference)) reportError(`${rel(filePath)} references remote image ${reference}`)
      continue
    }
    ensureFile(target, `${rel(filePath)} image`)
  }
  const externalPattern = /(?:url\(|(?:src|href)=)["']?(https?:\/\/[^"'\s)]+)/g
  while ((match = externalPattern.exec(source))) reportError(`${rel(filePath)} references external URL ${match[1]}`)
}

function checkPng(filePath, label) {
  if (!ensureFile(filePath, label)) return
  const bytes = fs.readFileSync(filePath)
  const signature = Buffer.from('\x89PNG\r\n\x1a\n', 'binary')
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(signature)) {
    reportError(`${rel(filePath)} is not a PNG file`)
    return
  }
  const width = bytes.readUInt32BE(16)
  const height = bytes.readUInt32BE(20)
  if (!width || !height) reportError(`${rel(filePath)} has invalid dimensions ${width}x${height}`)
  if (width > 96 || height > 96) reportWarning(`${rel(filePath)} is ${width}x${height}; tabbar icons should stay compact`)
  if (width < 24 || height < 24) reportWarning(`${rel(filePath)} is ${width}x${height}; tabbar icons may be hard to see`)
  if (bytes.length > 64 * 1024) reportWarning(`${rel(filePath)} is ${bytes.length} bytes; large tabbar assets may slow startup`)
}

function scanSourceFiles() {
  const sourceExtensions = new Set(['.js', '.wxml', '.json', '.wxss'])
  const files = []
  function visit(directory) {
    if (!fs.existsSync(directory)) return
    fs.readdirSync(directory, { withFileTypes: true }).forEach((entry) => {
      const filePath = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(filePath)
      else if (sourceExtensions.has(path.extname(entry.name))) files.push(filePath)
    })
  }
  visit(MINI)
  const pageStorage = /\bwx\.(?:get|set|remove|clear)Storage(?:Sync)?\s*\(/g
  const credentialPattern = new RegExp(`(?:${['api', '[_-]?', 'key'].join('')}|${'se' + 'cret'}|${['sk', '-[A-Za-z0-9]{8,}'].join('')})`, 'i')
  const external = /https?:\/\//i
  const auditTodoA = 'TO' + 'DO'
  const auditTodoB = 'FIX' + 'ME'
  const todo = new RegExp(`\\b(?:${auditTodoA}|${auditTodoB})\\b`, 'i')
  files.forEach((filePath) => {
    const source = fs.readFileSync(filePath, 'utf8')
    if (path.basename(path.dirname(filePath)) === 'pages' || filePath.includes(`${path.sep}pages${path.sep}`)) {
      if (pageStorage.test(source)) reportError(`${rel(filePath)} accesses wx Storage directly; use a Service`)
    }
    if (credentialPattern.test(source)) reportError(`${rel(filePath)} contains a possible credential token`)
    if (external.test(source)) reportError(`${rel(filePath)} contains an external URL`)
    if (todo.test(source)) reportWarning(`${rel(filePath)} contains a pending marker`)
    if (filePath.endsWith('.wxss')) {
      if (/\bgap\s*:/.test(source)) reportWarning(`${rel(filePath)} uses flex gap; adjacent margins are safer for older base libraries`)
      if (/display\s*:\s*grid/.test(source)) reportError(`${rel(filePath)} uses CSS grid, which is outside the v1.1 compatibility target`)
      if (/position\s*:\s*sticky/.test(source)) reportWarning(`${rel(filePath)} uses sticky positioning; verify on the target base library`)
    }
    if (filePath.endsWith('.wxml')) scanWxmlReferences(filePath)
  })
  return files
}

function checkV12Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const settings = readSource('miniprogram/pages/settings/settings.js')
  ;[
    ['/pages/about/about', 'about page navigation'],
    ['/pages/privacy/privacy', 'privacy page navigation'],
    ['/pages/feedback/feedback', 'feedback page navigation']
  ].forEach(([target, label]) => {
    if (settings.indexOf(target) < 0) reportError(`settings is missing ${label}`)
  })
  const bind = readSource('miniprogram/pages/bind/bind.js')
  const bindWxml = readSource('miniprogram/pages/bind/bind.wxml')
  if (!/onLoad\s*\(/.test(bind)) reportError('bind page is missing onLoad query handling')
  if (!/onShareAppMessage\s*\(/.test(bind)) reportError('bind page is missing onShareAppMessage')
  if (!/pages\/bind\/bind\?code=/.test(bind)) reportError('bind share payload is missing invite code path')
  if (!/open-type=["']share["']/.test(bindWxml)) reportError('bind page is missing native share button')
  const profile = readSource('miniprogram/pages/profile/profile.js')
  if (!/onShareAppMessage\s*\(/.test(profile) || !/pages\/bind\/bind\?code=/.test(profile)) reportError('profile invite share contract is incomplete')
  ;[bind, profile].forEach((source) => { if (/https?:\/\//.test(source)) reportError('invite share payload contains an external URL') })
  const feedbackModel = readSource('miniprogram/models/feedback.js')
  const feedbackService = readSource('miniprogram/services/feedbackService.js')
  const storage = readSource('miniprogram/services/storageService.js')
  if (!/FEEDBACK/.test(storage)) reportError('storage service is missing FEEDBACK collection key')
  if (!/saved_local/.test(feedbackModel) || !/createFeedback/.test(feedbackService)) reportError('feedback local status contract is incomplete')
  if (!/function\s+submit\s*\(/.test(feedbackService) || !/function\s+formatForCopy\s*\(/.test(feedbackService)) reportError('feedback service is missing submit/copy functions')
  const catModel = readSource('miniprogram/models/cat.js')
  const catImagePaths = Array.from(catModel.matchAll(/imagePath:\s*['"]([^'"]+)['"]/g)).map((match) => match[1])
  if (catImagePaths.length < 4) reportError('cat form metadata is missing generated image paths')
  catImagePaths.forEach((imagePath) => {
    const target = resolveMiniReference(imagePath)
    if (target) ensureFile(target, `cat form image ${imagePath}`)
  })
}

function checkImportContracts(rootConfig, miniApp) {
  if (!rootConfig || typeof rootConfig !== 'object') return
  if (rootConfig.compileType !== 'miniprogram') reportError('project.config.json compileType must be miniprogram')
  // The checked-in project may use the controlled real AppID while the app
  // remains explicitly local and guest-only (no login/cloud initialization).
  // Keep touristappid valid for local fixtures, but do not reject a configured
  // wx AppID solely because it is not the historical guest placeholder.
  const appid = typeof rootConfig.appid === 'string' ? rootConfig.appid : ''
  const validAppId = appid === 'touristappid' || /^wx[a-f-z0-9]{16}$/.test(appid)
  if (!validAppId) reportError('project.config.json appid must be touristappid or a valid wx AppID')
  const miniRoot = typeof rootConfig.miniprogramRoot === 'string' ? rootConfig.miniprogramRoot.replace(/[\\/]$/, '') : ''
  if (!miniRoot || !fs.existsSync(path.join(ROOT, miniRoot))) reportError(`project.config.json miniprogramRoot is missing: ${rootConfig.miniprogramRoot}`)
  if (!rootConfig.libVersion) reportError('project.config.json libVersion is missing')
  const privateConfig = readJson(path.join(ROOT, 'project.private.config.json'), false)
  if (privateConfig) {
    ;['appid', 'compileType', 'miniprogramRoot'].forEach((key) => { if (Object.prototype.hasOwnProperty.call(privateConfig, key)) reportError(`project.private.config.json must not override ${key}`) })
  }
  const forbiddenFiles = ['package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml']
  forbiddenFiles.forEach((file) => { if (fs.existsSync(path.join(ROOT, file))) reportError(`${file} is not allowed in the offline native project`) })
  const capabilityModule = path.join(MINI, 'utils/runtimeCapabilities.js')
  if (!ensureFile(capabilityModule, 'runtime capability module')) return
  const appSource = fs.existsSync(path.join(MINI, 'app.js')) ? fs.readFileSync(path.join(MINI, 'app.js'), 'utf8') : ''
  if (!/localGuestMode\s*:\s*true/.test(appSource) || !/capabilities/.test(appSource)) reportError('app.js must expose localGuestMode and capability snapshot')
  if (/wx\.login\s*\(|wx\.cloud|openId/i.test(appSource)) reportError('app.js must not initialize login, cloud, or openId')
  if (miniApp && Array.isArray(miniApp.pages)) {
    const appPages = new Set(miniApp.pages)
    const rootSitemap = readJson(path.join(ROOT, 'sitemap.json'))
    const miniSitemap = readJson(path.join(MINI, 'sitemap.json'))
    const pageSet = (sitemap) => new Set((sitemap && Array.isArray(sitemap.rules) ? sitemap.rules : []).map((rule) => rule && rule.page).filter(Boolean))
    const rootPages = pageSet(rootSitemap)
    const miniPages = pageSet(miniSitemap)
    if (rootPages.size !== appPages.size || Array.from(appPages).some((page) => !rootPages.has(page))) reportError('root sitemap pages do not match app.json pages')
    if (miniPages.size !== appPages.size || Array.from(appPages).some((page) => !miniPages.has(page))) reportError('miniprogram sitemap pages do not match app.json pages')
  }
}

function checkV13Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const storage = readSource('miniprogram/services/storageService.js')
  if (!/SCHEMA_VERSION\s*=\s*4\b/.test(storage) || !/SCHEMA_NAME\s*=\s*['"]1\.3['"]/.test(storage)) reportError('storage service schema must be numeric 4 / name 1.3')
  ;['initialize', 'setChecked', 'saveImageChecked', 'removeImageChecked', 'isManagedImagePath'].forEach((name) => {
    if (!new RegExp(`function\\s+${name}\\s*\\(`).test(storage)) reportError(`storage service is missing ${name}`)
  })

  const limits = readSource('miniprogram/utils/limits.js')
  ;[
    ['CHAT_MESSAGES', 20],
    ['CARE_EVENTS', 50],
    ['FEEDBACK', 50],
    ['ALBUM_PHOTOS_PER_BATCH', 9],
    ['RECIPE_PHOTOS_PER_RECIPE', 9],
    ['ALBUM_TOTAL_PHOTOS', 500],
    ['RECIPE_TOTAL_RECORDS', 200]
  ].forEach(([name, value]) => {
    if (!new RegExp(`${name}\\s*:\\s*${value}\\b`).test(limits)) reportError(`limits is missing ${name}=${value}`)
  })
  ;[
    ['miniprogram/services/chatService.js', 'CHAT_MESSAGES'],
    ['miniprogram/services/albumService.js', 'ALBUM_TOTAL_PHOTOS'],
    ['miniprogram/services/recipeService.js', 'RECIPE_TOTAL_RECORDS'],
    ['miniprogram/services/feedbackService.js', 'FEEDBACK']
  ].forEach(([relativePath, limitName]) => {
    if (!new RegExp(`LIMITS\\.${limitName}`).test(readSource(relativePath))) reportError(`${relativePath} must enforce ${limitName}`)
  })

  const cat = readSource('miniprogram/models/cat.js')
  if ((cat.match(/imagePath\s*:\s*['"][^'"]+['"]/g) || []).length !== 4) reportError('v1.3 cat mapping must contain four image paths')
  if (!/CAT_STATES\s*=\s*{[\s\S]*idle:[\s\S]*happy:[\s\S]*eating:[\s\S]*sad:/.test(cat)) reportError('v1.3 cat mapping must contain idle/happy/eating/sad states')
  if (!/function\s+getFormAsset\s*\(/.test(cat) || !/assets\s*:\s*{\s*idle:/.test(cat)) reportError('v1.3 cat mapping is missing idle asset fallback metadata')
  const displayJs = readSource('miniprogram/components/cat-display/cat-display.js')
  const displayWxml = readSource('miniprogram/components/cat-display/cat-display.wxml')
  const profileJs = readSource('miniprogram/pages/profile/profile.js')
  const profileWxml = readSource('miniprogram/pages/profile/profile.wxml')
  ;[
    [displayJs, 'cat-display.js', /getFormAsset/],
    [displayWxml, 'cat-display.wxml', /binderror/],
    [displayWxml, 'cat-display.wxml', /wx:else/],
    [profileJs, 'profile.js', /getFormAsset/],
    [profileWxml, 'profile.wxml', /binderror/],
    [profileWxml, 'profile.wxml', /wx:else/]
  ].forEach(([source, label, pattern]) => { if (!pattern.test(source)) reportError(`${label} is missing shared image fallback hook ${pattern}`) })

  const errorMessages = readSource('miniprogram/utils/errorMessage.js')
  if (!/function\s+mapError\s*\(/.test(errorMessages) || !/权限|取消|空间|不支持/.test(errorMessages)) reportError('errorMessage.js is missing user-visible failure mappings')
  const capabilities = readSource('miniprogram/utils/runtimeCapabilities.js')
  if (!/localGuestMode/.test(readSource('miniprogram/app.js')) || !/function\s+getCapabilities\s*\(/.test(capabilities)) reportError('guest capability contract is incomplete')

  const assetAudit = path.join(ROOT, 'scripts/audit-assets.js')
  if (!ensureFile(assetAudit, 'asset budget audit')) return
  const audit = childProcess.spawnSync(process.execPath, [assetAudit], { cwd: ROOT, encoding: 'utf8' })
  if (audit.error || audit.status !== 0) {
    reportError(`asset budget audit failed${audit.error ? `: ${audit.error.message}` : ` (exit ${audit.status})`}`)
  } else {
    const auditOutput = `${audit.stdout || ''}\n${audit.stderr || ''}`
    if (!/ASSET_ERRORS=0/.test(auditOutput) || !/ASSET_WARNINGS=0/.test(auditOutput)) reportError('asset budget audit did not report zero errors/warnings')
    else console.log('ASSET_AUDIT=PASS')
  }
}

function checkV14VersionContracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const appMeta = readSource('miniprogram/utils/appMeta.js')
  if (!/APP_VERSION\s*=\s*['"]1\.4\.0['"]/.test(appMeta)) reportError('appMeta must define APP_VERSION 1.4.0')
  if (!/LOCAL_MODE_NAME\s*=\s*['"]本机游客模式['"]/.test(appMeta)) reportError('appMeta must define the local guest mode name')
  ;['LOCAL_MODE_COPY', 'UNAVAILABLE_CAPABILITIES_COPY'].forEach((name) => {
    if (!new RegExp(`\\b${name}\\s*=`).test(appMeta)) reportError(`appMeta is missing ${name}`)
  })

  const app = readSource('miniprogram/app.js')
  if (!/require\(['"]\.\/utils\/appMeta['"]\)/.test(app) || !/version\s*:\s*APP_VERSION/.test(app)) reportError('app.js must read its version from appMeta')
  const about = readSource('miniprogram/pages/about/about.js')
  const aboutWxml = readSource('miniprogram/pages/about/about.wxml')
  if (!/APP_VERSION/.test(about) || !/version\s*:/.test(about) || !/localModeName\s*:/.test(about)) reportError('about page is missing appMeta-backed version data')
  if (!/\{\{version\}\}/.test(aboutWxml) || !/\{\{localModeName\}\}/.test(aboutWxml) || !/\{\{unavailableCapabilitiesCopy\}\}/.test(aboutWxml) || !/真实 LLM/.test(appMeta)) reportError('about page is missing visible v1.4/local-mode boundary copy')
  const settings = readSource('miniprogram/pages/settings/settings.js')
  const settingsWxml = readSource('miniprogram/pages/settings/settings.wxml')
  if (!/APP_VERSION/.test(settings) || !/version\s*:/.test(settings) || !/localModeName\s*:/.test(settings)) reportError('settings page is missing appMeta-backed version data')
  if (!/\{\{version\}\}/.test(settingsWxml) || !/\{\{localModeName\}\}/.test(settingsWxml)) reportError('settings page is missing dynamic version/mode copy')

  const userVisible = [
    'README.md',
    'miniprogram/app.js',
    'miniprogram/pages/about/about.js',
    'miniprogram/pages/about/about.wxml',
    'miniprogram/pages/settings/settings.js',
    'miniprogram/pages/settings/settings.wxml'
  ]
  userVisible.forEach((relativePath) => {
    const source = readSource(relativePath)
    if (/v1\.2\.0|v1\.3\.0/.test(source)) reportError(`${relativePath} contains an obsolete application version`) 
  })
  if (!/应用版本为 `1\.4\.0`/.test(readSource('README.md'))) reportError('README must document application version 1.4.0')
}

function checkV14Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const storage = readSource('miniprogram/services/storageService.js')
  ;['setChecked', 'removeChecked', 'clearChecked'].forEach((name) => {
    if (!new RegExp(`function\\s+${name}\\s*\\(`).test(storage)) reportError(`storage service is missing v1.4 ${name}`)
  })
  ;fs.readdirSync(path.join(MINI, 'services')).filter((name) => name.endsWith('.js')).forEach((name) => {
    const source = readSource(`miniprogram/services/${name}`)
    if (/storage\.(?:set|remove|clear)\s*\(/.test(source)) reportError(`miniprogram/services/${name} uses unchecked storage API`)
  })

  const app = readSource('miniprogram/app.js')
  if (!/retryInitialization\s*\(/.test(app) || !/initializationStage/.test(app) || !/initializationRetryable/.test(app)) reportError('app.js is missing retryable staged initialization contract')
  const capabilities = readSource('miniprogram/utils/runtimeCapabilities.js')
  if (!/reasons/.test(capabilities) || !/details/.test(capabilities) || !/wx_missing/.test(capabilities) || !/can_i_use_denied/.test(capabilities)) reportError('runtime capabilities is missing reason matrix fields')

  ;[
    'chat',
    'album',
    'album-upload',
    'recipe-add',
    'recipe-detail',
    'profile-edit',
    'bind',
    'feedback',
    'settings'
  ].forEach((pageName) => {
    const source = readSource(`miniprogram/pages/${pageName}/${pageName}.js`)
    if (!/onHide\s*\(/.test(source) || !/onUnload\s*\(/.test(source) || !/pageTask/.test(source)) reportError(`${pageName} is missing page lifecycle task hooks`)
  })
  ;['smoke-storage-atomic.js', 'smoke-invariants.js', 'smoke-recovery.js', 'smoke-lifecycle.js'].forEach((script) => ensureFile(path.join(ROOT, 'scripts', script), `v1.4 ${script}`))
  ;['miniprogram/pages', 'miniprogram/services', 'miniprogram/utils'].forEach((relativeDirectory) => {
    const directory = path.join(ROOT, relativeDirectory)
    if (!fs.existsSync(directory)) return
    const visit = (current) => fs.readdirSync(current, { withFileTypes: true }).forEach((entry) => {
      const filePath = path.join(current, entry.name)
      if (entry.isDirectory()) visit(filePath)
      else if (/\.(?:js|wxml)$/.test(entry.name) && /\.stack\b/.test(fs.readFileSync(filePath, 'utf8'))) reportError(`${rel(filePath)} exposes a raw stack`) 
    })
    visit(directory)
  })
}

function checkV15T1Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const catDisplay = readSource('miniprogram/components/cat-display/cat-display.wxml')
  const catDisplayJs = readSource('miniprogram/components/cat-display/cat-display.js')
  const chat = readSource('miniprogram/pages/chat/chat.js')
  const chatWxml = readSource('miniprogram/pages/chat/chat.wxml')
  const profileWxml = readSource('miniprogram/pages/profile/profile.wxml')
  const catModel = readSource('miniprogram/models/cat.js')
  const catService = readSource('miniprogram/services/catService.js')
  if (!/bindtap="onPet"/.test(catDisplay) || !/bindlongpress="onPet"/.test(catDisplay)) reportError('cat display must expose tap and longpress on the shared onPet handler')
  if (!/source/.test(catDisplayJs) || !/token/.test(catDisplayJs)) reportError('cat display pet events must include a source and token')
  if (!/petting/.test(chat) || !/lastPetToken/.test(chat)) reportError('chat page is missing the duplicate pet guard')
  if (!/getExperienceProgress/.test(catModel) || !/getExperienceProgress/.test(catService)) reportError('cat service/model is missing derived experience progress')
  if (!/progress\.experience\.current/.test(chatWxml) || !/progress\.experience\.percent/.test(chatWxml)) reportError('chat page is missing visible experience progress')
  if (!/progress\.experience\.current/.test(profileWxml) || !/progress\.experience\.percent/.test(profileWxml)) reportError('profile page is missing visible experience progress')
  ensureFile(path.join(ROOT, 'scripts/smoke-cat-interaction.js'), 'v1.5 smoke-cat-interaction.js')
}

function checkV16T1Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const mediaUtil = readSource('miniprogram/utils/mediaUtil.js')
  const photoModel = readSource('miniprogram/models/photo.js')
  const storage = readSource('miniprogram/services/storageService.js')
  const album = readSource('miniprogram/pages/album/album.js')
  const albumWxml = readSource('miniprogram/pages/album/album.wxml')
  const recipeAdd = readSource('miniprogram/pages/recipe-add/recipe-add.js')
  const recipeAddWxml = readSource('miniprogram/pages/recipe-add/recipe-add.wxml')
  const recipeDetail = readSource('miniprogram/pages/recipe-detail/recipe-detail.js')
  const recipeDetailWxml = readSource('miniprogram/pages/recipe-detail/recipe-detail.wxml')
  const albumUpload = readSource('miniprogram/pages/album-upload/album-upload.js')
  const albumUploadWxml = readSource('miniprogram/pages/album-upload/album-upload.wxml')
  if (!/https\?|data|blob/.test(mediaUtil) || !/local|wxfile|file|temp|tmp/.test(mediaUtil) || !/isImagePath/.test(mediaUtil)) reportError('mediaUtil must reject remote/data/blob/unknown URIs and allow local path families')
  if (!/hasImage/.test(album) || !/photo\.hasImage\s*!==\s*true/.test(album)) reportError('album save must require a rendered image flag before saving')
  if (!/photoItems/.test(recipeAdd) || !/isImagePath/.test(recipeAdd) || !/item\.hasImage/.test(recipeAddWxml) || /src="\{\{item\}\}"/.test(recipeAddWxml)) reportError('recipe-add must derive safe photo presenter items instead of binding raw paths')
  if (!/photoItems/.test(recipeDetail) || !/item\.hasImage/.test(recipeDetailWxml)) reportError('recipe detail must gate image rendering with hasImage')
  if (!/imageItems/.test(albumUpload) || !/item\.hasImage/.test(albumUploadWxml) || /src="\{\{item\}\}"/.test(albumUploadWxml)) reportError('album upload must derive safe image presenter items')
  if (!/renderPath/.test(album) || !/item\.renderPath/.test(albumWxml)) reportError('album preview must pass only a safe render path to image')
  if (!/\[a-z\]\[a-z0-9\+\.\-\]\*:\|\\\//.test(photoModel) || !/\[a-z\]\[a-z0-9\+\.\-\]\*:\|\\\//.test(storage)) reportError('migration normalizers must preserve non-local URI metadata')
  ensureFile(path.join(ROOT, 'scripts/smoke-photo-presenter.js'), 'v1.6 smoke-photo-presenter.js')
}

function checkV15T2Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const card = readSource('miniprogram/components/photo-card/photo-card.wxml')
  const album = readSource('miniprogram/pages/album/album.js')
  const albumWxml = readSource('miniprogram/pages/album/album.wxml')
  if (!/uploaderLabel/.test(card) || !/uploaderLabel/.test(album) || !/presentPhoto/.test(album)) reportError('photo presenter is missing the safe uploader label mapping')
  if (!/uploaderLabel/.test(albumWxml) || /uploadedBy/.test(card) || /uploadedBy/.test(albumWxml)) reportError('photo WXML must show uploaderLabel without binding raw uploadedBy')
  ensureFile(path.join(ROOT, 'scripts/smoke-photo-presenter.js'), 'v1.5 smoke-photo-presenter.js')
}

function checkV15T4Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const chat = readSource('miniprogram/services/chatService.js')
  const chatModel = readSource('miniprogram/models/chat.js')
  const detector = readSource('miniprogram/utils/emotionDetector.js')
  if (!/eventId/.test(chat) || !/care_event_cleanup_failed/.test(chat) || !/care_event_write_failed/.test(chat) || !/care_message_write_failed/.test(chat)) reportError('chat service is missing care event ids or stable failure codes')
  if (!/86400000/.test(chat) || !/normalizeCareTag/.test(chat) || !/deliveryState/.test(chat)) reportError('chat service is missing normalized 24 hour care dedupe')
  if (!/emotion_care/.test(chatModel) || !/careMessage/.test(detector)) reportError('care message model or generalized copy is incomplete')
  ensureFile(path.join(ROOT, 'scripts/smoke-care-atomic.js'), 'v1.5 smoke-care-atomic.js')
}

function checkV15T5Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const capabilities = readSource('miniprogram/utils/runtimeCapabilities.js')
  const bindWxml = readSource('miniprogram/pages/bind/bind.wxml')
  const profileWxml = readSource('miniprogram/pages/profile/profile.wxml')
  if (!/share: *probe\('button\.open-type\.share'\)/.test(capabilities) || !/shareMenu: *probe\('showShareMenu'/.test(capabilities)) reportError('share button and showShareMenu must be probed independently')
  if (!/open-type="share"/.test(bindWxml) || !/open-type="share"/.test(profileWxml)) reportError('bind/profile pages are missing native share buttons')
  if (!/reasons/.test(capabilities) || !/details/.test(capabilities)) reportError('capability snapshot must retain reasons and details')
}

function checkV15T6Contracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const catWxml = readSource('miniprogram/components/cat-display/cat-display.wxml')
  const chatWxml = readSource('miniprogram/pages/chat/chat.wxml')
  const profileWxml = readSource('miniprogram/pages/profile/profile.wxml')
  const photoWxml = readSource('miniprogram/components/photo-card/photo-card.wxml')
  const albumWxml = readSource('miniprogram/pages/album/album.wxml')
  const albumService = readSource('miniprogram/services/albumService.js')
  const recipeService = readSource('miniprogram/services/recipeService.js')
  const userService = readSource('miniprogram/services/userService.js')
  const chatService = readSource('miniprogram/services/chatService.js')
  if (!/bindtap="onPet"/.test(catWxml) || !/bindlongpress="onPet"/.test(catWxml)) reportError('v1.5 cat interaction contract is incomplete')
  if (!/progress\.experience\.percent/.test(chatWxml) || !/progress\.experience\.percent/.test(profileWxml)) reportError('v1.5 experience progress is not visible in both pages')
  if (!/uploaderLabel/.test(photoWxml) || !/uploaderLabel/.test(albumWxml) || /uploadedBy/.test(photoWxml) || /uploadedBy/.test(albumWxml)) reportError('v1.5 photo uploader privacy contract is incomplete')
  if (!/file_remove_failed/.test(albumService) || !/failedFiles/.test(recipeService) || !/removeImageChecked/.test(userService)) reportError('v1.5 file cleanup retry contract is incomplete')
  if (!/eventId/.test(chatService) || !/careStatus/.test(chatService) || !/care_message_write_failed/.test(chatService)) reportError('v1.5 care failure contract is incomplete')
  ;['smoke-cat-interaction.js', 'smoke-photo-presenter.js', 'smoke-file-cleanup.js', 'smoke-care-atomic.js'].forEach((script) => ensureFile(path.join(ROOT, 'scripts', script), `v1.5 ${script}`))
  const readme = readSource('README.md')
  if (!/SMOKE_CAT_INTERACTION=PASS/.test(readme) || !/SMOKE_PHOTO_PRESENTER=PASS/.test(readme) || !/SMOKE_FILE_CLEANUP=PASS/.test(readme) || !/SMOKE_CARE_ATOMIC=PASS/.test(readme) || !/idle\.png/.test(readme)) reportError('README is missing v1.5 smoke and idle fallback boundaries')
}

function checkV23CatContracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const catModel = readSource('miniprogram/models/cat.js')
  const displayJs = readSource('miniprogram/components/cat-display/cat-display.js')
  const displayWxml = readSource('miniprogram/components/cat-display/cat-display.wxml')
  const chatWxml = readSource('miniprogram/pages/chat/chat.wxml')
  const profileWxml = readSource('miniprogram/pages/profile/profile.wxml')
  const catSmoke = readSource('scripts/smoke-cat-interaction.js')
  const before = errors.length

  if (!/CAT_STATES\s*=\s*{[\s\S]*idle:[\s\S]*happy:[\s\S]*eating:[\s\S]*sad:/.test(catModel)) reportError('v2.3 cat states must remain idle/happy/eating/sad')
  if (!/hasDedicatedAsset/.test(catModel) || !/fallbackReason/.test(catModel) || !/fallbackText/.test(catModel)) reportError('cat asset presenter is missing explicit fallback metadata')
  if (!/assetFallback/.test(displayJs) || !/fallbackText/.test(displayJs) || !/onImageError/.test(displayJs)) reportError('cat display is missing image fallback state')
  if (!/bindtap="onPet"/.test(displayWxml) || !/bindlongpress="onPet"/.test(displayWxml) || !/点击或长按/.test(displayWxml) || !/当前状态/.test(displayWxml) || !/Emoji 占位/.test(displayWxml)) reportError('cat display is missing readable interaction/state/fallback copy')
  if (!/<cat-display[^>]+bind:pet="onPet"/.test(chatWxml) || !/bindtap="onPet"/.test(chatWxml)) reportError('chat page must expose both the interactive cat and the pet button')
  if (!/当前状态/.test(profileWxml) || !/formImageFailed/.test(profileWxml) || !/Emoji 占位/.test(profileWxml)) reportError('profile page is missing readable cat state/fallback copy')
  if (!/getFormAsset/.test(catSmoke) || !/fallback/.test(catSmoke)) reportError('cat smoke is missing fallback assertions')

  const auditPath = path.join(ROOT, 'scripts/audit-assets.js')
  const audit = childProcess.spawnSync(process.execPath, [auditPath], { cwd: ROOT, encoding: 'utf8' })
  const auditOutput = `${audit.stdout || ''}\n${audit.stderr || ''}`
  const catRemaining = Number((auditOutput.match(/ASSET_CAT_REMAINING_BYTES=(\d+)/) || [])[1])
  const miniRemaining = Number((auditOutput.match(/ASSET_MINIPROGRAM_REMAINING_BYTES=(\d+)/) || [])[1])
  if (audit.error || audit.status !== 0 || !Number.isFinite(catRemaining) || !Number.isFinite(miniRemaining) || !/ASSET_ERRORS=0/.test(auditOutput) || !/ASSET_WARNINGS=0/.test(auditOutput)) reportError('cat asset audit is missing or failed')

  if (errors.length === before) {
    console.log('CAT_STATE_FALLBACK=PASS')
    console.log('CAT_ASSET_BUDGET=PASS')
    console.log('UX_ACCESSIBILITY_COPY=PASS')
  }
}

function checkV23RecipeAlbumContracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const recipe = readSource('miniprogram/pages/recipe/recipe.wxml')
  const recipeAdd = readSource('miniprogram/pages/recipe-add/recipe-add.wxml')
  const recipeDetail = readSource('miniprogram/pages/recipe-detail/recipe-detail.wxml')
  const recipeCard = readSource('miniprogram/components/recipe-card/recipe-card.wxml')
  const album = readSource('miniprogram/pages/album/album.wxml')
  const albumUpload = readSource('miniprogram/pages/album-upload/album-upload.wxml')
  const photoCard = readSource('miniprogram/components/photo-card/photo-card.wxml')
  const emptyState = readSource('miniprogram/components/empty-state/empty-state.wxml')
  const albumJs = readSource('miniprogram/pages/album/album.js')
  const pageSmoke = readSource('scripts/smoke-pages.js')
  const photoSmoke = readSource('scripts/smoke-photo-presenter.js')
  const before = errors.length

  if (!/recipe-tab-count/.test(recipe) || !/recipe-tab-state/.test(recipe) || !/当前分类/.test(recipe) || !/新增菜品/.test(recipe)) reportError('recipe tabs/add action are missing readable current/count labels')
  if (!/recipe-placeholder-label/.test(recipeCard) || !/recipe-status-text/.test(recipeCard) || !/评分/.test(recipeCard) || !/补充照片解锁/.test(recipeCard)) reportError('recipe card is missing readable lock/photo/rating copy')
  if (!/当前评分/.test(recipeAdd) || !/照片占位/.test(recipeAdd) || !/添加照片/.test(recipeAdd)) reportError('recipe add is missing readable rating/photo actions')
  if (!/照片占位/.test(recipeDetail) || !/编辑菜品/.test(recipeDetail) || !/点赞/.test(recipeDetail) || !/删除这道菜/.test(recipeDetail)) reportError('recipe detail is missing readable placeholder/edit/like/delete actions')
  if (!/编辑签名/.test(album) || !/关闭照片预览/.test(album) || !/照片预览/.test(album) || !/长按照片可尝试保存到系统相册/.test(album) || !/上传照片/.test(album) || !/删除这张照片/.test(album)) reportError('album is missing readable preview/signature/upload/delete copy')
  if (!/照片占位/.test(albumUpload) || !/选择照片/.test(albumUpload)) reportError('album upload is missing readable picker/placeholder copy')
  if (!/点击预览/.test(photoCard) || !/长按尝试保存/.test(photoCard) || !/uploaderLabel/.test(photoCard) || !/bindlongpress="onLongPress"/.test(photoCard)) reportError('photo card is missing readable preview/longpress copy')
  if (!/aria-label/.test(emptyState) || !/empty-state__text/.test(emptyState)) reportError('empty state is missing readable action labeling')
  if (/bindtap="saveCurrent"/.test(album) || /touchstart|touchend|setTimeout\s*\(/.test(albumJs)) reportError('album must not synthesize longpress/save through taps or timers')
  if (/src="\{\{item\}\}"/.test(recipeAdd) || /src="\{\{item\}\}"/.test(recipeDetail) || /src="\{\{item\}\}"/.test(albumUpload)) reportError('recipe/album WXML must not bind unknown raw photo URIs')
  if (!/recipe-tab-state|照片预览|长按照片可尝试保存到系统相册/.test(pageSmoke) || !/uploaderLabel/.test(photoSmoke)) reportError('T2 smoke scripts are missing readable presenter assertions')

  if (errors.length === before) console.log('RECIPE_ALBUM_UX_COPY=PASS')
}

function checkV23BindFeedbackSettingsContracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const bind = readSource('miniprogram/pages/bind/bind.js')
  const bindWxml = readSource('miniprogram/pages/bind/bind.wxml')
  const feedback = readSource('miniprogram/pages/feedback/feedback.js')
  const feedbackWxml = readSource('miniprogram/pages/feedback/feedback.wxml')
  const settings = readSource('miniprogram/pages/settings/settings.js')
  const settingsWxml = readSource('miniprogram/pages/settings/settings.wxml')
  const aboutWxml = readSource('miniprogram/pages/about/about.wxml')
  const privacyWxml = readSource('miniprogram/pages/privacy/privacy.wxml')
  const navWxml = readSource('miniprogram/components/nav-bar/nav-bar.wxml')
  const pageSmoke = readSource('scripts/smoke-pages.js')
  const capabilitySmoke = readSource('scripts/smoke-capabilities.js')
  const before = errors.length

  if (!/onLoad\s*\(/.test(bind) || !/bindPartner/.test(bind) || /wx\.login\s*\(|wx\.cloud|openId/i.test(bind)) reportError('bind page must stay local and explicit without login/cloud/auto-sync claims')
  if (!/不会自动绑定/.test(bindWxml) || !/跨设备同步/.test(bindWxml) || !/手动记录/.test(bindWxml) || !/确认绑定/.test(bindWxml) || !/capabilities\.share/.test(bindWxml) || !/aria-label/.test(bindWxml)) reportError('bind page is missing local-only, capability, or readable action copy')
  if (!/contentCount/.test(feedback) || !/onContentInput/.test(feedback) || !/本设备/.test(feedbackWxml) || !/5[–-]500/.test(feedbackWxml) || !/aria-label/.test(feedbackWxml)) reportError('feedback page is missing local status, count, or readable input copy')
  if (!/clearError/.test(settings) || !/已开启/.test(settingsWxml) || !/已关闭/.test(settingsWxml) || !/清除当前设备/.test(settingsWxml) || !/aria-label/.test(settingsWxml)) reportError('settings page is missing state, retry, or readable action copy')
  if (!/当前设备/.test(aboutWxml) || !/尚未发送/.test(aboutWxml) || !/当前设备/.test(privacyWxml) || !/跨设备账号服务/.test(privacyWxml)) reportError('about/privacy pages are missing local capability boundaries')
  if (!/bindtap="onBack"/.test(navWxml) || !/返回上一页/.test(navWxml) || !/aria-label/.test(navWxml)) reportError('nav bar is missing a readable back action')
  ;[bind, feedback, settings, aboutWxml, privacyWxml].forEach((source) => { if (/https?:\/\/|wx\.cloud|wx\.login\s*\(|openId/i.test(source)) reportError('T3 local UX source contains a forbidden remote capability claim') })
  if (!/不会自动绑定|手动记录/.test(pageSmoke) || !/contentCount/.test(pageSmoke) || !/已开启|已关闭/.test(pageSmoke)) reportError('page smoke is missing T3 binding/feedback/settings assertions')
  if (!/不会自动绑定|本设备/.test(capabilitySmoke) || !/aria-label/.test(capabilitySmoke)) reportError('capability smoke is missing T3 local UX assertions')

  if (errors.length === before) console.log('BIND_FEEDBACK_SETTINGS_UX=PASS')
}

function checkV22RecipeContracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const service = readSource('miniprogram/services/recipeService.js')
  const add = readSource('miniprogram/pages/recipe-add/recipe-add.js')
  const detail = readSource('miniprogram/pages/recipe-detail/recipe-detail.js')
  const detailWxml = readSource('miniprogram/pages/recipe-detail/recipe-detail.wxml')
  const detailWxss = readSource('miniprogram/pages/recipe-detail/recipe-detail.wxss')
  if (!/cleanupAddedFiles/.test(service) || !/saveImageChecked/.test(service) || !/removeImageChecked/.test(service) || !/failedFiles/.test(service) || !/storage_write_failed/.test(service)) reportError('recipe service is missing add-photo transaction cleanup contract')
  if (!/createdRecipeId/.test(add) || !/photoWriteAttempted/.test(add) || !/removeAsync/.test(add) || !/recipe_creation_rollback_failed/.test(add)) reportError('recipe add page is missing empty-record rollback contract')
  if (!/!this\.data\.recipe\.isUnlocked/.test(detail) || !/item\.hasImage/.test(detailWxml) || !/还没吃过哦/.test(detailWxml) || !/补充照片解锁/.test(detailWxml) || !/recipe\.isUnlocked/.test(detailWxml)) reportError('recipe detail is missing explicit locked/unlocked semantics')
  if (!/lock-state/.test(detailWxss) || !/locked-actions/.test(detailWxss)) reportError('recipe detail wxss is missing locked-state presentation')
  ;['smoke-file-cleanup.js', 'smoke-pages.js'].forEach((script) => ensureFile(path.join(ROOT, 'scripts', script), `v2.2 ${script}`))
  const fileSmoke = readSource('scripts/smoke-file-cleanup.js')
  const pageSmoke = readSource('scripts/smoke-pages.js')
  if (!/recipe photo metadata failure/.test(fileSmoke) || !/shared/.test(fileSmoke)) reportError('recipe file smoke is missing transaction/shared-file assertions')
  if (!/locked recipe/.test(pageSmoke) || !/rollback/.test(pageSmoke)) reportError('page smoke is missing locked detail/creation rollback assertions')
}

function checkV22AvatarContracts() {
  const readSource = (relativePath) => {
    const filePath = path.join(ROOT, relativePath)
    if (!ensureFile(filePath, relativePath)) return ''
    return fs.readFileSync(filePath, 'utf8')
  }
  const profile = readSource('miniprogram/pages/profile-edit/profile-edit.js')
  const profileWxml = readSource('miniprogram/pages/profile-edit/profile-edit.wxml')
  const pageSmoke = readSource('scripts/smoke-pages.js')
  const capabilitySmoke = readSource('scripts/smoke-capabilities.js')
  if (!/pendingAvatarPaths/.test(profile) || !/removeImageChecked/.test(profile) || !/cleanupPendingAvatar/.test(profile) || !/onHide\s*\(/.test(profile) || !/onUnload\s*\(/.test(profile)) reportError('profile edit is missing pending avatar cleanup lifecycle')
  if (!/capabilities\.chooseImage/.test(profileWxml) || !/不能选图/.test(profileWxml)) reportError('profile edit is missing choose-image capability copy')
  if (!/pending-avatar/.test(pageSmoke) || !/current-avatar/.test(pageSmoke) || !/saveImageChecked/.test(pageSmoke)) reportError('page smoke is missing pending avatar/current avatar rollback fixtures')
  if (!/capabilityMessage\('chooseImage'/.test(capabilitySmoke) || !/saveImageToPhotosAlbum/.test(capabilitySmoke)) reportError('capability smoke is missing choose-image/save-album copy assertions')
}

function main() {
  const rootJson = ['project.config.json', 'sitemap.json'].map((file) => readJson(path.join(ROOT, file)))
  const miniApp = readJson(path.join(MINI, 'app.json'))
  readJson(path.join(MINI, 'sitemap.json'))
  if (miniApp) {
    if (!Array.isArray(miniApp.pages) || !miniApp.pages.length) reportError('miniprogram/app.json.pages must be a non-empty array')
    else miniApp.pages.forEach(checkPageSuite)
    const componentsByPage = miniApp.pages || []
    componentsByPage.forEach((pagePath) => {
      const pageJsonPath = path.join(MINI, `${pagePath}.json`)
      const pageJson = readJson(pageJsonPath)
      if (pageJson) checkUsingComponents(pageJsonPath, pageJson.usingComponents)
    })
    const tabbar = miniApp.tabBar
    if (!tabbar || !Array.isArray(tabbar.list)) reportError('miniprogram/app.json.tabBar.list must be present')
    else tabbar.list.forEach((item) => {
      if (!item || typeof item.pagePath !== 'string') reportError('tabBar item is missing pagePath')
      else checkPageSuite(item.pagePath)
      ;['iconPath', 'selectedIconPath'].forEach((key) => checkPng(path.join(MINI, item[key] || ''), `tabBar ${key}`))
    })
    if (typeof miniApp.sitemapLocation === 'string') ensureFile(path.join(MINI, miniApp.sitemapLocation), 'app.json sitemapLocation')
  }
  if (rootJson[1] && Array.isArray(rootJson[1].rules)) rootJson[1].rules.forEach((rule) => {
    if (rule && rule.page) checkPageSuite(rule.page)
  })
  const files = scanSourceFiles()
  checkV12Contracts()
  checkImportContracts(rootJson[0], miniApp)
  checkV13Contracts()
  checkV14VersionContracts()
  checkV14Contracts()
  checkV15T1Contracts()
  checkV15T2Contracts()
  checkV15T4Contracts()
  checkV15T5Contracts()
  checkV15T6Contracts()
  checkV16T1Contracts()
  checkV23CatContracts()
  checkV23RecipeAlbumContracts()
  checkV23BindFeedbackSettingsContracts()
  checkV22RecipeContracts()
  checkV22AvatarContracts()
  console.log(`AUDIT_FILES=${files.length}`)
  console.log(`ERRORS=${errors.length}`)
  console.log(`WARNINGS=${warnings.length}`)
  if (errors.length) process.exitCode = 1
}

main()
