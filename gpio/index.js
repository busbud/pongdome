const { Gpio } = require('onoff')
const io = require('socket.io-client')

const makeConfig = require('../config')
const debug = require('../debug')('pongdome:gpio')
const defaults = require('./config')

function onPush (err, value, self, press, hold) {
  debug(self.name, value)

  if (err) {
    debug(self.name)
    debug(err)
    return
  }

  if (value) self.on = Date.now()
  else self.off = Date.now()

  // Is released after being pushed.
  if (!value && self.last && !self.disabled) {
    self.disabled = true

    const holdTime = self.off - self.on

    // If released 1700 milliseconds after pushed, button was held.
    if (holdTime > 1700) {
      debug(self.name, 'hold')
      hold && hold()
    } else {
      debug(self.name, 'press')
      press()
    }

    // Only accept button pushes every 100 milliseconds.
    setTimeout(() => {
      self.disabled = false
    }, 100)
  }

  self.last = value
}

exports.run = function gpio (config) {
  config = makeConfig(defaults, config)

  const api = io(config.API_URL)
  const emit = event => () => api.emit(event)

  const gpioReverse = {
    [config.GPIO_P1_GREEN]: 'player one green',
    [config.GPIO_P1_RED]: 'player one red',
    [config.GPIO_P2_GREEN]: 'player two green',
    [config.GPIO_P2_RED]: 'player two red'
  }

  function button (gpio, press, hold) {
    const self = { name: gpioReverse[gpio], on: 0, off: 0, last: 0, disabled: false }

    new Gpio(gpio, 'in', 'both')
      .watch((err, value) => {
        onPush(err, value, self, press, hold)
      })
  }

  button(config.GPIO_P1_GREEN, emit('increment-player-one'))
  button(config.GPIO_P1_RED, emit('decrement-player-one'), emit('end-game'))
  button(config.GPIO_P2_GREEN, emit('increment-player-two'))
  button(config.GPIO_P2_RED, emit('decrement-player-two'), emit('end-game'))
}

if (require.main === module) {
  exports.run()
}
