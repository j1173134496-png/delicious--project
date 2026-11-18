const storage = require('./storageService')
const userService = require('./userService')
const { createRecipe, createDefaultRecipes } = require('../models/recipe')
const { today } = require('../utils/dateUtil')
const { now, safeText } = require('../utils/util')
const { LIMITS } = require('../utils/limits')

let lastError = null
function ensure() { storage.initialize() }
function ensureDefaults() {
  ensure(); const recipes = storage.list(storage.KEYS.RECIPES)
  if (!recipes.length) {
    const result = storage.setChecked(storage.KEYS.RECIPES, createDefaultRecipes())
    lastError = result.ok ? null : (result.error || { code: 'storage_write_failed', message: '默认菜谱保存失败，请重试' })
  }
  return list()
}
function list() { ensure(); return storage.list(storage.KEYS.RECIPES) }
function get(recipeId) { return list().find((recipe) => recipe.recipeId === recipeId) || null }
function saveAll(recipes) {
  const result = storage.setChecked(storage.KEYS.RECIPES, recipes)
  lastError = result.ok ? null : { code: 'storage_write_failed', message: '菜谱保存失败，请重试' }
  return result.ok ? recipes : null
}
function getLastError() { return lastError }
function uniquePaths(paths) { return Array.from(new Set((Array.isArray(paths) ? paths : []).map((path) => String(path || '').trim()).filter(Boolean))) }
function validImagePath(path) { return /^(?:emoji:|local:|wxfile:|file:|temp:|tmp:|https?:\/\/|\/)/i.test(String(path || '').trim()) }
function allImageReferences(excludeRecipeId) {
  const references = []
  list().forEach((recipe) => { if (recipe.recipeId !== excludeRecipeId) (recipe.photos || []).forEach((path) => references.push(path)) })
  storage.list(storage.KEYS.PHOTOS).forEach((photo) => references.push(photo.imagePath))
  const user = userService.getCurrentUser()
  if (user.avatar) references.push(user.avatar)
  return references.filter(Boolean)
}
function hasForeignImagePath(imagePath, recipeId) {
  if (!storage.isManagedImagePath(imagePath)) return false
  return allImageReferences(recipeId).indexOf(imagePath) >= 0
}
function create(input) {
  const current = userService.getCurrentUser()
  const source = Object.assign({}, input || {}, { coupleId: 'local-couple', createdBy: current.userId })
  if (source.recipeId && get(source.recipeId)) { lastError = { code: 'duplicate_recipe', message: '这道菜已经存在' }; return null }
  if (list().length >= LIMITS.RECIPE_TOTAL_RECORDS) { lastError = { code: 'recipe_limit', message: '本地菜谱已达到上限，请先清理旧记录' }; return null }
  if (Array.isArray(source.photos) && source.photos.length > LIMITS.RECIPE_PHOTOS_PER_RECIPE) { lastError = { code: 'photo_limit', message: '每道菜最多保存 9 张照片' }; return null }
  if (Array.isArray(source.photos) && source.photos.some((path) => !validImagePath(path))) { lastError = { code: 'unsupported_path', message: '图片路径无效，请重新选择' }; return null }
  const recipe = createRecipe(source)
  recipe.photos = uniquePaths(recipe.photos).slice(0, LIMITS.RECIPE_PHOTOS_PER_RECIPE)
  if (recipe.photos.some((path) => hasForeignImagePath(path, ''))) { lastError = { code: 'duplicate_image_path', message: '图片已被其他记录使用' }; return null }
  if (recipe.photos.length) { recipe.isUnlocked = true; recipe.unlockedDate = recipe.unlockedDate || today() }
  const saved = saveAll(list().concat(recipe))
  return saved ? saved.find((item) => item.recipeId === recipe.recipeId) : null
}
function update(recipeId, patch) {
  const recipes = list()
  const index = recipes.findIndex((recipe) => recipe.recipeId === recipeId)
  if (index < 0) { lastError = { code: 'not_found', message: '菜品不存在' }; return null }
  if (patch && Array.isArray(patch.photos) && patch.photos.length > LIMITS.RECIPE_PHOTOS_PER_RECIPE) { lastError = { code: 'photo_limit', message: '每道菜最多保存 9 张照片' }; return null }
  if (patch && Array.isArray(patch.photos) && patch.photos.some((path) => !validImagePath(path))) { lastError = { code: 'unsupported_path', message: '图片路径无效，请重新选择' }; return null }
  const merged = createRecipe(Object.assign({}, recipes[index], patch || {}, { recipeId, updatedAt: now() }))
  merged.photos = uniquePaths(merged.photos).slice(0, LIMITS.RECIPE_PHOTOS_PER_RECIPE)
  if (merged.photos.some((path) => hasForeignImagePath(path, recipeId))) { lastError = { code: 'duplicate_image_path', message: '图片已被其他记录使用' }; return null }
  if (merged.photos.length) { merged.isUnlocked = true; merged.unlockedDate = merged.unlockedDate || today() }
  recipes[index] = merged
  return saveAll(recipes) ? merged : null
}
function pathCanRemove(imagePath, recipeId) { return storage.isManagedImagePath(imagePath) && allImageReferences(recipeId).indexOf(imagePath) < 0 }
async function cleanupAddedFiles(paths, recipeId) {
  const failedFiles = []
  const skippedFiles = []
  for (const path of uniquePaths(paths)) {
    if (!storage.isManagedImagePath(path)) continue
    if (hasForeignImagePath(path, recipeId)) {
      skippedFiles.push(path)
      continue
    }
    let result
    try { result = await storage.removeImageChecked(path) } catch (error) { result = { ok: false, path, code: 'file_remove_failed', message: error.message || String(error) } }
    if (!result || !result.ok) failedFiles.push({ path, code: result && result.code ? result.code : 'file_remove_failed', message: result && result.message ? result.message : '本地图片清理失败' })
  }
  return { failedFiles, skippedFiles }
}
function remove(recipeId) {
  const recipe = get(recipeId)
  if (!recipe) { lastError = { code: 'not_found', message: '菜品不存在' }; return false }
  ;(recipe.photos || []).filter((path) => pathCanRemove(path, recipeId)).forEach((path) => { storage.removeImage(path) })
  return Boolean(saveAll(list().filter((item) => item.recipeId !== recipeId)))
}
async function removeAsync(recipeId) {
  const recipe = get(recipeId)
  if (!recipe) { lastError = { code: 'not_found', message: '菜品不存在' }; return { ok: false, reason: 'not_found', message: '菜品不存在' } }
  const paths = uniquePaths(recipe.photos).filter((path) => pathCanRemove(path, recipeId))
  const results = await Promise.all(paths.map((path) => storage.removeImageChecked(path).catch((error) => ({ ok: false, path, message: error.message || String(error) }))))
  const failedFiles = results.filter((result) => !result.ok).map((result) => ({ path: result.path, code: result.code || 'file_remove_failed', message: result.message || '本地图片清理失败' }))
  const skippedFiles = uniquePaths(recipe.photos).filter((path) => !paths.includes(path))
  if (failedFiles.length) {
    lastError = { code: failedFiles[0].code, message: '本地图片清理失败，请重试', failedFiles, skippedFiles, retryable: true }
    return { ok: false, reason: failedFiles[0].code, fileRemoved: false, failedFiles, skippedFiles, retryable: true, message: '本地图片清理失败，请重试' }
  }
  const saved = saveAll(list().filter((item) => item.recipeId !== recipeId))
  if (!saved) { lastError = { code: 'storage_write_failed', message: '菜品记录删除失败，请重试', failedFiles: [], skippedFiles, retryable: true }; return { ok: false, reason: 'storage_write_failed', message: '菜品记录删除失败，请重试', failedFiles: [], skippedFiles, retryable: true } }
  return { ok: true, fileRemoved: true, failedFiles: [], skippedFiles }
}
async function addPhotos(recipeId, paths) {
  const recipe = get(recipeId)
  if (!recipe) { lastError = { code: 'not_found', message: '菜品不存在' }; return null }
  const currentPaths = uniquePaths(recipe.photos)
  const incoming = uniquePaths(paths).filter((path) => currentPaths.indexOf(path) < 0)
  if (Array.isArray(paths) && paths.length > LIMITS.RECIPE_PHOTOS_PER_RECIPE) { lastError = { code: 'too_many_photos', message: '一次最多添加 9 张照片' }; return null }
  const left = LIMITS.RECIPE_PHOTOS_PER_RECIPE - currentPaths.length
  if (incoming.length > left) { lastError = { code: 'photo_limit', message: '每道菜最多保存 9 张照片' }; return null }
  if (incoming.some((path) => hasForeignImagePath(path, recipeId))) { lastError = { code: 'duplicate_image_path', message: '图片已被其他记录使用' }; return null }
  if (!incoming.length) { lastError = { code: 'duplicate_photo', message: '这些照片已经添加过了' }; return recipe }
  const results = await Promise.all(incoming.map((path, index) => Promise.resolve().then(() => storage.saveImageChecked(path, `recipe_${recipeId}_${index}`)).catch((error) => ({ ok: false, code: 'file_save_failed', path: '', message: error.message || String(error) }))))
  const failed = results.filter((result) => !result || !result.ok)
  const savedPaths = results.filter((result) => result && result.ok && result.path).map((result) => result.path)
  if (failed.length) {
    const cleanup = await cleanupAddedFiles(savedPaths, recipeId)
    lastError = { code: failed[0].code || 'file_save_failed', message: failed[0].message || '照片保存失败，请重试', failedFiles: failed.map((result) => ({ path: result.path || '', code: result.code || 'file_save_failed', message: result.message || '照片保存失败，请重试' })).concat(cleanup.failedFiles), savedFiles: savedPaths, skippedFiles: cleanup.skippedFiles, retryable: true }
    return null
  }
  const updated = update(recipeId, { photos: currentPaths.concat(savedPaths), isUnlocked: true, unlockedDate: recipe.unlockedDate || today() })
  if (updated) return updated
  const writeError = getLastError() || { code: 'storage_write_failed', message: '菜谱保存失败，请重试' }
  const cleanup = await cleanupAddedFiles(savedPaths, recipeId)
  lastError = { code: writeError.code === 'storage_write_failed' ? 'storage_write_failed' : (writeError.code || 'storage_write_failed'), message: writeError.message || '菜谱保存失败，请重试', failedFiles: cleanup.failedFiles, savedFiles: savedPaths, skippedFiles: cleanup.skippedFiles, retryable: true }
  return null
}
function getUnlockedCount() { return list().filter((recipe) => recipe && recipe.isUnlocked).length }
function toggleLike(recipeId) { const recipe = get(recipeId); if (!recipe) return null; const userId = userService.getCurrentUser().userId; const likes = recipe.likes.indexOf(userId) >= 0 ? recipe.likes.filter((id) => id !== userId) : recipe.likes.concat(userId); return update(recipeId, { likes }) }
function listByTab(tab) { const recipes = ensureDefaults(); if (tab === 'unlocked') return recipes.filter((recipe) => recipe.isUnlocked); if (tab === 'dessert') return recipes.filter((recipe) => recipe.category === 'dessert'); return recipes.filter((recipe) => !recipe.isUnlocked && recipe.category !== 'dessert') }
function validate(input) { const source = input || {}; if (!safeText(source.name, 30)) return { ok: false, message: '请写下菜名' }; if (source.review && String(source.review).length > 300) return { ok: false, message: '评价最多 300 字' }; return { ok: true } }

module.exports = { ensureDefaults, list, get, getUnlockedCount, create, update, remove, removeAsync, addPhotos, toggleLike, listByTab, validate, getLastError }
