function formatScore (match) {
  return match.winner_points
    .map((points, i) => `${points}-${match.loser_points[i]}`)
    .join(', ')
}

function formatStreak (player, streak) {
  const winning = streak[0].winner_id === String(player.id)

  const list = streak
    .map(match => `* ${winning ? match.loser_name : match.winner_name} (${formatScore(match)})`)
    .join('\n')

  return `${player.name} is on a ${winning ? 'winning' : 'losing'} streak of ${streak.length}:

${list}`
}

module.exports = function streak ({ bot, socket, message }) {
  const players = bot.mentions(message)
  if (!players.length) players.push(message.author)
  const player = players[0]

  socket.emit('streak', player, streak => {
    message.send(formatStreak(player, streak))
  })
}
