function hasWxGlobal() { return typeof wx !== 'undefined' && wx !== null }

function probe(api, methods) {
  if (!hasWxGlobal()) return { available: false, reason: 'wx_missing' }
  const required = methods ? (Array.isArray(methods) ? methods : [methods]) : []
  if (required.some((method) => typeof wx[method] !== 'function')) return { available: false, reason: 'method_missing' }
  if (typeof wx.canIUse !== 'function') return { available: true, reason: 'available' }
  try { return wx.canIUse(api) ? { available: true, reason: 'available' } : { available: false, reason: 'can_i_use_denied' } } catch (error) { return { available: false, reason: 'can_i_use_error' } }
}

function probeStorage() {
  if (!hasWxGlobal()) return { available: false, reason: 'wx_missing' }
  if (typeof wx.getStorageSync !== 'function' || typeof wx.setStorageSync !== 'function') return { available: false, reason: 'method_missing' }
  return { available: true, reason: 'available' }
}

function probeFileSystem() {
  if (!hasWxGlobal()) return { available: false, reason: 'wx_missing' }
  if (typeof wx.getFileSystemManager !== 'function' || !wx.env || !wx.env.USER_DATA_PATH) return { available: false, reason: 'method_missing' }
  return { available: true, reason: 'available' }
}

function getCapabilities() {
  const present = hasWxGlobal()
  const details = {
    storage: probeStorage(),
    fileSystem: probeFileSystem(),
    chooseImage: probe('chooseImage', 'chooseImage'),
    chooseMedia: probe('chooseMedia', 'chooseMedia'),
    clipboard: probe('setClipboardData', 'setClipboardData'),
    saveImageToPhotosAlbum: probe('saveImageToPhotosAlbum', 'saveImageToPhotosAlbum'),
    navigate: (() => {
      const back = probe('navigateBack', 'navigateBack')
      const to = probe('navigateTo', 'navigateTo')
      if (!back.available) return back
      return to
    })(),
    share: probe('button.open-type.share'),
    shareMenu: probe('showShareMenu', 'showShareMenu'),
    login: { available: false, reason: 'disabled_by_policy' },
    cloud: { available: false, reason: 'disabled_by_policy' },
    remoteSync: { available: false, reason: 'disabled_by_policy' }
  }
  const capabilities = {
    hasWx: present,
    mode: present ? 'wx-guest' : 'node-local',
    localGuestMode: true,
    login: false,
    cloud: false,
    remoteSync: false,
    reasons: Object.keys(details).reduce((result, key) => { result[key] = details[key].reason; return result }, {}),
    details
  }
  Object.keys(details).forEach((key) => { if (key !== 'login' && key !== 'cloud' && key !== 'remoteSync') capabilities[key] = details[key].available })
  return capabilities
}

function capabilityMessage(key, capabilities) {
  const messages = {
    share: '当前环境不支持分享，可复制邀请码给 Ta',
    clipboard: '当前环境不支持复制，请手动记录内容',
    chooseImage: '当前环境不支持选图，可先保存文字记录',
    saveImageToPhotosAlbum: '当前环境不支持保存到相册，请检查权限',
    fileSystem: '本地文件能力不可用，图片将以占位状态保留',
    storage: '本地存储不可用，请稍后重试',
    navigate: '当前页面暂时无法跳转，请使用底部导航'
  }
  const reason = capabilities && capabilities.reasons && capabilities.reasons[key]
  if (reason === 'wx_missing') return `${messages[key] || '当前环境能力不可用，可稍后重试'}（缺少微信环境）`
  if (reason === 'can_i_use_denied') return `${messages[key] || '当前环境能力不可用，可稍后重试'}（当前基础库拒绝）`
  if (reason === 'method_missing') return `${messages[key] || '当前环境能力不可用，可稍后重试'}（接口不可用）`
  return messages[key] || '当前环境能力不可用，可稍后重试'
}

function canUse(api, fallback) {
  if (!hasWxGlobal()) return false
  if (typeof wx.canIUse === 'function') {
    try { return Boolean(wx.canIUse(api)) } catch (error) { return Boolean(fallback) }
  }
  return Boolean(fallback)
}

module.exports = { getCapabilities, capabilityMessage, canUse }
