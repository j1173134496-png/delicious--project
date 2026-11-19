const recipeService = require('../../services/recipeService')
const storage = require('../../services/storageService')
const { LIMITS } = require('../../utils/limits')
const { safeText, showToast } = require('../../utils/util')
const { isImagePath, markImageError } = require('../../utils/mediaUtil')
const { getCapabilities, capabilityMessage } = require('../../utils/runtimeCapabilities')
const { mapError, mapServiceError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()

function presentPhotos(paths) {
  return (Array.isArray(paths) ? paths : []).map((path) => {
    const hasImage = isImagePath(path)
    return { path, imagePath: hasImage ? String(path) : '', hasImage }
  })
}

Page({
  data: { isEdit: false, form: { name: '', category: 'hunan', rating: 0, review: '' }, categoryOptions: ['湘菜', '甜品', '自定义'], categoryIndex: 0, ratingValues: [1, 2, 3, 4, 5], photos: [], photoItems: [], saving: false, choosingPhoto: false, capabilities: getCapabilities() },
  onLoad(options = {}) {
    this.setData({ capabilities: getCapabilities() })
    this.recipeId = options.id || ''
    this.load()
    if (this.data.isEdit && typeof wx !== 'undefined' && typeof wx.setNavigationBarTitle === 'function') {
      wx.setNavigationBarTitle({ title: '编辑菜品' })
    }
  },
  onShow() { task.activate(); this.setData({ saving: false, choosingPhoto: false }) },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  load() { const recipe = this.recipeId ? recipeService.get(this.recipeId) : null; if (!recipe) return; const photos = recipe.photos || []; const categoryIndex = { hunan: 0, dessert: 1, custom: 2 }[recipe.category] || 0; this.setData({ isEdit: true, form: { name: recipe.name, category: recipe.category, rating: recipe.rating, review: recipe.review }, categoryIndex, photos, photoItems: presentPhotos(photos) }) },
  onNameInput(event) { this.setData({ 'form.name': event.detail.value }) },
  onReviewInput(event) { this.setData({ 'form.review': event.detail.value }) },
  onCategoryChange(event) { const index = Number(event.detail.value); this.setData({ categoryIndex: index, 'form.category': ['hunan', 'dessert', 'custom'][index] }) },
  pickRating(event) { this.setData({ 'form.rating': Number(event.currentTarget.dataset.rating) }) },
  choosePhoto() {
    if (this.data.choosingPhoto || this.data.saving) return
    const left = LIMITS.RECIPE_PHOTOS_PER_RECIPE - this.data.photos.length
    if (left <= 0) return showToast(`最多添加 ${LIMITS.RECIPE_PHOTOS_PER_RECIPE} 张照片`)
    if (!this.data.capabilities.chooseImage || typeof wx === 'undefined' || !wx.chooseImage) return showToast(capabilityMessage('chooseImage', this.data.capabilities))
    this.setData({ choosingPhoto: true })
    try {
      wx.chooseImage({ count: left, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: task.guard((result) => {
        const paths = result && Array.isArray(result.tempFilePaths) ? result.tempFilePaths.filter(Boolean) : []
        if (!paths.length) return showToast('已取消选择')
        const photos = this.data.photos.concat(paths).slice(0, LIMITS.RECIPE_PHOTOS_PER_RECIPE)
        this.setData({ photos, photoItems: presentPhotos(photos) })
      }), fail: task.guard((error) => showToast(mapError(error, '已取消选择'))), complete: task.guard(() => this.setData({ choosingPhoto: false })) })
    } catch (error) { console.error('[recipe-add] choose photo failed', error); this.setData({ choosingPhoto: false }); showToast(mapError(error, '已取消选择')) }
  },
  onPhotoError(event) { this.setData({ photoItems: markImageError(this.data.photoItems, event && event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset.index : -1) }); showToast('照片已失效，显示占位图') },
  async save() {
    if (this.data.saving) return
    const form = Object.assign({}, this.data.form, { name: safeText(this.data.form.name, 30), review: safeText(this.data.form.review, 300) })
    const valid = recipeService.validate(form)
    if (!valid.ok) return showToast(valid.message)
    this.setData({ saving: true })
    let createdRecipeId = ''
    let photoWriteAttempted = false
    try {
      let recipe
      const existingPaths = this.data.isEdit && this.recipeId ? (recipeService.get(this.recipeId).photos || []) : []
      const pendingPaths = this.data.photos.slice(existingPaths.length)
      if (this.data.isEdit) {
        recipe = recipeService.update(this.recipeId, { name: form.name, category: form.category, rating: form.rating, review: form.review })
      } else {
        recipe = recipeService.create({ name: form.name, category: form.category, rating: form.rating, review: form.review })
        createdRecipeId = recipe && recipe.recipeId ? recipe.recipeId : ''
      }
      if (!recipe) throw new Error('recipe write returned empty')
      if (pendingPaths.length) {
        photoWriteAttempted = true
        recipe = await recipeService.addPhotos(recipe.recipeId, pendingPaths)
        if (!recipe) {
          const serviceError = recipeService.getLastError ? recipeService.getLastError() : null
          const photoError = Object.assign(new Error(serviceError && serviceError.message ? serviceError.message : '照片添加失败，请重试'), serviceError || {})
          photoError.userMessage = serviceError && serviceError.code === 'storage_write_failed' ? '菜品记录保存失败，照片已清理，请重试' : '照片添加失败，菜品记录未保存，请重试'
          throw photoError
        }
      }
      if (!recipe) throw new Error('recipe photo write returned empty')
      if (!task.isActive()) return
      showToast('菜品已保存', 'success')
      task.setTimer(() => {
        try { wx.navigateBack({ delta: 1, fail: task.guard(() => showToast('菜品已保存，请返回上一页查看')) }) } catch (error) { if (task.isActive()) showToast('菜品已保存，请返回上一页查看') }
      }, 450)
    } catch (error) {
      console.error('[recipe-add] save failed', error)
      if (!this.data.isEdit && createdRecipeId && photoWriteAttempted) {
        let rollback
        try { rollback = await recipeService.removeAsync(createdRecipeId) } catch (rollbackError) { rollback = { ok: false, reason: 'recipe_creation_rollback_failed', message: rollbackError.message || String(rollbackError) } }
        if (!rollback || !rollback.ok) {
          const rollbackMessage = '菜品创建回滚失败，请重试'
          error = Object.assign(error || new Error(rollbackMessage), { code: 'recipe_creation_rollback_failed', message: rollbackMessage, userMessage: rollbackMessage })
        }
      }
      if (task.isActive()) {
        showToast(error && error.userMessage ? error.userMessage : mapServiceError(recipeService, mapError(error, '保存失败，请稍后再试')))
      }
    } finally { if (task.isActive()) this.setData({ saving: false }) }
  }
})
