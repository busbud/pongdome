const debug = require('debug')
const { isatty } = require('tty')

module.exports = function makeDebug (name) {
  const stdoutDebug = debug(name)
  const stderrDebug = debug(name)

  stdoutDebug.log = console.log
  stdoutDebug.useColors = isatty(process.stdout.fd)
  stderrDebug.log = console.error
  stderrDebug.useColors = isatty(process.stderr.fd)

  return function debug (...args) {
    stdoutDebug(...args)
    if (process.env.DEBUG_DUPLEX) stderrDebug(...args)
  }
}
