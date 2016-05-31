module.exports = function accept ({ socket, findRequest, message }) {
  const request = findRequest(message)

  if (!request) return
  if (!request.challengee) request.challengee = message.author

  const { id, challenger, challengee } = request

  if (message.author.id !== request.challengee.id) return message.send('This is not your challenge.')

  request.accepted = true

  socket.emit('match', { id, challenger, challengee })
}
