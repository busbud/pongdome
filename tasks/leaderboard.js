const async = require('async');
const _ = require('lodash');
const Elo = require('elo-js');
const pg = require('pg');

const UserRepository = require('../app/js/users');
const config = require('../app/config');

const elo = new Elo();
const userRepository = new UserRepository(config);

const default_player = {
  user_id: null,
  name: '',
  match_wins: 0,
  match_losses: 0,
  game_wins: 0,
  game_losses: 0,
  points: 0,
  elo: 1000,
  streak: null
};

const players = {};

pg.connect(config.pg, (err, client, dispose) => {
  if (err) return console.error(err);

  async.waterfall([
    function downloadMatches(step) {
      const sql = `
          SELECT *
            FROM history
           WHERE created_at > date_trunc('year', now())
        ORDER BY created_at ASC
      `;

      client.query(sql, [], (err, results) => err ? step(err) : step(null, results.rows));
    },

    function createPlayers(matches, step) {
      const player_ids = _.uniq(_.flatten(matches.map(match => [match.winner_id, match.loser_id])));

      async.each(player_ids, (player_id, next) => {
        if (players[player_id]) return next();

        userRepository.getUser(player_id, (err, player) => {
          if (err) return next(err);

          players[player_id] = Object.assign({}, default_player);
          players[player_id].user_id = player_id;
          players[player_id].name = player.nick;

          next();
        });
      }, err => err ? step(err) : step(null, matches));
    },

    function recreateLeaderboard(matches, step) {
      matches.forEach(match => {
        const winner_id = match.winner_id;
        const loser_id = match.loser_id;

        const winner_current_elo = players[winner_id].elo;
        const loser_current_elo = players[loser_id].elo;

        players[winner_id].elo = elo.ifWins(winner_current_elo, loser_current_elo);
        players[loser_id].elo = elo.ifLoses(loser_current_elo, winner_current_elo);

        players[winner_id].match_wins += 1;
        players[loser_id].match_losses += 1;

        players[winner_id].points += _.sum(match.winner_points);
        players[loser_id].points += _.sum(match.loser_points);

        if (!players[winner_id].streak || players[winner_id].streak < 0) {
          players[winner_id].streak = 1;
        } else {
          players[winner_id].streak += 1;
        }

        if (!players[loser_id].streak || players[loser_id].streak > 0) {
          players[loser_id].streak = -1;
        } else {
          players[loser_id].streak -= 1;
        }

        _.range(match.winner_points.length).forEach(id => {
          if (match.winner_points[id] > match.loser_points[id]) {
            players[winner_id].game_wins += 1;
            players[loser_id].game_losses += 1;
          } else {
            players[loser_id].game_wins += 1;
            players[winner_id].game_losses += 1;
          }
        });
      });

      step();
    },

    function dropLeaderboard(step) {
      client.query('DELETE FROM leaderboard', err => step(err));
    },

    function insertLeaderboard(step) {
      const sql = `
        INSERT INTO leaderboard (user_id, name, match_wins, match_losses, game_wins, game_losses, points, elo, streak, avatar)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `;

      async.each(_.keys(players), (player_id, next) => {
        const p = players[player_id];

        client.query(sql, [
          p.user_id,
          p.name,
          p.match_wins,
          p.match_losses,
          p.game_wins,
          p.game_losses,
          p.points,
          p.elo,
          p.streak,
          ''
        ], next);
      }, step);
    }
  ], err => {
    if (err) console.error(err);
    dispose();
    pg.end();
  });
});
