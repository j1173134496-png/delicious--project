// User-visible application metadata lives in one module so pages and the App
// object cannot drift to different version or local-mode claims.
const APP_VERSION = '1.4.0'
const LOCAL_MODE_NAME = '本机游客模式'
const LOCAL_MODE_COPY = '当前设备本地保存，分享只预填邀请码，不能跨设备同步。'
const UNAVAILABLE_CAPABILITIES_COPY = '真实 LLM、云同步、远程反馈和主动推送未接入。'

module.exports = {
  APP_VERSION,
  LOCAL_MODE_NAME,
  LOCAL_MODE_COPY,
  UNAVAILABLE_CAPABILITIES_COPY
}
