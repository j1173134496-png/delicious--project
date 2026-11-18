const userService = require('../services/userService')

class UserStore {
  constructor() { this.data = userService.getCurrentUser() }
  refresh() { this.data = userService.getCurrentUser(); return this.data }
  update(patch) { this.data = userService.updateUser(patch); return this.data }
  get() { return this.data }
}
module.exports = new UserStore()
