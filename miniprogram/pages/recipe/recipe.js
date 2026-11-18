const recipeService = require('../../services/recipeService')
const { showToast } = require('../../utils/util')

Page({
  data: { tabs: [], activeTab: 'locked', recipes: [], unlockedCount: 0, emptyText: '这一栏还没有菜品', emptyActionText: '添加一道菜' },
  onLoad() { this.load('locked') },
  onShow() { this.load(this.data.activeTab || 'locked') },
  load(tab) {
    const all = recipeService.ensureDefaults()
    const tabs = [
      { key: 'locked', label: '未解锁', count: all.filter((item) => !item.isUnlocked && item.category !== 'dessert').length },
      { key: 'unlocked', label: '已解锁', count: all.filter((item) => item.isUnlocked).length },
      { key: 'dessert', label: '甜品区', count: all.filter((item) => item.category === 'dessert').length }
    ]
    const emptyText = tab === 'unlocked' ? '还没有已解锁的菜品' : tab === 'dessert' ? '甜品区还没有菜品' : '还没有待解锁的菜品'
    this.setData({ tabs, activeTab: tab, recipes: recipeService.listByTab(tab), unlockedCount: all.filter((item) => item.isUnlocked).length, emptyText, emptyActionText: '添加一道菜' })
  },
  switchTab(event) { this.load(event.currentTarget.dataset.tab) },
  openDetail(event) {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast('暂时无法打开菜品详情')
    try { wx.navigateTo({ url: `/pages/recipe-detail/recipe-detail?id=${event.detail.recipeId}`, fail: () => showToast('暂时无法打开菜品详情') }) } catch (error) { console.error('[recipe] detail navigation failed', error); showToast('暂时无法打开菜品详情') }
  },
  goAdd() {
    if (typeof wx === 'undefined' || !wx.navigateTo) return showToast('暂时无法打开新增菜品页')
    try { wx.navigateTo({ url: '/pages/recipe-add/recipe-add', fail: () => showToast('暂时无法打开新增菜品页') }) } catch (error) { console.error('[recipe] add navigation failed', error); showToast('暂时无法打开新增菜品页') }
  },
  onPullDownRefresh() { this.load(this.data.activeTab); if (typeof wx !== 'undefined' && wx.stopPullDownRefresh) wx.stopPullDownRefresh() }
})
