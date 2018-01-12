const electron = require('electron')
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

require('electron-reload')(__dirname)

let win = null;

app.on('ready', () => {

    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize

    let win = new BrowserWindow({
        height: height / 1.5,
        width: width / 2.5,
        frame: false,
        icon: path.join(__dirname, 'app/build/512x512.png')
    })

    win.loadURL('file://' + __dirname + '/app/index.html')

    win.webContents.openDevTools()
})

ipcMain.on('minimise', (event, arg) => {
  win.minimize()
})

ipcMain.on('maximise', (event, arg) => {
  win.maximize()
})

ipcMain.on('close', (event, arg) => {
  app.quit()
})
