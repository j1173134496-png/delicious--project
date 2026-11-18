const userService = require('../services/userService')

class CoupleStore {
  constructor() { this.data = userService.getCouple() }
  refresh() { this.data = userService.getCouple(); return this.data }
  get() { return this.data }
  getTogetherDays() { return userService.getTogetherDays() }
}
module.exports = new CoupleStore()
