const debug = require('./debug')('pongdome:main')
const api = require('./api')
const chat = require('./chat')
const gamepad = require('./gamepad')
// const gpio = process.platform === 'linux' ? require('./gpio') : { run () {} }
const screen = require('./screen')

process.on('uncaughtException', err => {
  debug(err)
  process.exit(1)
})

api.run()
chat.run()
gamepad.run()
// gpio.run()
screen.run()
