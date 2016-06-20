//const ipc = require('electron').ipcRender
const remote = require('electron').remote;

function drawVirtualLine(context, x, y, width){
    context.beginPath();
    context.strokeStyle = "#000000";
    context.lineWidth = 2.0;
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

let selRect;

function selectedRect(context, img, tilewidth){
    this.selectx = 0;
    this.selecty = 0;
    this.selectw = 1;
    this.selecth = 1;
    var ctx = context
    this.tileImg = img;
    this.tileWidth = tilewidth;
    this.draw = function(style){
        ctx.beginPath();
        ctx.strokeStyle = style;
        ctx.lineWidth = 2.0;
        //ctx.clearRect(selectx * tileWidth, selecty * tileWidth, tileWidth, tileWidth)
        ctx.strokeRect(	this.selectx * this.tileWidth,
                        this.selecty * this.tileWidth, 
                        this.tileWidth * this.selectw, 
                        this.tileWidth * this.selecth);
        ctx.closePath();
    }

    this.select = function(x, y, w, h){
        this.draw("#000000");
        this.selectx = x;
        this.selecty = y;
        this.selectw = w;
        this.selecth = h;
        this.draw("#FFFFFF");
    }
}

function drawRect(context){
    var ctx = context;
    this.select = function(x, y){
        srcX = selRect.selectx * selRect.tileWidth;
        srcY = selRect.selecty * selRect.tileWidth;
        srcW = selRect.tileWidth * selRect.selectw;
        srcH = selRect.tileWidth * selRect.selecth;
        dstX = x * GRID_WIDTH;
        dstY = y * GRID_WIDTH;
        dstW = GRID_WIDTH * selRect.selectw;
        dstH = GRID_WIDTH * selRect.selecth;
        tileimg = document.getElementById(IMG_ID);
        console.log("drawRect", srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
        ctx.drawImage(tileimg, srcX, srcY, srcW, srcH, dstX, dstY, dstW, dstH);
        ctx.beginPath();
        ctx.strokeStyle = "#000000";
        ctx.lineWidth = 2.0;
        //ctx.clearRect(selectx * tileWidth, selecty * tileWidth, tileWidth, tileWidth)
        ctx.strokeRect(dstX, dstY, dstW, dstH);
        ctx.closePath();
    }
}


function mouseListen(){
    var drawStart = false;
    var tileDownX = -1;
    var tileDownY = -1;
    var tileMove = false;

    $("#tileBox").mousedown(function (e) { 
        var mx = e.pageX - $("#tileBox").offset().left;
        var my = e.pageY - $("#tileBox").offset().top;
        tileDownX= parseInt(mx / selRect.tileWidth);
        tileDownY = parseInt(my / selRect.tileWidth);
        tileMove = true;
        console.log(tileDownX + ',' + tileDownY);
        selRect.select(tileDownX, tileDownY, 1, 1);
    });

    $("#tileBox").mousemove(function(e){
        var mx = e.pageX - $("#tileBox").offset().left;
        var my = e.pageY - $("#tileBox").offset().top;
        if(!tileMove)
            return;
        grid_num_x= parseInt(mx / selRect.tileWidth);
        grid_num_y = parseInt(my / selRect.tileWidth);
        //console.log(grid_num_x + ',' + tileDownY);
        var left, top, width, height;
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
        console.log("tilemove", left, top, width, height);
        selRect.select(left, top, width, height);
    });

    $("#tileBox").mouseup(function(e){
        tileMove = false;
    });
    $("#tileBox").mouseleave(function(e){
        tileMove = false;
    });
}

$(function(){
    var curWin = remote.getCurrentWindow();
    console.log("haha"); 
    if(curWin.hasOwnProperty('img')){
        $("#tile").attr("src", curWin.img.toDataURL());
        var tileCanvas = document.getElementById("tileBox");
        var tilecontext = tileCanvas.getContext("2d");
        var tileimg = document.getElementById("tile");
        $("#tileBox").attr("width", $("#tile").width());
		$("#tileBox").attr("height", $("#tile").height());
        tilecontext.drawImage(tileimg, 0, 0);
        //这个Tile的参数
        TILEX = 15,
		TILEY = 3,
		TILEWIDTH = 48,
        drawVirtualLine(tilecontext, TILEX, TILEY, TILEWIDTH);
        selRect = new selectedRect(tilecontext, "tile", TILEWIDTH);
        mouseListen();
    }
});
