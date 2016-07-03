const ipc = require('electron').ipcRenderer;
const remote = require('electron').remote;

$(document).ready(function () {
    //var main = new mainForm();
    let curWin = remote.getCurrentWindow();
    const drawer = require ("./drawer.js");
    //初始化工程内容

    var lineCanvas = document.getElementById("mainline");
    var lineContext = lineCanvas.getContext("2d");
    var tileX = 0;
    var tileY = 0;
    var tileWidth = 0;
    //函数区域
    let drawInit = function (){
        $("#mainline").attr("width", tileX * tileWidth ); //注意canvas只能通过html属性来设置宽高，否者图像会拉伸
		$("#mainline").attr("height", tileY * tileWidth );
        $("#drawingArea").height(tileY * tileWidth);
        $("#drawingArea").width(tileX * tileWidth);
        drawer.drawVirtualLine(lineContext, tileX, tileY, tileWidth);
        let maindisplaylineData = lineCanvas.toDataURL();
        $("#maindisplayline").attr("src", maindisplaylineData);
    }

    //注册electron事件
    ipc.on('newMap', function(event, msg){
        //$("#new").show();
        navshow();
    });
    ipc.on('tile-selected', function(event, selData){
        console.log(event, selData);
    });

    ipc.on('addTile', function(event, tile){
        let item = newListItem(tile.filename);
        putListTextArg(item, 'filepath', tile.file);
        addListTextFunc(item, function(){
            ipc.send('opentile', $(this).attr('filepath'));
        });
        addListIconFunc(item, function(){

        });
        addToListContainer("tilelist", item);
    });
    //注册Dom事件
    $(window).keyup(function (e) {
       switch (e.keyCode) {
           case 27: //esc
                navhide();
               break;
           case 65:
                break;
           default:
               break;
       }
    });
    //For Test
    tileX = 20;
    tileY = 20;
    tileWidth = 48;
    navhide();
    drawInit();
    prosetshow();

    $('#newBtn').click(function(e){
        e.preventDefault();
        tileX = $('#newx').val();
        tileY = $('#newy').val();
        tileWidth = $('#newwidth').val();
        $('#newx').val("");
        $('#newy').val("");
        $('#newwidth').val("");
        navhide();
        drawInit();
        prosetshow();
    });

    function mouseListen(){
        var drawStart = false;
        var tileDownX = -1;
        var tileDownY = -1;
        var tileMove = false;
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
    }
});