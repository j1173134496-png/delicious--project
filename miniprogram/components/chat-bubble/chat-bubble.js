const { formatTime } = require('../../utils/util')
const { getFormMeta } = require('../../models/cat')
Component({
  properties: { message: { type: Object, value: {} } },
  observers: { message: function (message) { this.setData({ time: formatTime(message && message.createdAt) }) } },
  data: { time: '', avatarPath: getFormMeta('baby').avatarPath, avatarFailed: false },
  methods: { onAvatarError() { this.setData({ avatarFailed: true }) } }
})
