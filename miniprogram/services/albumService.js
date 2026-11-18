const storage = require('./storageService')
const userService = require('./userService')
const { createPhoto } = require('../models/photo')
const { monthLabel } = require('../utils/dateUtil')
const { now } = require('../utils/util')
const { LIMITS } = require('../utils/limits')

let lastError = null
function ensureCollection() {
  storage.initialize()
  if (!storage.has(storage.KEYS.PHOTOS)) {
    const result = storage.setChecked(storage.KEYS.PHOTOS, [])
    lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '相册初始化失败，请重试' })
  }
  return list()
}
function list() { storage.initialize(); return storage.list(storage.KEYS.PHOTOS).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt) }
function get(photoId) { return list().find((photo) => photo.photoId === photoId) || null }
function saveAll(photos) { const result = storage.setChecked(storage.KEYS.PHOTOS, photos); lastError = result.ok ? null : { code: 'storage_write_failed', message: '相册记录保存失败，请重试' }; return result.ok ? list() : null }
function getLastError() { return lastError }
function uniquePaths(paths) { return Array.from(new Set((Array.isArray(paths) ? paths : []).map((path) => String(path || '').trim()).filter(Boolean))) }
function hasForeignImagePath(imagePath, photoId) {
  if (!storage.isManagedImagePath(imagePath)) return false
  return list().some((photo) => photo.photoId !== photoId && photo.imagePath === imagePath)
}
function create(input) {
  const current = userService.getCurrentUser()
  if (list().length >= LIMITS.ALBUM_TOTAL_PHOTOS) { lastError = { code: 'album_limit', message: '相册已达到 500 张上限，请先清理旧记录' }; return null }
  const source = Object.assign({}, input || {}, { coupleId: 'local-couple', uploadedBy: current.userId })
  if (!source.imagePath || typeof source.imagePath !== 'string' || !source.imagePath.trim()) { lastError = { code: 'invalid_image_path', message: '图片路径无效，请重新选择' }; return null }
  if (source.photoId && get(source.photoId)) { lastError = { code: 'duplicate_photo', message: '这张照片已经存在' }; return null }
  const photo = createPhoto(source)
  if (hasForeignImagePath(photo.imagePath, photo.photoId)) { lastError = { code: 'duplicate_image_path', message: '图片已被其他记录使用' }; return null }
  const photos = storage.list(storage.KEYS.PHOTOS).concat(photo)
  return saveAll(photos) ? photo : null
}
function createMany(inputs) {
  if (Array.isArray(inputs) && inputs.length > LIMITS.ALBUM_PHOTOS_PER_BATCH) { lastError = { code: 'too_many_photos', message: '一次最多保存 9 张照片' }; return [] }
  const current = userService.getCurrentUser()
  const existing = storage.list(storage.KEYS.PHOTOS).slice()
  if (Array.isArray(inputs) && existing.length + inputs.length > LIMITS.ALBUM_TOTAL_PHOTOS) { lastError = { code: 'album_limit', message: '相册已达到 500 张上限，请先清理旧记录' }; return [] }
  if (Array.isArray(inputs) && inputs.some((input) => !input || typeof input.imagePath !== 'string' || !input.imagePath.trim())) { lastError = { code: 'invalid_image_path', message: '图片路径无效，请重新选择' }; return [] }
  const accepted = []
  const seenIds = new Set(existing.map((photo) => photo.photoId))
  const seenPaths = new Set(existing.filter((photo) => storage.isManagedImagePath(photo.imagePath)).map((photo) => photo.imagePath))
  ;(Array.isArray(inputs) ? inputs : []).forEach((input) => {
    if (existing.length + accepted.length >= LIMITS.ALBUM_TOTAL_PHOTOS) { lastError = { code: 'album_limit', message: '相册已达到 500 张上限，请先清理旧记录' }; return }
    const source = Object.assign({}, input || {}, { coupleId: 'local-couple', uploadedBy: current.userId })
    const photo = createPhoto(source)
    if (seenIds.has(photo.photoId)) { lastError = { code: 'duplicate_photo', message: '照片记录重复' }; return }
    if (storage.isManagedImagePath(photo.imagePath) && seenPaths.has(photo.imagePath)) { lastError = { code: 'duplicate_image_path', message: '图片已被其他记录使用' }; return }
    seenIds.add(photo.photoId)
    if (storage.isManagedImagePath(photo.imagePath)) seenPaths.add(photo.imagePath)
    accepted.push(photo)
  })
  if (!accepted.length) return []
  const saved = saveAll(existing.concat(accepted))
  return saved ? accepted : []
}
async function saveImages(tempPaths, meta) {
  if (Array.isArray(tempPaths) && tempPaths.length > LIMITS.ALBUM_PHOTOS_PER_BATCH) { lastError = { code: 'too_many_photos', message: '一次最多保存 9 张照片' }; return [] }
  if (list().length + (Array.isArray(tempPaths) ? tempPaths.length : 0) > LIMITS.ALBUM_TOTAL_PHOTOS) { lastError = { code: 'album_limit', message: '相册已达到 500 张上限，请先清理旧记录' }; return [] }
  const paths = uniquePaths(tempPaths).slice(0, LIMITS.ALBUM_PHOTOS_PER_BATCH)
  if (!paths.length) { lastError = { code: 'empty_paths', message: '没有可保存的照片' }; return [] }
  const results = await Promise.all(paths.map((path, index) => storage.saveImageChecked(path, `album_${now()}_${index}`)))
  const failed = results.filter((result) => !result.ok)
  if (failed.length) {
    await Promise.all(results.filter((result) => result.ok && result.path).map((result) => storage.removeImage(result.path)))
    lastError = { code: failed[0].code || 'file_save_failed', message: failed[0].message || '照片保存失败，请重试' }
    return []
  }
  const created = createMany(results.map((result) => Object.assign({}, meta || {}, { imagePath: result.path })))
  if (created.length !== results.length) {
    await Promise.all(results.filter((result) => result.path && storage.isManagedImagePath(result.path)).map((result) => storage.removeImage(result.path)))
    return []
  }
  return created
}
function pathCanRemove(imagePath, photoId) {
  if (!storage.isManagedImagePath(imagePath)) return false
  const recipeReferences = storage.list(storage.KEYS.RECIPES).some((recipe) => (recipe.photos || []).indexOf(imagePath) >= 0)
  const albumReferences = list().some((item) => item.photoId !== photoId && item.imagePath === imagePath)
  const user = userService.getCurrentUser()
  return !recipeReferences && !albumReferences && user.avatar !== imagePath
}
function remove(photoId, requesterId) {
  const photo = get(photoId)
  if (!photo) return { ok: false, reason: 'not_found' }
  const current = requesterId || userService.getCurrentUser().userId
  if (photo.uploadedBy !== current) return { ok: false, reason: 'forbidden', message: '只能删除自己上传的照片' }
  if (pathCanRemove(photo.imagePath, photoId)) storage.removeImage(photo.imagePath)
  const saved = saveAll(list().filter((item) => item.photoId !== photoId))
  return saved ? { ok: true, fileRemoved: pathCanRemove(photo.imagePath, photoId) } : { ok: false, reason: 'storage_write_failed', message: '照片记录删除失败，请重试' }
}
async function removeAsync(photoId, requesterId) {
  const photo = get(photoId)
  if (!photo) return { ok: false, reason: 'not_found' }
  const current = requesterId || userService.getCurrentUser().userId
  if (photo.uploadedBy !== current) return { ok: false, reason: 'forbidden', message: '只能删除自己上传的照片' }
  const shouldRemove = pathCanRemove(photo.imagePath, photoId)
  const fileResult = shouldRemove ? await storage.removeImageChecked(photo.imagePath).catch((error) => ({ ok: false, message: error.message || String(error) })) : { ok: true, skipped: true }
  const skippedFiles = shouldRemove ? [] : uniquePaths([photo.imagePath])
  if (!fileResult.ok) return { ok: false, reason: fileResult.code || 'file_remove_failed', fileRemoved: false, failedFiles: [{ path: photo.imagePath, code: fileResult.code || 'file_remove_failed', message: fileResult.message || '本地图片清理失败' }], skippedFiles, retryable: true, message: fileResult.message || '本地图片清理失败，请重试' }
  const saved = saveAll(list().filter((item) => item.photoId !== photoId))
  if (!saved) return { ok: false, reason: 'storage_write_failed', message: '照片记录删除失败，请重试' }
  return { ok: true, fileRemoved: true, skipped: !shouldRemove, skippedFiles, failedFiles: [], message: '' }
}
function groupByMonth(photos) { const source = photos || list(); const groups = {}; source.forEach((photo) => { if (!groups[photo.month]) groups[photo.month] = { month: photo.month, label: monthLabel(`${photo.month}-01`), photos: [] }; groups[photo.month].photos.push(photo) }); return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map((key) => groups[key]) }
function updateSignature(value) { return userService.updateSignature(value) }
function total() { return list().length }

module.exports = { ensureCollection, list, get, create, createMany, saveImages, remove, removeAsync, groupByMonth, updateSignature, total, getLastError }
