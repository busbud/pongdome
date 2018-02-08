const debug = require('debug')('pongdome:screen')
const cp = require('child_process')
const io = require('socket.io-client')

const makeConfig = require('../config')
const defaults = require('./config')

function jour () {
  debug('jour')
  cp.spawn('xset', ['-dpms'])
}

function nuit () {
  debug('nuit')
  cp.spawn('xset', ['dpms', 'force', 'suspend'])
}

exports.run = (config) => {
  config = makeConfig(defaults, config)

  let sleepId

  const api = io(config.API_URL)

  function waitAndNuit () {
    debug('waitAndNuit')
    clearTimeout(sleepId)

    sleepId = setTimeout(() => {
      api.emit('state', ({ match }) => {
        if (!match) nuit()
      })
    }, config.SLEEP_TIMEOUT)
  }

  api.on('match', () => {
    jour()
  })

  api.on('end', () => {
    waitAndNuit()
  })

  api.on('cancel', ({ queue }) => {
    debug('cancel', `queue=${queue.length}`)

    if (queue.length === 0) {
      nuit()
    }
  })

  api.on('wakeup', () => {
    debug('wakeup')
    jour()
    waitAndNuit()
  })

  // Sleep screen on boot if no game.
  waitAndNuit()
}

if (require.main === module) {
  exports.run()
}
