const recipeService = require('../../services/recipeService')
const userService = require('../../services/userService')
const { confirm, showToast } = require('../../utils/util')
const { isImagePath, markImageError } = require('../../utils/mediaUtil')
const { LIMITS } = require('../../utils/limits')
const { getCapabilities, capabilityMessage } = require('../../utils/runtimeCapabilities')
const { mapError, mapServiceError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()

Page({
  data: { recipe: { recipeId: '', photos: [], likes: [], rating: 0 }, photoItems: [], liked: false, notFound: false, ratingValues: [1, 2, 3, 4, 5], choosingPhoto: false, addingPhoto: false, updating: false, deleting: false, capabilities: getCapabilities() },
  onLoad(options) { this.setData({ capabilities: getCapabilities() }); this.recipeId = options.id; this.load() },
  onShow() { task.activate(); this.setData({ choosingPhoto: false, addingPhoto: false, updating: false, deleting: false }); if (this.recipeId) this.load() },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  load() { const recipe = recipeService.get(this.recipeId); const userId = userService.getCurrentUser().userId; const safeRecipe = recipe || { recipeId: '', photos: [], likes: [], rating: 0 }; const photoItems = (safeRecipe.photos || []).map((path) => { const hasImage = isImagePath(path); return { path, imagePath: hasImage ? String(path) : '', hasImage } }); this.setData({ recipe: safeRecipe, photoItems, notFound: !recipe, liked: Boolean(recipe && recipe.likes.indexOf(userId) >= 0) }) },
  choosePhoto() {
    if (this.data.choosingPhoto || this.data.addingPhoto || this.data.deleting) return
    if (!this.data.capabilities.chooseImage || typeof wx === 'undefined' || !wx.chooseImage) return showToast(capabilityMessage('chooseImage', this.data.capabilities))
    const left = LIMITS.RECIPE_PHOTOS_PER_RECIPE - (Array.isArray(this.data.recipe.photos) ? this.data.recipe.photos.length : 0)
    if (left <= 0) return showToast(`最多添加 ${LIMITS.RECIPE_PHOTOS_PER_RECIPE} 张照片`)
    this.setData({ choosingPhoto: true })
    try {
      wx.chooseImage({ count: left, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: task.guard((result) => {
        const paths = result && Array.isArray(result.tempFilePaths) ? result.tempFilePaths.filter(Boolean) : []
        if (!paths.length) return showToast('已取消选择')
        this.setData({ addingPhoto: true })
        Promise.resolve(recipeService.addPhotos(this.recipeId, paths)).then(task.guard((saved) => { if (!saved) throw Object.assign(new Error('recipe photo write failed'), recipeService.getLastError ? recipeService.getLastError() : {}); this.load(); showToast('照片已添加', 'success') })).catch(task.guard((error) => { console.error('[recipe-detail] add photo failed', error); showToast(mapServiceError(recipeService, mapError(error, '照片添加失败，请重试'))) })).finally(task.guard(() => this.setData({ addingPhoto: false })))
      }), fail: task.guard((error) => showToast(mapError(error, '已取消选择'))), complete: task.guard(() => this.setData({ choosingPhoto: false })) })
    } catch (error) { console.error('[recipe-detail] choose photo failed', error); this.setData({ choosingPhoto: false }); showToast(mapError(error, '已取消选择')) }
  },
  onPhotoError(event) { const index = Number(event.currentTarget.dataset.index); this.setData({ photoItems: markImageError(this.data.photoItems, index) }); showToast('照片已失效，显示占位图') },
  rate(event) {
    if (this.data.updating || this.data.deleting) return
    if (!this.data.recipe.isUnlocked) return showToast('补充照片后即可评分')
    const rating = Number(event.currentTarget.dataset.rating)
    if (rating < 1 || rating > 5) return showToast('评分需要在 1 到 5 星之间')
    this.setData({ updating: true })
    try { if (!recipeService.update(this.recipeId, { rating })) return showToast('菜品不存在'); this.load() } catch (error) { console.error('[recipe-detail] rate failed', error); showToast('评分失败，请重试') }
    finally { if (task.isActive()) this.setData({ updating: false }) }
  },
  toggleLike() {
    if (this.data.updating || this.data.deleting) return
    if (!this.data.recipe.isUnlocked) return showToast('补充照片后即可点赞')
    this.setData({ updating: true })
    try { if (!recipeService.toggleLike(this.recipeId)) return showToast('菜品不存在'); this.load() } catch (error) { console.error('[recipe-detail] like failed', error); showToast('操作失败，请重试') }
    finally { if (task.isActive()) this.setData({ updating: false }) }
  },
  edit() {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast('暂时无法打开编辑页')
    try { wx.navigateTo({ url: `/pages/recipe-add/recipe-add?id=${this.recipeId}`, fail: () => showToast('暂时无法打开编辑页') }) } catch (error) { console.error('[recipe-detail] edit navigation failed', error); showToast('暂时无法打开编辑页') }
  },
  goRecipe() {
    if (typeof wx === 'undefined') return showToast('请使用底部导航返回菜谱')
    try {
      if (wx.switchTab) return wx.switchTab({ url: '/pages/recipe/recipe', fail: () => { if (wx.navigateBack) wx.navigateBack({ delta: 1, fail: () => showToast('请使用底部导航返回菜谱') }) } })
      if (wx.navigateBack) return wx.navigateBack({ delta: 1, fail: () => showToast('请使用底部导航返回菜谱') })
      showToast('请使用底部导航返回菜谱')
    } catch (error) { console.error('[recipe-detail] recipe navigation failed', error); showToast('请使用底部导航返回菜谱') }
  },
  async remove() {
    if (this.data.deleting) return
    const yes = await confirm({ title: '删除菜品', content: '删除后会移除这道菜的文字记录和本地照片，确定吗？' })
    if (!yes) return
    if (!task.isActive()) return
    this.setData({ deleting: true })
    try {
      const result = recipeService.removeAsync ? await recipeService.removeAsync(this.recipeId) : { ok: recipeService.remove(this.recipeId) }
      if (!result || !result.ok) {
        const failedCount = result && Array.isArray(result.failedFiles) ? result.failedFiles.length : 0
        return showToast(failedCount ? `照片清理失败（${failedCount} 张），请重试` : (result && result.message ? result.message : '菜品不存在或删除失败'))
      }
      showToast(result.skippedFiles && result.skippedFiles.length ? '已删除菜品记录，共享照片已保留' : '已删除')
      task.setTimer(() => { try { wx.navigateBack({ delta: 1, fail: task.guard(() => showToast('菜品已删除，请返回上一页')) }) } catch (error) { if (task.isActive()) showToast('菜品已删除，请返回上一页') } }, 350)
    } catch (error) { if (task.isActive()) { console.error('[recipe-detail] remove failed', error); showToast('删除失败，请重试') } }
    finally { if (task.isActive()) this.setData({ deleting: false }) }
  }
})
