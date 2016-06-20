'use strict';

const electron = require('electron');
// Module to control application life.
const app = electron.app;
// Module to create native browser window.
//const BrowserWindow = electron.BrowserWindow;
const {BrowserWindow} = require('electron');

const Menu = electron.Menu;

const MenuItem = electron.MenuItem;

const Dialog = require('electron').dialog;

const nativeImage = require('electron').nativeImage;

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
                var filename = filelist[i].substr(filelist[i].lastIndexOf('\\')+1);
                if(!winContainer.hasOwnProperty(filename)){
                  var img = nativeImage.createFromPath(filelist[i]);
                  var size = img.getSize();
                  var newTileWin = new BrowserWindow({width:size.width+65, height:size.height+65,title:filename, autoHideMenuBar:true});
                  newTileWin.loadURL('file://' + __dirname + '/tiles.html');
                  newTileWin.winID = filename;
                  newTileWin.file = filelist[i]; //将参数传送进去
                  newTileWin.img = img;
                  newTileWin.imgData = img.toDataURL();
                  newTileWin.webContents.openDevTools();
                  //其实windows有自己的唯一ID，但是我们需要判断打开的文件是否已打开，所以就用文件名当ID了
                  winContainer[filename] = newTileWin;
                  newTileWin.on('closed', function() {
                    delete winContainer[this.winID];
                  });
                }
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

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
//let mainWindow;
let winContainer = {};

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
