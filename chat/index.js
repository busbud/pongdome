const Table = require('cli-table2')
const fs = require('fs')
const numeral = require('numeral')
const io = require('socket.io-client')
const Stdbot = require('stdbot')
const uuid = require('uuid')

const config = require('./config')
const actions = require('./src/actions')

const socket = io(config.api)
const bot = Stdbot(config.adapter)

const challenges = {}
const matchesById = {}
const matchesByThread = {}

function saveState () {
  const state = Object.keys(matchesById).map(key => matchesById[key])
  fs.writeFileSync(`${__dirname}/state.json`, JSON.stringify(state, null, 2))
}

try {
  require('./state')
    .map(request => Object.assign({}, request, { message: bot.formatMessage(request.message) }))
    .forEach(addRequest)
} catch (e) {}

function findRequestThread (message) {
  const request = matchesByThread[message.thread]

  if (!request) {
    message.send('Could not find a challenge here.')
    throw new Error('Could not find a challenge here.')
  }

  return request
}

function findRequestUser (message) {
  const user = bot.mentions(message)[0]

  const requests = Object.keys(matchesById)
    .map(id => matchesById[id])
    .filter(request => {
      const isAuthor = request.challenger.id === message.author.id ||
        (request.challengee && request.challengee.id === message.author.id)

      if (!user) return isAuthor

      return isAuthor ||
          request.challenger.id === user.id ||
          (request.challengee && request.challengee.id === user.id)
    })

  if (!requests || !requests.length) {
    message.send('Could not find a challenge here.')
    throw new Error('Could not find a challenge here.')
  }

  if (user) {
    return requests.find(request => {
      return (request.challenger.id === user.id && (!request.challenge || request.challengee.id === message.author.id)) ||
        ((!request.challengee || request.challengee.id === user.id) && request.challenger.id === message.author.id)
    })
  }

  if (requests.length > 1) {
    message.send('Multiple possible challenges, please mention your partner.')
    throw new Error('Multiple possible challenges, please mention your partner.')
  }

  return requests.pop()
}

function findRequest (message) {
  if (message.thread) return findRequestThread(message)
  else return findRequestUser(message)
}

function addRequest (request) {
  if (!request.id) request = Object.assign({ id: uuid.v4() }, request)

  if (matchesByThread[request.message.thread]) {
    request.message.send('There\'s already a challenge here.')
    throw new Error('There\'s already a challenge here.')
  }

  challenges[request.challenger.id] = challenges[request.challenger.id] || []
  challenges[request.challenger.id].push(request)

  if (request.challengee) {
    challenges[request.challengee.id] = challenges[request.challengee.id] || []
    challenges[request.challengee.id].push(request)
  }

  matchesById[request.id] = request

  if (request.message.thread) {
    matchesByThread[request.message.thread] = request
  }

  saveState()

  return request
}

function removeRequest ({ id, challenger, challengee }) {
  if (challenges[challenger.id]) {
    challenges[challenger.id] = challenges[challenger.id]
      .filter(request => request.id !== id)
  }

  if (challenges[challengee.id]) {
    challenges[challengee.id] = challenges[challengee.id]
      .filter(request => request.id !== id)
  }

  const request = matchesById[id]

  delete matchesById[id]
  delete matchesByThread[request.message.thread]

  saveState()
}

function matchAll (regex, string) {
  let match
  const results = []
  while ((match = regex.exec(string)) != null) results.push(match)
  return results
}

bot.on('message', message => {
  const results = matchAll(/(?:^|[^\w])#(\w+)/g, message.text)

  if (!results.length) return

  const action = results[0][1].toLowerCase()

  if (!actions[action]) return

  const flags = results.slice(1).map(match => match[1])

  const flagsObject = flags.reduce((object, flag) => {
    object[flag] = true
    return object
  }, {})

  const isAdmin = (config.admins || [])
    .map(name => name.toLowerCase())
    .find(name => name === message.author.name.toLowerCase())

  console.log(`#${action} ${message.thread} ${flags.map(x => `#${x}`).join(' ')}`)

  try {
    actions[action]({ socket, bot, saveState, findRequest, addRequest, removeRequest, challenges, matchesById, matchesByThread, message, flags: flagsObject, isAdmin })
  } catch (err) {
    console.error(err)
  }
})

bot.on('error', console.error)

socket.on('match', ({ match }) => {
  if (!matchesById[match.id]) return
  const { challenger, challengee, message } = matchesById[match.id]
  message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Game on!`)
})

socket.on('queue', ({ match, position }) => {
  if (!matchesById[match.id]) return
  const { challenger, challengee, message } = matchesById[match.id]
  message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Queued Up! You're ${numeral(position).format('0o')} in the queue.`)
})

socket.on('progress', match => {
  const request = matchesById[match.id]

  if (!request) return
  if (!request.message.edit) return
  if (match.unranked) return

  const table = new Table({
    style: { head: [], border: [] }
  })

  const p1 = match.playerOne
  const p2 = match.playerTwo

  table.push(
    [p1.name, ...p1.games, p1.current],
    [p2.name, ...p2.games, p2.current]
  )

  const liveScore = '```\n' + table.toString() + '\n```'

  if (request.progress) {
    request.progress = request.progress.then(message => message.edit(liveScore))
  } else {
    request.progress = request.message.send(liveScore)
  }
})

socket.on('end', ({ match, winner, loser }) => {
  if (!matchesById[match.id]) return

  const request = matchesById[match.id]
  const winnerTotal = winner.games.reduce((a, b) => a + b, 0)
  const loserTotal = loser.games.reduce((a, b) => a + b, 0)

  request.message.send(`${bot.mention(winner.meta)} beat ${bot.mention(loser.meta)}! ${winnerTotal} points to ${loserTotal} points.`)
  removeRequest(request)
})

socket.on('cancel', ({ match }) => {
  if (!matchesById[match.id]) return

  const request = matchesById[match.id]
  request.message.send('Game cancelled.')
  removeRequest(request)
})
