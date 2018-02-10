module.exports = function streak ({ bot, api, message }) {
  const players = message.mentions()
  if (players.length < 2) players.unshift(message.author)
  if (players.length < 2) return message.send('Need two users')

  const [playerOne, playerTwo] = players

  api.emit('head-to-head', playerOne, playerTwo, data => {
    message.send(`${playerOne.name} ${data.player_one} - ${data.player_two} ${playerTwo.name}`)
  })
}
