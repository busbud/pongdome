const moment = require('moment')
const api = require('./api')

const root = document.querySelector('#scoreboard')

const playerOne = {
  root: document.querySelector('#player1'),
  name: document.querySelector('#player1name'),
  rank: document.querySelector('#player1 .rank .value'),
  ratio: document.querySelector('#player1 .ratio'),
  games: [
    document.querySelector('#player1game1'),
    document.querySelector('#player1game2'),
    document.querySelector('#player1game3')
  ]
}

const playerTwo = {
  root: document.querySelector('#player2'),
  name: document.querySelector('#player2name'),
  rank: document.querySelector('#player2 .rank .value'),
  ratio: document.querySelector('#player2 .ratio'),
  games: [
    document.querySelector('#player2game1'),
    document.querySelector('#player2game2'),
    document.querySelector('#player2game3')
  ]
}

const incomingGame = {
  root: document.querySelector('#incoming-game'),
  playerOne: document.querySelector('#incoming-game .player1'),
  playerTwo: document.querySelector('#incoming-game .player2')
}

const matchUpsToday = root.querySelector('.match-ups-today .value')

const headToHead = {
  playerOne: {
    name: document.querySelector('#head-to-head .player1wins .name'),
    value: document.querySelector('#head-to-head .player1wins .value')
  },
  playerTwo: {
    name: document.querySelector('#head-to-head .player2wins .name'),
    value: document.querySelector('#head-to-head .player2wins .value')
  }
}

const lastGame = document.querySelector('#last-game tbody')

function renderPlayer (html, player, match) {
  html.name.textContent = player.name

  player.games.forEach((score, i) => {
    html.games[i].textContent = score
  })

  html.games[player.games.length].textContent = player.current
  html.root.classList[player.serving ? 'add' : 'remove']('serving')
}

exports.reset = () => {
  playerOne.games.forEach(el => { el.textContent = '' })
  playerTwo.games.forEach(el => { el.textContent = '' })

  headToHead.playerOne.name.textContent = ''
  headToHead.playerOne.value.textContent = ''
  headToHead.playerTwo.name.textContent = ''
  headToHead.playerTwo.value.textContent = ''

  playerOne.rank.textContent = ''
  playerOne.ratio.textContent = ''
  playerTwo.rank.textContent = ''
  playerTwo.ratio.textContent = ''

  lastGame.textContent = ''
}

exports.render = match => {
  exports.progress(match)

  api.emit('match-ups-today', matches => {
    matchUpsToday.textContent = matches
  })

  api.emit('head-to-head', match.playerOne, match.playerTwo, data => {
    headToHead.playerOne.name.textContent = match.playerOne.name
    headToHead.playerOne.value.textContent = data.player_one
    headToHead.playerTwo.name.textContent = match.playerTwo.name
    headToHead.playerTwo.value.textContent = data.player_two
  })

  api.emit('player-stats', match.playerOne, stats => {
    if (stats) {
      playerOne.rank.textContent = stats.rank
      playerOne.ratio.textContent = `${stats.wins} - ${stats.losses}`
    }
  })

  api.emit('player-stats', match.playerTwo, stats => {
    if (stats) {
      playerTwo.rank.textContent = stats.rank
      playerTwo.ratio.textContent = `${stats.wins} - ${stats.losses}`
    }
  })

  api.emit('last-match', match.playerOne, match.playerTwo, match => {
    if (!match) {
      return
    }

    lastGame.innerHTML = `
      <tr>
        <th>${match.winner_name}</th>
        ${match.winner_points.map(p => `<td>${p}</td>`).join('')}
      </tr>
      <tr>
        <th>${match.loser_name}</th>
        ${match.loser_points.map(p => `<td>${p}</td>`).join('')}
      </tr>
    `
  })
}

exports.progress = match => {
  if (match.firstServing === true) match.firstServing = match.playerOne
  else if (match.firstServing === false) match.firstServing = match.playerTwo

  if (!match.firstServing) {
    document.querySelector('#overlay').style.display = 'flex'
    document.querySelector('#overlay-content').textContent = 'Starting player press green button'
  } else {
    document.querySelector('#overlay').style.display = 'none'
  }

  renderPlayer(playerOne, match.playerOne, match)
  renderPlayer(playerTwo, match.playerTwo, match)
}

exports.incoming = match => {
  if (!match) {
    incomingGame.root.style.display = 'none'
    return
  }

  incomingGame.root.style.display = 'block'
  incomingGame.playerOne.textContent = match.playerOne.name
  incomingGame.playerTwo.textContent = match.playerTwo.name
}

function setupMidnightListener () {
  const midnight = moment().add(1, 'day').startOf('day')
  const msUntilMidnight = midnight - moment()

  setTimeout(() => {
    matchUpsToday.textContent = '0'
    setupMidnightListener()
  }, msUntilMidnight)
}

setupMidnightListener()
