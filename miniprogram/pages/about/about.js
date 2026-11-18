const { showToast } = require('../../utils/util')
const {
  APP_VERSION,
  LOCAL_MODE_NAME,
  LOCAL_MODE_COPY,
  UNAVAILABLE_CAPABILITIES_COPY
} = require('../../utils/appMeta')

Page({
  data: {
    version: APP_VERSION,
    localModeName: LOCAL_MODE_NAME,
    localModeCopy: LOCAL_MODE_COPY,
    unavailableCapabilitiesCopy: UNAVAILABLE_CAPABILITIES_COPY
  },
  goFeedback() {
    try { wx.navigateTo({ url: '/pages/feedback/feedback', fail: () => showToast('暂时无法打开反馈页') }) } catch (error) { console.error('[about] feedback navigation failed', error); showToast('暂时无法打开反馈页') }
  }
})
