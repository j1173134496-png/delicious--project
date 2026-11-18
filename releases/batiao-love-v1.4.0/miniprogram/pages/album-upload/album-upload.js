const albumService = require('../../services/albumService')
const { LIMITS } = require('../../utils/limits')
const { today, isValidDate, isFutureDate } = require('../../utils/dateUtil')
const { safeText, showToast } = require('../../utils/util')
const { isImagePath, markImageError } = require('../../utils/mediaUtil')
const { getCapabilities, capabilityMessage } = require('../../utils/runtimeCapabilities')
const { mapError, mapServiceError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()

function presentImages(paths) {
  return (Array.isArray(paths) ? paths : []).map((path) => {
    const hasImage = isImagePath(path)
    return { path, imagePath: hasImage ? String(path) : '', hasImage }
  })
}

Page({
  data: { images: [], imageItems: [], date: today(), today: today(), description: '', tagText: '', saving: false, choosingImage: false, capabilities: getCapabilities() },
  onLoad() { this.setData({ capabilities: getCapabilities() }) },
  onShow() { task.activate(); this.setData({ saving: false, choosingImage: false }) },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  chooseImage() {
    if (this.data.choosingImage || this.data.saving) return
    const left = LIMITS.ALBUM_PHOTOS_PER_BATCH - this.data.images.length
    if (left <= 0) return showToast(`一次最多 ${LIMITS.ALBUM_PHOTOS_PER_BATCH} 张照片`)
    if (!this.data.capabilities.chooseImage || typeof wx === 'undefined' || !wx.chooseImage) return showToast(capabilityMessage('chooseImage', this.data.capabilities))
    this.setData({ choosingImage: true })
    try {
      wx.chooseImage({ count: left, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: task.guard((result) => {
        const paths = result && Array.isArray(result.tempFilePaths) ? result.tempFilePaths.filter(Boolean) : []
        if (!paths.length) return showToast('已取消选择')
        const images = this.data.images.concat(paths).slice(0, LIMITS.ALBUM_PHOTOS_PER_BATCH)
        this.setData({ images, imageItems: presentImages(images) })
      }), fail: task.guard((error) => showToast(mapError(error, '已取消选择'))), complete: task.guard(() => this.setData({ choosingImage: false })) })
    } catch (error) { console.error('[album-upload] choose image failed', error); this.setData({ choosingImage: false }); showToast(mapError(error, '已取消选择')) }
  },
  onImageError(event) { this.setData({ imageItems: markImageError(this.data.imageItems, event && event.currentTarget && event.currentTarget.dataset ? event.currentTarget.dataset.index : -1) }); showToast('照片已失效，显示占位图') },
  onDateChange(event) { this.setData({ date: event.detail.value }) },
  onDescriptionInput(event) { this.setData({ description: event.detail.value }) },
  onTagInput(event) { this.setData({ tagText: event.detail.value }) },
  async save() {
    if (this.data.saving) return
    if (!this.data.images.length) return showToast('先选择至少一张照片吧')
    if (!isValidDate(this.data.date) || isFutureDate(this.data.date)) return showToast('日期需要是有效的过去或今天')
    this.setData({ saving: true })
    const tags = safeText(this.data.tagText, 60).split(/[,，]/).map((tag) => safeText(tag, 20)).filter(Boolean).slice(0, 6)
    try {
      const saved = await albumService.saveImages(this.data.images, { date: this.data.date, description: safeText(this.data.description, 200), tags })
      if (!saved || saved.length !== this.data.images.length) throw Object.assign(new Error('some images were not saved'), albumService.getLastError ? albumService.getLastError() : {})
      if (!task.isActive()) return
      showToast('回忆已保存', 'success')
      task.setTimer(() => { try { wx.navigateBack({ delta: 1, fail: task.guard(() => showToast('回忆已保存，请返回上一页查看')) }) } catch (error) { if (task.isActive()) showToast('回忆已保存，请返回上一页查看') } }, 450)
    } catch (error) {
      if (task.isActive()) {
        console.error('[album-upload] save failed', error)
        showToast(mapServiceError(albumService, mapError(error, '保存失败，请稍后再试')))
      }
    } finally { if (task.isActive()) this.setData({ saving: false }) }
  }
})
