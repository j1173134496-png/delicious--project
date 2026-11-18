const userService = require('../../services/userService')
const storage = require('../../services/storageService')
const { today, isValidDate, isFutureDate } = require('../../utils/dateUtil')
const { safeText, showToast } = require('../../utils/util')
const { getCapabilities, capabilityMessage } = require('../../utils/runtimeCapabilities')
const { mapError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()
let originalAvatarPath = ''
let pendingAvatarPaths = []
let pendingCleanupError = null

function uniquePaths(paths) { return Array.from(new Set((Array.isArray(paths) ? paths : []).map((path) => String(path || '').trim()).filter(Boolean))) }
function cleanupPaths(paths) {
  const candidates = uniquePaths(paths).filter((path) => storage.isManagedImagePath(path) && path !== originalAvatarPath)
  if (!candidates.length) return Promise.resolve({ ok: true, failedFiles: [] })
  return Promise.all(candidates.map((path) => Promise.resolve().then(() => storage.removeImageChecked(path)).catch((error) => ({ ok: false, path, code: 'file_remove_failed', message: error.message || String(error) })))).then((results) => {
    const failedFiles = results.filter((result) => !result || !result.ok).map((result, index) => ({ path: result && result.path ? result.path : candidates[index], code: result && result.code ? result.code : 'file_remove_failed', message: result && result.message ? result.message : '本地头像清理失败' }))
    return { ok: failedFiles.length === 0, failedFiles }
  })
}

Page({
  data: { form: {}, genderOptions: ['未设置', '男', '女', '其他'], genderIndex: 0, today: today(), saving: false, avatarSaving: false, capabilities: getCapabilities() },
  onLoad() { this.setData({ capabilities: getCapabilities() }); this.loadForm() },
  onShow() { task.activate(); this.setData({ saving: false, avatarSaving: false }); if (pendingCleanupError) { showToast('头像文件清理失败，请重试'); pendingCleanupError = null } if (this.data.form && this.data.form.userId && !pendingAvatarPaths.length) this.loadForm() },
  onHide() { task.cancel(); this.cleanupPendingAvatar() },
  onUnload() { task.cancel(); this.cleanupPendingAvatar() },
  loadForm() {
    const user = userService.getCurrentUser()
    originalAvatarPath = user.avatar || ''
    pendingAvatarPaths = []
    const genderIndex = { '': 0, male: 1, female: 2, other: 3 }[user.gender] || 0
    this.setData({ form: Object.assign({}, user, { anniversaryDate: userService.getAnniversaryDate() }), genderIndex })
  },
  onNicknameInput(event) { this.setData({ 'form.nickname': event.detail.value }) },
  onSignatureInput(event) { this.setData({ 'form.signature': event.detail.value }) },
  onGenderChange(event) { const index = Number(event.detail.value); this.setData({ genderIndex: index, 'form.gender': ['', 'male', 'female', 'other'][index] }) },
  onBirthdayChange(event) { this.setData({ 'form.birthday': event.detail.value }) },
  onAnniversaryChange(event) { this.setData({ 'form.anniversaryDate': event.detail.value }) },
  async cleanupPendingAvatar() {
    const candidates = pendingAvatarPaths.slice()
    pendingAvatarPaths = []
    const result = await cleanupPaths(candidates)
    if (!result.ok) {
      pendingAvatarPaths = uniquePaths(result.failedFiles.map((file) => file.path))
      pendingCleanupError = result
    } else pendingCleanupError = null
    if (task.isActive() && this.data.form && pendingAvatarPaths.length === 0) this.setData({ 'form.avatar': originalAvatarPath })
    return result
  },
  async replacePendingAvatar(path) {
    const previous = pendingAvatarPaths.slice()
    pendingAvatarPaths = []
    const cleaned = await cleanupPaths(previous)
    if (!cleaned.ok) {
      pendingAvatarPaths = uniquePaths(cleaned.failedFiles.map((file) => file.path))
      pendingCleanupError = cleaned
      if (task.isActive()) showToast('头像文件清理失败，请重试')
    }
    if (!task.isActive()) {
      const detached = await cleanupPaths([path])
      if (!detached.ok) { pendingAvatarPaths = uniquePaths(pendingAvatarPaths.concat(detached.failedFiles.map((file) => file.path))); pendingCleanupError = detached }
      return { ok: false, code: 'page_inactive', failedFiles: detached.failedFiles }
    }
    if (storage.isManagedImagePath(path) && path !== originalAvatarPath) pendingAvatarPaths.push(path)
    this.setData({ 'form.avatar': path })
    return { ok: true, path }
  },
  pickAvatar() {
    if (this.data.avatarSaving || this.data.saving) return
    if (!this.data.capabilities.chooseImage || typeof wx === 'undefined' || !wx.chooseImage) return showToast(capabilityMessage('chooseImage', this.data.capabilities))
    this.setData({ avatarSaving: true })
    try {
      wx.chooseImage({ count: 1, sizeType: ['compressed'], sourceType: ['album', 'camera'], success: (result) => {
        const tempPath = result && result.tempFilePaths && result.tempFilePaths[0]
        if (!tempPath) { this.cleanupPendingAvatar().then((cleanup) => { if (task.isActive() && !cleanup.ok) showToast('头像文件清理失败，请重试') }).finally(() => { if (task.isActive()) this.setData({ avatarSaving: false }) }); if (task.isActive()) showToast('没有选择头像'); return }
        storage.saveImageChecked(tempPath, `avatar_${Date.now()}`).then((result) => {
          if (!result || !result.ok || !result.path) throw Object.assign(new Error(result && result.message ? result.message : '头像保存失败'), result || { code: 'file_save_failed' })
          return this.replacePendingAvatar(result.path)
        }).catch((error) => { console.error('[profile-edit] avatar save failed', error); if (task.isActive()) showToast(mapError(error, '头像保存失败，请重试')) }).finally(() => { if (task.isActive()) this.setData({ avatarSaving: false }) })
      }, fail: task.guard((error) => { this.cleanupPendingAvatar().then((cleanup) => { if (task.isActive() && !cleanup.ok) showToast('头像文件清理失败，请重试') }).finally(() => { if (task.isActive()) this.setData({ avatarSaving: false }) }); showToast(mapError(error, '已取消选择')) }), complete: () => {} })
    } catch (error) { console.error('[profile-edit] choose avatar failed', error); this.setData({ avatarSaving: false }); showToast(mapError(error, '已取消选择')) }
  },
  onChooseAvatar(event) { if (event.detail && event.detail.avatarUrl) this.replacePendingAvatar(event.detail.avatarUrl) },
  async save() {
    if (this.data.saving || this.data.avatarSaving) return
    const form = this.data.form
    const nickname = safeText(form.nickname, 20)
    if (!nickname) { const cleanup = await this.cleanupPendingAvatar(); return showToast(cleanup.ok ? '昵称不能为空' : '头像文件清理失败，请重试') }
    if (form.birthday && (!isValidDate(form.birthday) || isFutureDate(form.birthday))) { const cleanup = await this.cleanupPendingAvatar(); return showToast(cleanup.ok ? '生日需要是有效的过去日期' : '头像文件清理失败，请重试') }
    this.setData({ saving: true })
    try {
      const anniversary = userService.setAnniversaryDate(form.anniversaryDate)
      if (!anniversary.ok) { const cleanup = await this.cleanupPendingAvatar(); return showToast(cleanup.ok ? anniversary.message : '头像文件清理失败，请重试') }
      const savedUser = userService.updateUser({ nickname, avatar: form.avatar || '🐰', gender: form.gender || '', birthday: form.birthday || '', signature: safeText(form.signature, 60) })
      const writeError = userService.getLastError && userService.getLastError()
      if (writeError) { const cleanup = await this.cleanupPendingAvatar(); return showToast(cleanup.ok ? mapError(writeError, '资料保存失败，请重试') : '头像文件清理失败，请重试') }
      const committedAvatar = savedUser && savedUser.avatar ? savedUser.avatar : (form.avatar || '🐰')
      const stalePending = pendingAvatarPaths.filter((path) => path !== committedAvatar)
      pendingAvatarPaths = []
      const staleCleanup = await cleanupPaths(stalePending)
      if (!staleCleanup.ok) { pendingAvatarPaths = uniquePaths(staleCleanup.failedFiles.map((file) => file.path)); pendingCleanupError = staleCleanup }
      originalAvatarPath = committedAvatar
      showToast(staleCleanup.ok ? '资料已保存' : '资料已保存，旧头像清理失败，请重试', staleCleanup.ok ? 'success' : 'none')
      task.setTimer(() => { try { if (typeof wx === 'undefined' || !wx.navigateBack) return showToast('资料已保存，请返回上一页查看'); wx.navigateBack({ delta: 1, fail: task.guard(() => showToast('资料已保存，请返回上一页查看')) }) } catch (error) { if (task.isActive()) showToast('资料已保存，请返回上一页查看') } }, 450)
    } catch (error) { console.error('[profile-edit] save failed', error); const cleanup = await this.cleanupPendingAvatar(); showToast(cleanup.ok ? '保存失败，请重试' : '头像文件清理失败，请重试') }
    finally { if (task.isActive()) this.setData({ saving: false }) }
  }
})
