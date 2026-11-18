#!/usr/bin/env node

const assert = require('assert')
const path = require('path')
const storage = require('../miniprogram/services/storageService')
const recipeService = require('../miniprogram/services/recipeService')

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function makePage(definition) {
  const page = Object.assign({}, definition, { data: JSON.parse(JSON.stringify(definition.data || {})) })
  page.setData = (patch) => {
    Object.keys(patch || {}).forEach((key) => {
      const parts = key.split('.')
      let cursor = page.data
      parts.slice(0, -1).forEach((part) => { if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {}; cursor = cursor[part] })
      cursor[parts[parts.length - 1]] = patch[key]
    })
  }
  return page
}

function loadChatPage() {
  let definition
  const previous = global.Page
  global.Page = (config) => { definition = config }
  const file = path.resolve(__dirname, '../miniprogram/pages/chat/chat.js')
  delete require.cache[require.resolve(file)]
  require(file)
  if (previous) global.Page = previous
  else delete global.Page
  return makePage(definition)
}

async function main() {
  delete global.wx
  storage.clear()
  let appDefinition
  global.App = (definition) => { appDefinition = definition }
  const appFile = path.resolve(__dirname, '../miniprogram/app.js')
  delete require.cache[require.resolve(appFile)]
  require(appFile)
  delete global.App
  check(appDefinition && appDefinition.globalData, 'App definition is available to the headless harness')
  appDefinition.onLaunch.call(appDefinition)
  check(appDefinition.globalData.initialized && appDefinition.globalData.initializationStage === 'ready', 'startup records a ready stage')
  check(Array.isArray(appDefinition.globalData.initializationDiagnostics) && appDefinition.globalData.initializationDiagnostics.length >= 6, 'startup records each initialization stage')

  const originalEnsureDefaults = recipeService.ensureDefaults
  recipeService.ensureDefaults = () => { throw Object.assign(new Error('fixture failure'), { code: 'recipe_fixture_failed' }) }
  const originalConsoleError = console.error
  console.error = () => {}
  let failed
  try { failed = appDefinition.retryInitialization.call(appDefinition) } finally { console.error = originalConsoleError }
  check(!failed.ok && failed.stage === 'recipes' && appDefinition.globalData.initializationRetryable, 'stage failure is visible and retryable')
  check(appDefinition.globalData.initializationError.indexOf('fixture') < 0 && appDefinition.globalData.initializationError.indexOf('recipes') >= 0, 'user error keeps stage but hides raw exception text')
  const page = loadChatPage()
  global.getApp = () => appDefinition
  page.onLoad()
  check(page.data.initializationError && page.data.initializationStage === 'recipes', 'chat page exposes failed initialization stage')
  recipeService.ensureDefaults = originalEnsureDefaults
  const retried = appDefinition.retryInitialization.call(appDefinition)
  check(retried.ok && appDefinition.globalData.initialized && appDefinition.globalData.initializationError === '', 'successful retry restores initialized state without clearing data')
  page.retryInitialization()
  check(!page.data.initializationError && !page.data.retrying && page.data.messages.length > 0, 'chat retry hook clears banner and reloads local messages')

  appDefinition.globalData.initializing = true
  const busy = appDefinition.retryInitialization.call(appDefinition)
  appDefinition.globalData.initializing = false
  check(!busy.ok && busy.code === 'initialization_in_progress', 'duplicate retry is rejected while initialization is active')
  delete global.getApp
  console.log('SMOKE_RECOVERY=PASS')
  console.log(`RECOVERY_ASSERTIONS=${assertions}`)
}

main().catch((error) => {
  console.error(`SMOKE_RECOVERY_FAIL ${error.message}`)
  process.exitCode = 1
})
