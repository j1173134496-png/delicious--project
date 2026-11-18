#!/usr/bin/env node

// Headless presenter smoke for album labels, preview metadata and image
// fallback. It does not verify WeChat swiper, renderer or photo permissions.
const assert = require('assert')
const fs = require('fs')
const path = require('path')
const storage = require('../miniprogram/services/storageService')
const userService = require('../miniprogram/services/userService')
const albumService = require('../miniprogram/services/albumService')
const { isImagePath } = require('../miniprogram/utils/mediaUtil')

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
function loadPage(relativePath) {
  let definition
  const previous = global.Page
  global.Page = (config) => { definition = config }
  const file = path.resolve(ROOT, relativePath)
  delete require.cache[require.resolve(file)]
  require(file)
  if (previous) global.Page = previous
  else delete global.Page
  const page = Object.assign({}, definition)
  page.data = clone(definition.data || {})
  page.setData = (patch) => Object.keys(patch || {}).forEach((key) => assignPath(page.data, key, patch[key]))
  return page
}
function resetStorage() {
  const remoteHttps = ['https', '://example.invalid/x.png'].join('')
  const dataImage = ['data', ':image/png;base64,fixture'].join('')
  storage.clear()
  storage.initialize()
  userService.updateUser({ userId: 'self-user', nickname: '小主人' })
  storage.set(storage.KEYS.COUPLE, { coupleId: 'local-couple', partner: { userId: 'partner-user', nickname: '另一半', avatar: '🌷' }, anniversaryDate: '2026-01-01' })
  storage.set(storage.KEYS.PHOTOS, [
    { photoId: 'mine', coupleId: 'local-couple', imagePath: 'local://mine', description: '我的照片', date: '2026-09-10', month: '2026-09', uploadedBy: 'self-user', createdAt: 3 },
    { photoId: 'https', coupleId: 'local-couple', imagePath: remoteHttps, description: '远程迁移记录', date: '2026-09-09', month: '2026-09', uploadedBy: 'self-user', createdAt: 9 },
    { photoId: 'data', coupleId: 'local-couple', imagePath: dataImage, description: 'data 迁移记录', date: '2026-09-08', month: '2026-09', uploadedBy: 'partner-user', createdAt: 8 },
    { photoId: 'blob', coupleId: 'local-couple', imagePath: 'blob:fixture-image', description: 'blob 迁移记录', date: '2026-09-07', month: '2026-09', uploadedBy: 'partner-user', createdAt: 7 },
    { photoId: 'unknown', coupleId: 'local-couple', imagePath: 'mystery://fixture-image', description: '未知 URI 记录', date: '2026-09-06', month: '2026-09', uploadedBy: 'raw-user-id', createdAt: 6 },
    { photoId: 'partner', coupleId: 'local-couple', imagePath: 'emoji:🌷', description: 'Ta 的照片', date: '2026-08-10', month: '2026-08', uploadedBy: 'partner-user', createdAt: 2 },
    { photoId: 'broken', coupleId: 'local-couple', imagePath: 'local://broken-image', description: '失效本地图片', date: '2026-07-10', month: '2026-07', uploadedBy: 'partner-user', createdAt: 1 }
  ])
}

