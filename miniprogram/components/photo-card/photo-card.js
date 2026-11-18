const { isImagePath } = require('../../utils/mediaUtil')

Component({
  properties: { photo: { type: Object, value: {} } },
  data: { imagePath: '', hasImage: false },
  observers: { photo: function (photo) { const value = String(photo && photo.imagePath || ''); const hasImage = isImagePath(value); this.setData({ imagePath: hasImage ? value : '', hasImage }) } },
  methods: {
    onTap() { this.triggerEvent('select', { photoId: this.data.photo.photoId }) },
    onImageError() { this.setData({ hasImage: false }) },
    onLongPress() { this.triggerEvent('save', { photo: this.data.photo }) }
  }
})
