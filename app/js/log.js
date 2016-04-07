'use strict';

/*
 * Winston decorator for Electron logging.
 *
 * This is needed because Electron logging works with `console.log` and doesn't
 * support `process.stdout` nor `process.stderr`, which the default Winston
 * console logger is using.
 */

var winston = require('winston');
var common = require('winston/lib/winston/common');

exports.console = function(opts) {
  const transport = new winston.transports.Console(opts);

  transport.log = function(level, msg, meta, callback) {
    if (this.silent) return callback(null, true);

    var output = common.log({
      colorize: this.colorize,
      json: this.json,
      level: level,
      message: msg,
      meta: meta,
      stringify: this.stringify,
      timestamp: this.timestamp,
      showLevel: this.showLevel,
      prettyPrint: this.prettyPrint,
      raw: this.raw,
      label: this.label,
      logstash: this.logstash,
      depth: this.depth,
      formatter: this.formatter,
      align: this.align,
      humanReadableUnhandledException: this.humanReadableUnhandledException
    });

    if (this.stderrLevels[level]) {
      console.error(output);
    } else {
      console.log(output);
    }

    this.emit('logged');
    callback(null, true);
  };

  return transport;
};
