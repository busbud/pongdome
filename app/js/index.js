'use strict';

const Gpio = process.platform !== 'darwin' && require('onoff').Gpio;
const moment = require('moment');
const _ = require('lodash');
const async = require('async');
const winston = require('winston');
const path = require('path');

const Chat = require('./js/chat');
const MatchHistory = require('./js/history');
const UserRepository = require('./js/users');
const log = require('./js/log');

const config = require('./config.json');

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

window.logger = new winston.Logger({
  transports: [
    log.console({
      level: 'debug',
      handleExceptions: true,
      json: true
    }),
    new winston.transports.File({
      filename: path.join(process.cwd(), '..', 'pongdome.log'),
      handleExceptions: true,
      prettyPrint: true,
      level: (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
      options: {
        flags: 'a'
      }
    })
  ]
});

// Cheat code to prevent Electron from closing if an uncaught exception comes up.
window.logger.exitOnError = function() {
  return false;
};

const matchHistory = new MatchHistory(config);
const userRepository = new UserRepository(config);
const chat = new Chat(config, matchHistory, userRepository);

function updateLeaderboard() {
  const scoreTemplate = _.template(`
    <tr>
      <td>{{position}}</td>
      <th>{{name}}</th>
      <td>{{elo}}</td>
      <td>{{wins}}</td>
      <td>{{losses}}</td>
      <td>{{ratio}}</td>
    </tr>
  `);

  matchHistory.getMatchHistory(function(err, results) {
    if (err) return window.logger.error(err);

    results = results.slice(0, 13);

    // Calculate position.
    // If there is a position with a tie, show them both with the same position.
    const scores = _.map(results, (player, idx) => {
      const params = {
        elo: player.elo,
        ratio: player.ratio,
        wins: player.wins
      };

      if (player.streak > 0) player.streak = 'W' + player.streak;
      if (player.streak < 0) player.streak = 'L' + (player.streak * -1);

      const position_search = _.findIndex(results, params);
      player.position = (position_search && position_search !== idx) ? results[position_search].position : idx + 1;
      return scoreTemplate(player);
    });

    document.getElementById('scores').innerHTML = scores.join('');
  });

  updateMatchUpsToday();

  matchHistory.biggestWinningStreak(function(err, res) {
    if (err) return window.logger.error(err);

    document.querySelector('#winning-streak .name').textContent = res.name;
    document.querySelector('#winning-streak .value').textContent = res.streak;
  });

  matchHistory.mostConsecutiveLoses(function(err, res) {
    if (err) return window.logger.error(err);

    document.querySelector('#consecutive-losses .name').textContent = res.name;
    document.querySelector('#consecutive-losses .value').textContent = res.streak;
  });

  matchHistory.biggestCrush(function(err, res) {
    if (err) return window.logger.error(err);

    document.querySelector('#biggest-crush .player1wins .name').textContent = res.winner_name;
    document.querySelector('#biggest-crush .player1wins .value').textContent = res.winner_points;
    document.querySelector('#biggest-crush .player2wins .name').textContent = res.loser_name;
    document.querySelector('#biggest-crush .player2wins .value').textContent = res.loser_points;
  });
}

updateLeaderboard();

function playerSchema(number) {
  return {
    number,
    name: '',
    id: '',
    elo: 0,
    points: [],
    current: 0,
    games() {
      const scores = _.zip(this.points, this.other.points);
      return _.filter(scores, a => a[0] > a[1]).length;
    }
  };
}

function updateMatchUpsToday() {
  matchHistory.matchUpsToday(function(err, res) {
    if (err) return window.logger.error(err);
    document.querySelector('#leaderboard .match-ups-today .value').textContent = res;
    document.querySelector('#scoreboard .match-ups-today .value').textContent = res;
  });
}

let cancelled_games = [];
let thread_id;
let player_one;
let player_two;
let first_serving;
let game_in_progress = false;

function getGameName(player, current_game) {
  return 'player' + player + 'game' + current_game;
}

function updateScoreDisplay() {
  _.each(_.range(1, player_one.points.length + 1), i => {
    document.getElementById(getGameName(1, i)).innerHTML = player_one.points[i - 1];
    document.getElementById(getGameName(2, i)).innerHTML = player_two.points[i - 1];
  });
  _.each(_.range(player_one.points.length + 1, 4), i => {
    document.getElementById(getGameName(1, i)).innerHTML = '';
    document.getElementById(getGameName(2, i)).innerHTML = '';
  });

  const total = player_one.current + player_two.current;
  let current_serving;

  if (first_serving) {
    // alternate every 2 point until 20 points (10-10), then every point. reverse the result for the second game.
    current_serving = ((total < 20 ? total / 2 : total) % 2) ^ (player_one.points.length % 2) === 0 ? first_serving : first_serving.other;
    document.getElementById('message_overlay').style.display = 'none';
  } else {
    document.getElementById('message_overlay').style.display = 'flex';
  }
  _.each([player_one, player_two], player => {
    document.getElementById(getGameName(player.number, player_one.points.length + 1)).innerHTML = player.current;
    document.getElementById('player' + player.number + 'name').innerHTML = player.name;
    document.getElementById('player' + player.number).classList[player === current_serving ? 'add' : 'remove']('serving');
  });
}

function newGame(match_data) {
  game_in_progress = true;
  player_one = playerSchema(1);
  player_two = playerSchema(2);
  player_one.other = player_two;
  player_two.other = player_one;
  player_one.name = match_data.player_one.name;
  player_two.name = match_data.player_two.name;
  player_one.id = match_data.player_one.id;
  player_two.id = match_data.player_two.id;
  thread_id = match_data.thread_id;
  first_serving = null;

  userRepository.saveUser(match_data.player_one);
  userRepository.saveUser(match_data.player_two);

  document.getElementById('leaderboard').style.display = 'none';
  document.getElementById('scoreboard').style.display = 'flex';
  document.getElementById('message_overlay_content').innerHTML = 'Starting player press green button';

  updateMatchUpsToday();

  matchHistory.playerStats(player_one.name, function(err, res) {
    if (err) return window.logger.error(err);
    document.querySelector('#player1 .rank .value').textContent = res.row_number;
    document.querySelector('#player1 .ratio').textContent = `${res.match_wins} - ${res.match_losses}`;
  });

  matchHistory.playerStats(player_two.name, function(err, res) {
    if (err) return window.logger.error(err);
    document.querySelector('#player2 .rank .value').textContent = res.row_number;
    document.querySelector('#player2 .ratio').textContent = `${res.match_wins} - ${res.match_losses}`;
  });

  matchHistory.headToHead(player_one.name, player_two.name, function(err, res) {
    if (err) return window.logger.error(err);
    document.querySelector('#head-to-head .player1wins .name').textContent = player_one.name;
    document.querySelector('#head-to-head .player1wins .value').textContent = res.p1;
    document.querySelector('#head-to-head .player2wins .name').textContent = player_two.name;
    document.querySelector('#head-to-head .player2wins .value').textContent = res.p2;
  });

  matchHistory.lastGame(player_one.name, player_two.name, function(err, res) {
    if (err) return window.logger.error(err);
    const p1won = res.winner_id === player_one.id;
    const p1pts = p1won ? res.winner_points : res.loser_points;
    const p2pts = p1won ? res.loser_points : res.winner_points;

    document.querySelector('#last-game .content').innerHTML = `
      <table>
        <tbody>
          <tr>
            <th>${player_one.name}</th>
            ${p1pts.map(p => `<td>${p}</td>`)}
          </tr>
          <tr>
            <th>${player_two.name}</th>
            ${p2pts.map(p => `<td>${p}</td>`)}
          </tr>
        </tbody>
      </table>
    `;
  });

  updateScoreDisplay();
}

function resetBoard() {
  updateLeaderboard();
  document.getElementById('leaderboard').style.display = 'flex';
  document.getElementById('scoreboard').style.display = 'none';
  document.getElementById('message_overlay').style.display = 'none';
  document.getElementById('winner').style.display = 'none';
}

function saveGame(winner, loser) {
  document.getElementById('winner_name').textContent = winner.name;
  document.getElementById('scoreboard').style.display = 'none';
  document.getElementById('winner').style.display = 'flex';

  document.getElementById('final-score').innerHTML = `
    <tr>
      ${player_one.points.map(p => `<td>${p}</td>`)}
    </tr>
    <tr>
      ${player_two.points.map(p => `<td>${p}</td>`)}
    </tr>
  `;

  chat.send('end', {
    thread_id,
    winner: {
      name: winner.name,
      id: winner.id,
      points: winner.points,
      current: winner.current
    },
    loser: {
      name: loser.name,
      id: loser.id,
      points: loser.points,
      current: loser.current
    }
  });

  matchHistory.saveGame(thread_id, winner, loser, function() {
    setTimeout(function() {
      resetBoard();
      thread_id = null;
      queueNext();
    }, 7000);
  });
}

function endGame() {
  player_one.points.push(player_one.current);
  player_two.points.push(player_two.current);

  const game_winner = player_one.current > player_two.current ? player_one : player_two;

  if (game_winner.games() === 2) {
    saveGame(game_winner, game_winner.other);
  }

  player_one.current = 0;
  player_two.current = 0;
}

function onScoreChanged() {
  // Someone won this game. Except the 3rd game, which is manual
  if ((player_one.current >= 11 || player_two.current >= 11) &&
      (Math.abs(player_one.current - player_two.current) >= 2)) {
    const winner = player_one.current > player_two.current ? player_one : player_two;
    if (winner.games() === 0) {
      endGame();
    }
  }
  updateScoreDisplay();
  chat.send('progress', {
    thread_id,
    player_one: {
      name: player_one.name,
      id: player_one.id,
      points: player_one.points,
      current: player_one.current
    },
    player_two: {
      name: player_two.name,
      id: player_two.id,
      points: player_two.points,
      current: player_two.current
    }
  });
}

function _playerObj(player) {
  if (player === 1) {
    return player_one;
  }

  return player_two;
}

function incrementPlayer(player) {
  const player_obj = _playerObj(player);
  if (first_serving === null) {
    first_serving = player_obj;
  } else {
    player_obj.current++;
  }
  onScoreChanged();
}

function decrementPlayer(player) {
  const player_obj = _playerObj(player);
  if (player_one.current === 0 && player_two.current === 0) {
    if (player_one.points.length > 0) {
      // Only the player who won the last game can pop to the previous game at this point
      // otherwise the game will re-end immediatly
      if (player_obj.points[player_obj.points.length - 1] > player_obj.other.points[player_obj.other.points.length - 1]) {
        player_one.current = player_one.points.pop();
        player_two.current = player_two.points.pop();
      }
    } else if (player_obj === first_serving) {
      first_serving = null;
    }
  }
  if (player_obj.current > 0) {
    player_obj.current--;
  }
  onScoreChanged();
}

// Buttons Helper to process incomming commands.
function buttonHelper(err, value, self, next) {
  if (err) return window.logger.error(err);
  if (!thread_id) return;

  // Set moment constiables for when values 0 and 1 come from GPIO
  if (!self.btn_zero) {
    self.btn_zero = moment();
    self.btn_one = moment();
  }

  if (value === 1) self.btn_one = moment();
  if (value === 0) self.btn_zero = moment();

  // If value 0 comes 1700 milliseconds after value 1, button was held.
  const hold_time = self.btn_zero.diff(self.btn_one);
  if (value === 0 && self.last_value === 1 && !self.btnDisabled) {
    self.btnDisabled = true;
    if (hold_time > 1700 && self.button === 'red') {
      endGame();
    } else {
      next(self.player);
    }

    setTimeout(function() {
      self.btnDisabled = false; // Allow button to be used again.
    }, 100); // Only accept button pushes every 100 milliseconds.
  }

  self.last_value = value;
}

// Events for GPIO's on Raspberry Pi.
function buttonListen() {
  const self = {};

  // Player One
  const playerOneRed = new Gpio(config.buttons.player_one.red, 'in', 'both');
  playerOneRed.watch(function(err, value) {
    self.player = 1;
    self.button = 'red';
    buttonHelper(err, value, self, decrementPlayer);
  });

  const playerOneGreen = new Gpio(config.buttons.player_one.green, 'in', 'both');
  playerOneGreen.watch(function(err, value) {
    self.player = 1;
    self.button = 'green';
    buttonHelper(err, value, self, incrementPlayer);
  });

  // Player Two
  const playerTwoRed = new Gpio(config.buttons.player_two.red, 'in', 'both');
  playerTwoRed.watch(function(err, value) {
    self.player = 2;
    self.button = 'red';
    buttonHelper(err, value, self, decrementPlayer);
  });

  const playerTwoGreen = new Gpio(config.buttons.player_two.green, 'in', 'both');
  playerTwoGreen.watch(function(err, value) {
    self.player = 2;
    self.button = 'green';
    buttonHelper(err, value, self, incrementPlayer);
  });
}

const queue = [];

function updateIncomingGame() {
  if (queue.length) {
    document.querySelector('#incoming-game').style.display = '';
    document.querySelector('#incoming-game .player1').textContent = queue[0].player_one.name;
    document.querySelector('#incoming-game .player2').textContent = queue[0].player_two.name;
  } else {
    document.querySelector('#incoming-game').style.display = 'none';
  }
}

function queueNext() {
  if (!queue.length) {
    game_in_progress = false;
    return;
  }

  const data = queue.shift();

  if (_.includes(cancelled_games, data.thread_id)) {
    cancelled_games = _.remove(cancelled_games, id => id !== data.thread_id);
    return;
  }

  chat.send('match', { thread_id: data.thread_id });
  newGame(data);
  updateIncomingGame();
}

function pushQueue(data) {
  queue.push(data);

  if (!game_in_progress) {
    queueNext();
  } else {
    updateIncomingGame();
  }

  return queue.length;
}

chat.on('match', data => {
  let position = pushQueue(data);

  if (position) {
    chat.send('queue', { thread_id: data.thread_id, position });
  }
});

chat.on('cancel', data => {
  if (data.thread_id === thread_id) {
    resetBoard();
    queueNext();
  } else {
    cancelled_games.push(data.thread_id);
  }
});

chat.on('leaderboard', data => {
  matchHistory.getMatchHistory((err, leaderboard) => {
    if (err) return window.logger.error(err);
    chat.send('leaderboard', { thread_id: data.thread_id, leaderboard });
  });
});

if (process.platform !== 'darwin') {
  buttonListen();
}

function setupMidnightListener() {
  const midnight = moment().add(1, 'day').startOf('day')
  const msUntilMidnight = midnight - moment()

  setTimeout(() => {
    updateMatchUpsToday();
    setupMidnightListener();
  }, msUntilMidnight);
}
