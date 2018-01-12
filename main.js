const electron = require('electron')
const { app, BrowserWindow } = require('electron')
const path = require('path')

app.on('ready', () => {

    const {width, height} = electron.screen.getPrimaryDisplay().workAreaSize

    let win = new BrowserWindow({
        height: height / 1.5,
        width: width / 2.5,
        frame: false,
        icon: path.join(__dirname, 'app/build/512x512.png')
    })

    win.loadURL(path.join(__dirname, 'app/index.html'))
})
