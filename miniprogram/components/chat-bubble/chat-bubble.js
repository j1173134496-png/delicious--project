const { formatTime } = require('../../utils/util')
Component({
  properties: { message: { type: Object, value: {} } },
  observers: { message: function (message) { this.setData({ time: formatTime(message && message.createdAt) }) } },
  data: { time: '' }
})
