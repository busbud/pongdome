const { Gpio } = require('onoff')
const io = require('socket.io-client')
const config = require('./config')

const socket = io(config.api)

const gpioReverse = {
  [config.playerOne.green]: 'player one green',
  [config.playerOne.red]: 'player one red',
  [config.playerTwo.green]: 'player two green',
  [config.playerTwo.red]: 'player two red'
}

function onPush (err, value, self, press, hold) {
  console.log(self.name, value)

  if (err) return console.error(self.name, err.stack || err)

  if (value) self.on = Date.now()
  else self.off = Date.now()

  // Is released after being pushed.
  if (!value && self.last && !self.disabled) {
    self.disabled = true

    const holdTime = self.off - self.on

    // If released 1700 milliseconds after pushed, button was held.
    if (holdTime > 1700) {
      console.log(self.name, 'hold')
      hold && hold()
    } else {
      console.log(self.name, 'press')
      press()
    }

    // Only accept button pushes every 100 milliseconds.
    setTimeout(() => {
      self.disabled = false
    }, 100)
  }

  self.last = value
}

function button (gpio, press, hold) {
  const self = { name: gpioReverse[gpio], on: 0, off: 0, last: 0, disabled: false }

  new Gpio(gpio, 'in', 'both')
    .watch((err, value) => {
      onPush(err, value, self, press, hold)
    })
}

const emit = event => () => socket.emit(event)

button(config.playerOne.green, emit('increment-player-one'))
button(config.playerOne.red, emit('decrement-player-one'), emit('end-game'))
button(config.playerTwo.green, emit('increment-player-two'))
button(config.playerTwo.red, emit('decrement-player-two'), emit('end-game'))
