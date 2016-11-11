const api = require('./api')

const inputs = {
  playerOne: document.getElementById('player-one'),
  playerTwo: document.getElementById('player-two')
}

const buttons = {
  play: document.getElementById('play')
}

const queueContainer = document.getElementById('queue')

const id = () => Math.random().toString(16).slice(2)

buttons.play.addEventListener('click', e => {
  e.preventDefault()

  api.emit('match', {
    id: id(),
    challenger: { id: id(), name: inputs.playerOne.value },
    challengee: { id: id(), name: inputs.playerTwo.value },
    unranked: true
  })

  inputs.playerOne.value = ''
  inputs.playerTwo.value = ''
})

function appendMatch(match, isActive) {
  const el = document.createElement('tr')

  if (isActive) el.style.fontWeight = 'bold'

  const playerOne = document.createElement('td')
  const playerTwo = document.createElement('td')
  const actions = document.createElement('td')

  playerOne.textContent = match.playerOne.name
  playerTwo.textContent = match.playerTwo.name

  if (match.unranked) {
    const cancel = document.createElement('button')

    cancel.textContent = 'Cancel'

    cancel.addEventListener('click', e => {
      e.preventDefault()
      api.emit('cancel', { id: match.id })
    })

    actions.appendChild(cancel)
  }

  el.appendChild(playerOne)
  el.appendChild(playerTwo)
  el.appendChild(actions)

  queueContainer.appendChild(el)
}

function renderState({ match, queue }) {
  queueContainer.innerHTML = ''

  if (match) appendMatch(match, true)
  queue.forEach(match => appendMatch(match))
}

function refreshState() {
  api.emit('state', renderState)
}

api.on('match', refreshState)
api.on('queue', refreshState)
api.on('cancel', refreshState)
api.on('end', refreshState)

refreshState()
