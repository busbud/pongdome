'use strict';

const app = require('app');
const BrowserWindow = require('browser-window');
let mainWindow = null;

app.on('window-all-closed', function() {
  return app.quit();
});

app.on('ready', function() {
  const params = {
    fullscreen: process.env.NODE_ENV === 'production',
    width: 1920,
    height: 1080,
    center: true,
    resizable: true,
    show: false,
    title: 'PongDome'
  };

  mainWindow = new BrowserWindow(params);
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  if (process.env.NODE_ENV !== 'production') {
    mainWindow.openDevTools();
  }

  mainWindow.webContents.on('did-finish-load', function() {
    mainWindow.show();
  });

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
