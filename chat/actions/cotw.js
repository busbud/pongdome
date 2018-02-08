module.exports = function cotw ({ api, message }) {
  api.emit('biggest-crush', crush => {
    message.send(`Biggest crush of the week is ${crush.winner_name} vs. ${crush.loser_name}, ${crush.winner_points} to ${crush.loser_points}.`)
  })
}
