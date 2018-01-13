const electron = require('electron')
const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')

//require('electron-reload')(__dirname)

let win = null;

app.on('ready', () => {

    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize

    win = new BrowserWindow({
        height: height / 1.5,
        width: width / 2.5,
        maxHeight: 960, 
        maxWidth: 1024,
        minHeight: 720,
        minWidth: 768,
        frame: false,
        icon: path.join(__dirname, 'app/build/512x512.png')
    })

    win.loadURL('file://' + __dirname + '/app/index.html')

    win.webContents.openDevTools()
})

ipcMain.on('minimise', (event, arg) => {
  win.minimize()
})

ipcMain.on('close', (event, arg) => {
  app.quit()
})
