const numeral = require('numeral')

function formatQueue ({ match, queue }) {
  if (!match) return 'No game is on!'

  const scoreMessage = `${numeral(match.playerOne.games.length + 1).format('0o')} set, ${match.playerOne.current} to ${match.playerTwo.current}`
  const currentMessage = `* ${match.playerOne.name} vs. ${match.playerTwo.name} (${scoreMessage})`
  const queueMessages = queue.map(match => `* ${match.playerOne.name} vs. ${match.playerTwo.name}`)

  return [currentMessage, ...queueMessages].join('\n')
}

module.exports = function queue ({ api, message }) {
  api.emit('state', state => {
    message.send(formatQueue(state))
  })
}

module.exports.formatQueue = formatQueue
