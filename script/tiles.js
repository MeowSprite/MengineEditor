//const ipc = require('electron').ipcRender
const remote = require('electron').remote;
const ipc = require('electron').ipcRenderer;

var MTile = {
    file : "",
    imgWidth : 0, //真实图片大小
    imgHeight: 0,
    TileX : 0, //图像切块
    TileY : 0,
    TileWidth : 48,  //图像需要支持长方形吗
    subBlocks : 4,   //如果图像只是正方形，那这样就可以
    tiles : []  //块
};

Blocks = {
    id : 0,
    blocks : []
};

$(function(){
    var curWin = remote.getCurrentWindow();
    var mainWin = remote.BrowserWindow.fromId(curWin.mainWinID);
    if(!curWin.hasOwnProperty('img')){
        return;
    }
    ipc.on('save', function(event, msg){
        //$("#new").show();
        ipc.send('tile-save', curWin.filename, MTile, curWin.pid);
    });
    if(curWin.tiledata !== ""){
        MTile = JSON.parse(curWin.tiledata);
    }
    var filePath = curWin.file;
    //首先需要加载已有的内容
    MTile.file = curWin.filename;

    //处理输入图像
    $("#maindisplay").attr("src", curWin.img.toDataURL());
    MTile.imgWidth = curWin.img.getSize().width;
    MTile.imgHeight = curWin.img.getSize().height;
    //MTile.imgHeight = curWin.img.getSize().height;
    //状态栏信息显示图片大小
    $('#imgSize').text('['+MTile.imgWidth + ', ' + MTile.imgHeight + ']');

    //这个Tile的参数
    //MTile.TileWidth = 48;
    MTile.TileX = Math.ceil(MTile.imgWidth/MTile.TileWidth);
    MTile.TileY = Math.ceil(MTile.imgHeight/MTile.TileWidth);

    //属性内初始化Tile属性
    $('#tileWidth').val(MTile.TileWidth);

    //初始化canvas画布大小
    $("#main").attr("width", MTile.imgWidth);
    $("#main").attr("height", MTile.imgHeight);
    $("#mainline").attr("width", MTile.imgWidth);
    $("#mainline").attr("height", MTile.imgHeight);

    //初始化canvas图像内容
    var tileCanvas = document.getElementById("main");
    var tilecontext = tileCanvas.getContext("2d");
    var tileimg = document.getElementById("maindisplay");
    tilecontext.drawImage(tileimg, 0, 0);
    var lineCanvas = document.getElementById("mainline");
    var linecontext = lineCanvas.getContext("2d");
    drawVirtualLine(linecontext, MTile.TileX, MTile.TileY, MTile.TileWidth);

    //获得canvas绘图数据，图像display
    var maindisplaylineData = lineCanvas.toDataURL();
    $("#maindisplayline").attr("src", maindisplaylineData);


    //selRect = new selectedRect(linecontext, "tile", TILEWIDTH);
    //绑定鼠标事件
    mouseListen();

    //缩放属性
    var scaleIndex = 100;
    var minScaleIndex = 50;
    var maxScaleIndex = 250;
    var scaleSpeed = 2;
    var scaleOpacity = $("#scaleController").css("opacity");
    //初始化悬浮滑块控件
    $("#scaleIndicator").attr("min", minScaleIndex);
    $("#scaleIndicator").attr("max", maxScaleIndex);
    $("#scaleIndicator").val(scaleIndex);
    $("#scaleController").mouseover(function () {
        $("#scaleController").stop();
        $("#scaleController").css("opacity", scaleOpacity);
        $("#scaleController").show();
    });
    $("#scaleController").mouseout(function () { 
        $("#scaleController").fadeOut(3000);
    });
    //绑定滑块调整事件
    $("#scaleIndicator").on("input change", function() {
        scaleIndex = parseInt($('#scaleIndicator').val());
        scaleDisplay();
    });
    //缩放函数调整函数
    function scaleDisplay(){
        //console.log('scale indicator: ', scaleIndex);
        if(scaleIndex > maxScaleIndex){
            scaleIndex = maxScaleIndex;
        } else if(scaleIndex < minScaleIndex){
            scaleIndex = minScaleIndex;
        }
        $('#scaleIndex').text(scaleIndex + '%');
        $(".drawdisplay").attr("width", MTile.imgWidth * scaleIndex / 100);
        $(".drawdisplay").attr("height", MTile.imgHeight * scaleIndex / 100);
        $("#scaleIndicator").val(scaleIndex);
    }
    //状态栏显示缩放比例
    $('#scaleIndex').text(scaleIndex + '%');
    //主界面绑定滚轮事件,通过jquery第三方库绑定的
    $("#drawContent").bind('mousewheel', function(event, delta, deltaX, deltaY){
        if(delta < 0 && scaleIndex > minScaleIndex){
            scaleIndex -= scaleSpeed;
            scaleDisplay();
        }
        else if(delta > 0 && scaleIndex < maxScaleIndex){
            //console.log('oldscaleIndex: ', scaleIndex);
            scaleIndex += scaleSpeed;
            scaleDisplay();
        }
        $("#scaleController").stop();
        $("#scaleController").css("opacity", scaleOpacity);
        $("#scaleController").show();
        $("#scaleController").fadeOut(3000);
    });

    //nav内容处理事件
    registerEventChanged('tileWidth', function(){
        let w = $('#tileWidth').val();
        MTile.TileWidth = w;
        MTile.TileX = Math.ceil(MTile.imgWidth/MTile.TileWidth);
        MTile.TileY = Math.ceil(MTile.imgHeight/MTile.TileWidth);
        selRect.tileWidth = MTile.TileWidth;
        redrawVirtualLine();
        //selRect.select(0,0,0,0);    //使用选择0000来重新绘制线
    });

    //状态栏事件绑定
    $('#scaletray').click(function (e) { 
        e.preventDefault();
        scaleIndex = 100;
        scaleDisplay();
    });

    //初始化状态栏的鼠标坐标值
    $('#cursorCoordinate').text('[0, 0]');

    var selRect = new selectedRect(lineCanvas, 'maindisplayline', MTile.TileWidth);

    //编辑Block模式
    var isBlockOpen = false;
    //MTile.subBlocks = 4;
    if(curWin.tiledata === ""){
        initTiles();
    }
    $('#blockNum').val(MTile.subBlocks);
    registerEventChanged('blockNum', function(){
        MTile.subBlocks = $('#blockNum').val();
        //redrawVirtualLine();
        initBlocks();   //重新初始化tiles属性
        drawBlockLine();
    });
    function drawBlockLine(){
        redrawVirtualLine();
        drawVirtualLine(linecontext, MTile.TileX*MTile.subBlocks, MTile.TileY*MTile.subBlocks, MTile.TileWidth/MTile.subBlocks, true);
        drawBlocks();
        maindisplaylineData = lineCanvas.toDataURL();
        $("#maindisplayline").attr("src", maindisplaylineData);
    }
    function redrawVirtualLine(){
        linecontext.clearRect(0, 0, MTile.imgWidth, MTile.imgHeight);
        selRect.select(0,0,0,0);
    }
    $('#blockMode').change(function (e) { 
        e.preventDefault();
        isBlockOpen = $('#blockMode')[0].checked;
        $('#blockMode').blur();
        //显示block线框
        if(isBlockOpen){
            drawBlockLine();
            $('#tileWidth')[0].disabled = true;
            $('#blockInput').slideDown("normal");            
        }else{
            redrawVirtualLine();
            $('#tileWidth')[0].disabled = false;
            $('#blockInput').slideUp("normal");
        }
    });

    //增加删除tile block
    function initTiles(){
        let tilesCount = MTile.TileX * MTile.TileY;
        let blocksCount = MTile.subBlocks * MTile.subBlocks;
        for(let i = 0; i < tilesCount ; i++){
            let tile = {};
            tile.id = i;
            tile.blocks = [];
            for(let j = 0; j < blocksCount ; j++){
                tile.blocks.push(0);
            }
            MTile.tiles.push(tile);
        }
    }

    function initBlocks(){
        let blocksCount = MTile.subBlocks * MTile.subBlocks;
        for(let i = 0; i < MTile.tiles.length; i++){
            MTile.tiles[i].blocks = [];
            for(let j = 0; j < blocksCount ; j++){
                MTile.tiles[i].blocks.push(0);
            }
        }
        console.log(MTile);
    }

    function setBlocks(tileid, blockid, value){
        console.log(tileid, blockid);
        MTile.tiles[tileid].blocks[blockid] = value;
    }

    function drawBlocks(){
        let blockwidth = MTile.TileWidth / MTile.subBlocks;
        for(let i = 0; i < MTile.tiles.length; i++){
            let tilex = parseInt(i % MTile.TileX) * MTile.TileWidth;
            let tiley = parseInt(i / MTile.TileX) * MTile.TileWidth;
            console.log("showBlocks", tilex, tiley);
            for(let j = 0; j < MTile.tiles[i].blocks.length; j++){
                if(MTile.tiles[i].blocks[j] !== 0){
                    let blockx = parseInt(j % MTile.subBlocks) * blockwidth;
                    let blocky = parseInt(j / MTile.subBlocks) * blockwidth;
                    console.log("showBlocks2",tilex + blockx, tiley + blocky, blockwidth);
                    drawRect(linecontext, tilex + blockx, tiley + blocky, blockwidth);
                }
            }
        }
    }

    //函数定义区
    function mouseListen(){
        var drawStart = false;
        var tileDownX = -1;
        var tileDownY = -1;
        var tileMove = false;

        //let cursorPos = [0, 0];
        let cursorStatus = 0;
        let blockDownX = -1;
        let blockDownY = -1;

        $("#maindisplayline").mousedown(function (e) {
            let mx = e.pageX - $("#maindisplayline").offset().left;
            let my = e.pageY - $("#maindisplayline").offset().top;
            tileDownX= parseInt(mx / (MTile.TileWidth * scaleIndex / 100));
            tileDownY = parseInt(my / (MTile.TileWidth * scaleIndex / 100));
            tileMove = true;
            if(!isBlockOpen){
                //console.log(tileDownX + ',' + tileDownY);
                selRect.select(tileDownX, tileDownY, 1, 1);
                postToRemoteData(tileDownX, tileDownY, 1, 1);
                $('#selectRect').text('[' + tileDownX + ', ' + tileDownY + ', 0, 0 ]');
            } else{
                //补充Block模式
                let bx = e.pageX - tileDownX * (MTile.TileWidth * scaleIndex / 100) - $("#maindisplayline").offset().left;
                let by = e.pageY - tileDownY * (MTile.TileWidth * scaleIndex / 100)  - $("#maindisplayline").offset().top;
                blockDownX= parseInt(bx / (MTile.TileWidth / MTile.subBlocks * scaleIndex / 100));
                blockDownY = parseInt(by / (MTile.TileWidth / MTile.subBlocks * scaleIndex / 100));
                //console.log("block", tileDownX, tileDownY, blockDownX, blockDownY);
                let tileid = tileDownY * MTile.TileX + tileDownX;
                let blockid = blockDownY * MTile.subBlocks + blockDownX;
                if(e.which == 1){
                    //左键表示添加
                    cursorStatus = 1;
                    console.log(MTile.tiles[tileid].blocks[blockid]);
                    if(MTile.tiles[tileid].blocks[blockid] === 0){
                        drawRect(linecontext, (tileDownX * MTile.subBlocks + blockDownX) * MTile.TileWidth / MTile.subBlocks,
                             (tileDownY * MTile.subBlocks + blockDownY) * MTile.TileWidth / MTile.subBlocks, 
                             MTile.TileWidth / MTile.subBlocks);
                        var maindisplaylineData = lineCanvas.toDataURL();
                        $("#maindisplayline").attr("src", maindisplaylineData);
                    }
                    setBlocks(tileid, blockid, 1);
                } else if(e.which == 3){
                    //右键表示删减
                    cursorStatus = 2;
                    setBlocks(tileid, blockid, 1);
                }
            }
        });

        $("#maindisplayline").mousemove(function(e){
            let mx = e.pageX - $("#maindisplayline").offset().left;
            let my = e.pageY - $("#maindisplayline").offset().top;
            grid_num_x= parseInt(mx / (MTile.TileWidth * scaleIndex / 100));
            grid_num_y = parseInt(my / (MTile.TileWidth * scaleIndex / 100));
            //这里可以添加状态栏，信息显示
            $('#cursorCoordinate').text('['+grid_num_x + ', ' + grid_num_y + ']');
            if(!tileMove)
                return;
            if(!isBlockOpen){
                //console.log(grid_num_x + ',' + tileDownY);
                let left, top, width, height;
                if(grid_num_x > tileDownX){
                    left = tileDownX;
                    width = grid_num_x - tileDownX + 1;
                }
                else{
                    left = grid_num_x;
                    width = tileDownX - grid_num_x + 1;
                }
                if(grid_num_y > tileDownY){
                    top = tileDownY;
                    height = grid_num_y - tileDownY + 1;
                }
                else{
                    top = grid_num_y;
                    height = tileDownY - grid_num_y + 1;
                }
                //console.log("tilemove", left, top, width, height);
                selRect.select(left, top, width, height);
                postToRemoteData(left, top, width, height);
                $('#selectRect').text('[' + left + ', ' + top + ', '+width+', ' + height +' ]');
            } else{
                //补充Block模式
                let bx = e.pageX - grid_num_x * (MTile.TileWidth * scaleIndex / 100) - $("#maindisplayline").offset().left;
                let by = e.pageY - grid_num_y * (MTile.TileWidth * scaleIndex / 100)  - $("#maindisplayline").offset().top;
                blockDownX= parseInt(bx / (MTile.TileWidth / MTile.subBlocks * scaleIndex / 100));
                blockDownY = parseInt(by / (MTile.TileWidth / MTile.subBlocks * scaleIndex / 100));
                //console.log("block", tileDownX, tileDownY, blockDownX, blockDownY);
                let tileid = grid_num_y * MTile.TileX + grid_num_x;
                let blockid = blockDownY * MTile.subBlocks + blockDownX;
                if(e.which == 1){
                    //左键表示添加
                    cursorStatus = 1;
                    console.log(tileid, blockid);
                    console.log(MTile.tiles[tileid].blocks[blockid]);
                    if(MTile.tiles[tileid].blocks[blockid] === 0){
                        drawRect(linecontext, (grid_num_x * MTile.subBlocks + blockDownX) * MTile.TileWidth / MTile.subBlocks,
                             (grid_num_y * MTile.subBlocks + blockDownY) * MTile.TileWidth / MTile.subBlocks, 
                             MTile.TileWidth / MTile.subBlocks);
                        setBlocks(tileid, blockid, 1);
                        var maindisplaylineData = lineCanvas.toDataURL();
                        $("#maindisplayline").attr("src", maindisplaylineData);
                    }
                } else if(e.which == 3){
                    //右键表示删减
                    cursorStatus = 2;
                    if(MTile.tiles[tileid].blocks[blockid] !== 0){
                        cleanRect(linecontext, (grid_num_x * MTile.subBlocks + blockDownX) * MTile.TileWidth / MTile.subBlocks,
                                (grid_num_y * MTile.subBlocks + blockDownY) * MTile.TileWidth / MTile.subBlocks, 
                                MTile.TileWidth / MTile.subBlocks);
                        var maindisplaylineData = lineCanvas.toDataURL();
                        $("#maindisplayline").attr("src", maindisplaylineData);
                        setBlocks(tileid, blockid, 0);
                    }
                }                
            }
        });

        $("#maindisplayline").mouseup(function(e){
            tileMove = false;
        });
        $("#maindisplayline").mouseleave(function(e){
            tileMove = false;
        });
    }

    function postToRemoteData(l, t, r, b){
        selData.left = l;
        selData.top = t;
        selData.right = r;
        selData.bottom = b;
        selData.blocksID = [];
        for(let i = 0; i < selData.bottom; i++){
            let blockIDx = [];
            for(let j = 0; j < selData.right; j++){
                let id = (i + selData.top) * MTile.TileX + j + selData.left;
                blockIDx.push(id);
            }
            selData.blocksID.push(blockIDx);
        }
        selData.tileWidth = MTile.TileWidth;
        selData.filename = MTile.file;
        mainWin.webContents.send('tile-selected', selData);
    }
    if(curWin.tiledata === ""){
        ipc.send('tile-save', curWin.filename, MTile, curWin.pid, true);
    }
    //curWin.MTile = MTile;
    //console.log(curWin);
    let tileData = {};
    tileData.file = curWin.file;
    tileData.filename = curWin.filename;
    tileData.datafile = curWin.file + '.json';
    tileData.imgData = curWin.imgData;
    tileData.MTile = MTile;
    mainWin.webContents.send('addTile', tileData);
});

