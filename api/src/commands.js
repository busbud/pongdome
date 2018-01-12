exports.leaderboard = db =>
  db.query('SELECT * FROM leaderboard_display_recent')

exports.matchUpsToday = db =>
  db.one('SELECT count(*) FROM history WHERE created_at::date = current_date')
    .then(result => result.count)

exports.biggestWinningStreak = db =>
  db.oneOrNone('SELECT * FROM leaderboard_display_recent ORDER BY streak DESC LIMIT 1')

exports.mostConsecutiveLosses = db =>
  db.oneOrNone('SELECT * FROM leaderboard_display_recent ORDER BY streak LIMIT 1')

exports.biggestCrush = db =>
  db.oneOrNone(`
    SELECT *
      FROM (SELECT (SELECT name FROM players WHERE id = winner_id) AS winner_name,
                   (SELECT name FROM players WHERE id = loser_id) AS loser_name,
                   (SELECT sum(points) FROM unnest(winner_points) AS points) AS winner_points,
                   (SELECT sum(points) FROM unnest(loser_points) AS points) AS loser_points
              FROM history
             WHERE created_at > date_trunc('week', current_date)
          ORDER BY created_at DESC
           ) AS games
  ORDER BY winner_points - loser_points DESC
     LIMIT 1
  `)

exports.headToHead = (db, playerOne, playerTwo) =>
  db.one(`
    SELECT (SELECT count(*) FROM history WHERE winner_id = $1 AND loser_id = $2) AS player_one,
           (SELECT count(*) FROM history WHERE winner_id = $2 AND loser_id = $1) AS player_two
  `, [String(playerOne.id), String(playerTwo.id)])

exports.playerStats = (db, player) =>
  db.oneOrNone(`
    SELECT *
      FROM (SELECT row_number() OVER (ORDER BY elo DESC) AS rank, *
            FROM leaderboard_display
           ) AS rank
     WHERE player_id = $1
  `, [String(player.id)])

exports.lastMatch = (db, playerOne, playerTwo) =>
  db.oneOrNone(`
      SELECT history.*,
             winner.name AS winner_name,
             loser.name AS loser_name
        FROM history
        JOIN players AS winner
          ON winner.id = history.winner_id
        JOIN players AS loser
          ON loser.id = history.loser_id
       WHERE (winner.id = $1 AND loser.id = $2)
          OR (winner.id = $2 AND loser.id = $1)
    ORDER BY created_at DESC
       LIMIT 1
  `, [String(playerOne.id), String(playerTwo.id)])

exports.savePlayer = (db, player) =>
  db.query(`
    INSERT INTO players (id, name, meta)
         VALUES ($1, $2, $3)
    ON CONFLICT (id)
      DO UPDATE
            SET name = $2,
                meta = $3
  `, [String(player.id), player.name, player.meta])

exports.saveMatch = (db, id, winner, loser) =>
  db.query(`
    INSERT INTO history (id, winner_id, loser_id, winner_points, loser_points)
         VALUES ($1, $2, $3, $4, $5)
  `, [String(id), String(winner.id), String(loser.id), winner.games, loser.games])

exports.updateLeaderboard = (db, player, wins, losses, elo, streak) =>
  db.query(`
    INSERT INTO leaderboard (player_id, wins, losses, elo, streak)
         VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (player_id)
      DO UPDATE
            SET wins = $2,
                losses = $3,
                elo = $4,
                streak = $5
  `, [String(player.id), wins, losses, elo, streak])

exports.streak = (db, player) =>
  db.oneOrNone(`
      SELECT winner_id
        FROM history
       WHERE winner_id = $1
          OR loser_id = $1
    ORDER BY created_at DESC
       LIMIT 1
  `, [String(player.id)])
    .then(result => result.winner_id === String(player.id))
    .then(winning => db.query(`
          WITH streak_start AS (
                 SELECT created_at
                   FROM history
                  WHERE ${winning ? 'loser_id' : 'winner_id'} = $1
               ORDER BY created_at DESC
                  LIMIT 1
               )
        SELECT history.*,
               winner.name AS winner_name,
               loser.name AS loser_name
          FROM history
          JOIN players AS winner
            ON winner.id = history.winner_id
          JOIN players AS loser
            ON loser.id = history.loser_id
         WHERE ${winning ? 'winner_id' : 'loser_id'} = $1
           AND created_at >= COALESCE((SELECT * FROM streak_start), '1970-01-01')
      ORDER BY created_at DESC
    `, [String(player.id)]))

exports.streakBetween = (db, playerOne, playerTwo) =>
  db.oneOrNone(`
      SELECT winner_id
        FROM history
       WHERE (winner_id = $1 AND loser_id = $2)
          OR (winner_id = $2 AND loser_id = $1)
    ORDER BY created_at DESC
       LIMIT 1
  `, [String(playerOne.id), String(playerTwo.id)])
    .then(result => result.winner_id === String(playerOne.id))
    .then(playerOneWinning => db.query(`
          WITH streak_start AS (
                 SELECT created_at
                   FROM history
                  WHERE ${playerOneWinning ? 'loser_id' : 'winner_id'} = $1
                    AND ${playerOneWinning ? 'winner_id' : 'loser_id'} = $2
               ORDER BY created_at DESC
                  LIMIT 1
               )
        SELECT history.*,
               winner.name AS winner_name,
               loser.name AS loser_name
          FROM history
          JOIN players AS winner
            ON winner.id = history.winner_id
          JOIN players AS loser
            ON loser.id = history.loser_id
         WHERE ${playerOneWinning ? 'winner_id' : 'loser_id'} = $1
           AND ${playerOneWinning ? 'loser_id' : 'winner_id'} = $2
           AND created_at >= COALESCE((SELECT * FROM streak_start), '1970-01-01')
      ORDER BY created_at DESC
    `, [String(playerOne.id), String(playerTwo.id)]))
