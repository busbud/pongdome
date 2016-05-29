const Table = require('cli-table2')

function formatLeaderboard (leaderboard) {
  const table = new Table({
    head: ['#', 'name', 'elo', 'wins', 'losses', 'ratio', 'streak'],
    style: { head: [], border: [] }
  })

  leaderboard.forEach((entry, rank) => {
    table.push([rank + 1, entry.name, entry.elo, entry.wins, entry.losses, entry.ratio, entry.streak])
  })

  return '```\n' + table.toString() + '\n```'
}

module.exports = function leaderboard ({ socket, message }) {
  socket.emit('leaderboard', leaderboard => {
    message.send(formatLeaderboard(leaderboard))
  })
}
