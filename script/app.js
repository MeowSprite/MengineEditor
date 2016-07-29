const ipc = require('electron').ipcRenderer;
const remote = require('electron').remote;
const dialog = require('electron').remote.dialog;

var Tile = {
    file : "",
    datafile : "",
    tiledata : "",
    imgdata : "",
    tileID : 0,
    MTile : {}
};

//TileIdIndex = {};   //Tile名字到Id的索引
//Layer里的每个Tile记号，最后一个数字表示所属的TileID，其他数字表名Tile内的块ID

var Map = {
    tileMaxNum : 10,    //最大tilefile的数量，这个必须是10的倍数。
    tileX : 20,
    tileY : 20,
    tileWidth : 48,
    tileBlockNum : 0,
    TileIdIndex : {},   //Tile名字到Id的索引
    Tiles : {},
    layers : {},    //layers具体存的数据
    layerIndex : []     //用于指明layer的层次关系
};

/*一个layer用一个二维数组表示
var layer = [
    [],
    [],
];
var layers = {
    layername : layer,
    layername : layer,
};
*/

var selectData = null;

var curDrawerID = "";
var curDisplayID = "";
var curDrawer = null;
var curDrawerContext = null;
var curLayer = "";
var ischanged = false; //Todo：在任何更改工程下，标记修改
var title = "";

