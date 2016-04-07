'use strict';

const pg = require('pg');

function UserRepository(config) {
  this.config = config;
}

UserRepository.prototype.getUser = function(user_id, done) {
  pg.connect(this.config.pg, (err, client, dispose) => {
    if (err) return window.logger.error(err);
    this._getUser(client, user_id, (err, user) => {
      dispose();
      done(err, user);
    });
  });
};

UserRepository.prototype.saveUser = function(user, done) {
  pg.connect(this.config.pg, (err, client, dispose) => {
    if (err) return window.logger.error(err);
    this._saveUser(client, user, (err, user) => {
      dispose();
      if (done) done(err, user);
    });
  });
};

UserRepository.prototype._getUser = function(client, user_id, done) {
  client.query('SELECT * FROM players WHERE id = $1', [user_id], (err, results) => {
    if (err) return done(err);
    done(null, results.rows[0]);
  });
};

UserRepository.prototype._saveUser = function(client, user, done) {
  const query = `
    WITH upsert AS (
        UPDATE players SET nick = $2, email = $3, avatar = $4, name = $5, website = $6
        WHERE user_id = $1 RETURNING *
    )
    INSERT INTO players (id, nick, email, avatar, name, website)
    SELECT $1, $2, $3, $4, $5, $6 WHERE NOT EXISTS (SELECT * FROM upsert)
  `;

  client.query(
    query,
    [user.id, user.nick, user.email, user.avatar, user.name, user.website],
    done
  );
};

module.exports = UserRepository;
