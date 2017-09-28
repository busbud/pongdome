module.exports = function streak ({ bot, socket, message }) {
  const players = bot.mentions(message)
  if (players.length < 2) players.push(message.author)
  if (players.length < 2) return message.send('Need two users')

  socket.emit('head-to-head', playerOne, playerTwo, data => {
    message.send(`${playerOne.name} ${data.player_one} - ${data.player_two} ${playerTwo.name}`)
  })
}
