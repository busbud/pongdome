'use strict';

const EventEmitter = require('events').EventEmitter;
const util = require('util');
const WebSocket = require('ws');

class Chat {
  constructor(config, matchHistory, userRepository) {
    this._config = config;
    this._ws = new WebSocket('ws://localhost:3030');
    this._ws.on('error', err => window.logger.error(err));
    this._ws.on('message', this._onMessage.bind(this));
  }

  _onMessage(data) {
    data = JSON.parse(data);
    this.emit(data.event, data.data);
  }

  send(event, data) {
    this._ws.send(JSON.stringify({ event, data }));
  }
}

util.inherits(Chat, EventEmitter);

module.exports = Chat;
