const Table = require('cli-table2')
const fs = require('fs')
const numeral = require('numeral')
const io = require('socket.io-client')
const Stdbot = require('stdbot')
const uuid = require('uuid')

const makeConfig = require('../config')
const debug = require('../debug')('pongdome:chat')
const defaults = require('./config')
const actions = require('./actions')

function getAdapterConfig (config) {
  if (config.ADAPTER_CONFIG) return JSON.parse(config.ADAPTER_CONFIG)

  if (config.ADAPTER === 'stdbot-flowdock') {
    const adapterConfig = { token: config.FLOWDOCK_TOKEN }
    if (config.FLOWDOCK_FLOWS) adapterConfig.flows = config.FLOWDOCK_FLOWS.split(',')
    if (config.FLOWDOCK_USER === 'true') adapterConfig.streamConfig = { user: true }
    return adapterConfig
  }
}

function makeBot (config) {
  const adapterConfig = getAdapterConfig(config)
  const adapter = require(config.ADAPTER)(adapterConfig)
  return Stdbot(adapter)
}

exports.run = function chat (config) {
  config = makeConfig(defaults, config)

  const bot = makeBot(config)
  const api = io(config.API_URL)

  const admins = config.ADMINS ? config.ADMINS.split(',') : []
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
    const user = message.mentions()[0]

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

  const wordBoundary = /[ \n\r\t.,'"+!?-]/

  let botState

  bot.on('load', state => {
    botState = state
  })

  bot.on('message', message => {
    let results = matchAll(/(?:^|[^\w])#(\w+)/g, message.text)

    // Flowdock specific code: in a flow.
    if (message.raw.thread_id) {
      // Keep only tags that are actual Flowdock tags (will not match tags
      // inside code blocks and alike). Do it only in a flow because those
      // are never present in private messages.
      results = results.filter(match => message.raw.tags.includes(match[1]))

      // In a flow, other users are properly tagged so use the native way.
      message.mentions = function mentions () {
        return bot.mentions(message)
      }
    }

    // Flowdock specific code: in a private conversation.
    if (message.raw.to) {
      // In a private conversation, we can't mention persons, so we need
      // an alternative way to find users.
      message.mentions = function mentions () {
        const matches = message.text.split(wordBoundary)
          .filter(word => word.startsWith('@'))
          .map(name => name.substr(1))

        if (!matches.length) return []

        const usersByName = {}

        Object.keys(botState.usersById)
          .map(id => botState.usersById[id])
          .forEach(user => {
            usersByName[user.name.toLowerCase()] = user
          })

        return matches
          .map(name => usersByName[name.toLowerCase()])
          .filter(user => user)
      }
    }

    if (!results.length) return

    const action = results[0][1].toLowerCase()

    if (!actions[action]) return

    const flags = results.slice(1).map(match => match[1])

    const flagsObject = flags.reduce((object, flag) => {
      object[flag] = true
      return object
    }, {})

    const isAdmin = admins
      .map(name => name.toLowerCase())
      .find(name => name === message.author.name.toLowerCase())

    debug(`@${message.author.name}: #${action}${message.mentions().map(x => ` @${x.name}`).join('')}${flags.map(x => ` #${x}`).join('')} [${message.thread || 'dm'}]`)

    try {
      actions[action]({ api, bot, saveState, findRequest, addRequest, removeRequest, challenges, matchesById, matchesByThread, message, flags: flagsObject, isAdmin })
    } catch (err) {
      debug(err)
    }
  })

  bot.on('error', debug)

  api.on('match', ({ match }) => {
    if (!matchesById[match.id]) return
    const { challenger, challengee, message } = matchesById[match.id]
    message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Game on!`)
  })

  api.on('queue', ({ match, position }) => {
    if (!matchesById[match.id]) return
    const { challenger, challengee, message } = matchesById[match.id]
    message.send(`${bot.mention(challenger)} ${bot.mention(challengee)} Queued Up! You're ${numeral(position).format('0o')} in the queue.`)
  })

  api.on('progress', match => {
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
      if (request.progress.then) {
        // Most cases, we posted the first live score and can piggy back on
        // that promise to make sure we edit the message after it's really
        // posted.
        request.progress = request.progress.then(message => message.edit(liveScore))
      } else {
        // The promise was JSON stringified in the state as empty object, more
        // likely PongDome was restarted. This means that we can assume the
        // message to be already be posted and just edit it directly without
        // checking on the promise.
        message.edit(liveScore)
      }
    } else {
      request.progress = request.message.send(liveScore)
    }
  })

  api.on('end', ({ match, winner, loser }) => {
    if (!matchesById[match.id]) return

    const request = matchesById[match.id]
    const winnerTotal = winner.games.reduce((a, b) => a + b, 0)
    const loserTotal = loser.games.reduce((a, b) => a + b, 0)

    request.message.send(`${bot.mention(winner.meta)} beat ${bot.mention(loser.meta)}! ${winnerTotal} points to ${loserTotal} points.`)
    removeRequest(request)
  })

  api.on('cancel', ({ match }) => {
    if (!matchesById[match.id]) return

    const request = matchesById[match.id]
    request.message.send('Game cancelled.')
    removeRequest(request)
  })
}

if (require.main === module) {
  exports.run()
}
