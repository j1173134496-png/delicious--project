const { truncate } = require('./util')

const replies = [
  { keys: ['开心', '高兴', '快乐'], text: '喵~ 听起来今天有好事发生！八条也跟着尾巴摇起来啦 💕' },
  { keys: ['累', '疲惫', '加班'], text: '辛苦啦，先喝口水、伸个懒腰，再把剩下的事慢慢做完喵。' },
  { keys: ['吃什么', '美食', '好吃'], text: '八条提议去菜谱图鉴挑一道，吃饱饱才有力气约会呀！' },
  { keys: ['晚安', '睡觉'], text: '晚安喵~ 把烦恼放在枕头外面，明天醒来又是软乎乎的一天。' },
  { keys: ['谢谢', '感谢'], text: '不用谢！被你需要就是八条的超能力喵 ✨' }
]

function reply(content, context) {
  const text = truncate(content, 120)
  const matched = replies.find((item) => item.keys.some((key) => text.indexOf(key) >= 0))
  if (matched) return matched.text
  const count = Array.isArray(context) ? context.length : 0
  const endings = ['喵~', '我在听哦。', '抱抱你一下 💕', '我们一起想办法吧。']
  return `八条收到啦（这是我们的第 ${Math.max(1, Math.ceil(count / 2))} 次聊天），${endings[count % endings.length]}`
}

module.exports = { reply }
