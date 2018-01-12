const electron = require('electron')
const { app, BrowserWindow } = require('electron')
const path = require('path')

app.on('ready', () => {

    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize

    let win = new BrowserWindow({
        height: height / 1.5,
        width: width / 4,
        frame: false,
    })

    win.loadURL(path.join(__dirname, '/app/index.html'))
})
