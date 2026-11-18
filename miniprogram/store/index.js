const userStore = require('./userStore')
const catStore = require('./catStore')
const coupleStore = require('./coupleStore')

module.exports = { userStore, catStore, coupleStore, refreshAll() { return { user: userStore.refresh(), cat: catStore.refresh(), couple: coupleStore.refresh() } } }
