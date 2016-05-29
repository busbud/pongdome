const numeral = require('numeral')
const io = require('socket.io-client')
const Stdbot = require('stdbot')

const config = require('./config')
const actions = require('./src/actions')

const socket = io(config.api)
const bot = Stdbot(config.adapter)

const challenges = {}
const matches = {}

function findRequest (message) {
  const requests = challenges[message.author.id]

  if (!requests || !requests.length) {
    message.send('Could not find a challenge here.')
    return
  }

  const user = bot.mentions(message)[0]
  const threadId = message.raw.thread_id
  let request

  if (!user) {
    if (threadId) {
      request = matches[threadId]
    } else if (requests.length > 1) {
      message.send('Multiple possible challenges, please mention your partner.')
      return
    } else {
      request = requests.pop()
    }
  } else {
    request = requests.find(request => {
      return (request.challenger.id === user.id && request.challengee.id === message.author.id) ||
        (request.challengee.id === user.id && request.challenger.id === message.author.id)
    })
  }

  if (!request) {
    message.send('Could not find a challenge here.')
    return
  }

  return request
}

function addRequest (request) {
  challenges[request.challenger.id] = challenges[request.challenger.id] || []
  challenges[request.challenger.id].push(request)
  challenges[request.challengee.id] = challenges[request.challengee.id] || []
  challenges[request.challengee.id].push(request)
  matches[request.id] = request
}

function removeRequest ({ id, challenger, challengee }) {
  challenges[challenger.id] = challenges[challenger.id]
    .filter(request => request.id !== id)

  challenges[challengee.id] = challenges[challengee.id]
    .filter(request => request.id !== id)

  delete matches[id]
}

bot.on('message', message => {
  const match = message.text.match(/(?:^|\s)#([^\s]+)/)
  if (!match) return
  const hash = match[1]
  if (!actions[hash]) return
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
