const userService = require('../../services/userService')
const { confirm, showToast } = require('../../utils/util')
const { getCapabilities } = require('../../utils/runtimeCapabilities')
const { APP_VERSION, LOCAL_MODE_NAME } = require('../../utils/appMeta')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()

Page({
  data: { settings: {}, clearing: false, clearError: '', capabilities: getCapabilities(), version: APP_VERSION, localModeName: LOCAL_MODE_NAME },
  onShow() { task.activate(); this.setData({ clearing: false, clearError: '', settings: userService.getSettings(), capabilities: getCapabilities() }) },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  onEmotionChange(event) { const settings = userService.updateSettings({ emotionCareEnabled: event.detail.value }); const error = userService.getLastError && userService.getLastError(); if (error) return showToast('设置保存失败，请重试'); this.setData({ settings }) },
  onNotificationChange(event) { const settings = userService.updateSettings({ notificationsEnabled: event.detail.value }); const error = userService.getLastError && userService.getLastError(); if (error) return showToast('设置保存失败，请重试'); this.setData({ settings }) },
  openPage(url, fallback) {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast(fallback)
    try { wx.navigateTo({ url, fail: () => showToast(fallback) }) } catch (error) { console.error('[settings] navigation failed', error); showToast(fallback) }
  },
  showAbout() { this.openPage('/pages/about/about', '暂时无法打开关于页') },
  showPrivacy() { this.openPage('/pages/privacy/privacy', '暂时无法打开隐私说明') },
  feedback() { this.openPage('/pages/feedback/feedback', '暂时无法打开反馈页') },
  async clearData() {
    if (this.data.clearing) return
    const yes = await confirm({ title: '清除本地数据', content: '资料、聊天、菜谱、照片和本地反馈记录都会被清除，确定吗？' })
    if (!yes) return
    if (!task.isActive()) return
    this.setData({ clearing: true })
    try {
      const result = await userService.clearLocalData()
      if (!task.isActive()) return
      if (!result || !result.ok) {
        const failedFiles = result && Array.isArray(result.failedFiles) ? result.failedFiles.length : 0
        const failedKeys = result && Array.isArray(result.failedKeys) ? result.failedKeys.length : 0
        const message = failedFiles ? `有 ${failedFiles} 张图片清理失败，请重试` : (failedKeys ? `有 ${failedKeys} 项本地记录未清除，请重试` : '数据清除未完成，请重试')
        this.setData({ clearError: message })
        showToast(message)
        console.warn('[settings] clear incomplete', result && (result.failedFiles || result.failedKeys))
      } else {
        this.setData({ clearError: '', settings: userService.getSettings() })
        showToast('已恢复默认数据', 'success')
      }
    } catch (error) { if (task.isActive()) { console.error('[settings] clear failed', error); this.setData({ clearError: '清除失败，请再次点击重试' }); showToast('清除失败，请重试') } }
    finally { if (task.isActive()) this.setData({ clearing: false }) }
  }
})
