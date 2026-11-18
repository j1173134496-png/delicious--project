#!/usr/bin/env node

// Pure contract smoke for the persisted cat state machine. It injects time so
// local night rules and transient action windows remain deterministic.
const assert = require('assert')
const storage = require('../miniprogram/services/storageService')
const catService = require('../miniprogram/services/catService')
const {
  createDefaultCat,
  CAT_STATES,
  STATE_DURATIONS,
  NIGHT_WINDOW,
  SAD_MOOD_THRESHOLD,
  SAD_HUNGER_THRESHOLD,
  resolveCatState
} = require('../miniprogram/models/cat')

let assertions = 0
function check(condition, message) { assertions += 1; assert.ok(condition, message) }
function at(text) { return new Date(text).getTime() }

function main() {
  const day = at('2026-10-13T14:00:00+08:00')
  const night = at('2026-10-13T23:00:00+08:00')
  const morning = at('2026-10-14T06:30:00+08:00')
  const base = createDefaultCat({ mood: 78, hunger: 65 })
  check(Object.keys(CAT_STATES).length === 5 && CAT_STATES.sleeping.label === '睡梦中', 'state metadata contains sleeping')
  check(resolveCatState(base, { now: day }).stateKey === 'idle', 'healthy daytime cat is idle')
  check(resolveCatState(base, { now: night }).stateKey === 'sleeping', 'healthy night cat is sleeping')
  check(resolveCatState(base, { now: morning }).stateKey === 'sleeping', 'healthy early morning cat is sleeping')
  check(resolveCatState(Object.assign({}, base, { mood: SAD_MOOD_THRESHOLD }), { now: day }).stateKey === 'sad', 'sad state uses the mood threshold')
  check(resolveCatState(Object.assign({}, base, { hunger: SAD_HUNGER_THRESHOLD }), { now: day }).stateKey === 'sad', 'sad state uses the hunger threshold')
  check(resolveCatState(Object.assign({}, base, { mood: 'bad', hunger: 'bad' }), { now: day }).stateKey === 'idle', 'NaN mood and hunger safely fall back to idle')
  check(resolveCatState(Object.assign({}, base, { stateKey: 'happy', stateSince: day - 50, stateUntil: day + STATE_DURATIONS.happy }), { now: day, nightWindow: NIGHT_WINDOW }).stateKey === 'happy', 'happy action overrides derived state')
  check(resolveCatState(Object.assign({}, base, { stateKey: 'eating', stateSince: day - 50, stateUntil: day - 1 }), { now: day }).stateKey === 'idle', 'expired action resolves to idle during daytime')
  check(resolveCatState(Object.assign({}, base, { stateKey: 'eating', stateSince: day + 100, stateUntil: day + 1000 }), { now: day }).stateKey === 'idle', 'future action timestamp is ignored safely')
  check(resolveCatState(Object.assign({}, base, { stateKey: 'unknown' }), { now: day }).stateKey === 'idle', 'unknown state normalizes to idle')
  const stateView = resolveCatState(Object.assign({}, base, { stateKey: 'happy', stateSince: day, stateUntil: day + 1000 }), { now: day + 1 })
  stateView.stateKey = 'mutated'
  check(resolveCatState(Object.assign({}, base, { stateKey: 'happy', stateSince: day, stateUntil: day + 1000 }), { now: day + 1 }).stateKey === 'happy', 'state view does not leak mutable metadata')

  storage.clear()
  storage.set(storage.KEYS.CAT, { name: '旧记录', level: 1, mood: 78, hunger: 65, stateKey: 'missing', stateUntil: 'bad' })
  const first = storage.initialize()
  const migrated = storage.get(storage.KEYS.CAT, {})
  const second = storage.initialize()
  const again = storage.get(storage.KEYS.CAT, {})
  check(first.ok && second.ok && migrated.stateKey === 'idle' && migrated.stateUntil === 0, 'legacy cat record migrates to safe state fields')
  check(JSON.stringify(migrated) === JSON.stringify(again), 'cat storage normalization is idempotent')

  storage.clear()
  storage.initialize()
  const fed = catService.feed()
  check(fed.ok && fed.previousState && fed.nextState && fed.nextState.stateKey === 'eating', 'feed exposes an eating state transition')
  const fedStored = catService.getCat({ now: at('2026-10-13T14:00:00+08:00') + STATE_DURATIONS.eating + 1 })
  check(fedStored.stateKey === 'idle', 'expired feed state resolves after reload')
  const petted = catService.pet()
  check(petted.ok && petted.stateTransition && petted.nextState.stateKey === 'happy', 'pet exposes a happy state transition')
  const progress = catService.getProgress()
  check(progress.stateKey && progress.stateText && progress.animationClass, 'progress includes the shared state view model')

  console.log('SMOKE_CAT_STATE=PASS')
  console.log(`CAT_STATE_ASSERTIONS=${assertions}`)
}

try { main() } catch (error) {
  console.error(`SMOKE_CAT_STATE_FAIL ${error.message}`)
  process.exitCode = 1
}
