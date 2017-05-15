const cp = require('child_process')
const moment = require('moment')
const io = require('socket.io-client')

const config = require('./config')

const socket = io(config.api)

let process
let file
let startRecordingTime = 0
let lastProgress = 0
let timer = 0
let currentMatch = 0

function formatDuration(duration) {
  const pad = n => n < 10 ? `0${n}` : n
  const d = new Date(duration)
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}.${d.getUTCMilliseconds()}`
}

function record(match) {
  file = `${moment().format('YYYY-MM-DD/HH.mm.ss')}-${match.playerOne.name}-${match.playerTwo.name}.mkv`
  console.log('record', file)

  process = cp.spawn('ffmpeg', '-loglevel error -f v4l2 -video_size 640x480 -i /dev/video0 -f alsa -ac 1 -i hw:1 -c:v h264_omx -c:a aac -f matroska -'.split(' '), { stdio: ['ignore', 'pipe', 2] })
  const ssh = cp.spawn('ssh', ['pong@192.168.1.215', './record', file], { stdio: ['pipe', 1, 2] })
  process.stdout.pipe(ssh.stdin)

  startRecordingTime = Date.now()
  console.log('startRecordingTime', startRecordingTime)
}

// Make sure webcam is running if it's not already
function ensureRecord(match) {
  if (!process || process.exitCode !== null) record(match)
}

// Make sure recurding is off
function ensureKill() {
  if (process) process.kill('SIGINT')
}

socket.on('progress', match => {
  currentMatch = match
  ensureRecord(match)
  lastProgress = Date.now()
  console.log('lastProgress', lastProgress)

  // Kill recording if no activity for 1 minute
  clearTimeout(timer)
  timer = setTimeout(() => {
    console.log('No activity for 1 minute, killing process')
    ensureKill()
  }, 1000 * 60)
})

socket.on('capture', () => {
  const output = `${moment().format('YYYY-MM-DD/HH.mm.ss')}-${currentMatch.playerOne.name}-${currentMatch.playerTwo.name}-action.mkv`
  console.log('capture', file, output)

  const start = formatDuration(lastProgress - startRecordingTime)
  console.log('start', start)
  const duration = formatDuration(Date.now() - lastProgress)
  console.log('duration', duration)

  cp.spawn('ssh', ['pong@192.168.1.215', './cut', file, start, duration, output], { stdio: 'inherit' })
})

socket.on('end', ensureKill)
socket.on('cancel', ensureKill)
