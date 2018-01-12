const { app, BrowserWindow } = require('electron')
const path = require('path')

app.on('ready', () => {
    let win = new BrowserWindow({
        height: 800,
        width: 500,
        frame: false,
    })

    win.loadURL(path.join(__dirname, '/app/index.html'))
})
