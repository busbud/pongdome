function formatScore (match) {
  return match.winner_points
    .map((points, i) => `${points}-${match.loser_points[i]}`)
    .join(', ')
}

function formatStreak (playerOne, playerTwo, streak) {
  const winning = streak[0].winner_id === String(playerOne.id)

  const list = streak
    .map(match => `* ${winning ? match.loser_name : match.winner_name} (${formatScore(match)})`)
    .join('\n')

  const against = playerTwo ? ` against ${playerTwo.name}` : ''

  return `${playerOne.name} is on a ${winning ? 'winning' : 'losing'} streak of ${streak.length}${against}:

${list}`
}

module.exports = function streak ({ bot, socket, message }) {
  const players = bot.mentions(message)
  if (!players.length) players.push(message.author)
  const playerOne = players[0]
  const playerTwo = players[1]

  const onStreak = streak =>
    message.send(formatStreak(playerOne, playerTwo, streak))

  if (playerTwo) socket.emit('streak-between', playerOne, playerTwo, onStreak)
  else socket.emit('streak', playerOne, onStreak)
}
