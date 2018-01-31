function formatScore (match) {
  return match.winner_points
    .map((points, i) => `${points}-${match.loser_points[i]}`)
    .join(', ')
}

function formatDate (date) {
  return new Date(date).toDateString().split(' ').slice(1).join(' ')
}

function formatStreak (playerOne, playerTwo, streak) {
  const against = playerTwo ? ` against ${playerTwo.name}` : ''

  if (!streak.length) return `${playerOne.name} didn't play${against} yet!`

  const winning = streak[0].winner_id === String(playerOne.id)
  const prefix = match => playerTwo ? '' : `**${winning ? match.loser_name : match.winner_name}** `

  const list = streak
    .map(match => `* ${prefix(match)}${formatScore(match)} on *${formatDate(match.created_at)}*`)
    .join('\n')

  return `${playerOne.name} is on a ${winning ? 'winning' : 'losing'} streak of ${streak.length}${against}:

${list}`
}

module.exports = function streak ({ bot, socket, message }) {
  const players = message.mentions()
  if (!players.length) players.push(message.author)
  const playerOne = players[0]
  const playerTwo = players[1]

  const onStreak = streak =>
    message.send(formatStreak(playerOne, playerTwo, streak))

  if (playerTwo) socket.emit('streak-between', playerOne, playerTwo, onStreak)
  else socket.emit('streak', playerOne, onStreak)
}