$(document).ready(function () {
    //var main = new mainForm();
    const curWin = remote.getCurrentWindow();
    const drawer = require ("./script/drawer.js");
    title = curWin.getTitle();
    //初始化工程内容

    var lineCanvas = document.getElementById("mainline");
    var lineContext = lineCanvas.getContext("2d");
    //函数区域
    let drawInit = function (){
        $("#mainline").attr("width", Map.tileX * Map.tileWidth ); //注意canvas只能通过html属性来设置宽高，否者图像会拉伸
		$("#mainline").attr("height", Map.tileY * Map.tileWidth );
        $("#drawingArea").height(Map.tileY * Map.tileWidth);
        $("#drawingArea").width(Map.tileX * Map.tileWidth);
        drawer.drawVirtualLine(lineContext, Map.tileX, Map.tileY, Map.tileWidth);
        let maindisplaylineData = lineCanvas.toDataURL();
        $("#maindisplayline").attr("src", maindisplaylineData);
    }

    //注册electron事件
    ipc.on('newMap', function(event, msg){
        //$("#new").show();
        navshow();
    });

    ipc.on('tile-selected', function(event, selData){
        //使用ID而不是名字
        if(selectData != null){
            selectTileColor(Map.TileIdIndex[selectData.filename], Map.TileIdIndex[selData.filename]);
        }
        else{
            selectTileColor(null, Map.TileIdIndex[selData.filename]);
        }
        selectData = selData;
        selectData.tileID = Map.TileIdIndex[selectData.filename];
        selectData.srcX = selData.left * selData.tileWidth;
        selectData.srcY = selData.top * selData.tileWidth;
        selectData.srcW = selData.right* selData.tileWidth;
        selectData.srcH = selData.bottom * selData.tileWidth;
    });

    ipc.on('addTile', function(event, tileData){
        if(Map.TileIdIndex.hasOwnProperty(tileData.filename)){
            console.log("addTile: reopen " + tileData.filename);
            //用于打开工程时，加载Tile数据
            //ToTest：普通打开关闭Tile，加载Map工程
            let tileId = Map.TileIdIndex[tileData.filename];
            if(!Map.Tiles[tileId].hasOwnProperty("MTile")){
                let tileId = Map.TileIdIndex[tileData.filename];
                Map.Tiles[tileId].imgdata = tileData.imgData;
                Map.Tiles[tileId].MTile = tileData.MTile;
                addToTilePanal(tileId, tileData);
                loadedStep();
            }
            return;
        }
        let tile = {};
        tile.file = tileData.file;
        tile.datafile = tileData.datafile;
        //tile.tiledata = tileData.tiledata;
        tile.imgdata = tileData.imgData;
        tile.MTile = tileData.MTile;
        
        //为Tile分配一个ID，以便在layer标记
        let id = 0;
        while(Map.Tiles.hasOwnProperty(id)){
            id += 1;
            if(id > Map.tileMaxNum){
                //Todo：处理最大Tile数
                console.log("Tile数量已达到最大");
            }
        }
        tile.tileID = id;
        //更新总Tile块数目
        console.log(tileData);
        tile.blockNum = tile.MTile.TileX * tile.MTile.TileY;
        Map.tileBlockNum += tile.blockNum;
        Map.TileIdIndex[tileData.filename] = tile.tileID;
        //Map.Tiles.push(tile);
        Map.Tiles[tile.tileID] = tile;
        
        addToTilePanal(tile.tileID, tileData);

        function addToTilePanal(tileID, tileData){
            console.log(tileID, tileData.filename);
            tileImg(tileData.filename, tileData.imgData);
            console.log(tileID, tileData.filename);
            let item = newListItem(tileID, tileData.filename);
            //初始化函数
            putListTextArg(item, 'filepath', tileData.file);
            addListTextFunc(item, function(){
                ipc.send('opentile', curWin.id, $(this).attr('filepath'));
            });
            addListIconFunc(item, function(){
                let res = confirm("delete this tile");
                if(res == true){
                    let filename = $(this).parent().siblings("i").text();
                    ipc.send('deletetile', curWin.id, filename);
                    delete Map.Tiles[Map.TileIdIndex[filename]];
                    delete Map.TileIdIndex[filename];
                    //Todo：删除的Tile的时候，一定要重新绘制画面，把相关的Tile排除。
                    $(this).parent().parent().remove();
                }
            });
            addToListContainer("tilelist", item);
        }

        projectDataChange();
    });

    ipc.on('save', function(event){
        ipc.send('project-save', Map, curWin.pid);
        ischanged = false;
        curWin.setTitle(title);
    });

    ipc.on('export', function(event){
        ipc.send('export-map', Map, curWin.pid);
    });

    ipc.on('test',function(event, data){
        console.log(data);
    });
    
    window.onbeforeunload = (e) => {
        if(ischanged == true){
            dialog.showMessageBox(
                curWin,
                {
                    type: "warning",
                    buttons:["Save", "Ignore", "Cancel"],
                    title: "project change save",
                    message: "The map project is changed, please Save or Ignore",
                    cancelId: 2,
                },
                function(response){
                    console.log(response);
                    if(response == 0){
                        ipc.sendSync('project-save', Map, curWin.pid);
                        curWin.destroy();
                    } else if(response == 1){
                        curWin.destroy();
                    }
                }
            );
            e.returnValue = false;
        }
    };

    //注册Dom事件
    $(window).keyup(function (e) {
       switch (e.keyCode) {
           case 27: //esc
                navhide();
               break;
           case 65: //a
                break;
           default:
               break;
       }
    });

    $('#newBtn').click(function(e){
        e.preventDefault();
        Map.tileX = $('#newx').val();
        Map.tileY = $('#newy').val();
        Map.tileWidth = $('#newwidth').val();
        $('#newx').val("");
        $('#newy').val("");
        $('#newwidth').val("");
        navhide();
        drawInit();
        prosetshow();
    });

    $('#addNewLayer').click(function(e){
        e.preventDefault();

        //加入Map工程数据集
        let id = 1;
        while($.inArray('Layer' + id, Map.layerIndex) != -1){
            id += 1;
        }
        Map.layerIndex.push('Layer' + id);
        //创建新的Layer插入工程数据中
        let newlayer = newLayer();
        Map.layers['Layer' + id] = newlayer;
        createLayerDom('Layer' + id);

        projectDataChange();
    });

    function createLayerDom(name){
        //创建Html界面元素
        let item = newListItemLayers(name);
        item.attr("id", name);
        //插入layer list
        $('#addNewLayer').before(item);
        //创建新的Drawer
        newDrawer(name);

        if(Map.layerIndex.length == 1){
            let canvasName = getDrawerIdFromLayer(name);
            let displayName = getDisplayIdFromLayer(name);
            curDrawer = document.getElementById(canvasName);
            curDrawerContext = curDrawer.getContext("2d");
            curDrawerID = canvasName;
            curDisplayID = displayName; 
            curLayer = name;
        }

        //item选择实现
        item.click(function(event){
            console.log($(this).attr("id"), "is selected");
            $("#" + curLayer).css("background", "");    //清空原来的样式
            $(this).css("background", "#5aaee0");
            setCurWorkedLayer($(this).attr("id"));
        });

        //拖拽实现
        item.get(0).ondragstart = function(event){
            event.dataTransfer.setData("layername", $(this).attr("id"));
        }
        item.get(0).ondrop=function(event){
            event.preventDefault();
            let layerid = event.dataTransfer.getData("layername");
            let layer = $('#' + layerid)
            //Todo：交换Display显示
            let displayid = getDisplayIdFromLayer(layerid);
            let thisdisplayid = getDisplayIdFromLayer($(this).attr("id"));
            
            //for better drag
            let layerDragedDeep = $("#layerlist .layer-item").index(this);
            let layerDropedDeep = $("#layerlist .layer-item").index(layer);
            if(layerDragedDeep > layerDropedDeep){
                $(this).after(layer);
                $('#' + thisdisplayid).after($('#' + displayid));
            } else if(layerDragedDeep < layerDropedDeep){
                $(this).before(layer);
                $('#' + thisdisplayid).before($('#' + displayid));
            } else{
                return;
            }

            //generate new layerlist
            Map.layerIndex = [];
            $(this).parent().children(".layer-item").each(function(){
                Map.layerIndex.push($(this).attr("id"));
            });
            console.log(Map.layerIndex);
        };

        item.children("span.layer-close").click(function(e){
            e.preventDefault();
            console.log($(this));
            let res = confirm("delete this layer");
            if(res == true){
                //删除Layer
                let name = $(this).siblings("i").text();
                Map.layerIndex.splice($.inArray(name,Map.layerIndex),1);
                //
                $(this).parent().remove();
            }
        });

        item.children("span.layer-visible").click(function(e){
            //change visible
            let layerId = $(this).parent().attr("id");
            let displayId = getDisplayIdFromLayer(layerId);
            if($(this).children("img").css("visibility") != "hidden"){
                $(this).children("img").css("visibility", "hidden");
                $('#' + displayId).hide();
            } else{
                $(this).children("img").css("visibility", "visible");
                $('#' + displayId).show();
            }
        });

        item.children("i.dblclick-change-label").dblclick(function(e){
            e.preventDefault();
            $(this).parent().attr("draggable", false);
            $(this).siblings("input").show();
            $(this).siblings("input").focus();
            $(this).hide();
        });

        item.children("input.list-input").blur(function(e){
            e.preventDefault();
            let itext = $(this).siblings("i");
            //如果没有重名的话就修改名称
            if($.inArray($(this).val(), Map.layerIndex) == -1){
                let index = $.inArray(itext.text(), Map.layerIndex);
                //修改Map里layer数据里的内容
                let layer = Map.layers[Map.layerIndex[index]];   //获得原来的Layers
                delete Map.layers[Map.layerIndex[index]];
                Map.layers[$(this).val()] = layer;

                Map.layerIndex[index] = $(this).val();
                itext.text($(this).val());
                $(this).parent().attr("id", $(this).val());
                //Todo：修改Drawer的ID
                setDrawerId($(this).val());
                //修改Layer相关的数据

            }
            $(this).parent().attr("draggable", true);
            itext.show();
            $(this).hide();
        });

        item.click();
    }

    function selectTileColor(oldID, newID){
        if(oldID == newID)
            return;
        if(oldID && oldID != null || oldID == 0){
            $('#tile-' + oldID).css('background', '');
        }
        if(newID && newID != null || newID == 0){
            $('#tile-' + newID).css("background", "#5aaee0");
        }
    }

    function getDrawerIdFromLayer(name){
        return "drawer-" + name;
    }

    function getDisplayIdFromLayer(name){
        return "display-" + name;
    }

    function setCurWorkedLayer(name){
        let canvasName = getDrawerIdFromLayer(name);
        let displayName = getDisplayIdFromLayer(name);
        curDrawer = document.getElementById(canvasName);
        curDrawerContext = curDrawer.getContext("2d");
        curDrawerID = canvasName;
        curDisplayID = displayName; 
        curLayer = name;        
    }

    function setDrawerId(newname){
        $('#' + curDrawerID).attr('id', getDrawerIdFromLayer(newname));
        $('#' + curDisplayID).attr('id', getDisplayIdFromLayer(newname));
        curDrawerID = getDrawerIdFromLayer(newname);
        curDisplayID = getDisplayIdFromLayer(newname);
    }

    function newLayer(){
        let layer = [];
        for(let i = 0; i < Map.tileY; i++){
            let layerx = [];
            for(let j = 0; j < Map.tileY; j++){
                layerx.push(0);
            }
            layer.push(layerx);
        }
        return layer;
    }

    function newDrawer(name){
        let newCanvas = $('<canvas id="' + getDrawerIdFromLayer(name) + '" class="drawBox""></canvas>');
        let newDisplay = $('<img id="' + getDisplayIdFromLayer(name) + '" class="drawdisplay" draggable="false"/>	')
        //新建的Drawr永远在最上层
        $('#drawingArea .drawdisplay:first').before(newCanvas);
        $('#maindisplayline').before(newDisplay);
        newCanvas.attr("width", Map.tileX * Map.tileWidth ); //注意canvas只能通过html属性来设置宽高，否者图像会拉伸
		newCanvas.attr("height", Map.tileY * Map.tileWidth );
    }

    function tileImg(id, imgData){
        let tileID = "tile-" + id;
        if(imgData){
            //添加id
            if($('#' + tileID).length > 0){
                //替换img内容
                $('#' + tileID).attr('src', imgData);
            }
            else{
                //添加一个Img
                let newImg = $('<img style="display:none" />');
                newImg.attr('id', tileID);
                newImg.attr('src', imgData);
                $("#tileContainer").append(newImg);
            }
            return document.getElementById(tileID);
        } else{
            return document.getElementById(tileID);
        }
    }

    function showDisplay(){
        let curDrawerImg = curDrawer.toDataURL();
        $("#"+curDisplayID).attr("src", curDrawerImg);
    }

    function drawToLayerData(drawPoint){
        //Todo：保存Layer绘制Data
        let w = selectData.right;
        let h = selectData.bottom;
        let tileID = Map.TileIdIndex[selectData.filename];
        for(let i = 0; i < h; i++){
            for(let j = 0; j < w; j++){
                Map.layers[curLayer][i + drawPoint.y][j + drawPoint.x] = ( selectData.blocksID[i][j] + 1 ) * Map.tileMaxNum + tileID;
            }
        }

        projectDataChange();
    }

    function drawBlock(){

    }

    function erase(drawPoint){
        curDrawerContext.clearRect(drawPoint.x * Map.tileWidth, drawPoint.y * Map.tileWidth, Map.tileWidth, Map.tileWidth);
        Map.layers[curLayer][drawPoint.y][drawPoint.x] = 0;
        showDisplay();
    }

    function draw(drawPoint){
        if(selectData === null || $('#' + curDisplayID).children("img").css('visibility') == "hidden"){
            return;
        }
        dstX = drawPoint.x * Map.tileWidth;
        dstY = drawPoint.y * Map.tileWidth;
        dstW = selectData.right * Map.tileWidth;
        dstH = selectData.bottom * Map.tileWidth;
        let img = tileImg(selectData.filename);
        curDrawerContext.drawImage(img, 
                            selectData.srcX, selectData.srcY,
                            selectData.srcW, selectData.srcH,
                            dstX, dstY,
                            dstW, dstH);
        drawToLayerData(drawPoint);
        showDisplay();
    }

    var scaleIndex = 100;
    var isBlockOpen = false;

    mouseListen();

    function mouseListen(){
        var drawStart = false;
        var tileDownX = -1;
        var tileDownY = -1;
        var tileMove = false;
        var point = [];
        var oldgrid_num = [];
        $("#maindisplayline").mousedown(function (e) {
            let mx = e.pageX - $("#maindisplayline").offset().left;
            let my = e.pageY - $("#maindisplayline").offset().top;
            let grid_num_x = parseInt(mx / (Map.tileWidth * scaleIndex / 100));
            let grid_num_y = parseInt(my / (Map.tileWidth * scaleIndex / 100));
            if(!isBlockOpen){
                //绘制图形
                point.x = grid_num_x;
                point.y = grid_num_y;
                if(e.which == 1){
                    draw(point);
                } else{
                    erase(point);
                }
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
            let grid_num_x= parseInt(mx / (Map.tileWidth * scaleIndex / 100));
            let grid_num_y = parseInt(my / (Map.tileWidth * scaleIndex / 100));
            if(oldgrid_num[0] != grid_num_x || oldgrid_num[1] != grid_num_y){
                $('#cursorCoordinate').text('['+grid_num_x + ', ' + grid_num_y + ']');
                oldgrid_num[0] = grid_num_x;
                oldgrid_num[1] = grid_num_y;
                if(!isBlockOpen){
                    //绘制图形
                    point.x = grid_num_x;
                    point.y = grid_num_y;
                    if(e.which == 1){
                        draw(point);
                    } else if(e.which == 3){
                        erase(point);
                    }
                } 
            }

        });
    }

    var loadProgress = 0;
    function mapDataLoad(){
        //加载Tile数据
        for(var tileID in Map.Tiles){
            loadProgress++;
            ipc.send('opentile', curWin.id,  Map.Tiles[tileID].file);
        }
        //加载Drawer页面
        for(var layerName in Map.layers){
            createLayerDom(layerName);
        }
    }

    function loadedStep(){
        loadProgress--; //单线程不需要锁吧?
        if(loadProgress == 0){
            wholeRedraw();
        }
    }

    //整体重画功能函数
    function wholeRedraw(){
        let dstX = 0;
        let dstY = 0;
        let dstW = Map.tileWidth;
        let dstH = Map.tileWidth;
        let oldLayer = curLayer;
        for(let layerName in Map.layers){
            //切换Layer
            setCurWorkedLayer(layerName);
            for(let j = 0; j < Map.tileY; j++){
                for(let i = 0; i < Map.tileX; i++){
                    let data = Map.layers[layerName][j][i];
                    if(data == 0)
                        continue;
                    //先获得Tile
                    let tileID = parseInt(data%Map.tileMaxNum);
                    let blockID = parseInt(data/Map.tileMaxNum) - 1;
                    let img = tileImg(Map.Tiles[tileID].MTile.file);
                    let srcY = parseInt(blockID/Map.Tiles[tileID].MTile.TileX) * Map.Tiles[tileID].MTile.TileWidth;
                    let srcX = parseInt(blockID%Map.Tiles[tileID].MTile.TileX) * Map.Tiles[tileID].MTile.TileWidth;
                    dstX = i * Map.tileWidth;
                    dstY = j * Map.tileWidth;
                    curDrawerContext.drawImage(img, 
                            srcX, srcY,
                            Map.Tiles[tileID].MTile.TileWidth, Map.Tiles[tileID].MTile.TileWidth,
                            dstX, dstY,
                            dstW, dstH);
                }
            }
            //显示整个Layer
            showDisplay();
        }
        setCurWorkedLayer(oldLayer);
    }

    //用于修改，以后可能用于保存信息栈，实现undo与redo操作
    function projectDataChange(){
        if(ischanged == false){
            curWin.setTitle(title + ' *');
        }
        ischanged = true;
    }

    //
    if(curWin.isDefaultMap){
        Map.tileX = 20;
        Map.tileY = 20;
        Map.tileWidth = 48;
        navhide();
        drawInit();
        prosetshow();
        $('#addNewLayer').click();
        ischanged = false;
        curWin.setTitle(title);
    } else{
        //console.log(curWin.mapData);
        Map = JSON.parse(curWin.mapData);
        mapDataLoad();
        drawInit();
        prosetshow();
    }

    //-------
});