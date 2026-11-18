const storageService = require('./services/storageService')
const userService = require('./services/userService')
const catService = require('./services/catService')
const recipeService = require('./services/recipeService')
const chatService = require('./services/chatService')
const albumService = require('./services/albumService')
const { getCapabilities } = require('./utils/runtimeCapabilities')
const { APP_VERSION, LOCAL_MODE_NAME } = require('./utils/appMeta')

App({
  globalData: {
    initialized: false,
    version: APP_VERSION,
    localGuestMode: true,
    localModeName: LOCAL_MODE_NAME,
    capabilities: null,
    initializationError: '',
    initializationErrorCode: '',
    initializationStage: 'idle',
    initializationRetryable: false,
    initializationDiagnostics: [],
    initializing: false,
    activeUser: null,
    cat: null
  },
  onLaunch() {
    this.globalData.capabilities = getCapabilities()
    this.retryInitialization()
  },
  retryInitialization() {
    if (this.globalData.initializing) return { ok: false, code: 'initialization_in_progress', message: '正在初始化，请稍候' }
    this.globalData.initializing = true
    this.globalData.initializationError = ''
    this.globalData.initializationErrorCode = ''
    this.globalData.initializationRetryable = false
    this.globalData.initializationStage = 'storage'
    this.globalData.initializationDiagnostics = []
    try {
      const storageResult = storageService.initialize()
      if (storageResult && storageResult.ok === false) throw Object.assign(new Error('storage initialization failed'), { code: 'storage_initialize_failed' })
      this.globalData.initializationDiagnostics.push({ stage: 'storage', ok: true })
      this.globalData.initializationStage = 'user'
      this.globalData.activeUser = userService.getCurrentUser()
      this.globalData.initializationDiagnostics.push({ stage: 'user', ok: true })
      this.globalData.initializationStage = 'cat'
      this.globalData.cat = catService.getCat()
      this.globalData.initializationDiagnostics.push({ stage: 'cat', ok: true })
      this.globalData.initializationStage = 'recipes'
      recipeService.ensureDefaults()
      this.globalData.initializationDiagnostics.push({ stage: 'recipes', ok: true })
      this.globalData.initializationStage = 'chat'
      chatService.ensureWelcomeMessage()
      this.globalData.initializationDiagnostics.push({ stage: 'chat', ok: true })
      this.globalData.initializationStage = 'album'
      albumService.ensureCollection()
      this.globalData.initializationDiagnostics.push({ stage: 'album', ok: true })
      this.globalData.initialized = true
      this.globalData.initializationStage = 'ready'
      this.globalData.initializationRetryable = false
      return { ok: true, stage: 'ready' }
    } catch (error) {
      console.error('[app] initialization failed', error)
      this.globalData.initialized = false
      const stage = this.globalData.initializationStage || 'unknown'
      const code = error && (error.code || error.name) ? String(error.code || error.name) : 'initialization_failed'
      this.globalData.initializationErrorCode = code
      this.globalData.initializationError = `本地数据初始化失败（${stage}），请重试`
      this.globalData.initializationRetryable = true
      this.globalData.initializationDiagnostics.push({ stage, ok: false, code })
      return { ok: false, stage, code, message: this.globalData.initializationError }
    } finally {
      this.globalData.initializing = false
    }
  },
  refreshGlobalData() {
    this.globalData.activeUser = userService.getCurrentUser()
    this.globalData.cat = catService.getCat()
    return this.globalData
  }
})
