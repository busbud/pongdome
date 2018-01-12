const { formatQueue } = require('./queue')

module.exports = function requeue ({ socket, findRequest, message, flags, isAdmin }) {
  const request = findRequest(message)

  if (!request.accepted) return message.send('This game is not in the queue.')
  if (!isAdmin && ![request.challenger.id, request.challengee.id].includes(message.author.id)) return message.send('This is not your challenge.')

  function onQueue (state) {
    message.send(formatQueue(state))
  }

  if (flags.first) {
    if (!isAdmin) return message.send('Nope.')
    socket.emit('requeue', { id: request.id, where: 'first' }, onQueue)
  } else if (flags.before) {
    if (!isAdmin) return message.send('Nope.')
    socket.emit('requeue', { id: request.id, where: 'before' }, onQueue)
  } else if (flags.after) {
    socket.emit('requeue', { id: request.id, where: 'after' }, onQueue)
  } else {
    socket.emit('requeue', { id: request.id, where: 'last' }, onQueue)
  }
}
