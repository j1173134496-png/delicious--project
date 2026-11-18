const RULES = [
  { tag: '委屈', keys: ['委屈', '没人理解', '受气', '忍着'] },
  { tag: '孤独', keys: ['孤单', '孤独', '没人陪', '好寂寞', '一个人'] },
  { tag: '生气', keys: ['生气', '气死', '讨厌', '吵架', '不想理'] },
  { tag: '失望', keys: ['失望', '不在乎', '不爱我', '忽略', '不理我'] },
  { tag: '焦虑', keys: ['焦虑', '担心', '害怕', '睡不着', '紧张'] }
]

function detect(content) {
  const text = String(content || '')
  const match = RULES.find((rule) => rule.keys.some((key) => text.indexOf(key) >= 0))
  return match ? { detected: true, tag: match.tag } : { detected: false, tag: '' }
}

function careMessage(tag) {
  const messages = {
    委屈: '喵~ 你的另一半最近好像有一点委屈，给 Ta 一个拥抱和耐心的倾听吧 💕',
    孤独: '喵~ 你的另一半最近可能有些孤单，主动陪 Ta 聊聊天吧。',
    生气: '喵~ 你的另一半最近情绪有点紧绷，温柔地问问 Ta 需要什么吧。',
    失望: '喵~ 你的另一半最近好像有点失落，给 Ta 多一点回应和陪伴吧。',
    焦虑: '喵~ 你的另一半最近可能有些不安，告诉 Ta 你一直在身边吧。'
  }
  return messages[tag] || '喵~ 你的另一半最近可能需要一点关心，主动陪 Ta 聊聊天吧。'
}

module.exports = { detect, careMessage }
