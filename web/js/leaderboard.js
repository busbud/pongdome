const api = require('./api')

const scores = document.querySelector('#scores')

const biggestWinningStreak = {
  name: document.querySelector('#winning-streak .name'),
  value: document.querySelector('#winning-streak .value')
}

const mostConsecutiveLosses = {
  name: document.querySelector('#consecutive-losses .name'),
  value: document.querySelector('#consecutive-losses .value')
}

const biggestCrush = {
  winner: {
    name: document.querySelector('#biggest-crush .player1wins .name'),
    value: document.querySelector('#biggest-crush .player1wins .value')
  },
  loser: {
    name: document.querySelector('#biggest-crush .player2wins .name'),
    value: document.querySelector('#biggest-crush .player2wins .value')
  }
}

const el = (node, text) =>
  Object.assign(document.createElement(node), { textContent: text })

exports.render = () => {
  api.emit('leaderboard', leaderboard => {
    scores.textContent = ''

    leaderboard
      .forEach((line, i) => {
        const tr = document.createElement('tr')

        tr.appendChild(el('td', i + 1))
        tr.appendChild(el('td', line.name))
        tr.appendChild(el('td', line.elo))
        tr.appendChild(el('td', line.wins))
        tr.appendChild(el('td', line.losses))
        tr.appendChild(el('td', line.ratio))

        scores.appendChild(tr)
      })
  })

  api.emit('biggest-winning-streak', data => {
    biggestWinningStreak.name.textContent = data.name
    biggestWinningStreak.value.textContent = data.streak
  })

  api.emit('most-consecutive-losses', data => {
    mostConsecutiveLosses.name.textContent = data.name
    mostConsecutiveLosses.value.textContent = data.streak * -1 // Assumes `data.streak` is negative.
  })

  api.emit('biggest-crush', data => {
    if (data) {
      biggestCrush.winner.name.textContent = data.winner_name
      biggestCrush.winner.value.textContent = data.winner_points
      biggestCrush.loser.name.textContent = data.loser_name
      biggestCrush.loser.value.textContent = data.loser_points
    }
  })
}
