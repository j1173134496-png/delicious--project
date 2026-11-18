const { showToast } = require('../../utils/util')

Component({
  properties: {
    title: { type: String, value: '' },
    showBack: { type: Boolean, value: false }
  },
  methods: {
    onBack() {
      if (typeof wx === 'undefined' || !wx.navigateBack) return showToast('当前页面无法返回')
      try { wx.navigateBack({ delta: 1, fail: () => showToast('当前页面无法返回，请使用底部导航') }) } catch (error) { console.error('[nav-bar] back failed', error); showToast('当前页面无法返回，请使用底部导航') }
    }
  }
})
