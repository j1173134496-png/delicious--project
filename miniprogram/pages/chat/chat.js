const chatService = require('../../services/chatService')
const catService = require('../../services/catService')
const { showToast, safeText } = require('../../utils/util')
const { mapError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

function getAppSafe() {
  try { return typeof getApp === 'function' ? getApp() : null } catch (error) { return null }
}
const task = createPageTask()

Page({
  data: { messages: [], cat: {}, progress: {}, inputValue: '', sending: false, feeding: false, petting: false, retrying: false, initializationError: '', initializationStage: '', initializationRetryable: false, capabilities: null, catState: 'idle', careTip: '', upgradeTip: '', scrollIntoView: 'chat-bottom', hearts: [] },
  onLoad() { this.loadData() },
  onShow() { task.activate(); this._lastPetToken = ''; this._lastPetAt = 0; this.loadData() },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  loadData() {
    const app = getAppSafe()
    const globalData = app && app.globalData ? app.globalData : {}
    try {
      const messages = chatService.list()
      const cat = catService.getCat()
      this.setData({ messages, cat, progress: catService.getProgress(), catState: cat.stateKey || 'idle', scrollIntoView: messages.length ? `msg-${messages[messages.length - 1].messageId}` : 'chat-bottom', initializationError: globalData.initializationError || '', initializationStage: globalData.initializationStage || '', initializationRetryable: Boolean(globalData.initializationRetryable), capabilities: globalData.capabilities || null })
    } catch (error) {
      this.setData({ messages: [], cat: {}, progress: {}, initializationError: globalData.initializationError || '本地数据初始化失败，请重试', initializationStage: globalData.initializationStage || 'unknown', initializationRetryable: true, capabilities: globalData.capabilities || null })
    }
  },
  refreshCatState() {
    if (!task.isActive()) return
    const cat = catService.getCat()
    this.setData({ cat, progress: catService.getProgress(), catState: cat.stateKey || 'idle' })
  },
  retryInitialization() {
    if (this.data.retrying) return
    const app = getAppSafe()
    if (!app || typeof app.retryInitialization !== 'function') return showToast('暂时无法重试，请重新打开小程序')
    this.setData({ retrying: true })
    try {
      const result = app.retryInitialization()
      this.loadData()
      if (result && !result.ok) showToast('初始化仍未完成，请稍后重试')
      else showToast('本地数据已恢复', 'success')
    } catch (error) { console.error('[chat] initialization retry failed', error); showToast('初始化仍未完成，请稍后重试') }
    finally { if (task.isActive()) this.setData({ retrying: false }) }
  },
  onInput(event) { this.setData({ inputValue: event.detail.value }) },
  send() {
    if (this.data.sending) return
    const text = safeText(this.data.inputValue, 500)
    if (!text) return showToast('先写点想和八条说的话吧~')
    this.setData({ sending: true })
    try {
      const result = chatService.sendMessage(text)
      if (!result.ok) return showToast(result.message)
      const careTip = result.careMessage ? '八条把温柔的关怀送到 Ta 的聊天里啦 💌' : ''
      this.setData({ inputValue: '', messages: result.messages, cat: result.cat, progress: catService.getProgress(), catState: result.cat.stateKey || 'happy', careTip, scrollIntoView: `msg-${result.botMessage.messageId}` })
      this.showUpgrade(result.transition)
      task.setTimer(() => { this.refreshCatState(); if (task.isActive()) this.setData({ careTip: '' }) }, 1700)
    } catch (error) {
      console.error('[chat] send failed', error)
      showToast(mapError(error, '发送失败，请稍后重试'))
    } finally { if (task.isActive()) this.setData({ sending: false }) }
  },
  feed() {
    if (this.data.feeding) return
    this.setData({ feeding: true })
    try {
      const result = catService.feed()
      if (!result.ok) return showToast(result.message)
      this.setData({ cat: result.cat, progress: catService.getProgress(), catState: result.cat.stateKey || 'eating' })
      this.showUpgrade(result.transition)
      task.setTimer(() => this.refreshCatState(), 1300)
      showToast(result.message, 'success')
    } catch (error) { console.error('[chat] feed failed', error); showToast(mapError(error, '喂食失败，请重试')) }
    finally { if (task.isActive()) this.setData({ feeding: false }) }
  },
  onPet(event) {
    if (!task.isActive() || this.data.petting) return
    const detail = event && event.detail && typeof event.detail === 'object' ? event.detail : {}
    const source = String(detail.source || (event && event.type) || 'tap')
    const token = String(detail.token || `${source}:${event && event.timeStamp ? event.timeStamp : 'direct'}`)
    const timestamp = Number(event && event.timeStamp) > 0 ? Number(event.timeStamp) : Date.now()
    if (this._lastPetToken === token) return
    if (this._lastPetAt && timestamp - this._lastPetAt >= 0 && timestamp - this._lastPetAt < 320) return
    this._lastPetToken = token
    this._lastPetAt = timestamp
    this.setData({ petting: true })
    try {
      const result = catService.pet()
      if (!result || result.ok === false) return showToast(result && result.message ? result.message : '互动失败，请重试')
      const hearts = [0, 1, 2].map((index) => ({ left: 38 + index * 11, delay: index * 120 }))
      this.setData({ cat: result.cat, progress: catService.getProgress(), catState: result.cat.stateKey || 'happy', hearts })
      task.setTimer(() => { this.refreshCatState(); if (task.isActive()) this.setData({ hearts: [] }) }, 1700)
    } catch (error) { console.error('[chat] pet failed', error); showToast('互动失败，请重试') }
    finally { if (task.isActive()) this.setData({ petting: false }) }
  },
  showUpgrade(transition) {
    if (!transition || !transition.formName) return
    const key = `${transition.from}-${transition.to}-${transition.form}`
    if (this._lastUpgradeKey === key) return
    this._lastUpgradeKey = key
    this.setData({ upgradeTip: `已升级为 ${transition.formName}，继续收集小幸福吧！` })
    showToast(`已升级为 ${transition.formName}`, 'success')
    task.setTimer(() => { if (this._lastUpgradeKey === key) this.setData({ upgradeTip: '' }) }, 2400)
  },
  onShareAppMessage() { return { title: '和八条聊聊今天的心情', path: '/pages/chat/chat' } }
})
