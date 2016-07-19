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

const iconFile = __dirname + "/assets/icon/m.ico";

var template = [
  {
    label: '文件',
    submenu: [
      {
        label: '新建',
        click: function(item, focusedWindow) {
          focusedWindow.webContents.send('newMap');
        }
      },
      {
        label: '打开',
        click: function(item, focusedWindow) {
          Dialog.showOpenDialog( 
            {
              filters:[ {name: 'Project', extensions: ['map']} ],
              properties : ['openFile']
            },
            function(filelist){
              //focusedWindow.webContents.send('loadTileFile', fileName);
              if(filelist){
                openMapProject(filelist[0], focusedWindow);
              }
            }
          );
        }
      },
      {
        label: '保存地图',
        click: function(item, focusedWindow) {
          focusedWindow.webContents.send('save');
        }
      },
      {
        label: '导入新图块',
        click: function(item, focusedWindow) {
          Dialog.showOpenDialog( 
            {
              filters:[ { name: 'Images', extensions: ['png'] } ],
              properties : ['openFile']
            },
            function(filelist){
              //focusedWindow.webContents.send('loadTileFile', fileName);
              if(filelist){
                for(var i in filelist){
                  let tilewin = createTileWindow(filelist[i], focusedWindow);
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
let projectNum = 0;
let mainWinContainer = {};
let tileContainer = {};   //每个工程指定一个tile集 id:{tileWindow}
let projectContainer = {};

//用于Map工程保存
var projectMainPath = null;
var projectMapData = null;
ipc.on('project-save', function(event, mapData, pid){
  projectMapData = mapData;
  if(!projectContainer.hasOwnProperty(pid)){
    let filelist = Dialog.showSaveDialog({
      filters: [
        {name: 'Project', extensions: ['map']}
      ]
    });
    if(filelist){
      saveMapProject(filelist);
      projectContainer[pid] = filelist;
    }
    event.returnValue = true;
  } else{
    saveMapProject(projectContainer[pid]);
    event.returnValue = true;
  }
});

ipc.on('tile-save', function(event, filename, tileData, pid, noMsgBox){
  let win = tileContainer[pid][filename];
  //let jsonfilepath = win.filedir + win.filename + '.json';
  let fd = fs.openSync(win.datafile, 'w');
  fs.writeSync(fd, JSON.stringify(tileData));
  fs.closeSync(fd);
  if(noMsgBox)
    return;
  Dialog.showMessageBox(win, {
    type: "info",
    buttons: ["确定"],
    title: "保存",
    message: "保存成功，保存路径：" + win.datafile,
  });
});

ipc.on('opentile', function(event, winId, filepath){
  let mainwin = BrowserWindow.fromId(winId);
  createTileWindow(filepath, mainwin);
});

ipc.on('deletetile', function(event, winId, filename){
  let mainwin = BrowserWindow.fromId(winId);
  if(tileContainer[mainwin.pid].hasOwnProperty(filename)){
    tileContainer[mainwin.pid][filename].close();
  }
});

function openMapProject(filepath, focusedWindow){
  let data = fs.readFileSync(filepath, 'utf8');
  projectContainer[projectNum] = filepath;
  createWindow(data);
}

function saveMapProject(filepath){
  if(projectMapData != null){
    //清洗数据
    for(var tileID in projectMapData.Tiles){
      delete projectMapData.Tiles[tileID].MTile;
      delete projectMapData.Tiles[tileID].imgdata;
    }
    console.log(filepath);
    let fd = fs.openSync(filepath, 'w');
    fs.writeSync(fd, JSON.stringify(projectMapData));
    fs.closeSync(fd);
  }
}

function createTileWindow(filepath, focusedWindow){
  let filename = filepath.substr(filepath.lastIndexOf('\\')+1);
  let filedir = filepath.substr(0, filepath.lastIndexOf('\\') + 1);
  let newTileWin = null;
  let tileSet = tileContainer[focusedWindow.pid]
  if(!tileSet.hasOwnProperty(filename)){
    let img = nativeImage.createFromPath(filepath);
    let size = img.getSize();
    if(size.width == 0 && size.height == 0){
      console.log("Open Tile Error img load");
      return newTileWin;
    }
    newTileWin = new BrowserWindow({width:size.width+65, height:size.height+65, title:filename, icon:iconFile});
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
    newTileWin.mainWinID = focusedWindow.id;
    newTileWin.pid = focusedWindow.pid;
    newTileWin.imgData = img.toDataURL();
    newTileWin.webContents.openDevTools();
    //其实windows有自己的唯一ID，但是我们需要判断打开的文件是否已打开，所以就用文件名当ID了
    tileSet[filename] = newTileWin;
    newTileWin.on('closed', function() {
      console.log("closeWin: ", this.filename);
      delete tileContainer[this.pid][this.filename];
    });
  } else{
    tileSet[filename].focus();
  }
  return newTileWin;
}

function createWindow (mapData) {
  // Create the browser window.
  mainWinContainer[projectNum] = new BrowserWindow({width: 800, height: 600, icon:iconFile});

  var menu = Menu.buildFromTemplate(template);

  Menu.setApplicationMenu(menu);

  // and load the index.html of the app.
  mainWinContainer[projectNum].loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools.
  mainWinContainer[projectNum].webContents.openDevTools();

  //Set project id bind to windows
  mainWinContainer[projectNum].pid = projectNum;

  //Init the tile Container
  tileContainer[projectNum] = {};

  //transfor the map data
  if(mapData){
    mainWinContainer[projectNum].isDefaultMap = false;
  } else{
    mainWinContainer[projectNum].isDefaultMap = true;
  }
  mainWinContainer[projectNum].mapData = mapData;

  // Emitted when the window is closed.
  mainWinContainer[projectNum].on('closed', function(event) {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    let pid = this.pid;
    for(var winID in tileContainer[pid]){
        //Todo：关闭当前的工程相关的窗口
        console.log(winID);
        tileContainer[pid][winID].close();
    }
    tileContainer[pid] = null;
    mainWinContainer[pid] = null;
    delete projectContainer[pid];
  });

  projectNum += 1;
}

function initCreateWindow(){
  createWindow();
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', initCreateWindow);

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipc.on('haha-test', function(event, a){
  console.log(event, a);
});