const uuid = require('node-uuid')

const getMatchId = message =>
  message.thread || uuid.v4()

module.exports = function challenge ({ bot, addRequest, matches, message, flags }) {
  const challenger = message.author
  const mentions = bot.mentions(message)

  if (!mentions.length) return message.send('Could not find who to challenge.')
  if (mentions.length > 1) return message.send('Cannot challenge multiple people.')

  const challengee = mentions[0]
  const id = getMatchId(message)

  if (matches[id]) return message.send('There\'s already a challenge here.')

  addRequest({ id, challenger, challengee, message, unranked: flags.forfun })
}
