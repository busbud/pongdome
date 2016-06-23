module.exports = function cotw ({ socket, message }) {
  socket.emit('biggest-crush', crush => {
    message.send(`Biggest crush of the week is ${crush.winner_name} vs. ${crush.loser_name}, ${crush.winner_points} to ${crush.loser_points}.`);
  });
}
