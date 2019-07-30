const helpText = `Here's all the PongDome commands:

* \`#challenge @player\`: challenge \`@player\` for a game
* \`#accept\`: (in a challenge thread) accept a challenge
* \`#cancel\`: (in a challenge thread) cancel the game
* \`#challenge @player #forfun\`: challenge \`@player\` for an unranked game
* \`#openchallenge\`: create an open challenge, anybody can accept it
* \`#forcechallenge @player\`: challenge a player without them needing to accept
* \`#forcechallenge @player1 @player2\`: force two players to play together
* \`#guest player\`: create a (unranked for obvious reasons) game between you and a guest
* \`#guest player1 player2\`: create a (unranked for obvious reasons) game between two guests
* \`#lead\` or \`#leaderboard\`: show the leaderboard
* \`#queue\`: show the current games queue
* \`#requeue\`: (in a thread) put the game at the end of the queue
* \`#requeue #after\`: (in a thread) put the game one game behind in the queue
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
