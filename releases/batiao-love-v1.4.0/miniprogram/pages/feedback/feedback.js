const feedbackService = require('../../services/feedbackService')
const { showToast, safeText } = require('../../utils/util')
const { getCapabilities, capabilityMessage } = require('../../utils/runtimeCapabilities')
const { mapError } = require('../../utils/errorMessage')
const { createPageTask } = require('../../utils/pageTask')

const task = createPageTask()

function decorateRecords(records) {
  const options = feedbackService.getCategoryOptions()
  return records.map((record) => Object.assign({}, record, {
    categoryLabel: (options.find((item) => item.key === record.category) || options[options.length - 1]).label,
    timeLabel: record.createdAt ? new Date(record.createdAt).toLocaleString() : ''
  }))
}

Page({
  data: { categories: [], selectedCategory: 'bug', selectedCategoryLabel: '问题反馈', content: '', contentCount: 0, contact: '', records: [], submitting: false, copyingId: '', capabilities: getCapabilities() },
  onShow() { task.activate(); this.setData({ submitting: false, copyingId: '' }); this.load() },
  onHide() { task.cancel() },
  onUnload() { task.cancel() },
  load() {
    const categories = feedbackService.getCategoryOptions().map((item) => Object.assign({}, item, { selected: item.key === this.data.selectedCategory }))
    const selected = categories.find((item) => item.selected)
    this.setData({ categories, selectedCategoryLabel: selected ? selected.label : '', records: decorateRecords(feedbackService.list()), capabilities: getCapabilities() })
  },
  selectCategory(event) {
    const key = event.currentTarget.dataset.key
    if (!key) return
    const categories = this.data.categories.map((item) => Object.assign({}, item, { selected: item.key === key }))
    const selected = categories.find((item) => item.selected)
    this.setData({ selectedCategory: key, selectedCategoryLabel: selected ? selected.label : '', categories })
  },
  onContentInput(event) { const content = String(event.detail.value || ''); this.setData({ content, contentCount: content.length }) },
  onContactInput(event) { this.setData({ contact: event.detail.value }) },
  submit() {
    if (this.data.submitting) return
    this.setData({ submitting: true })
    try {
      const result = feedbackService.submit({ category: this.data.selectedCategory, content: this.data.content, contact: safeText(this.data.contact, 60) })
      if (!result.ok) return showToast(result.message)
      if (!task.isActive()) return
      this.setData({ content: '', contentCount: 0, contact: '', records: decorateRecords(feedbackService.list()) })
      showToast('已记录在本设备，尚未发送到服务器', 'success')
    } catch (error) { console.error('[feedback] submit failed', error); showToast('保存失败，请重试') }
    finally { if (task.isActive()) this.setData({ submitting: false }) }
  },
  copyRecord(event) {
    if (this.data.copyingId) return
    const id = event.currentTarget.dataset.id
    const record = feedbackService.list().find((item) => item.feedbackId === id)
    if (!record) return showToast('反馈记录不存在')
    if (!this.data.capabilities.clipboard || typeof wx === 'undefined' || !wx.setClipboardData) return showToast(capabilityMessage('clipboard', this.data.capabilities))
    this.setData({ copyingId: id })
    try {
      wx.setClipboardData({ data: feedbackService.formatForCopy(record), success: task.guard(() => showToast('已复制，请手动发送给产品方', 'success')), fail: task.guard((error) => showToast(mapError(error, '复制失败，记录仍保存在本设备'))), complete: task.guard(() => this.setData({ copyingId: '' })) })
    } catch (error) { console.error('[feedback] copy failed', error); if (task.isActive()) { this.setData({ copyingId: '' }); showToast(mapError(error, '复制失败，记录仍保存在本设备')) } }
  }
})
