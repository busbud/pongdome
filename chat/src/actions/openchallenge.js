const uuid = require('node-uuid')

const getMatchId = message =>
  message.thread || uuid.v4()

module.exports = function openchallenge ({ bot, addRequest, matches, message }) {
  const challenger = message.author
  const mentions = bot.mentions(message)

  if (mentions.length) return message.send('It\'s an open challenge man...')

  const id = getMatchId(message)

  if (matches[id]) return message.send('There\'s already a challenge here.')

  addRequest({ id, challenger, challengee: null, message })
}