async function main() {
  resetStorage()
  const page = loadPage('miniprogram/pages/album/album.js')
  page.onShow()
  const photos = page.data.groups.reduce((all, group) => all.concat(group.photos), [])
  check(photos.length === 7 && page.data.groups.length === 3, 'album presenter preserves photos and month groups')
  const mine = photos.find((photo) => photo.photoId === 'mine')
  const partner = photos.find((photo) => photo.photoId === 'partner')
  const unknown = photos.find((photo) => photo.photoId === 'unknown')
  const remote = photos.find((photo) => photo.photoId === 'https')
  const dataImage = photos.find((photo) => photo.photoId === 'data')
  const blob = photos.find((photo) => photo.photoId === 'blob')
  const broken = photos.find((photo) => photo.photoId === 'broken')
  check(mine.uploaderLabel === '小主人', 'own photo uses the current nickname as uploader label')
  check(partner.uploaderLabel === 'Ta', 'partner photo uses the stable Ta label')
  check(unknown.uploaderLabel === '本机记录' && unknown.hasImage === false, 'unknown uploader and URI use safe local fallback')
  check(unknown.uploaderLabel !== 'raw-user-id', 'unknown uploader is mapped to a stable local label')
  check(remote.imagePath.indexOf('example.invalid') >= 0 && remote.hasImage === false && remote.renderPath === '', 'https metadata is preserved while rendering is blocked')
  check(dataImage.imagePath.indexOf('data:') === 0 && dataImage.hasImage === false && dataImage.renderPath === '', 'data metadata is preserved while rendering is blocked')
  check(blob.imagePath.indexOf('blob:') === 0 && blob.hasImage === false && blob.renderPath === '', 'blob metadata is preserved while rendering is blocked')
  check(!isImagePath('mystery://fixture-image') && !isImagePath('emoji:🌷'), 'unknown URI and emoji paths are never image sources')
  check(broken.hasImage === true, 'local path can enter the renderer before a native image error')

  page.preview({ detail: { photoId: 'mine' } })
  check(page.data.previewVisible && page.data.currentPhoto.uploaderLabel === '小主人' && page.data.canDelete, 'preview shows own uploader and allows own deletion')
  const partnerIndex = page.data.previewPhotos.findIndex((photo) => photo.photoId === 'partner')
  page.onPreviewChange({ detail: { current: partnerIndex } })
  check(page.data.currentPhoto.uploaderLabel === 'Ta' && page.data.canDelete === false, 'preview switching preserves partner label and delete permission')
  const brokenIndex = page.data.previewPhotos.findIndex((photo) => photo.photoId === 'broken')
  page.onPreviewError({ currentTarget: { dataset: { index: brokenIndex } } })
  const brokenAfterError = page.data.previewPhotos[brokenIndex]
  check(brokenAfterError.hasImage === false && brokenAfterError.uploaderLabel === 'Ta', 'native image failure keeps metadata and placeholder state')

  let saveCalls = 0
  global.wx = { saveImageToPhotosAlbum(payload) { saveCalls += 1; if (payload.complete) payload.complete({}) }, showToast() {} }
  page.data.capabilities = Object.assign({}, page.data.capabilities, { saveImageToPhotosAlbum: true })
  page.saveToAlbum({ detail: { photo: remote } })
  page.saveToAlbum({ detail: { photo: dataImage } })
  page.saveToAlbum({ detail: { photo: blob } })
  page.saveToAlbum({ detail: { photo: unknown } })
  page.saveToAlbum({ detail: { photo: brokenAfterError } })
  page.saveToAlbum({ detail: { photo: partner } })
  check(saveCalls === 0, 'https/data/blob/unknown/failed/emoji paths never call saveImageToPhotosAlbum')
  page.saveToAlbum({ detail: { photo: mine } })
  check(saveCalls === 1, 'legal local path calls saveImageToPhotosAlbum once')

  const remoteRemoved = await albumService.removeAsync(remote.photoId)
  check(remoteRemoved.ok && remoteRemoved.skippedFiles.indexOf(remote.imagePath) >= 0 && !albumService.get(remote.photoId), 'non-local metadata can be deleted without unlinking a file')
  page.data.currentPhoto = partner
  page.data.canDelete = false
  await page.deleteCurrent()
  check(page.data.canDelete === false, 'delete action remains blocked for a partner photo')

  const photoCardWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/components/photo-card/photo-card.wxml'), 'utf8')
  const albumWxml = fs.readFileSync(path.join(ROOT, 'miniprogram/pages/album/album.wxml'), 'utf8')
  check(/uploaderLabel/.test(photoCardWxml) && /上传者：\{\{currentPhoto\.uploaderLabel/.test(albumWxml), 'grid and preview bind only the safe uploader label')
  check(!/uploadedBy/.test(photoCardWxml) && !/uploadedBy/.test(albumWxml), 'WXML does not bind raw uploadedBy identifiers')
  check(/点击预览/.test(photoCardWxml) && /长按尝试保存/.test(photoCardWxml) && /bindlongpress="onLongPress"/.test(photoCardWxml), 'photo card exposes readable preview and longpress guidance')
  check(/关闭照片预览/.test(albumWxml) && /长按照片可尝试保存到系统相册/.test(albumWxml) && /编辑签名/.test(albumWxml), 'album preview exposes readable close/save/signature guidance')

  delete global.wx
  console.log('SMOKE_PHOTO_PRESENTER=PASS')
  console.log(`PHOTO_ASSERTIONS=${assertions}`)
}

main().catch((error) => {
  delete global.wx
  console.error(`SMOKE_PHOTO_PRESENTER_FAIL ${error.message}`)
  process.exitCode = 1
})
