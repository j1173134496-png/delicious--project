const catService = require('../services/catService')

class CatStore {
  constructor() { this.data = catService.getCat() }
  refresh() { this.data = catService.getCat(); return this.data }
  feed() { const result = catService.feed(); this.data = result.cat; return result }
  pet() { const result = catService.pet(); this.data = result.cat; return result }
  get() { return this.data }
}
module.exports = new CatStore()
