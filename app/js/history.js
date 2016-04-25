'use strict';

const pg = require('pg');
const async = require('async');
const _ = require('lodash');
const Elo = require('elo-js');
const elo = new Elo();

function MatchHistory(config) {
  this.pg_url = config.pg;

  const sql = 'SELECT user_id FROM leaderboard';
  pg.connect(this.pg_url, (err, client, dispose) => {
    if (err) {
      window.logger.error(err);
      dispose();
      return;
    }

    client.query(sql, (err, results) => {
      if (err) {
        window.logger.error(err);
        dispose();
        return;
      }

      this.player_ids = _.map(results.rows, 'user_id');
      dispose();
    });
  });
}

MatchHistory.prototype.saveGame = function(game_id, winner, loser, done) {
  const sql = 'SELECT user_id, elo, streak FROM leaderboard WHERE user_id = $1';

  pg.connect(this.pg_url, (err, client, dispose) => {
    if (err) return window.logger.error(err);

    async.parallel([
      function winner_elo(step) {
        client.query(sql, [winner.id], function(err, results) {
          if (err) return window.logger.error(err);

          // This is done incase there's a new player.
          if (!results.rows) return step();
          winner.elo = results.rows[0] ? results.rows[0].elo : null;
          winner.streak = results.rows[0] ? results.rows[0].streak : null;
          step();
        });
      },
      function loser_elo(step) {
        client.query(sql, [loser.id], function(err, results) {
          if (err) return window.logger.error(err);

          // This is done incase there's a new player.
          if (!results.rows) return step();
          loser.elo = results.rows[0] ? results.rows[0].elo : null;
          loser.streak = results.rows[0] ? results.rows[0].streak : null;
          step();
        });
      }
    ], () => {
      dispose();
      return this._saveGame(game_id, winner, loser, done);
    });
  });
};

