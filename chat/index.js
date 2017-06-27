const Table = require('cli-table2')
const fs = require('fs')
const numeral = require('numeral')
const io = require('socket.io-client')
const Stdbot = require('stdbot')

const config = require('./config')
const actions = require('./src/actions')

const socket = io(config.api)
const bot = Stdbot(config.adapter)

const challenges = {}
const matches = {}

function saveState () {
  const state = Object.keys(matches).map(key => matches[key])
  fs.writeFile(`${__dirname}/state.json`, JSON.stringify(state, null, 2))
}

try {
  require('./state')
    .map(request => Object.assign({}, request, { message: bot.formatMessage(request.message) }))
    .forEach(addRequest)
} catch (e) {}

function findRequestThread (message) {
  const request = matches[message.thread]

  if (!request) {
    message.send('Could not find a challenge here.')
    return
  }

  return request
}

function findRequestUser (message) {
  const user = bot.mentions(message)[0]

  const requests = Object.keys(matches)
    .map(id => matches[id])
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
    return
  }

  if (user) {
    return requests.find(request => {
      return (request.challenger.id === user.id && (!request.challenge || request.challengee.id === message.author.id)) ||
        ((!request.challengee || request.challengee.id === user.id) && request.challenger.id === message.author.id)
    })
  }

  if (requests.length > 1) {
    message.send('Multiple possible challenges, please mention your partner.')
    return
  }

  return requests.pop()
}

function findRequest (message) {
  if (message.thread) return findRequestThread(message)
  else return findRequestUser(message)
}

function addRequest (request) {
  challenges[request.challenger.id] = challenges[request.challenger.id] || []
  challenges[request.challenger.id].push(request)

  if (request.challengee) {
    challenges[request.challengee.id] = challenges[request.challengee.id] || []
    challenges[request.challengee.id].push(request)
  }

  matches[request.id] = request

  saveState()
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

  delete matches[id]

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

  actions[action]({ socket, bot, saveState, findRequest, addRequest, removeRequest, challenges, matches, message, flags: flagsObject, isAdmin })
})

bot.on('error', console.error)

socket.on('match', ({ match }) => {
  if (!matches[match.id]) return
  const { challenger, challengee, message } = matches[match.id]
  message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Game on!`)
})

socket.on('queue', ({ match, position }) => {
  if (!matches[match.id]) return
  const { challenger, challengee, message } = matches[match.id]
  message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Queued Up! You're ${numeral(position).format('0o')} in the queue.`)
})

socket.on('progress', match => {
  const request = matches[match.id]

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
  if (!matches[match.id]) return

  const request = matches[match.id]
  const winnerTotal = winner.games.reduce((a, b) => a + b, 0)
  const loserTotal = loser.games.reduce((a, b) => a + b, 0)

  request.message.send(`${bot.mention(winner.meta)} beat ${bot.mention(loser.meta)}! ${winnerTotal} points to ${loserTotal} points.`)
  removeRequest(request)
})

socket.on('cancel', ({ match }) => {
  if (!matches[match.id]) return

  const request = matches[match.id]
  request.message.send('Game cancelled.')
  removeRequest(request)
})
