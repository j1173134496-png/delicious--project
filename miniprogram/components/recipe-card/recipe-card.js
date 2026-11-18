const { isImagePath } = require('../../utils/mediaUtil')

Component({
  properties: { recipe: { type: Object, value: {} } },
  observers: { recipe: function (recipe) { const rating = Number(recipe && recipe.rating) || 0; const firstPhoto = recipe && recipe.photos && recipe.photos[0]; const hasImage = isImagePath(firstPhoto); this.setData({ stars: '♥'.repeat(rating) + '♡'.repeat(5 - rating), imagePath: hasImage ? String(firstPhoto) : '', hasImage }) } },
  data: { stars: '♡♡♡♡♡', imagePath: '', hasImage: false },
  methods: {
    onTap() { this.triggerEvent('select', { recipeId: this.data.recipe.recipeId }) },
    onImageError() { this.setData({ hasImage: false }) }
  }
})
