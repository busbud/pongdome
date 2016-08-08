const api = require('./api')

const name = document.querySelector('#winner-name')
const finalScore = document.querySelector('#final-score')

const winnerStats = {
  name: document.querySelector('#winner .winner h3'),
  rank: document.querySelector('#winner .winner .rank .value'),
  variation: document.querySelector('#winner .winner .variation'),
  elo: document.querySelector('#winner .winner .elo .value')
}

const loserStats = {
  name: document.querySelector('#winner .loser h3'),
  rank: document.querySelector('#winner .loser .rank .value'),
  variation: document.querySelector('#winner .loser .variation'),
  elo: document.querySelector('#winner .loser .elo .value')
}

exports.render = ({ match, winner, loser, beforeStats }) => {
  name.innerHTML = winner.name

  finalScore.innerHTML = `
    <tr>
      ${match.playerOne.games.map(p => `<td>${p}</td>`).join('')}
    </tr>
    <tr>
      ${match.playerTwo.games.map(p => `<td>${p}</td>`).join('')}
    </tr>
  `

  winnerStats.name.textContent = winner.name
  loserStats.name.textContent = loser.name

  if (!match.unranked) {
    api.emit('player-stats', winner, stats => {
      winnerStats.rank.textContent = stats.rank
      const variation = stats.rank - beforeStats.winner.rank
      winnerStats.variation.textContent = variation ? `(+${variation})` : ''
      winnerStats.elo.textContent = stats.elo - beforeStats.winner.elo
    })

    api.emit('player-stats', loser, stats => {
      loserStats.rank.textContent = stats.rank
      const variation = beforeStats.loser.rank - stats.rank
      loserStats.variation.textContent = variation ? `(${variation})` : '' // Should be negative, thus already include the minus sign.
      loserStats.elo.textContent = beforeStats.loser.elo - stats.elo
    })
  } else {
    winnerStats.rank.textContent = ''
    winnerStats.variation.textContent = ''
    winnerStats.elo.textContent = ''
    loserStats.rank.textContent = ''
    loserStats.variation.textContent = ''
    loserStats.elo.textContent = ''
  }
}
