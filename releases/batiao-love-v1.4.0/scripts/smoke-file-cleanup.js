#!/usr/bin/env node

// Headless transaction smoke for managed files and metadata. The local
// fallback has no real filesystem; injected remove failures prove the
// retryable semantics without claiming wx unlink behavior.
const assert = require('assert')
const storage = require('../miniprogram/services/storageService')
const userService = require('../miniprogram/services/userService')
const albumService = require('../miniprogram/services/albumService')
const recipeService = require('../miniprogram/services/recipeService')

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function resetStorage() { delete global.wx; storage.clear(); storage.initialize() }

async function main() {
  resetStorage()
  const originalRemoveImageChecked = storage.removeImageChecked
  const originalSetChecked = storage.setChecked

  const albumFailurePhoto = albumService.create({ imagePath: 'local://album-failure', date: '2026-09-27' })
  storage.removeImageChecked = (filePath) => Promise.resolve({ ok: false, path: filePath, code: 'file_remove_failed', message: '本地图片清理失败' })
  const albumFailure = await albumService.removeAsync(albumFailurePhoto.photoId)
  check(!albumFailure.ok && albumFailure.reason === 'file_remove_failed' && albumFailure.failedFiles.length === 1, 'album unlink failure returns a stable failed file result')
  check(Boolean(albumService.get(albumFailurePhoto.photoId)), 'album metadata remains when unlink fails')
  storage.removeImageChecked = originalRemoveImageChecked
  const albumRetry = await albumService.removeAsync(albumFailurePhoto.photoId)
  check(albumRetry.ok && !albumService.get(albumFailurePhoto.photoId), 'album retry removes file and metadata')

  const metadataFailurePhoto = albumService.create({ imagePath: 'local://metadata-failure', date: '2026-09-27' })
  storage.setChecked = (key, value) => key === storage.KEYS.PHOTOS ? ({ ok: false, key, value, error: { code: 'storage_write_failed', message: '相册记录保存失败' } }) : originalSetChecked(key, value)
  const metadataFailure = await albumService.removeAsync(metadataFailurePhoto.photoId)
  storage.setChecked = originalSetChecked
  check(!metadataFailure.ok && metadataFailure.reason === 'storage_write_failed', 'album metadata write failure is reported')
  check(Boolean(albumService.get(metadataFailurePhoto.photoId)), 'metadata write failure preserves the photo record')
  check((await albumService.removeAsync(metadataFailurePhoto.photoId)).ok, 'photo metadata can be retried after a storage write failure')

  const sharedPhoto = albumService.create({ imagePath: 'local://shared-cleanup', date: '2026-09-27' })
  storage.set(storage.KEYS.RECIPES, [{ recipeId: 'shared-recipe', name: '共享菜谱', photos: ['local://shared-cleanup'] }])
  const sharedResult = await albumService.removeAsync(sharedPhoto.photoId)
  check(sharedResult.ok && sharedResult.skippedFiles.indexOf('local://shared-cleanup') >= 0, 'shared album file is skipped and metadata is removed')

  resetStorage()
  const recipeTransaction = recipeService.create({ name: '事务菜谱', photos: ['local://recipe-old'] })
  const recipeBefore = recipeService.get(recipeTransaction.recipeId)
  const originalSaveImageChecked = storage.saveImageChecked
  const cleanupCalls = []
  storage.saveImageChecked = () => Promise.resolve({ ok: true, path: 'local://recipe-new' })
  storage.removeImageChecked = (filePath) => { cleanupCalls.push(filePath); return Promise.resolve({ ok: true, path: filePath }) }
  storage.setChecked = (key, value) => key === storage.KEYS.RECIPES ? ({ ok: false, key, value, error: { code: 'storage_write_failed', message: '菜谱记录保存失败' } }) : originalSetChecked(key, value)
  const metadataFailureRecipe = await recipeService.addPhotos(recipeTransaction.recipeId, ['local://incoming-new'])
  storage.setChecked = originalSetChecked
  check(!metadataFailureRecipe && recipeService.getLastError().code === 'storage_write_failed', 'recipe photo metadata failure returns stable storage_write_failed')
  check(JSON.stringify(recipeService.get(recipeTransaction.recipeId).photos) === JSON.stringify(recipeBefore.photos) && cleanupCalls.indexOf('local://recipe-new') >= 0 && cleanupCalls.indexOf('local://recipe-old') < 0, 'recipe metadata failure cleans only newly saved files and keeps original photos')

  storage.setChecked = (key, value) => key === storage.KEYS.RECIPES ? ({ ok: false, key, value, error: { code: 'storage_write_failed', message: '菜谱记录保存失败' } }) : originalSetChecked(key, value)
  storage.removeImageChecked = (filePath) => Promise.resolve({ ok: false, path: filePath, code: 'file_remove_failed', message: '本地图片清理失败' })
  const unlinkFailureRecipe = await recipeService.addPhotos(recipeTransaction.recipeId, ['local://incoming-retry'])
  check(!unlinkFailureRecipe && recipeService.getLastError().failedFiles.some((file) => file.path === 'local://recipe-new' && file.code === 'file_remove_failed'), 'recipe unlink failure is returned as a retryable failed file')
  storage.setChecked = originalSetChecked
  storage.removeImageChecked = originalRemoveImageChecked
  storage.saveImageChecked = () => Promise.resolve({ ok: true, path: 'local://recipe-retry' })
  const retryRecipe = await recipeService.addPhotos(recipeTransaction.recipeId, ['local://incoming-retry'])
  storage.saveImageChecked = originalSaveImageChecked
  check(retryRecipe && retryRecipe.photos.indexOf('local://recipe-retry') >= 0 && recipeService.get(recipeTransaction.recipeId).photos.indexOf('local://recipe-old') >= 0, 'recipe photo transaction can retry without dropping original photos')

  const sharedRecipe = recipeService.create({ name: '共享源菜谱', photos: ['local://shared-recipe-file'] })
  const candidateRecipe = recipeService.create({ name: '共享回滚菜谱' })
  storage.saveImageChecked = () => Promise.resolve({ ok: true, path: 'local://shared-recipe-file' })
  const sharedCandidate = await recipeService.addPhotos(candidateRecipe.recipeId, ['local://candidate-path'])
  storage.saveImageChecked = originalSaveImageChecked
  check(!sharedCandidate && recipeService.getLastError().skippedFiles.indexOf('local://shared-recipe-file') >= 0 && recipeService.get(sharedRecipe.recipeId).photos.indexOf('local://shared-recipe-file') >= 0, 'recipe rollback never unlinks a path still shared by another recipe')

  resetStorage()
  const recipeFailure = recipeService.create({ name: '待清理菜谱', photos: ['local://recipe-failure'] })
  storage.removeImageChecked = (filePath) => Promise.resolve({ ok: false, path: filePath, code: 'file_remove_failed', message: '本地图片清理失败' })
  const recipeFailureResult = await recipeService.removeAsync(recipeFailure.recipeId)
  check(!recipeFailureResult.ok && recipeFailureResult.reason === 'file_remove_failed' && recipeService.get(recipeFailure.recipeId), 'recipe unlink failure preserves metadata and exposes retry')
  storage.removeImageChecked = originalRemoveImageChecked
  check((await recipeService.removeAsync(recipeFailure.recipeId)).ok && !recipeService.get(recipeFailure.recipeId), 'recipe retry removes metadata after file cleanup')

  resetStorage()
  albumService.create({ imagePath: 'local://clear-failure', date: '2026-09-27' })
  storage.removeImageChecked = (filePath) => Promise.resolve({ ok: false, path: filePath, code: 'file_remove_failed', message: '本地图片清理失败' })
  const clearFailure = await userService.clearLocalData()
  check(!clearFailure.ok && clearFailure.failedFiles.length >= 1 && clearFailure.user === null, 'clear failure returns failed files without fake default reset')
  check(albumService.total() === 1 && userService.getCurrentUser().nickname !== '', 'clear failure retains metadata for retry')
  storage.removeImageChecked = originalRemoveImageChecked
  const clearRetry = await userService.clearLocalData()
  check(clearRetry.ok && clearRetry.user && albumService.total() === 0, 'clear retry completes after file cleanup succeeds')

  storage.removeImageChecked = originalRemoveImageChecked
  storage.setChecked = originalSetChecked
  console.log('SMOKE_FILE_CLEANUP=PASS')
  console.log(`FILE_CLEANUP_ASSERTIONS=${assertions}`)
}

main().catch((error) => {
  console.error(`SMOKE_FILE_CLEANUP_FAIL ${error.message}`)
  process.exitCode = 1
})