function registerEventChanged(textBoxID, callback){
    $('#' + textBoxID).change(function (e) { 
        e.preventDefault();
        this.hasChanged = true;
    });
    $('#' + textBoxID).blur(function (e) { 
        e.preventDefault();
        if(this.hasChanged == true){
            //repaint the line
            callback();
        }
    });
}

function drawVirtualLine(context, x, y, width, isdash){
    context.beginPath();
    if(isdash){
        context.setLineDash([3, 1]);
        context.lineWidth = 1.0;
    } else{
        context.setLineDash([1, 0]);
        context.lineWidth = 2.0;
    }
    context.strokeStyle = "#000000";
    
    var i;
    for(i = 0; i <= x ; i+=1){
        context.moveTo(i * width, 0);
        context.lineTo(i * width, y * width);
    }
    for(i = 0; i <= y ; i+=1){
        context.moveTo(0, i * width);
        context.lineTo(x * width, i * width);
    }
    context.stroke();
    context.closePath();
}

function drawRect(context, x, y, width){
    console.log(x, y, width);
    context.fillStyle = "rgba(0,0,0,0.5)";
    context.fillRect(x + 1,y + 1, width - 2,width - 2);
}

function cleanRect(context, x, y, width){
    context.clearRect(x + 1, y + 1, width - 2, width - 2);
}

