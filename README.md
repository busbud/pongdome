# ![PongDome](https://cdn.rawgit.com/busbud/pongdome/master/app/images/logo.svg)

![PongDome](https://blog-assets.busbud.com/wp-content/uploads/2015/08/pingpongsetup.png)

PongDome is Busbud's *revolutionary* ping pong setup.

* Challenge your teammates from the company's chat.
* Count the points and current serving on a TV screen using push buttons.
* Track all the games played and display a leaderboard with the players' [Elo][elo].

[elo]: https://en.wikipedia.org/wiki/Elo_rating_system

## Setup

### Prerequisites

* A [Raspberry Pi][rpi]. Current instructions are tested with the
  [Raspberry Pi 2 Model B][rpi2b], with [Raspbian][raspbian] Jessie, but
  we now advise to take the [Raspberry Pi 3 Model B][rpi3b], since it
  includes WiFi, you won't have to buy an additional WiFi USB adapter.
* A screen.
* A [breadboard][breadboard].
* A [T-Cobbler][t-cobbler].
* 4 push buttons (ideally 2 [green][green] and 2 [red][red]).
* 8 wires to connect the buttons, size should allow to connect the
  buttons (on the ping pong table) to the breadboard.
* 4 [resistors, 2.2k ohm 5%][resistors].

[rpi]: https://www.raspberrypi.org/
[rpi2b]: https://www.raspberrypi.org/products/raspberry-pi-2-model-b/
[raspbian]: https://www.raspbian.org/
[rpi3b]: https://www.raspberrypi.org/products/raspberry-pi-3-model-b/
[breadboard]: https://www.adafruit.com/products/64
[t-cobbler]: https://www.adafruit.com/products/2028
[green]: https://www.adafruit.com/products/475
[red]: https://www.adafruit.com/products/472
[resistors]: https://www.adafruit.com/products/2782

### Wiring everything together

* Plug the Raspberry PI and the screen to a power outlet.
* Plug the T-Cobbler to the breadboard.
* Wire the 3V or 5V pin (usually the first one on the T-Cobbler) to the
  `+` column on the outer side of the breadboard.
* Wire one connector of each button to this same `+` column.
* Put 4 resistors, each one between a unique pin on the T-Cobbler area,
  and a unique pin on the free area.
* Wire each button's other connector to a line on the breadboard (pick a
  unique one on the part not covered by the T-Cobbler where a resistor
  is plugged).

**Note:** remember the line numbers where you plugged the resistor on
the T-Cobbler area, they'll be the GPIO ports you'll have to listen on.

### Raspberry Pi

A couple of things needs to be configured on the Raspberry PI for
PongDome to work properly, mostly settings related to power saving,
which does not play well with a server that should be up permanently.

#### Configure the WiFi

If you're not connected by ethernet, the easiest way to configure the
WiFi is to use `wicd-curses`:

```sh
apt install wicd-curses
wicd-curses
```

Select your network, press right to configure it, and check
"Automatically connect to this network".

Type your WiFi password below, and press F10 to save.

#### Automatic desktop log in

Since PongDome is meant to run without keyboard/mouse, we need it to
automatically start a desktop session.

For this, run `raspi-config` as `root`, select `Enable Boot to
Desktop/Scratch` then `Desktop Log in as user 'pi' at the graphical
desktop`, and press enter.

See it live on [asciinema](https://asciinema.org/a/cubcwv6esyt9q0n9pofxiyv08).

#### Prevent the screen from sleeping

Add the following to `/etc/lightdm/lightdm.conf`, in the `SeatDefaults`
section:

```conf
xserver-command=X -s 0 -dpms
```

[Source](http://raspberrypi.stackexchange.com/questions/2059/disable-screen-blanking-in-x-windows-on-raspbian).

You also need to set the following in `/etc/kbd/config`:

```conf
BLANK_TIME=0
POWERDOWN_TIME=0
```

[Source](https://www.reddit.com/r/raspberry_pi/comments/3eydc3/how_do_i_disable_sleep_mode_on_my_raspberry_pi/).

#### Install PostgreSQL

PongDome uses a database and use PostgreSQL specific features.

```sh
apt install postgresql
```

#### Install [`nvm`][nvm]

[nvm]: https://github.com/creationix/nvm

```sh
curl -o- https://raw.githubusercontent.com/creationix/nvm/master/install.sh | bash
```

### Application

Clone this repository, for example in `pi` home directory:

```sh
git clone https://github.com/busbud/pongdome.git
```

The rest of this readme assumes this location for `pongdome` and
the user `pi`.

In the `app` directory you'll find a `config.json.dist` file. Fill in
the blanks and save it as `config.json`. Here's an example of what one
would look like, using a `pongdome` database locally:

```json
{
  "pg": "pongdome",
  "buttons": {
    "player_one": {
      "red": 19,
      "green": 26
    },
    "player_two": {
      "red": 16,
      "green": 20
    }
  }
}
```

The following will set you up with the correct Node.js version,
database, and get an environment running for you:

```sh
nvm install
nvm use
npm install
npm run db:create
npm start
```

### Hubot

PongDome uses [Hubot][hubot] to communicate with your chat system.

[hubot]: https://hubot.github.com/

Go in the `hubot` directory and run the following, example for using
Flowdock adapter:

```sh
nvm use
npm install
npm install hubot-flowdock
export HUBOT_FLOWDOCK_API_TOKEN=your-token
npm start flowdock
```

## Testing

To simulate a game, you can call the following functions in the
development tools console.

### Start game

The thread ID is the UID for a every game. It's gotta change for every
game you simulate otherwise you'll start getting database errors when
saving matches.

```js
pushQueue({
  thread_id: '1234',
  player_one: {
    id: '1234',
    name: 'Player One'
  },
  player_two: {
    id: '4567',
    name: 'Player Two'
  }
});
```

#### Increment/decrement player

These are the same functions that are called when a button is pressed.

```js
incrementPlayer(1);
decrementPlayer(2);
```

#### End game

Ends a match and/or game depending on the score.

```js
endGame();
```

## Auto starting the app on boot

This is done with an `@reboot` entry in the crontab:

```sh
crontab -e
```

```crontab
@reboot /home/pi/pongdome/start-session
```

The `start-session` script starts an `app` tmux session and runs the app
inside, so you can attach to it when you connect.

## Updating

First SSH in the Raspberry PI (default is user `pi` and password
`raspberry`).

Using `tmux ls` you can see what session the app is running in. It's
usually `app`. The session is by default started in the busbud-pingpong
directory where `start-app` exists.

Then attach the session, kill the currently running app, pull the latest
version, and restart it:

```sh
tmux attach -t app
^C
git pull
./start-app
^B D
```
