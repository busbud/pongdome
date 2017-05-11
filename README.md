# ![PongDome][pongdome-logo]

[![PongDome][pongdome-preview]][pongdome-video]

[pongdome-logo]: https://cdn.rawgit.com/busbud/pongdome/master/web/img/logo.svg
[pongdome-preview]: https://cdn.rawgit.com/busbud/pongdome/assets/preview.jpg
[pongdome-video]: https://cdn.rawgit.com/busbud/pongdome/assets/pongdome.webm

PongDome is Busbud's *revolutionary* ping pong setup.

* Challenge your teammates from the company's chat.
* Count the points and current serving on a TV screen using push buttons.
* Track all the games played and display a leaderboard with the players' [Elo][elo].

[elo]: https://en.wikipedia.org/wiki/Elo_rating_system

## Status

| App | Dependencies | devDependencies |
| --- | ------------ | --------------- |
| [Shared](package.json) | [![Dependency status](https://david-dm.org/busbud/pongdome.svg)](https://david-dm.org/busbud/pongdome) | [![devDependency status](https://david-dm.org/busbud/pongdome/dev-status.svg)](https://david-dm.org/busbud/pongdome#info=devDependencies) |
| [API](api/package.json) | [![Dependency status](https://david-dm.org/busbud/pongdome.svg?path=api)](https://david-dm.org/busbud/pongdome?path=api) | [![devDependency status](https://david-dm.org/busbud/pongdome/dev-status.svg?path=api)](https://david-dm.org/busbud/pongdome?path=api#info=devDependencies) |
| [Chat](chat/package.json) | [![Dependency status](https://david-dm.org/busbud/pongdome.svg?path=chat)](https://david-dm.org/busbud/pongdome?path=chat) | [![devDependency status](https://david-dm.org/busbud/pongdome/dev-status.svg?path=chat)](https://david-dm.org/busbud/pongdome?path=chat#info=devDependencies) |
| [GPIO](gpio/package.json) | [![Dependency status](https://david-dm.org/busbud/pongdome.svg?path=gpio)](https://david-dm.org/busbud/pongdome?path=gpio) | [![devDependency status](https://david-dm.org/busbud/pongdome/dev-status.svg?path=gpio)](https://david-dm.org/busbud/pongdome?path=gpio#info=devDependencies) |
| [Web](web/package.json) | [![Dependency status](https://david-dm.org/busbud/pongdome.svg?path=web)](https://david-dm.org/busbud/pongdome?path=web) | [![devDependency status](https://david-dm.org/busbud/pongdome/dev-status.svg?path=web)](https://david-dm.org/busbud/pongdome?path=web#info=devDependencies) |
| [Electron](electron/package.json) | [![Dependency status](https://david-dm.org/busbud/pongdome.svg?path=electron)](https://david-dm.org/busbud/pongdome?path=electron) | [![devDependency status](https://david-dm.org/busbud/pongdome/dev-status.svg?path=electron)](https://david-dm.org/busbud/pongdome?path=electron#info=devDependencies) |

## Setup

### Prerequisites

* A [Raspberry Pi][rpi]. Current instructions are tested with the
  [Raspberry Pi 3 Model B][rpi3b], with [Raspbian Jessie Lite][raspbian].
* A screen.
* A [breadboard][breadboard].
* A [T-Cobbler][t-cobbler].
* 4 push buttons (ideally 2 [green][green] and 2 [red][red]).
* 8 wires to connect the buttons, size should allow to connect the
  buttons (on the ping pong table) to the breadboard.
* 4 [resistors, 2.2k ohm 5%][resistors].

[rpi]: https://www.raspberrypi.org/
[raspbian]: https://www.raspberrypi.org/downloads/raspbian/
[rpi3b]: https://www.raspberrypi.org/products/raspberry-pi-3-model-b/
[breadboard]: https://www.adafruit.com/products/64
[t-cobbler]: https://www.adafruit.com/products/2028
[green]: https://www.adafruit.com/products/475
[red]: https://www.adafruit.com/products/472
[resistors]: https://www.adafruit.com/products/2782

### Wiring everything together

* Plug the Raspberry PI and the screen to a power outlet.
* Plug the T-Cobbler to the breadboard (make sure the ribbon cable is
  plugged in the right way, the ribbon should be to the outre side of
  the Raspberry PI).
* Wire the 3V to the `+` column on the outer side of the breadboard, and
  the ground one to the `-` column.
* Wire one connector of each button to this same `+` column.
* The other connector of each button should go in a unique line not
  covered by the T-Cobbler on the breadboard. Then on that line, wire a
  resistor to the GPIO of your choice for that button, and another
  resistor to the ground.

![Diagram][diagram]

[diagram]: https://cdn.rawgit.com/busbud/pongdome/assets/diagram.png

Diagram made using [Fritzing](http://fritzing.org/) with the
[AdaFruit Library](https://github.com/adafruit/Fritzing-Library).

This way of wiring button is from the [onoff module documentation][onoff].

[onoff]: https://github.com/fivdi/onoff#usage

In that example, the buttons GPIO mapping is the following:

* Player one red: #5
* Player one green: #6
* Player two red: #20
* Player two green: #21

Here's what it looks like on our side (approximately respecting the
diagram):

![Setup 1][setup-1] ![Setup 2][setup-2]

[setup-1]: https://cdn.rawgit.com/busbud/pongdome/assets/setup-1.jpg
[setup-2]: https://cdn.rawgit.com/busbud/pongdome/assets/setup-2.jpg

#### Debugging

Use the following script to watch the status of all GPIOs in near real time:

```sh
watch -d -n 0.5 gpio readall
```

This will display a table of all GPIOs, their mode (input/output) and
current value.

When the value of a GPIO change, it will be highlighted so it's easier
to notice.

So you can just run this, and mess with the connections and buttons and
see how it affects the value read from GPIOs.

### Raspbian

First install [Raspbian Jessie Lite][raspbian] following the
official [instructions][raspbian-instructions].

[raspbian-instructions]: https://www.raspberrypi.org/documentation/installation/installing-images/README.md

### Configure the WiFi

Connect a screen and a keyboard.

Login with user `pi` and password `raspberry`, and run `sudo su -` to be
`root`.

Add the following to `/etc/wpa_supplicant/wpa_supplicant.conf` (using
your WiFi SSID and password):

```
network={
  ssid="foo"
  psk="bar"
}
```

Save and run `wpa_cli reconfigure`. After a few seconds, it should be
connected to your WiFi (check using the `ip address` command).

### Configure SSH

Still as `root`, run `raspi-config`. Go in "Interfacing Options", "SSH",
and enable SSH remote access.

### Install the needed packages

```sh
apt install tmux vim git wiringpi postgresql xserver-xorg-legacy xinit chromium-browser unclutter
```

* `wiringpi` is not needed for PongDome to run but is useful for
  manipulating GPIOs from the shell using the `gpio` command.
* Don't install `postgresql` if you want to use an external database.
* We use `xserver-xorg-legacy` to be able to run `xinit` as user
  instead of `root`.

Then run `exit` to go back as a regular user where we'll continue the
installation.

### Extra configuration

If you want to start PongDome from a SSH session, run the following as
root to allow SSH users to start a X11 session:

```sh
sed -i '/allowed_users/s/console/anybody/' /etc/X11/Xwrapper.config
```

**Source:** <http://karuppuswamy.com/wordpress/2010/09/26/how-to-fix-x-user-not-authorized-to-run-the-x-server-aborting/>

To prevent black borders on the screen, run the following as root
(uncomments the `disable_overscan=1` line in `/boot/config.txt`):

```sh
sed -i '/disable_overscan/s/#//' /boot/config.txt
```

**Source:** <http://www.opentechguides.com/how-to/article/raspberry-pi/28/raspi-display-setting.html>

To make sure Chromium takes up the whole screen, set the screen size in
its preferences (set your proper resolution):

```sh
echo '{"browser":{"window_placement":{"bottom": 1080,"left": 0,"maximized": true,"right": 1920,"top": 0}}}' > ~/.config/chromium/Default/Preferences
```

**Source:** <https://askubuntu.com/questions/124564/google-chrome-kiosk-screen-does-not-maximize>

### PongDome

First, clone the repository:

```
git clone https://github.com/busbud/pongdome
cd pongdome
```

We'll install the required Node.js version using [nvm]:

[nvm]: https://github.com/creationix/nvm

```sh
git clone https://github.com/creationix/nvm ~/.nvm
echo 'source ~/.nvm/nvm.sh' >> ~/.bashrc # To persistently have nvm in your shell
source ~/.nvm/nvm.sh # To load nvm now
nvm install # To install the Node.js version needed by PongDome
```

Then install the npm dependencies, run build steps, copy default
configuration:

```sh
./install
```

Update `api/config.json` to set your `db` URL. Also setup the schema with:

```sh
createdb pongdome
psql pongdome < api/sql/schema.sql
```

Update `chat/config.js` to use and configure your [stdbot][stdbot]
adapter. You'll need to `npm install` the stdbot adapter of your choice
before.

[stdbot]: https://github.com/stdbot/stdbot

Update `gpio/config.json` to associate GPIO pins to buttons.

For the diagram shown earlier, it would look like:

```json
{
  "api": "http://localhost:4242",
  "playerOne": {
    "green": 6,
    "red": 5
  },
  "playerTwo": {
    "green": 21,
    "red": 20
  }
}
```

You can then start everything in a kiosk Chromium instance with:

```sh
xinit ./start-app
```

## Testing

To simulate a game, you can call the following functions in the
development tools console.

### Start game

The thread ID is the UID for a every game. It's gotta change for every
game you simulate otherwise you'll start getting database errors when
saving matches.

```js
api.emit('match', {
  id: '1234',
  challenger: {
    id: '1234',
    name: 'Player One'
  },
  challengee: {
    id: '4567',
    name: 'Player Two'
  }
})
```

### Increment/decrement player

```js
api.emit('increment-player-one')
api.emit('increment-player-two')
api.emit('decrement-player-one')
api.emit('decrement-player-two')
```

### End game

Ends a match and/or game depending on the score.

```js
api.emit('end-game')
```

## Auto starting the app on boot

You can do this with an `@reboot` entry in the crontab:

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
./install
xinit ./start-app
^B D
```

## History and thanks

This project was initially developed in two days, during the
[summer 2015 Busbud hackaton][hackaton], by [Dustin][dustin] and
[Cole][cole].

At this time, it was only working for our Flowdock, our managed
database, our TV, and was nearly totally undocumented. While it was not
portable, it was perfect for us!

PongDome was continuously improved at our lost hours with new
contributors in the company, [Simon][simon], [Chris][chris], [Tim][tim]
and [Val][val].

Val always believed that PongDome ought to be open source, and
surrounded himself with [Pec][pec], [Dorian][dorian], [Daniel][daniel]
and [Issam][issam] during the spring 2016 hackaton to achieve this.

The new version featured a brand new responsive design, a Hubot
integration and challenge/accept system rewrite to allow usage with any
chat system, adaptations to configure the database, a complete
documentation and code cleaning (even there is still a lot of room for
improvement on both points), and a [presentation video][pongdome-video]
by [Legato Productions][legato].

We then squashed everything in a new public repository, with a MIT
license, and here begins the new free and open source life of PongDome!

[hackaton]: https://www.busbud.com/blog/busbuds-hackathon-got-six-awesome-projects-done-two-days/
[dustin]: https://github.com/dustinblackman
[cole]: https://github.com/Cole-macd
[simon]: https://github.com/smaspe
[chris]: https://github.com/Chris911
[tim]: https://github.com/TimmyCarbone
[val]: https://github.com/valeriangalliat
[pec]: http://www.pec-design.com/
[dorian]: https://twitter.com/doriantalks
[daniel]: https://www.facebook.com/StaticGold
[issam]: https://github.com/killix
[legato]: http://www.legatomontreal.com/
