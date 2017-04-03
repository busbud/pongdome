const cp = require('child_process')
const io = require('socket.io-client')
const config = require('./config')

const socket = io(config.api)

const jour = () => cp.spawn('xset', ['-dpms'])
const nuit = () => cp.spawn('xset', ['dpms', 'force', 'suspend'])

let sleepId

const waitAndNuit = () => {
  clearTimeout(sleepId)

  sleepId = setTimeout(() => {
    socket.emit('state', ({ match }) => {
      if (!match) nuit()
    })
  }, 1000 * 60)
}

socket.on('match', () => {
  jour()
})

socket.on('end', () => {
  waitAndNuit()
})

socket.on('cancel', ({ queue }) => {
  if (queue.length === 0) nuit()
})

socket.on('wakeup', () => {
  jour()
  waitAndNuit()
})

// Sleep screen on boot if no game.
waitAndNuit()
