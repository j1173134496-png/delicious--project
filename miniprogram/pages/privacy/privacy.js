const { showToast } = require('../../utils/util')

Page({
  goFeedback() {
    try { wx.navigateTo({ url: '/pages/feedback/feedback', fail: () => showToast('暂时无法打开反馈页') }) } catch (error) { console.error('[privacy] feedback navigation failed', error); showToast('暂时无法打开反馈页') }
  }
})
