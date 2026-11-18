const { isImagePath } = require('../../utils/mediaUtil')

Component({
  properties: {
    avatar: { type: null, value: '' },
    fallback: { type: String, value: '🐰' },
    size: { type: String, value: 'default' }
  },
  data: { imagePath: '', hasImage: false, sizeClass: 'avatar--default', fallbackText: '🐰' },
  observers: {
    avatar: function (avatar) {
      const value = String(avatar || '')
      const hasImage = isImagePath(value)
      this.setData({ imagePath: hasImage ? value : '', hasImage, fallbackText: this.data.fallback || '🐰' })
    },
    fallback: function (fallback) { this.setData({ fallbackText: fallback || '🐰' }) },
    size: function (size) { this.setData({ sizeClass: `avatar--${size || 'default'}` }) }
  },
  methods: {
    onImageError() { this.setData({ hasImage: false }) }
  }
})
