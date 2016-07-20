const uuid = require('node-uuid')
const config = require('../../config')

const isAdmin = user =>
  (config.admins || [])
    .map(name => name.toLowerCase())
    .find(name => name === user.name.toLowerCase())

const getMatchId = message =>
  message.thread || uuid.v4()

module.exports = function forcechallenge ({ bot, socket, saveState, addRequest, matches, message }) {
  if (!isAdmin(message.author)) return message.send('Nope.')

  const mentions = bot.mentions(message)

  if (!mentions.length) return message.send('Could not find who to challenge.')
  if (mentions.length > 2) return message.send('Too much people.')

  const challenger = mentions.length === 1 ? message.author : mentions.shift()
  const challengee = mentions.shift()
  const id = getMatchId(message)

  if (matches[id]) return message.send('There\'s already a challenge here.')

  console.log(id, challenger, challengee)

  addRequest({ id, challenger, challengee, message, accepted: true, forced: true })

  saveState()

  socket.emit('match', { id, challenger, challengee })
}
