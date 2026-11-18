const LIMITS = Object.freeze({
  CHAT_MESSAGES: 20,
  CARE_EVENTS: 50,
  FEEDBACK: 50,
  ALBUM_PHOTOS_PER_BATCH: 9,
  RECIPE_PHOTOS_PER_RECIPE: 9,
  ALBUM_TOTAL_PHOTOS: 500,
  RECIPE_TOTAL_RECORDS: 200
})

function limitFor(name, fallback) {
  const value = Number(LIMITS[name])
  return Number.isFinite(value) && value > 0 ? value : fallback
}

module.exports = { LIMITS, limitFor }
