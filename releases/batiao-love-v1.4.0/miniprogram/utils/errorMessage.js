function errorText(error) {
  if (!error) return ''
  if (typeof error === 'string') return error
  return String(error.errMsg || error.message || error.code || '').toLowerCase()
}

function mapError(error, fallback) {
  const text = errorText(error)
  if (/cancel|cancelled|canceled|取消/.test(text)) return /取消/.test(String(fallback || '')) ? fallback : '已取消操作'
  if (/auth|permission|denied|forbidden|无权限|权限/.test(text)) return '请在设置中允许相关权限后重试'
  if (/quota|storage|space|容量|空间/.test(text)) return '本地空间不足，请先清理旧记录'
  if (/not[_ -]?found|不存在|missing/.test(text)) return '记录不存在，返回后刷新再试'
  if (/duplicate|already|重复|已存在/.test(text)) return '这条记录已经保存过了'
  if (/unsupported|unavailable|不支持|不可用/.test(text)) return '当前环境不支持此能力，可使用文字或占位记录'
  if (/file|unlink|saveimage|savefile|图片|照片/.test(text)) return '图片处理失败，记录仍可重试保存'
  return fallback || '操作失败，请重试'
}

function mapServiceError(service, fallback) {
  const error = service && typeof service.getLastError === 'function' ? service.getLastError() : null
  return mapError(error, fallback)
}

module.exports = { mapError, mapServiceError }
