const config = require('../../config')

const isAdmin = user =>
  (config.admins || [])
    .map(name => name.toLowerCase())
    .find(name => name === user.name.toLowerCase())

module.exports = function cancel ({ socket, findRequest, removeRequest, message }) {
  const request = findRequest(message)

  if (!request) return

  const { id, challenger, challengee, accepted } = request

  if (!isAdmin(message.author) && ![challenger.id, challengee.id].includes(message.author.id)) {
    return message.send('This is not your challenge!')
  }

  if (accepted) {
    socket.emit('cancel', { id })
  }
}
