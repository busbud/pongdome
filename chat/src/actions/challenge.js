module.exports = function challenge ({ bot, addRequest, message, flags }) {
  const challenger = message.author
  const mentions = bot.mentions(message)

  if (!mentions.length) return message.send('Could not find who to challenge.')
  if (mentions.length > 1) return message.send('Cannot challenge multiple people.')

  const challengee = mentions[0]

  addRequest({ challenger, challengee, message, unranked: flags.forfun })
}
