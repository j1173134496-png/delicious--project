// Small page-scoped task registry. It works with Node's timer stubs and with
// WeChat timers, and invalidates callbacks when a page is hidden or unloaded.
function createPageTask() {
  let active = true
  let token = 0
  const timers = new Set()

  function activate() {
    active = true
    token += 1
  }

  function cancel() {
    active = false
    token += 1
    timers.forEach((timer) => { try { clearTimeout(timer) } catch (error) {} })
    timers.clear()
  }

  function setTimer(callback, delay) {
    const expected = token
    let timer
    timer = setTimeout(() => {
      timers.delete(timer)
      if (!active || expected !== token) return
      callback()
    }, delay)
    timers.add(timer)
    return timer
  }

  function guard(callback) {
    const expected = token
    return (...args) => {
      if (!active || expected !== token) return undefined
      return callback(...args)
    }
  }

  function isActive() { return active }
  function currentToken() { return token }

  return { activate, cancel, setTimer, guard, isActive, currentToken }
}

module.exports = { createPageTask }
