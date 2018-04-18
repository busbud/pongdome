const io = require('socket.io-client')
const config = require('../config')

module.exports = io(config.API_URL, { transports: ['websocket'] })
