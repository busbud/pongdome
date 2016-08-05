const c = require('./src/commands')
const db = require('./db')

const available = { p1: null, p2: null }
const timeout = 1000 * 60

function removePlayer (key, user) {
  if (available[key] === user) {
    available[key] = null
  }
}

function timeoutPlayer (key, user) {
  setTimeout(() => removePlayer(key, user), timeout)
}

module.exports = function (socket) {
  socket.on('player-by-email', (email, cb) => {
    return c.playerByEmail(db, email).then(cb)
  })

  socket.on('player-one-in-range', user => {
    available.p1 = user
    timeoutPlayer('p1', user)
  })

  socket.on('player-two-in-range', user => {
    timeoutPlayer('p2', user)
  })

  socket.on('player-one-off-range', user => {
    removePlayer('p1', user)
  })

  socket.on('player-two-off-range', user => {
    removePlayer('p1', user)
  })
}
