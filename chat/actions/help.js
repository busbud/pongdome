const helpText = `Here's all the PongDome commands:

* \`#challenge @player\`: challenge \`@player\` for a game
* \`#accept\`: accept a challenge
* \`#cancel\`: cancel the game
* \`#challenge @player #forfun\`: challenge \`@player\` for an unranked game
* \`#openchallenge\`: create an open challenge, anybody can accept it
* \`#lead\` or \`#leaderboard\`: show the leaderboard
* \`#queue\`: show the current games queue
* \`#requeue\`: put a game at the end of the queue
* \`#requeue #after\`: put a game one game behind in the queue
* \`#streak\`: show your own streak
* \`#streak @player\`: show a player's streak
* \`#streak @player1 @player2\`: show the streak between two players
* \`#h2h @player\`: show the head to head wins between a player and you
* \`#h2h @player1 @player2\`: show the head to head wins between two players
* \`#cotw\`: show the crush of thre week
* \`#help\`: show this message`

module.exports = function help ({ message }) {
  message.send(helpText)
}
