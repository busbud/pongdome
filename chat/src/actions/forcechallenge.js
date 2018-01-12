module.exports = function forcechallenge ({ bot, socket, saveState, addRequest, message, flags, isAdmin }) {
  if (!isAdmin) return message.send('Nope.')

  const mentions = message.mentions()

  if (!mentions.length) return message.send('Could not find who to challenge.')
  if (mentions.length > 2) return message.send('Too much people.')

  const challenger = mentions.length === 1 ? message.author : mentions.shift()
  const challengee = mentions.shift()

  const { id } = addRequest({ challenger, challengee, message, accepted: true, forced: true, unranked: flags.forfun })

  saveState()

  socket.emit('match', { id, challenger, challengee, unranked: flags.forfun })
}
