const Elo = require('elo-js')
const pg = require('pg-promise')
const config = require('../config')

const elo = new Elo()
const db = pg()(config.DATABASE_URL)

const entry = {
  player_id: null,
  wins: 0,
  losses: 0,
  elo: 1000,
  streak: 0
}

db.query(`
  SELECT *
    FROM history
   WHERE created_at > date_trunc('year', now())
ORDER BY created_at ASC
`)
  .then(history => {
    const leaderboard = {}

    history.forEach(match => {
      const winnerId = match.winner_id
      const loserId = match.loser_id

      const winner = leaderboard[winnerId] = leaderboard[winnerId] || Object.assign({}, entry, { player_id: winnerId })
      const loser = leaderboard[loserId] = leaderboard[loserId] || Object.assign({}, entry, { player_id: loserId })

      const winnerElo = winner.elo
      const loserElo = loser.elo

      winner.elo = elo.ifWins(winnerElo, loserElo)
      loser.elo = elo.ifLoses(loserElo, winnerElo)

      winner.wins += 1
      loser.losses += 1

      winner.streak = winner.streak <= 0 ? 1 : winner.streak + 1
      loser.streak = loser.streak >= 0 ? -1 : loser.streak - 1
    })

    return Object.keys(leaderboard).map(id => leaderboard[id])
  })
  .then(leaderboard => db.query('DELETE FROM leaderboard').then(() => leaderboard))
  .then(leaderboard => {
    const sql = `
      INSERT INTO leaderboard (player_id, wins, losses, elo, streak)
           VALUES ($1, $2, $3, $4, $5)
    `

    return Promise.all(leaderboard.map(entry => db.query(sql, [
      entry.player_id,
      entry.wins,
      entry.losses,
      entry.elo,
      entry.streak
    ])))
  })
  .then(() => db.$pool.end())
  .catch(console.error)
