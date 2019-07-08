const gamepad = require('gamepad')
const io = require('socket.io-client')

const makeConfig = require('../config')
const debug = require('../debug')('pongdome:gamepad')
const defaults = require('./config')

exports.run = function gpio (config) {
  config = makeConfig(defaults, config)

  const api = io(config.API_URL)
  const emit = event => () => api.emit(event)

  const buttons = {
    [config.GAMEPAD_P1_GREEN]: {
      name: 'player one green',
      press: emit('increment-player-one')
    },
    [config.GAMEPAD_P1_RED]: {
      name: 'player one red',
      press: emit('decrement-player-one'),
      hold: emit('end-game')
    },
    [config.GAMEPAD_P2_GREEN]: {
      name: 'player two green',
      press: emit('increment-player-two')
    },
    [config.GAMEPAD_P2_RED]: {
      name: 'player two red',
      press: emit('decrement-player-two'),
      hold: emit('end-game')
    }
  }

  gamepad.init()

  setInterval(gamepad.processEvents, 16)

  gamepad.on('down', (id, num) => {
    const button = buttons[num]

    if (!button) {
      return
    }

    button.downAt = Date.now()
  })

  gamepad.on('up', (id, num) => {
    const button = buttons[num]

    if (!button || button.disabled) {
      return
    }

    const now = Date.now()
    const holdTime = now - button.downAt

    // If released 1700 milliseconds after pushed, button was held.
    if (holdTime > 1700) {
      debug(button.name, 'hold')
      button.hold && button.hold()
    } else {
      debug(button.name, 'press')
      button.press()
    }

    // Only accept button pushes every 100 milliseconds.
    buttons[id].disabled = true

    setTimeout(() => {
      buttons[id].disabled = false
    }, 100)
  })
}

if (require.main === module) {
  exports.run()
}
