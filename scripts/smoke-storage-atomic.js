#!/usr/bin/env node

/**
 * Headless wx Storage contract. The stub deliberately fails native writes and
 * deletes so the checked API can prove that the old value stays readable and
 * clearChecked reports every key that could not be removed.
 */
const assert = require('assert')
const storage = require('../miniprogram/services/storageService')

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function clone(value) { return value === undefined ? value : JSON.parse(JSON.stringify(value)) }

async function main() {
  delete global.wx
  storage.clear()
  const memoryWrite = storage.setChecked(storage.KEYS.USER, { nickname: '内存模式' })
  check(memoryWrite.ok && storage.get(storage.KEYS.USER, {}).nickname === '内存模式', 'memory fallback still commits checked writes')

  const state = { values: {}, failSet: false, failRemove: false, failRemoveKeys: new Set() }
  global.wx = {
    getStorageSync(key) { return state.values[key] },
    setStorageSync(key, value) {
      if (state.failSet) throw new Error(state.failSet === 'quota' ? 'exceed storage quota' : 'setStorageSync denied')
      state.values[key] = clone(value)
    },
    removeStorageSync(key) {
      if (state.failRemove || state.failRemoveKeys.has(key)) throw new Error('removeStorageSync denied')
      delete state.values[key]
    },
    getStorageInfoSync() { return { keys: Object.keys(state.values), currentSize: 0, limitSize: 10240 } }
  }

  let result = storage.setChecked(storage.KEYS.USER, { nickname: '旧值' })
  check(result.ok && storage.get(storage.KEYS.USER, {}).nickname === '旧值', 'native write establishes a baseline')
  state.failSet = true
  result = storage.setChecked(storage.KEYS.USER, { nickname: '写入失败的新值' })
  check(!result.ok && result.error.code === 'storage_write_failed', 'native write failure has a stable code')
  check(storage.get(storage.KEYS.USER, {}).nickname === '旧值' && state.values['batiao:user'].nickname === '旧值', 'failed native write preserves memory and native values')
  state.failSet = 'quota'
  result = storage.setChecked(storage.KEYS.USER, { nickname: '配额失败的新值' })
  check(!result.ok && result.error.code === 'storage_quota', 'quota failure has a distinct stable code')
  check(storage.get(storage.KEYS.USER, {}).nickname === '旧值', 'quota failure preserves the previous value')
  state.failSet = false

  storage.setChecked(storage.KEYS.RECIPES, [{ recipeId: 'keep' }])
  state.failRemove = true
  result = storage.removeChecked(storage.KEYS.RECIPES)
  check(!result.ok && result.error.code === 'storage_remove_failed', 'native delete failure has a stable code')
  check(storage.get(storage.KEYS.RECIPES, [])[0].recipeId === 'keep', 'failed native delete preserves the previous value')
  state.failRemove = false
  state.failRemoveKeys.add('batiao:recipes')
  const cleared = storage.clearChecked()
  check(!cleared.ok && cleared.failedKeys.indexOf(storage.KEYS.RECIPES) >= 0, 'partial clear reports the failed key')
  check(storage.get(storage.KEYS.RECIPES, [])[0].recipeId === 'keep', 'partial clear leaves failed key data available for retry')
  check(cleared.removedKeys.indexOf(storage.KEYS.USER) >= 0 && storage.get(storage.KEYS.USER, undefined) === undefined, 'successful clear keys are removed')

  global.wx.env = { USER_DATA_PATH: '/headless-user-data' }
  global.wx.getFileSystemManager = () => ({ unlink(payload) { payload.fail({ errMsg: 'unlink:fail no such file or directory' }) } })
  const missingFile = await storage.removeImageChecked('local://already-missing')
  check(missingFile.ok && missingFile.missing === true, 'missing managed files are treated as already cleaned')

  delete global.wx
  storage.clear()
  check(storage.get(storage.KEYS.RECIPES, undefined) === undefined, 'memory cleanup can retry after native failures')
  console.log('SMOKE_STORAGE_ATOMIC=PASS')
  console.log(`ATOMIC_ASSERTIONS=${assertions}`)
}

main().catch((error) => {
  console.error(`SMOKE_STORAGE_ATOMIC_FAIL ${error.message}`)
  process.exitCode = 1
})
