const formatServerAddress = require('@rdcl/format-server-address')
const Elo = require('elo-js')
const move = require('lodash-move').default
const makeIoServer = require('socket.io')

const makeConfig = require('../config')
const debug = require('../debug')('pongdome:api')
const defaults = require('./config')
const makeDatabase = require('./db')

const elo = new Elo()

exports.run = function api (config) {
  config = makeConfig(defaults, config)

  const db = makeDatabase(config.DATABASE_URL)
  const io = makeIoServer()

  let currentMatch = null
  let queue = []

  function saveState () {
    db.setState(currentMatch, queue)
      .catch(debug)
  }

  function newPlayer (player) {
    return {
      id: player.id,
      name: player.name,
      games: player.games || [],
      current: player.current || 0,
      serving: player.serving || false,
      meta: player.meta || player,
      wonGames () {
        return this.games.filter((points, i) => points > this.other.games[i]).length
      },
      toJSON () {
        const { id, name, games, current, serving, meta } = this
        return { id, name, games, current, serving, meta }
      }
    }
  }

  function newMatch (match) {
    match = {
      id: match.id,
      playerOne: newPlayer(match.playerOne || match.challenger),
      playerTwo: newPlayer(match.playerTwo || match.challengee),
      firstServing: match.firstServing || null,
      unranked: match.unranked || false,
      toJSON () {
        const { id, playerOne, playerTwo, unranked } = this
        const firstServing = this.firstServing && this.firstServing === playerOne
        return { id, playerOne, playerTwo, firstServing, unranked }
      }
    }

    match.playerOne.other = match.playerTwo
    match.playerTwo.other = match.playerOne

    if (match.firstServing === true) match.firstServing = match.playerOne
    else if (match.firstServing === false) match.firstServing = match.playerTwo

    return match
  }

  function currentServing (firstServing, playerOne, playerTwo) {
    let total = playerOne.current + playerTwo.current

    // Change every two points unless 10-10.
    if (total < 20) total = Math.floor(total / 2)

    const player = total % 2 === 0 ? firstServing : firstServing.other

    // Invert first serving every game.
    if (playerOne.games.length % 2 === 0) {
      return player
    } else {
      return player.other
    }
  }

  function endMatch (winner) {
    const match = currentMatch
    currentMatch = null

    const save = match.unranked ? Promise.resolve() : db.tx(db => {
      return db.batch([
        db.playerStats(winner),
        db.playerStats(winner.other),
        db.savePlayer(winner),
        db.savePlayer(winner.other)
      ])
        .then(([winnerStats, loserStats]) => {
          // If player isn't on the leaderboard yet, then ELO defaults to 1000.
          winnerStats = winnerStats || { wins: 0, losses: 0, elo: 1000, streak: 0 }
          loserStats = loserStats || { wins: 0, losses: 0, elo: 1000, streak: 0 }

          winner.beforeStats = winnerStats
          winner.other.beforeStats = loserStats

          const winnerElo = elo.ifWins(winnerStats.elo, loserStats.elo)
          const loserElo = elo.ifLoses(loserStats.elo, winnerStats.elo)
          const winnerStreak = winnerStats.streak <= 0 ? 1 : winnerStats.streak + 1
          const loserStreak = loserStats.streak >= 0 ? -1 : loserStats.streak - 1

          return db.batch([
            db.saveMatch(match.id, winner, winner.other),
            db.updateLeaderboard(winner, winnerStats.wins + 1, winnerStats.losses, winnerElo, winnerStreak),
            db.updateLeaderboard(winner.other, loserStats.wins, loserStats.losses + 1, loserElo, loserStreak)
          ])
        })
    })

    save
      .then(() => {
        io.emit('end', {
          match,
          winner,
          loser: winner.other,
          beforeStats: {
            winner: winner.beforeStats,
            loser: winner.other.beforeStats
          }
        })

        if (queue.length) {
          currentMatch = queue.shift()
          io.emit('match', { match: currentMatch, queue })
        }

        saveState()
      })
      .catch(debug)
  }

  function isSetOver () {
    const { playerOne, playerTwo } = currentMatch

    return (playerOne.current >= 11 || playerTwo.current >= 11) &&
      (Math.abs(playerOne.current - playerTwo.current) >= 2)
  }

  function endSet () {
    if (!isSetOver()) return

    const { playerOne, playerTwo } = currentMatch

    playerOne.games.push(playerOne.current)
    playerTwo.games.push(playerTwo.current)

    const winner = playerOne.current > playerTwo.current ? playerOne : playerTwo

    playerOne.current = 0
    playerTwo.current = 0

    if (winner.wonGames() === 2) {
      endMatch(winner)
    }
  }

  function onProgress () {
    const { firstServing, playerOne, playerTwo } = currentMatch

    if (isSetOver()) {
      const winner = playerOne.current > playerTwo.current ? playerOne : playerTwo

      // Auto end game if not match game.
      if (winner.wonGames() === 0) {
        endSet()
      }
    }

    if (firstServing) {
      const player = currentServing(firstServing, playerOne, playerTwo)
      player.serving = true
      player.other.serving = false
    } else {
      playerOne.serving = false
      playerTwo.serving = false
    }

    io.emit('progress', currentMatch)
    saveState()
  }

  function incrementPlayer (player) {
    if (!currentMatch.firstServing) {
      currentMatch.firstServing = player
    } else {
      player.current++
    }

    onProgress()
  }

  function decrementPlayer (player) {
    if (player.current === 0 && player.other.current === 0) {
      if (player.games.length > 0) {
        // Only the player who won the last game can pop to the previous game at
        // this point otherwise the game will re-end immediatly.
        if (player.games[player.games.length - 1] >= player.other.games[player.other.games.length - 1]) {
          player.current = player.games.pop()
          player.other.current = player.other.games.pop()
        }
      } else if (player === currentMatch.firstServing) {
        currentMatch.firstServing = null
      }
    }

    if (player.current > 0) {
      player.current--
    }

    onProgress()
  }

  db.getState()
    .then(state => {
      if (!state) return saveState()
      currentMatch = state.current_match && newMatch(state.current_match)
      queue = state.queue.map(match => newMatch(match))
    })

  io.on('connection', socket => {
    socket.on('state', f => {
      f({ match: currentMatch, queue })
    })

    socket.on('match', match => {
      match = newMatch(match)

      if (!currentMatch) {
        currentMatch = match
        io.emit('match', { match: currentMatch, queue })
      } else {
        io.emit('queue', {
          match,
          position: queue.push(match)
        })
      }

      saveState()
    })

    socket.on('cancel', ({ id }) => {
      let cancelledMatch

      if (currentMatch.id === id) {
        cancelledMatch = currentMatch
        currentMatch = null
      } else {
        cancelledMatch = queue.find(match => match.id === id)
        queue = queue.filter(match => match.id !== id)
      }

      io.emit('cancel', {
        match: cancelledMatch,
        queue
      })

      if (!currentMatch && queue.length) {
        currentMatch = queue.shift()
        io.emit('match', { match: currentMatch, queue })
      }

      saveState()
    })

    socket.on('requeue', ({ id, where }, f) => {
      if (!currentMatch) return f({ match: currentMatch, queue })

      let virtualQueue = [currentMatch, ...queue]
      const matchIndex = virtualQueue.indexOf(virtualQueue.find(match => match.id === id))

      if (matchIndex === -1) return f({ match: currentMatch, queue })

      let targetIndex

      switch (where) {
        case 'first': targetIndex = 0; break
        case 'before': targetIndex = matchIndex - 1; break
        case 'after': targetIndex = matchIndex + 1; break
        default: targetIndex = virtualQueue.length - 1; break
      }

      virtualQueue = move(virtualQueue, matchIndex, targetIndex)

      const previousCurrentMatch = newMatch(currentMatch)
      currentMatch = virtualQueue.shift()
      queue = virtualQueue

      saveState()
      f({ match: currentMatch, queue })

      if (previousCurrentMatch.id !== currentMatch.id) {
        io.emit('match', { match: currentMatch, queue })
      }
    })

    socket.on('increment-player-one', () => currentMatch ? incrementPlayer(currentMatch.playerOne) : io.emit('wakeup'))
    socket.on('decrement-player-one', () => currentMatch ? decrementPlayer(currentMatch.playerOne) : io.emit('wakeup'))
    socket.on('increment-player-two', () => currentMatch ? incrementPlayer(currentMatch.playerTwo) : io.emit('wakeup'))
    socket.on('decrement-player-two', () => currentMatch ? decrementPlayer(currentMatch.playerTwo) : io.emit('wakeup'))

    socket.on('end-game', () => {
      if (!currentMatch) {
        return
      }

      endSet()
    })

    socket.on('leaderboard', f => {
      db.leaderboard().then(f)
    })

    socket.on('match-ups-today', f => {
      db.matchUpsToday().then(f)
    })

    socket.on('biggest-winning-streak', f => {
      db.biggestWinningStreak().then(f)
    })

    socket.on('most-consecutive-losses', f => {
      db.mostConsecutiveLosses().then(f)
    })

    socket.on('biggest-crush', f => {
      db.biggestCrush().then(f)
    })

    socket.on('head-to-head', (playerOne, playerTwo, f) => {
      db.headToHead(playerOne, playerTwo).then(f)
    })

    socket.on('player-stats', (player, f) => {
      db.playerStats(player).then(f)
    })

    socket.on('last-match', (playerOne, playerTwo, f) => {
      db.lastMatch(playerOne, playerTwo).then(f)
    })

    socket.on('streak', (player, f) => {
      db.streak(player).then(f)
    })

    socket.on('streak-between', (playerOne, playerTwo, f) => {
      db.streakBetween(playerOne, playerTwo).then(f)
    })
  })

  const { httpServer } = io.listen(config.PORT)

  httpServer.on('listening', () => {
    debug(`PongDome API listening on ${formatServerAddress(httpServer.address())}`)
  })
}

if (require.main === module) {
  exports.run()
}
