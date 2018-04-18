const debug = require('debug')
const fs = require('fs')
const util = require('util')

debug.enable('pongdome:*,-pongdome:gpio:verbose')

const debugFileStream = process.env.PONGDOME_DEBUG_FILE && fs.createWriteStream(process.env.PONGDOME_DEBUG_FILE, { flags: 'a' })

function logToFile (...args) {
  return debugFileStream.write(util.format.apply(util, arguments) + '\n');
}

function makeFileDebug (name) {
  const fileDebug = debug(name)

  fileDebug.log = logToFile
  fileDebug.useColors = false

  return fileDebug
}

module.exports = function makeDebug (name) {
  const mainDebug = debug(name)
  const fileDebug = debugFileStream && makeFileDebug(name)

  return function debug (...args) {
    mainDebug(...args)
    if (fileDebug) fileDebug(...args)
  }
}
