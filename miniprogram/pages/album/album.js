const albumService = require('../../services/albumService')
const userService = require('../../services/userService')
const { showToast, confirm, safeText } = require('../../utils/util')
const { withImageFlag, markImageError, isImagePath } = require('../../utils/mediaUtil')
const { getCapabilities, capabilityMessage } = require('../../utils/runtimeCapabilities')
const { mapError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()

function uploaderLabel(photo, user, couple) {
  const uploadedBy = String(photo && photo.uploadedBy || '').trim()
  if (uploadedBy && uploadedBy === String(user && user.userId || '')) return String(user && user.nickname || '本人')
  if (uploadedBy && couple && couple.partner && uploadedBy === String(couple.partner.userId || '')) return 'Ta'
  return '本机记录'
}

function presentPhoto(photo, user, couple) {
  const presented = withImageFlag(photo)
  return Object.assign({}, presented, { renderPath: presented.hasImage ? presented.imagePath : '', uploaderLabel: uploaderLabel(photo, user, couple) })
}

Page({
  data: { groups: [], total: 0, user: {}, couple: {}, togetherDays: 0, isBound: false, signature: '', signatureDraft: '', previewVisible: false, previewPhotos: [], previewIndex: 0, currentPhoto: {}, canDelete: false, deleting: false, savingToAlbum: false, editingSignature: false, savingSignature: false, capabilities: getCapabilities() },
  onShow() { task.activate(); this.setData({ deleting: false, savingToAlbum: false, savingSignature: false }); this.load() },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  load() {
    const user = userService.getCurrentUser(); const couple = userService.getCouple(); const photos = albumService.list(); const withFlags = photos.map((photo) => presentPhoto(photo, user, couple)); const groups = albumService.groupByMonth(withFlags)
    const isBound = Boolean(couple.partner)
    const signature = userService.getSettings().albumSignature
    this.setData({ groups, total: photos.length, user, couple, togetherDays: isBound ? userService.getTogetherDays() : 0, isBound, signature, signatureDraft: this.data.editingSignature ? this.data.signatureDraft : signature, capabilities: getCapabilities() })
    if (this.data.previewVisible) this.closePreview()
  },
  goUpload() {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast('暂时无法打开上传页')
    try { wx.navigateTo({ url: '/pages/album-upload/album-upload', fail: () => showToast('暂时无法打开上传页') }) } catch (error) { console.error('[album] upload navigation failed', error); showToast('暂时无法打开上传页') }
  },
  goBind() {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast('暂时无法打开绑定页')
    try { wx.navigateTo({ url: '/pages/bind/bind', fail: () => showToast('暂时无法打开绑定页') }) } catch (error) { console.error('[album] bind navigation failed', error); showToast('暂时无法打开绑定页') }
  },
  preview(event) { const id = event.detail.photoId; const user = userService.getCurrentUser(); const couple = userService.getCouple(); const photos = albumService.list().map((photo) => presentPhoto(photo, user, couple)); const index = photos.findIndex((photo) => photo.photoId === id); if (index < 0) return; this.setData({ previewVisible: true, previewPhotos: photos, previewIndex: index, currentPhoto: photos[index], canDelete: photos[index].uploadedBy === user.userId }) },
  onPreviewChange(event) { const index = Number(event.detail.current); const photo = this.data.previewPhotos[index]; if (!photo) return; this.setData({ previewIndex: index, currentPhoto: photo, canDelete: photo.uploadedBy === userService.getCurrentUser().userId }) },
  onPreviewError(event) { const index = Number(event.currentTarget.dataset.index); const previewPhotos = markImageError(this.data.previewPhotos, index); const currentPhoto = previewPhotos[this.data.previewIndex] || {}; this.setData({ previewPhotos, currentPhoto, canDelete: currentPhoto.uploadedBy === userService.getCurrentUser().userId }); showToast('照片已失效，显示占位图') },
  closePreview() { this.setData({ previewVisible: false, previewPhotos: [], previewIndex: 0, currentPhoto: {}, canDelete: false }) },
  saveCurrent() { this.saveToAlbum({ detail: { photo: this.data.currentPhoto } }) },
  saveToAlbum(event) {
    if (this.data.savingToAlbum) return
    const photo = event.detail.photo
    if (!photo || photo.hasImage !== true || !isImagePath(photo.imagePath)) return showToast('占位照片暂时不能保存')
    if (!this.data.capabilities.saveImageToPhotosAlbum || typeof wx === 'undefined' || !wx.saveImageToPhotosAlbum) return showToast(capabilityMessage('saveImageToPhotosAlbum', this.data.capabilities))
    this.setData({ savingToAlbum: true })
    try { wx.saveImageToPhotosAlbum({ filePath: photo.imagePath, success: task.guard(() => showToast('已保存到手机相册', 'success')), fail: task.guard((error) => showToast(mapError(error, '保存失败，请检查相册权限'))), complete: task.guard(() => this.setData({ savingToAlbum: false })) }) } catch (error) { console.error('[album] save photo failed', error); if (task.isActive()) { this.setData({ savingToAlbum: false }); showToast(mapError(error, '保存失败，请重试')) } }
  },
  async deleteCurrent() {
    if (this.data.deleting) return
    if (!this.data.canDelete) return showToast('只能删除自己上传的照片')
    const yes = await confirm({ title: '删除照片', content: '删除后无法恢复，确定吗？' })
    if (!yes) return
    if (!task.isActive()) return
    this.setData({ deleting: true })
    try {
      const result = albumService.removeAsync ? await albumService.removeAsync(this.data.currentPhoto.photoId) : albumService.remove(this.data.currentPhoto.photoId)
      if (!task.isActive()) return
      if (!result || !result.ok) {
        const failedCount = result && Array.isArray(result.failedFiles) ? result.failedFiles.length : 0
        return showToast(failedCount ? `图片清理失败（${failedCount} 张），请重试` : (result && result.message ? result.message : '删除失败'))
      }
      showToast(result.fileRemoved === false ? '照片记录已删除，但文件清理失败' : '照片已删除')
      const user = userService.getCurrentUser(); const couple = userService.getCouple(); const remaining = albumService.list().map((photo) => presentPhoto(photo, user, couple))
      if (!remaining.length) return this.closePreview()
      const nextIndex = Math.min(this.data.previewIndex, remaining.length - 1)
      const nextPhoto = remaining[nextIndex]
      this.setData({ previewPhotos: remaining, previewIndex: nextIndex, currentPhoto: nextPhoto, canDelete: nextPhoto.uploadedBy === userService.getCurrentUser().userId })
      this.load()
    } catch (error) { if (task.isActive()) { console.error('[album] delete failed', error); showToast('删除失败，请重试') } }
    finally { if (task.isActive()) this.setData({ deleting: false }) }
  },
  editSignature() {
    if (this.data.editingSignature || this.data.savingSignature) return
    this.setData({ editingSignature: true, signatureDraft: this.data.signature })
  },
  onSignatureInput(event) { this.setData({ signatureDraft: event.detail.value }) },
  saveSignature() {
    if (!this.data.editingSignature || this.data.savingSignature) return
    this.setData({ savingSignature: true })
    try {
      const value = safeText(this.data.signatureDraft, 60)
      userService.updateSignature(value)
      const writeError = userService.getLastError && userService.getLastError()
      if (writeError) return showToast(mapError(writeError, '签名保存失败，请重试'))
      if (!task.isActive()) return
      this.setData({ signature: value, signatureDraft: value, editingSignature: false })
      showToast('签名已更新', 'success')
    } catch (error) { console.error('[album] signature save failed', error); showToast('签名保存失败，请重试') }
    finally { if (task.isActive()) this.setData({ savingSignature: false }) }
  },
  cancelSignature() { if (this.data.savingSignature) return; this.setData({ editingSignature: false, signatureDraft: this.data.signature }) }
})
