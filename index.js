const api = require('./api')
const chat = require('./chat')
const gpio = process.platform === 'linux' ? require('./gpio') : { run () {} }
const screen = require('./screen')

api.run()
chat.run()
gpio.run()
screen.run()