MatchHistory.prototype._saveGame = function(game_id, winner, loser, done) {
  const queries = [];

  // Create a new player.
  const newPlayer = params => {
    // Push new player to player_ids array.
    this.player_ids.push(params[0]);

    const query = `
      INSERT INTO leaderboard (user_id, name, match_wins, match_losses, game_wins, game_losses, points, elo, streak, avatar)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;

    return {query: query, params: params};
  };


  const winner_exists = _.includes(this.player_ids, String(winner.id));
  const loser_exists = _.includes(this.player_ids, String(loser.id));

  // If player isn't on the leaderboard yet, then ELO defaults to 1000.
  winner.elo = winner.elo || 1000;
  loser.elo = loser.elo || 1000;

  const new_winner_elo = elo.ifWins(winner.elo, loser.elo);
  const new_loser_elo = elo.ifLoses(loser.elo, winner.elo);

  // Calculate win or losing streak.
  // If losing, streak is a negative.
  if (!winner.streak || winner.streak < 0) {
    winner.streak = 1;
  } else {
    winner.streak += 1;
  }

  if (!loser.streak || loser.streak > 0) {
    loser.streak = -1;
  } else {
    loser.streak -= 1;
  }

  if (winner_exists) {
    const winner_query = `
      UPDATE leaderboard
      SET
        match_wins = match_wins + 1,
        game_wins = game_wins + $1,
        game_losses = game_losses + $2,
        points = points + $3,
        elo = $4,
        streak = $5
      WHERE user_id = $6
    `;

    const winner_params = [winner.games(), loser.games(), _.sum(winner.points), new_winner_elo, winner.streak, winner.id];
    queries.push({query: winner_query, params: winner_params});
  } else {
    queries.push(newPlayer([winner.id, winner.name, 1, 0, winner.games(), loser.games(), _.sum(winner.points), new_winner_elo, winner.streak, winner.avatar]));
  }

  if (loser_exists) {
    const loser_query = `
      UPDATE leaderboard
      SET
        match_losses = match_losses + 1,
        game_wins = game_wins + $1,
        game_losses = game_losses + $2,
        points = points + $3,
        elo = $4,
        streak = $5
      WHERE user_id = $6
    `;

    const loser_params = [loser.games(), winner.games(), _.sum(loser.points), new_loser_elo, loser.streak, loser.id];
    queries.push({query: loser_query, params: loser_params});
  } else {
    queries.push(newPlayer([loser.id, loser.name, 0, 1, loser.games(), winner.games(), _.sum(loser.points), new_loser_elo, loser.streak, loser.avatar]));
  }

  // Add to game history
  const winner_points = '{' + winner.points.join(',') + '}';
  const loser_points = '{' + loser.points.join(',') + '}';

  const history_query = `
    INSERT INTO history (game_id, winner_id, loser_id, winner_points, loser_points)
    VALUES($1, $2, $3, $4, $5)
  `;

  const history_params = [game_id, winner.id, loser.id, winner_points, loser_points];
  queries.push({query: history_query, params: history_params});

  pg.connect(this.pg_url, (err, client, dispose) => {
    if (err) {
      window.logger.error(err);
      dispose();
      if (done) done(err);
      return;
    }

    async.each(queries, (query_obj, step) => {
      client.query(query_obj.query, query_obj.params, (err, results) => {
        if (err) {
          window.logger.info(query_obj);
          return step(err);
        }

        return step();
      });
    }, err => {
      if (err) window.logger.error(err);
      dispose();
      if (done) done(err);
      return;
    });
  });
};

MatchHistory.prototype.getMatchHistory = function(done) {
  const sql = 'SELECT * FROM leaderboard_display';

  this._query(sql, [], (err, results) => {
    if (err) return done(err);

    const formatted_results = _.map(results.rows, player => {
      const ratio = Math.round(player.match_wins / (player.match_wins + player.match_losses) * 100) / 100;

      return {
        name: player.name,
        wins: player.match_wins,
        losses: player.match_losses,
        ratio: ratio,
        points: player.points,
        elo: player.elo,
        avatar: player.avatar,
        streak: player.streak
      };
    });

    formatted_results.sort((a, b) => {
      if (a.elo < b.elo) return 1;
      if (a.elo > b.elo) return -1;

      if (a.wins < b.wins) return 1;
      if (a.wins > b.wins) return -1;

      if (a.ratio < b.ratio) return 1;
      if (a.ratio > b.ratio) return -1;

      return 0;
    });

    done(null, formatted_results);
  });
};

MatchHistory.prototype.gameExists = function(game_id, done) {
  const sql = 'SELECT count(*) FROM history WHERE game_id = $1';

  this._query(sql, [], (err, results) => {
    if (err) return done(err);
    done(null, Number(results.rows[0].count === 1));
  });
};

MatchHistory.prototype.matchUpsToday = function(done) {
  const sql = 'SELECT COUNT(*) FROM history WHERE created_at::date = current_date';

  this._query(sql, [], (err, results) => {
    if (err) return done(err);
    done(null, Number(results.rows[0].count));
  });
};

MatchHistory.prototype.biggestWinningStreak = function(done) {
  const sql = 'SELECT name, streak FROM leaderboard_display ORDER BY streak DESC LIMIT 1';

  this._query(sql, [], (err, results) => {
    if (err) return done(err);
    done(null, {
      name: results.rows[0].name,
      streak: Math.abs(results.rows[0].streak)
    });
  });
};

MatchHistory.prototype.mostConsecutiveLoses = function(done) {
  const sql = 'SELECT name, streak FROM leaderboard_display ORDER BY streak LIMIT 1';

  this._query(sql, [], (err, results) => {
    if (err) return done(err);
    done(null, {
      name: results.rows[0].name,
      streak: Math.abs(results.rows[0].streak)
    });
  });
};

MatchHistory.prototype.biggestCrush = function(done) {
  const sql = `
       SELECT *
       FROM  (SELECT (SELECT nick from players where id = winner_id) as winner_name,
                     (SELECT nick from players where id = loser_id) as loser_name,
                     (SELECT SUM(t) from UNNEST(winner_points) t) as winner_points,
                     (SELECT SUM(t) from UNNEST(loser_points) t) as loser_points
                FROM history
               WHERE created_at > date_trunc('week', current_date)
             ) as x
    ORDER BY winner_points - loser_points DESC
       LIMIT 1;
  `;

  this._query(sql, [], (err, results) => {
    if (err) return done(err);
    done(null, results.rows[0]);
  });
};

MatchHistory.prototype.headToHead = function(player1, player2, done) {
  const sql = `
    SELECT (SELECT COUNT(*) FROM history WHERE winner_id = p1 and loser_id = p2) as p1,
           (SELECT COUNT(*) FROM history WHERE winner_id = p2 and loser_id = p1) as p2
      FROM (SELECT (SELECT id FROM players WHERE nick = $1) as p1,
                   (SELECT id FROM players WHERE nick = $2) as p2
           ) AS x
  `;

  this._query(sql, [player1, player2], (err, results) => {
    if (err) return done(err);
    done(null, results.rows[0]);
  });
};

MatchHistory.prototype.playerStats = function(name, done) {
  const sql = `
    SELECT *
      FROM (SELECT ROW_NUMBER() OVER (ORDER BY elo DESC), *
            FROM leaderboard_display
           ) AS x
    WHERE name = $1
  `;

  this._query(sql, [name], (err, results) => {
    if (err) return done(err);
    done(null, results.rows[0]);
  });
};

MatchHistory.prototype.lastGame = function(player1, player2, done) {
  const sql = `
      SELECT history.*
        FROM history
        JOIN players winner
          ON winner.id = history.winner_id
        JOIN players loser
          ON loser.id = history.loser_id
       WHERE (winner.nick = $1 AND loser.nick = $2)
          OR (winner.nick = $2 AND loser.nick = $1)
    ORDER BY created_at DESC
       LIMIT 1
  `;

  this._query(sql, [player1, player2], (err, results) => {
    if (err) return done(err);
    done(null, results.rows[0]);
  });
};


MatchHistory.prototype._query = function(sql, params, done) {
  pg.connect(this.pg_url, (err, client, dispose) => {
    if (err) {
      window.logger.error(err);
      dispose();
      if (done) done(err);
      return;
    }

    client.query(sql, params || [], (err, results) => {
      if (err) {
        window.logger.error(err);
        dispose();
        if (done) done(err);
        return;
      }

      dispose();
      return done(null, results);
    });
  });
};

module.exports = MatchHistory;
