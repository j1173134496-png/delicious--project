const userService = require('../../services/userService')
const { showToast, confirm } = require('../../utils/util')
const { getCapabilities, capabilityMessage } = require('../../utils/runtimeCapabilities')
const { mapError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()

Page({
  data: { inviteCode: '', inputCode: '', inviteHint: '', copyHint: '', couple: {}, isBound: false, togetherDays: 0, binding: false, copying: false, unbinding: false, capabilities: getCapabilities() },
  onLoad(options) {
    const raw = options && (options.code || options.inviteCode)
    if (!raw) return
    const code = String(raw).trim().toUpperCase()
    if (userService.validateInviteCode(code)) this.setData({ inputCode: code, inviteHint: '已填入 Ta 分享的邀请码，请确认后绑定' })
    else { this.setData({ inputCode: '', inviteHint: '链接中的邀请码无效，请手动输入 6 位邀请码' }); showToast('邀请码格式不正确') }
  },
  onShow() { task.activate(); this.setData({ binding: false, copying: false, unbinding: false }); this.load() },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  load() { const couple = userService.getCouple(); this.setData({ inviteCode: userService.getInviteCode(), couple, isBound: Boolean(couple.partner), togetherDays: userService.getTogetherDays(), capabilities: getCapabilities() }) },
  generateCode() { if (this.data.binding || this.data.unbinding) return; try { const code = userService.generateInviteCode(); const writeError = userService.getLastError && userService.getLastError(); if (writeError) return showToast(mapError(writeError, '邀请码生成失败，请重试')); this.setData({ inviteCode: code }); showToast('新邀请码已生成', 'success') } catch (error) { console.error('[bind] generate code failed', error); showToast('邀请码生成失败，请重试') } },
  copyCode() {
    if (this.data.copying || !this.data.inviteCode) return
    if (!this.data.capabilities.clipboard || typeof wx === 'undefined' || !wx.setClipboardData) {
      this.setData({ copyHint: '当前环境不能使用剪贴板，请手动记录邀请码' })
      return showToast(capabilityMessage('clipboard', this.data.capabilities))
    }
    this.setData({ copying: true })
    try { wx.setClipboardData({ data: this.data.inviteCode, success: task.guard(() => { this.setData({ copyHint: '邀请码已复制；也可以手动抄写备用' }); showToast('邀请码已复制', 'success') }), fail: task.guard((error) => { this.setData({ copyHint: '复制失败，请手动记录邀请码' }); showToast(mapError(error, '复制失败，请手动记录邀请码')) }), complete: task.guard(() => this.setData({ copying: false })) }) } catch (error) { console.error('[bind] copy failed', error); if (task.isActive()) { this.setData({ copying: false, copyHint: '复制失败，请手动记录邀请码' }); showToast(mapError(error, '复制失败，请手动记录邀请码')) } }
  },
  onInput(event) { this.setData({ inputCode: String(event.detail.value || '').toUpperCase() }) },
  bind() {
    if (this.data.binding || this.data.unbinding) return
    this.setData({ binding: true })
    try { const result = userService.bindPartner(this.data.inputCode); if (!result.ok) { this.setData({ inviteHint: result.message || '邀请码无效，请检查后重试' }); return showToast(result.message || '邀请码无效，请检查后重试') } this.setData({ inputCode: '', inviteHint: '' }); this.load(); showToast('绑定成功，去和 Ta 记录日常吧', 'success') } catch (error) { console.error('[bind] bind failed', error); this.setData({ inviteHint: '绑定失败，请检查邀请码后重试' }); showToast(mapError(error, '绑定失败，请重试')) }
    finally { if (task.isActive()) this.setData({ binding: false }) }
  },
  async unbind() {
    if (this.data.unbinding || this.data.binding) return
    const yes = await confirm({ title: '解除绑定', content: '解除后会隐藏伴侣信息，确定继续吗？' })
    if (!yes) return
    if (!task.isActive()) return
    this.setData({ unbinding: true })
    try { const result = userService.unbindPartner(); if (!result || !result.ok) return showToast(result && result.message ? result.message : '解除绑定失败，请重试'); this.load(); showToast('已解除绑定') } catch (error) { console.error('[bind] unbind failed', error); showToast(mapError(error, '解除绑定失败，请重试')) }
    finally { if (task.isActive()) this.setData({ unbinding: false }) }
  },
  onShareAppMessage() {
    let code = ''
    try { code = userService.getInviteCode() } catch (error) { console.error('[bind] share code failed', error) }
    return { title: '邀请 Ta 加入八条与你（当前设备模拟）', path: `/pages/bind/bind?code=${encodeURIComponent(code)}` }
  }
})
