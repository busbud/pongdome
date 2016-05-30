const api = require('./api')
const leaderboard = require('./leaderboard')
const scoreboard = require('./scoreboard')
const winner = require('./winner')

leaderboard.render()

function showLeaderboard () {
  leaderboard.render()
  document.querySelector('#leaderboard').style.display = 'flex'
}

let winnerScreen = false
let nextMatch = null

function onMatch (state) {
  document.querySelector('#leaderboard').style.display = 'none'
  document.querySelector('#scoreboard').style.display = 'flex'

  scoreboard.reset()
  scoreboard.render(state.match)
  scoreboard.incoming(state.queue[0])
}

api.on('match', state => {
  if (winnerScreen) {
    nextMatch = state
  } else {
    onMatch(state)
  }
})

api.on('queue', data => {
  if (data.position === 1) {
    scoreboard.incoming(data.match)
  }
})

api.on('progress', match => {
  scoreboard.progress(match)
})

api.on('end', data => {
  document.querySelector('#scoreboard').style.display = 'none'
  document.querySelector('#winner').style.display = 'flex'

  winner.render(data)
  winnerScreen = true

  setTimeout(() => {
    document.querySelector('#winner').style.display = 'none'
    winnerScreen = false

    if (nextMatch) {
      onMatch(nextMatch)
      nextMatch = null
    } else {
      showLeaderboard()
    }
  }, 7000)
})

api.on('cancel', data => {
  if (!data.queue.length) {
    document.querySelector('#scoreboard').style.display = 'none'
    document.querySelector('#overlay').style.display = 'none'
    showLeaderboard()
  }
})

api.emit('state', state => {
  if (state.match) {
    onMatch(state)
  }
})

window.api = api