function clearVirtualLine(context, width, height){
    context.clearRect(0,0,width,height);
}

function selectedRect(imgCanvas, imgDiv, tilewidth){
    this.selectx = 0;
    this.selecty = 0;
    this.selectw = 1;
    this.selecth = 1;
    this.canvas = imgCanvas
    this.ctx = this.canvas.getContext("2d");
    this.display = imgDiv;
    this.tileWidth = tilewidth;
    this.draw = function(style){
        this.ctx.clearRect(this.selectx * this.tileWidth,
                        this.selecty * this.tileWidth, 
                        this.tileWidth * this.selectw, 
                        this.tileWidth * this.selecth);
        this.ctx.beginPath();
        this.ctx.strokeStyle = style;
        this.ctx.lineWidth = 2.0;
        //ctx.clearRect(selectx * tileWidth, selecty * tileWidth, tileWidth, tileWidth)
        this.ctx.strokeRect(this.selectx * this.tileWidth,
                        this.selecty * this.tileWidth, 
                        this.tileWidth * this.selectw, 
                        this.tileWidth * this.selecth);
        this.ctx.closePath();
    }

    this.select = function(x, y, w, h){
        //this.draw("#000000");
        let TILEX = Math.ceil(this.canvas.width/this.tileWidth);
        let TILEY = Math.ceil(this.canvas.height/this.tileWidth);
        drawVirtualLine(this.ctx, TILEX, TILEY, this.tileWidth);
        this.selectx = x;
        this.selecty = y;
        this.selectw = w;
        this.selecth = h;
        this.draw("#FFFFFF");
        $('#' + this.display).attr('src', this.canvas.toDataURL());
    }
}

function selectData(){
    this.tileWidth = 0;
    this.left = 0;
    this.right = 0;
    this.top = 0;
    this.bottom = 0;
}

let selData = new selectData();
