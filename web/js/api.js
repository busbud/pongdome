const io = require('socket.io-client')
const config = require('../config')

module.exports = io(config.api)
