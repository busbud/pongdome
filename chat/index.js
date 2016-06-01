const numeral = require('numeral')
const io = require('socket.io-client')
const Stdbot = require('stdbot')

const config = require('./config')
const actions = require('./src/actions')

const socket = io(config.api)
const bot = Stdbot(config.adapter)

const challenges = {}
const matches = {}

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
}

bot.on('message', message => {
  const match = message.text.match(/(?:^|\s)#([^\s]+)/)
  if (!match) return
  const hash = match[1].toLowerCase()
  if (!actions[hash]) return
  console.log(`#${hash} ${message.thread}`)
  actions[hash]({ socket, bot, findRequest, addRequest, removeRequest, challenges, matches, message })
})

bot.on('error', console.error)

socket.on('match', ({ match }) => {
  const { challenger, challengee, message } = matches[match.id]
  message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Game on!`)
})

socket.on('queue', ({ match, position }) => {
  const { challenger, challengee, message } = matches[match.id]
  message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Queued Up! You're ${numeral(position).format('0o')} in the queue.`)
})

socket.on('end', ({ match, winner, loser }) => {
  const request = matches[match.id]
  const winnerTotal = winner.games.reduce((a, b) => a + b, 0)
  const loserTotal = loser.games.reduce((a, b) => a + b, 0)

  request.message.send(`${bot.mention(winner.meta)} beat ${bot.mention(loser.meta)}! ${winnerTotal} points to ${loserTotal} points.`)
  removeRequest(request)
})

socket.on('cancel', ({ match }) => {
  const request = matches[match.id]
  request.message.send('Game cancelled.')
  removeRequest(request)
})
