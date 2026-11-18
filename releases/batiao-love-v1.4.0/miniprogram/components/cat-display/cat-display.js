const { getFormAsset } = require('../../models/cat')
const DEFAULT_ASSET = getFormAsset('baby', 'idle')
Component({
  properties: { cat: { type: Object, value: {} }, state: { type: String, value: 'idle' }, reducedMotion: { type: Boolean, value: false } },
  data: { emoji: DEFAULT_ASSET.emoji, imagePath: DEFAULT_ASSET.imagePath, hasImage: DEFAULT_ASSET.hasImage, formName: DEFAULT_ASSET.formName, stateText: DEFAULT_ASSET.stateText, stateClass: DEFAULT_ASSET.animationClass, assetFallback: DEFAULT_ASSET.fallback, fallbackText: DEFAULT_ASSET.fallbackText },
  observers: { 'cat.currentForm, cat.stateKey, state': function (form, catState, state) { const resolvedState = catState || state || 'idle'; const asset = getFormAsset(form, resolvedState); const failed = Boolean(asset.imagePath && this._failedImagePath === asset.imagePath); this.setData({ emoji: asset.emoji, imagePath: asset.imagePath, hasImage: asset.hasImage && !failed, formName: asset.formName, stateText: asset.stateText, stateClass: asset.animationClass, assetFallback: asset.fallback, fallbackText: failed ? `${asset.formName} 图片加载失败，显示 Emoji 占位` : asset.fallbackText }) } },
  methods: {
    onImageError() { this._failedImagePath = this.data.imagePath || ''; this.setData({ hasImage: false, assetFallback: 'emoji', fallbackText: `${this.data.formName || '猫咪'} 图片加载失败，显示 Emoji 占位` }) },
    onPet(event) {
      const source = event && event.type === 'longpress' ? 'longpress' : 'tap'
      const timestamp = Date.now()
      // WeChat can dispatch a tap after a longpress. Treat that pair as one
      // gesture while allowing a later, intentional interaction through.
      if (source === 'tap' && this._lastPetSource === 'longpress' && timestamp - this._lastPetAt < 700) return
      this._petSequence = (this._petSequence || 0) + 1
      this._lastPetSource = source
      this._lastPetAt = timestamp
      this.triggerEvent('pet', { source, token: `pet-${timestamp}-${this._petSequence}` })
    }
  }
})
