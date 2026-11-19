const { getFormAsset } = require('../../models/cat')
const DEFAULT_ASSET = getFormAsset('baby', 'idle')
Component({
  properties: { cat: { type: Object, value: {} }, state: { type: String, value: 'idle' }, reducedMotion: { type: Boolean, value: false } },
  data: { emoji: DEFAULT_ASSET.emoji, imagePath: DEFAULT_ASSET.imagePath, hasImage: DEFAULT_ASSET.hasImage, formName: DEFAULT_ASSET.formName, stateText: DEFAULT_ASSET.stateText, stateClass: DEFAULT_ASSET.animationClass, assetFallback: DEFAULT_ASSET.fallback, fallbackText: DEFAULT_ASSET.fallbackText },
  observers: {
    'cat.currentForm, cat.stateKey, state': function (form, catState, state) {
      const asset = getFormAsset(form, catState || state || 'idle')
      if (this._asset && this._asset.formKey === asset.formKey && this._asset.stateKey === asset.stateKey) return
      this._asset = asset
      this.setData({ emoji: asset.emoji, imagePath: asset.imagePath, hasImage: asset.hasImage, formName: asset.formName, stateText: asset.stateText, stateClass: asset.animationClass, assetFallback: asset.fallback, fallbackText: asset.fallbackText })
    }
  },
  methods: {
    onImageError(event) {
      const src = event && event.currentTarget && event.currentTarget.dataset.src
      if (src && src !== this.data.imagePath) return
      const asset = this._asset || DEFAULT_ASSET
      if (asset.idlePath && this.data.imagePath !== asset.idlePath) {
        this.setData({ imagePath: asset.idlePath, assetFallback: 'idle', fallbackText: '状态图片加载失败，使用 idle 素材' })
      } else {
        this.setData({ hasImage: false, assetFallback: 'emoji', fallbackText: `${asset.formName} 图片加载失败，显示 Emoji 占位` })
      }
    },
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
