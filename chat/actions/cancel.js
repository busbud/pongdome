module.exports = function cancel ({ api, findRequest, removeRequest, message, isAdmin }) {
  const request = findRequest(message)

  if (!request) return

  const { id, challenger, challengee, accepted } = request

  if (request.forced && !isAdmin) return message.send('Nope.')

  if (!isAdmin && ![challenger.id, challengee.id].includes(message.author.id)) {
    return message.send('This is not your challenge!')
  }

  if (accepted) {
    api.emit('cancel', { id })
  }
}
