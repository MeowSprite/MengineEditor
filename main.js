'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
//const BrowserWindow = electron.BrowserWindow;
const {BrowserWindow} = require('electron');

const Menu = electron.Menu;

const MenuItem = electron.MenuItem;

const Dialog = electron.dialog;

const nativeImage = electron.nativeImage;

const ipc = electron.ipcMain;

const fs = require('fs');

var template = [
  {
    label: '文件',
    submenu: [
      {
        label: '新建',
        click: function(item, focusedWindow) {
          winContainer[0].webContents.send('newMap');
        }
      },
      {
        label: '导入新图块',
        click: function(item, focusedWindow) {
          Dialog.showOpenDialog( 
            {
              filter:[ { name: 'Images', extensions: ['jpg', 'png', 'gif'] } ],
              properties : ['openFile']
            },
            function(filelist){
              //focusedWindow.webContents.send('loadTileFile', fileName);
              for(var i in filelist){
                let tilewin = createTileWindow(filelist[i]);
                if(tilewin != null)
                  winContainer[0].webContents.send('addTile', tilewin);
              }
            }
          );
        }
      },
      {
        label: 'Toggle Developer Tools',
        accelerator: (function() {
          if (process.platform == 'darwin')
            return 'Alt+Command+I';
          else
            return 'Ctrl+Shift+I';
        })(),
        click: function(item, focusedWindow) {
          if (focusedWindow)
            focusedWindow.toggleDevTools();
        }
      },
    ]
  },
];


var tileMenu = [
  {
    label: '文件',
    submenu: [
      {
        label: '保存',
        click: function(item, focusedWindow){
          focusedWindow.webContents.send('save');
        }
      }
    ]
  },
];

let tilemenu = Menu.buildFromTemplate(tileMenu);
// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
//let mainWindow;
let winContainer = {};

ipc.on('tile-save', function(event, filename, tileData){
  let win = winContainer[filename];
  //let jsonfilepath = win.filedir + win.filename + '.json';
  let fd = fs.openSync(win.datafile, 'w');
  fs.writeSync(fd, JSON.stringify(tileData));
  fs.closeSync(fd);
  Dialog.showMessageBox(win, {
    type: "info",
    buttons: ["确定"],
    title: "保存",
    message: "保存成功，保存路径：" + win.datafile,
  });
});

ipc.on('opentile', function(event, filepath){
  createTileWindow(filepath);
});

ipc.on('deletetile', function(event, filename){
  if(winContainer.hasOwnProperty(filename)){
    winContainer[filename].close();
  }
});

function createTileWindow(filepath){
  let filename = filepath.substr(filepath.lastIndexOf('\\')+1);
  let filedir = filepath.substr(0, filepath.lastIndexOf('\\') + 1);
  let newTileWin = null;
  if(!winContainer.hasOwnProperty(filename)){
    let img = nativeImage.createFromPath(filepath);
    let size = img.getSize();
    newTileWin = new BrowserWindow({width:size.width+65, height:size.height+65,title:filename});
    newTileWin.setMenu(tilemenu);
    newTileWin.loadURL('file://' + __dirname + '/tiles.html');
    newTileWin.filename = filename;
    newTileWin.file = filepath; //将参数传送进去
    newTileWin.datafile = newTileWin.file + '.json';
    newTileWin.tiledata = "";
    if(fs.existsSync(newTileWin.datafile)){
      newTileWin.tiledata = fs.readFileSync(newTileWin.datafile, 'utf8');
    }
    newTileWin.img = img;
    newTileWin.mainWinID = winContainer[0].id;
    newTileWin.imgData = img.toDataURL();
    newTileWin.webContents.openDevTools();
    //其实windows有自己的唯一ID，但是我们需要判断打开的文件是否已打开，所以就用文件名当ID了
    winContainer[filename] = newTileWin;
    newTileWin.on('closed', function() {
      delete winContainer[this.filename];
    });
  } else{
    winContainer[filename].focus();
  }
  return newTileWin;
}

function createWindow () {
  // Create the browser window.
  winContainer[0] = new BrowserWindow({width: 800, height: 600});

  var menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  winContainer[0].loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  winContainer[0].webContents.openDevTools();

  // Emitted when the window is closed.
  winContainer[0].on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    for(var winID in winContainer){
      if(winID != 0){
        winContainer[winID].close();
      }
    }
    winContainer[0] = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', createWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (winContainer[0] === null) {
    createWindow();
  }
});
