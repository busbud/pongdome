const pg = require('pg-promise')
const methods = require('./methods')

function bind (db, to, from) {
  for (const name of Object.keys(from)) {
    to[name] = (...args) => from[name](db, ...args)
  }

  return to
}

module.exports = function makeDatabase (url) {
  const db = pg()(url)

  return bind(db, {
    tx: f => db.tx(t => f(bind(t, {
      batch: (...args) => t.batch(...args)
    }, methods)))
  }, methods)
}
