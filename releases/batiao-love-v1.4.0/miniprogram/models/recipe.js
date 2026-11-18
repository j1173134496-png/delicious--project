const { generateId, now, safeText } = require('../utils/util')

const DEFAULT_RECIPES = [
  ['辣椒炒肉', 'hunan'], ['剁椒鱼头', 'hunan'], ['小炒黄牛肉', 'hunan'],
  ['毛氏红烧肉', 'hunan'], ['口味虾', 'hunan'], ['酸辣土豆丝', 'hunan'],
  ['外婆菜', 'hunan'], ['湘西外婆菜炒蛋', 'hunan'], ['农家小炒肉', 'hunan'],
  ['糖油粑粑', 'dessert'], ['冰粉', 'dessert'], ['芒果千层', 'dessert']
]

function createRecipe(input) {
  const source = input || {}
  const timestamp = now()
  const photos = Array.isArray(source.photos) ? Array.from(new Set(source.photos.map((item) => safeText(item, 500)).filter(Boolean))).slice(0, 9) : []
  const category = ['hunan', 'dessert', 'custom'].indexOf(source.category) >= 0 ? source.category : 'custom'
  const rating = Number(source.rating)
  const likes = Array.isArray(source.likes) ? Array.from(new Set(source.likes.map((id) => safeText(id, 80)).filter(Boolean))).slice(0, 200) : []
  return {
    recipeId: safeText(source.recipeId, 100) || generateId('recipe'),
    coupleId: safeText(source.coupleId || 'local-couple', 80),
    name: safeText(source.name || '未命名菜品', 30),
    category,
    photos,
    rating: Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0,
    review: safeText(source.review || '', 300),
    isUnlocked: source.isUnlocked === undefined ? photos.length > 0 : Boolean(source.isUnlocked),
    isDefault: Boolean(source.isDefault),
    unlockedDate: source.unlockedDate || '',
    likes,
    createdBy: safeText(source.createdBy, 80),
    createdAt: Number.isFinite(Number(source.createdAt)) && Number(source.createdAt) > 0 ? Number(source.createdAt) : timestamp,
    updatedAt: Number.isFinite(Number(source.updatedAt)) && Number(source.updatedAt) > 0 ? Number(source.updatedAt) : timestamp
  }
}

function createDefaultRecipes() {
  return DEFAULT_RECIPES.map(([name, category]) => createRecipe({ name, category, isDefault: true, isUnlocked: false }))
}

module.exports = { DEFAULT_RECIPES, createRecipe, createDefaultRecipes }
