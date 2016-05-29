require('../api')
require('../chat')

if (process.platform !== 'darwin') {
  require('../gpio')
}

const electron = require('electron')
const { app } = electron
const { BrowserWindow } = electron

app.on('window-all-closed', () => app.quit())

app.on('ready', () => {
  let mainWindow = new BrowserWindow({
    fullscreen: process.env.NODE_ENV === 'production',
    width: 1920,
    height: 1080,
    center: true,
    resizable: true,
    title: 'PongDome'
  })

  mainWindow.loadURL(`file://${__dirname}/../web/index.html`)

  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools()
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
})
