#!/usr/bin/env node

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const capabilitiesModule = require('../miniprogram/utils/runtimeCapabilities')

const ROOT = path.resolve(__dirname, '..')

let assertions = 0
function check(value, message) { assertions += 1; assert.ok(value, message) }

const originalWx = global.wx
try {
  delete global.wx
  const nodeCapabilities = capabilitiesModule.getCapabilities()
  check(nodeCapabilities.mode === 'node-local' && nodeCapabilities.localGuestMode, 'Node fallback is local guest mode')
  check(!nodeCapabilities.storage && !nodeCapabilities.fileSystem && !nodeCapabilities.chooseImage, 'Node fallback marks native capabilities unavailable')
  check(!nodeCapabilities.share && !nodeCapabilities.clipboard && !nodeCapabilities.saveImageToPhotosAlbum, 'Node fallback keeps copy/share/save fallbacks')
  check(nodeCapabilities.reasons.storage === 'wx_missing' && nodeCapabilities.reasons.chooseImage === 'wx_missing', 'Node fallback explains missing wx for each capability')
  check(nodeCapabilities.login === false && nodeCapabilities.cloud === false && nodeCapabilities.remoteSync === false, 'Node fallback never enables login/cloud/sync')
  check(capabilitiesModule.capabilityMessage('share').indexOf('复制邀请码') >= 0, 'share fallback message is visible')

  global.wx = {
    env: { USER_DATA_PATH: '/user-data' },
    canIUse(api) { return api !== 'button.open-type.share' },
    getStorageSync() {}, setStorageSync() {}, getFileSystemManager() {},
    chooseImage() {}, chooseMedia() {}, setClipboardData() {}, saveImageToPhotosAlbum() {},
    navigateTo() {}, navigateBack() {}, showShareMenu() {}
  }
  const partial = capabilitiesModule.getCapabilities()
  check(partial.mode === 'wx-guest' && partial.localGuestMode, 'wx capability snapshot stays guest mode')
  check(partial.storage && partial.fileSystem && partial.chooseImage && partial.chooseMedia, 'available wx capabilities are detected')
  check(partial.clipboard && partial.saveImageToPhotosAlbum && partial.navigate, 'clipboard/save/navigation capabilities are detected')
  check(!partial.share && partial.login === false && partial.cloud === false, 'canIUse denial and forbidden services remain disabled')
  check(partial.reasons.share === 'can_i_use_denied' && partial.reasons.chooseImage === 'available', 'capability matrix distinguishes canIUse denial from available methods')
  check(capabilitiesModule.capabilityMessage('chooseImage', partial).indexOf('选图') >= 0 && capabilitiesModule.capabilityMessage('saveImageToPhotosAlbum', partial).indexOf('相册') >= 0, 'choose-image and save-album capability copy remains actionable')

  global.wx = {
    canIUse() { return true },
    getStorageSync() {}, setStorageSync() {}, getFileSystemManager() {},
    chooseImage() {}, chooseMedia() {}, setClipboardData() {}, saveImageToPhotosAlbum() {},
    navigateTo() {}, navigateBack() {}
  }
  const shareWithoutMenu = capabilitiesModule.getCapabilities()
  check(shareWithoutMenu.share && !shareWithoutMenu.shareMenu, 'share button remains usable when the optional menu method is absent')
  check(shareWithoutMenu.reasons.share === 'available' && shareWithoutMenu.reasons.shareMenu === 'method_missing', 'share button and menu expose independent reasons')

  global.wx.canIUse = () => false
  const denied = capabilitiesModule.getCapabilities()
  check(!denied.chooseImage && !denied.clipboard && !denied.saveImageToPhotosAlbum && !denied.navigate && !denied.share, 'canIUse denial produces safe capability flags')
  check(denied.reasons.chooseImage === 'can_i_use_denied' && denied.details.chooseImage.available === false, 'denied capabilities retain a reason and boolean detail')
  check(capabilitiesModule.capabilityMessage('chooseImage', denied).indexOf('拒绝') >= 0 && capabilitiesModule.capabilityMessage('saveImageToPhotosAlbum', denied).indexOf('拒绝') >= 0, 'permission denial copy remains visible for choose-image and save-album')

  global.wx = { canIUse() { return true } }
  const missingMethods = capabilitiesModule.getCapabilities()
  check(missingMethods.reasons.chooseImage === 'method_missing' && missingMethods.reasons.storage === 'method_missing', 'missing native methods are distinct from canIUse rejection')
  const bindWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/bind/bind.wxml'), 'utf8')
  const feedbackWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/feedback/feedback.wxml'), 'utf8')
  const settingsWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/settings/settings.wxml'), 'utf8')
  const navWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/nav-bar/nav-bar.wxml'), 'utf8')
  check(/不会自动绑定/.test(bindWxml) && /手动记录/.test(bindWxml), 'bind page keeps auto-binding and clipboard fallbacks visible')
  check(/本设备/.test(feedbackWxml) && /尚未发送/.test(feedbackWxml) && /aria-label/.test(feedbackWxml), 'feedback page keeps local-only capability copy visible')
  check(/已开启/.test(settingsWxml) && /已关闭/.test(settingsWxml) && /清除当前设备/.test(settingsWxml), 'settings page keeps switch and clear capability copy visible')
  check(/返回上一页/.test(navWxml) && /aria-label/.test(navWxml), 'navigation back action has an accessible label')
  console.log('SMOKE_CAPABILITIES=PASS')
  console.log(`CAPABILITY_ASSERTIONS=${assertions}`)
} catch (error) {
  console.error(`SMOKE_CAPABILITIES=FAIL ${error.stack || error.message}`)
  process.exitCode = 1
} finally {
  if (originalWx === undefined) delete global.wx
  else global.wx = originalWx
}
