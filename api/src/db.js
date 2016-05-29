const pg = require('pg-promise')({ noLocking: true })
const config = require('../config')

module.exports = pg(config.db)
module.exports.end = pg.end
