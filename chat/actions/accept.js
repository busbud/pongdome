module.exports = function accept ({ api, saveState, findRequest, message }) {
  const request = findRequest(message)

  if (!request) return
  if (!request.challengee) request.challengee = message.author

  const { id, challenger, challengee, unranked } = request

  if (message.author.id !== request.challengee.id) return message.send('This is not your challenge.')
  if (request.accepted) return message.send('This challenge is already accepted.')

  request.accepted = true

  saveState()

  api.emit('match', { id, challenger, challengee, unranked })
}
