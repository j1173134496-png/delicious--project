const userService = require('../../services/userService')
const catService = require('../../services/catService')
const { getFormMeta, getStateMeta, getFormAsset } = require('../../models/cat')
const { showToast } = require('../../utils/util')
const { getCapabilities } = require('../../utils/runtimeCapabilities')

const GENDER_LABELS = { male: '男', female: '女', other: '其他' }
const CONDITION_UNITS = { feed: '次', chat: '次', recipes: '道', anniversary: '天' }
const DEFAULT_FORM = getFormMeta('baby')
const DEFAULT_STATE = getStateMeta('idle')
const DEFAULT_ASSET = getFormAsset('baby', 'idle')

Page({
  data: { user: {}, couple: {}, cat: {}, progress: {}, togetherDays: 0, isBound: false, formEmoji: DEFAULT_ASSET.emoji, formImage: DEFAULT_ASSET.imagePath, formImageFailed: false, formName: DEFAULT_ASSET.formName, stateText: DEFAULT_ASSET.stateText, formStateClass: DEFAULT_STATE.animationClass, formAssetFallback: DEFAULT_ASSET.fallback, formTransitionTip: '', genderLabel: '未设置', birthdayLabel: '未设置', anniversaryDate: '', anniversaryLabel: '绑定后设置纪念日', conditionRows: [], capabilities: getCapabilities() },
  onShow() { this.loadData() },
  loadData() {
    const user = userService.getCurrentUser()
    const couple = userService.getCouple()
    const cat = catService.getCat()
    const progress = catService.getProgress(cat)
    const isBound = Boolean(couple.partner)
    const formMeta = getFormMeta(cat.currentForm)
    const stateMeta = getStateMeta(cat.stateKey || 'idle')
    const formAsset = getFormAsset(cat.currentForm, cat.stateKey || 'idle')
    const togetherDays = isBound ? userService.getTogetherDays() : 0
    const anniversaryDate = isBound ? userService.getAnniversaryDate() : ''
    const conditionRows = (progress.conditions || []).map((condition) => Object.assign({}, condition, {
      unit: CONDITION_UNITS[condition.key] || '',
      targetText: `${condition.current}/${condition.need}${CONDITION_UNITS[condition.key] || ''}`,
      remainingText: condition.ready ? '已满足' : `还差 ${condition.remaining}${CONDITION_UNITS[condition.key] || ''}`
    }))
    const previousForm = this._lastFormKey
    const formTransitionTip = previousForm && previousForm !== cat.currentForm ? `形态已切换为 ${formMeta.name}，继续收集小幸福吧！` : ''
    this._lastFormKey = cat.currentForm
    this.setData({
      user,
      couple,
      cat,
      progress,
      togetherDays,
      isBound,
      formEmoji: formAsset.emoji,
      formImage: formAsset.imagePath,
      formIdleImage: formAsset.idlePath,
      formImageFailed: false,
      formName: formMeta.name,
      stateText: stateMeta.label,
      formStateClass: stateMeta.animationClass,
      formAssetFallback: formAsset.fallback,
      formTransitionTip,
      genderLabel: GENDER_LABELS[user.gender] || '未设置',
      birthdayLabel: user.birthday || '未设置',
      anniversaryDate,
      anniversaryLabel: isBound ? `在一起第 ${togetherDays} 天` : '未绑定，先绑定 / 设置纪念日',
      conditionRows,
      capabilities: getCapabilities()
    })
  },
  onFormImageError(event) {
    const src = event && event.currentTarget && event.currentTarget.dataset.src
    if (src && src !== this.data.formImage) return
    if (this.data.formIdleImage && this.data.formImage !== this.data.formIdleImage) {
      this.setData({ formImage: this.data.formIdleImage, formAssetFallback: 'idle' })
    } else {
      this.setData({ formImageFailed: true, formAssetFallback: 'emoji' })
    }
  },
  openPage(url, message) {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast(message)
    try { wx.navigateTo({ url, fail: () => showToast(message) }) } catch (error) { console.error('[profile] navigation failed', error); showToast(message) }
  },
  goEdit() { this.openPage('/pages/profile-edit/profile-edit', '暂时无法打开资料编辑页') },
  goBind() { this.openPage('/pages/bind/bind', '暂时无法打开绑定页') },
  goSettings() { this.openPage('/pages/settings/settings', '暂时无法打开设置页') },
  showAbout() {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast('暂时无法打开关于页')
    try { wx.navigateTo({ url: '/pages/about/about', fail: () => showToast('暂时无法打开关于页') }) } catch (error) { console.error('[profile] about navigation failed', error); showToast('暂时无法打开关于页') }
  },
  onShareAppMessage() {
    const couple = userService.getCouple()
    if (!couple.partner) {
      let code = ''
      try { code = userService.getInviteCode() } catch (error) { console.error('[profile] invite share failed', error) }
      return { title: '邀请 Ta 加入八条与你（当前设备模拟）', path: `/pages/bind/bind?code=${encodeURIComponent(code)}` }
    }
    return { title: '和八条一起记录我们的日常', path: '/pages/chat/chat' }
  }
})
