module.exports = function accept ({ socket, saveState, findRequest, message }) {
  const request = findRequest(message)

  if (!request) return
  if (!request.challengee) request.challengee = message.author

  const { id, challenger, challengee, unranked } = request

  if (message.author.id !== request.challengee.id) return message.send('This is not your challenge.')

  request.accepted = true

  saveState()

  const emit = () => socket.emit('match', { id, challenger, challengee, unranked })

  if (request.time) request.timer = setTimeout(emit, request.time.getTime() - new Date().getTime())
  else emit()
}
