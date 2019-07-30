const wordBoundary = /[ \n\r\t.,'"+!?-]/

function makePlayer (name) {
  return { id: name, name }
}

module.exports = function guest ({ bot, api, saveState, addRequest, message, flags, isAdmin }) {
  const words = message.text.split(wordBoundary)
  const mentions = words.filter(word => !word.startsWith('#'))

  if (!mentions.length) return message.send('Could not find who to challenge.')
  if (mentions.length > 2) return message.send('Too much people.')

  const challenger = mentions.length === 1 ? message.author : makePlayer(mentions.shift())
  const challengee = makePlayer(mentions.shift())

  const { id } = addRequest({ challenger, challengee, message, accepted: true, unranked: true })

  saveState()

  api.emit('match', { id, challenger, challengee, unranked: true })
}
