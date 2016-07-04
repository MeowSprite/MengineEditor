const ipc = require('electron').ipcRenderer;
const remote = require('electron').remote;

var Tiles = [];
var Tile = {
    file : "",
    datafile : "",
    tiledata : "",
    imgdata : "",
    MTile : {}
};
var Map = {
    tileX : 0,
    tileY : 0,
    tileWidth : 0,
    layer : []
};


var layer = {};
var layerName = [];

var selectData = null;

var curDrawerID = "";
var curDisplayID = "";
var curDrawer = null;
var curDrawerContext = null;
var curLayer = "";

$(document).ready(function () {
    //var main = new mainForm();
    let curWin = remote.getCurrentWindow();
    const drawer = require ("./drawer.js");
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
        //Todo：姑且项目是空，会默认先创建一个图层
        console.log("创建图层");
        $('#addNewLayer').click();  //创建新的图层
        //curLayer = $('#layerlist .layer-item').get(0).id;   //获得第一个Layer的名称


        //Todo：创建第一个画板，这里应该需要一个全新的函数，创建画层
        //$("#main").attr("width", Map.tileX * Map.tileWidth ); //注意canvas只能通过html属性来设置宽高，否者图像会拉伸
		//$("#main").attr("height", Map.tileY * Map.tileWidth );
        //Todo: 临时使用一个main，之后会增加多个图层
        //curDrawer = document.getElementById("main");
        //curDrawerContext = curDrawer.getContext("2d");
        //curDrawerID = "main";
        //curDisplayID = "maindisplay";
    }

    //注册electron事件
    ipc.on('newMap', function(event, msg){
        //$("#new").show();
        navshow();
    });
    ipc.on('tile-selected', function(event, selData){
        selectData = selData;
        selectData.srcX = selData.left * selData.tileWidth;
        selectData.srcY = selData.top * selData.tileWidth;
        selectData.srcW = selData.right* selData.tileWidth;
        selectData.srcH = selData.bottom * selData.tileWidth;
        console.log(selectData);
    });

    ipc.on('addTile', function(event, tileData){
        let item = newListItem(tileData.filename);
        let tile = [];
        tile.file = tileData.file;
        tile.datafile = tileData.datafile;
        tile.tiledata = tileData.tiledata;
        tile.imgdata = tileData.imgData;
        tile.MTile = JSON.parse(tile.tiledata);
        tileImg(tileData.filename, tile.imgdata);
        Tiles[tileData.filename] = tile;
        putListTextArg(item, 'filepath', tileData.file);
        addListTextFunc(item, function(){
            ipc.send('opentile', $(this).attr('filepath'));
        });
        addListIconFunc(item, function(){
            let res = confirm("delete this tile");
            if(res == true){
                let filename = $(this).parent().siblings("i").text();
                ipc.send('deletetile', filename);
                delete Tiles[filename];
                $(this).parent().parent().remove();
            }
        });
        addToListContainer("tilelist", item);
    });
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
    //For Test
    Map.tileX = 20;
    Map.tileY = 20;
    Map.tileWidth = 48;
    navhide();
    drawInit();
    prosetshow();
    //-------

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
        console.log("new layer add");
        let id = 1;
        while($.inArray('Layer' + id, layerName) != -1){
            id += 1;
        }
        layerName.push('Layer' + id);
        let item = newListItemLayers('Layer' + id);
        item.attr("id", 'Layer' + id);
        //插入layer list
        $(this).before(item);
        //创建新的Drawer
        newDrawer('Layer' + id);

        if(layerName.length == 1){
            let canvasName = getDrawerIdFromLayer('Layer' + id);
            let displayName = getDisplayIdFromLayer('Layer' + id);
            curDrawer = document.getElementById(canvasName);
            curDrawerContext = curDrawer.getContext("2d");
            curDrawerID = canvasName;
            curDisplayID = displayName; 
            curLayer = 'Layer' + id;
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

            //for better drag
            let layerDragedDeep = $("#layerlist .layer-item").index(this);
            let layerDropedDeep = $("#layerlist .layer-item").index(layer);
            if(layerDragedDeep > layerDropedDeep){
                layer.before($(this));
            } else if(layerDragedDeep < layerDropedDeep){
                layer.after($(this));
            } else{
                return;
            }

            //generate new layerlist
            layerName = [];
            $(this).parent().children(".layer-item").each(function(){
                layerName.push($(this).attr("id"));
            });
            console.log(layerName);
        };

        item.children("span.layer-close").click(function(e){
            e.preventDefault();
            console.log($(this));
            let res = confirm("delete this layer");
            if(res == true){
                //删除Layer
                let name = $(this).siblings("i").text();
                layerName.splice($.inArray(name,layerName),1);
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
            if($.inArray($(this).val(), layerName) == -1){
                let index = $.inArray(itext.text(), layerName);
                layerName[index] = $(this).val();
                itext.text($(this).val());
                $(this).parent().attr("id", $(this).val());
                //Todo：修改Drawer的ID
                setDrawerId($(this).val());
            }
            $(this).parent().attr("draggable", true);
            itext.show();
            $(this).hide();
        });

        item.click();
    });

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
        let tileID = "#tile-" + id;
        if(imgData !== null){
            //添加id
            if($(tileID).length > 0){
                //替换img内容
                $(tileID).attr('src', imgData);
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
        console.log(img,
                    selectData.srcX, selectData.srcY,
                    selectData.srcW, selectData.srcH,
                    dstX, dstY,
                    dstW, dstH);
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
        $("#maindisplayline").mousedown(function (e) {
            let mx = e.pageX - $("#maindisplayline").offset().left;
            let my = e.pageY - $("#maindisplayline").offset().top;
            grid_num_x = parseInt(mx / (Map.tileWidth * scaleIndex / 100));
            grid_num_y = parseInt(my / (Map.tileWidth * scaleIndex / 100));
            tileMove = true;
            if(!isBlockOpen){
                //绘制图形
                point.x = grid_num_x;
                point.y = grid_num_y;
                draw(point);
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
            let grid_num_x= parseInt(mx / (Map.tileWidth * scaleIndex / 100));
            let grid_num_y = parseInt(my / (Map.tileWidth * scaleIndex / 100));
            $('#cursorCoordinate').text('['+grid_num_x + ', ' + grid_num_y + ']');
        });
    }
});