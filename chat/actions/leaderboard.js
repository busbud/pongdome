const Table = require('cli-table2')

function formatLeaderboard (leaderboard) {
  const table = new Table({
    head: ['#', 'name', 'elo', 'wins', 'losses', 'gp', 'ratio', 'streak'],
    chars: {
      top: '',
      'top-mid': '',
      'top-left': '',
      'top-right': '',
      bottom: '',
      'bottom-mid': '',
      'bottom-left': '',
      'bottom-right': '',
      left: '',
      'left-mid': '',
      mid: '',
      'mid-mid': '',
      right: '',
      'right-mid': '',
      middle: ' '
    },
    style: {
      'padding-left': 0,
      'padding-right': 0,
      // This removes CLI coloring meta characters
      head: [],
      border: []
    },
    colAligns: ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right']
  })

  leaderboard.forEach((entry, rank) => {
    table.push([rank + 1, entry.name, entry.elo, entry.wins, entry.losses, entry.wins + entry.losses, entry.ratio, entry.streak])
  })

  return '```\n' + table.toString() + '\n```'
}

module.exports = function leaderboard ({ api, message, flags }) {
  const method = flags.full ? 'leaderboard-full' : 'leaderboard'

  api.emit(method, leaderboard => {
    message.send(formatLeaderboard(leaderboard))
  })
}
