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

function clearVirtualLine(context, width, height){
    context.clearRect(0,0,width,height);
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

    $("#mainline").mousedown(function (e) { 
        var mx = e.pageX - $("#mainline").offset().left;
        var my = e.pageY - $("#mainline").offset().top;
        tileDownX= parseInt(mx / selRect.tileWidth);
        tileDownY = parseInt(my / selRect.tileWidth);
        tileMove = true;
        console.log(tileDownX + ',' + tileDownY);
        selRect.select(tileDownX, tileDownY, 1, 1);
    });

    $("#mainline").mousemove(function(e){
        var mx = e.pageX - $("#mainline").offset().left;
        var my = e.pageY - $("#mainline").offset().top;
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

    $("#mainline").mouseup(function(e){
        tileMove = false;
    });
    $("#mainline").mouseleave(function(e){
        tileMove = false;
    });
}

function tileForm(){
    this.img = null;    //定义图片数据
    this.imgfile = null; //定义图片文件
    this.tileWidth = 48;    //tiles的宽度
}

$(function(){
    var curWin = remote.getCurrentWindow();
    console.log("haha"); 
    if(curWin.hasOwnProperty('img')){
        $("#tile").attr("src", curWin.img.toDataURL());
        var img_width = curWin.img.getSize().width;
        var img_height = curWin.img.getSize().height;
        $('#imgSize').text('['+img_width + ',' + img_height + ']');
        var tileCanvas = document.getElementById("main");
        var tilecontext = tileCanvas.getContext("2d");
        var tileimg = document.getElementById("tile");
        $("#main").attr("width", $("#tile").width());
		$("#main").attr("height", $("#tile").height());
        $("#mainline").attr("width", $("#tile").width());
		$("#mainline").attr("height", $("#tile").height());
        tilecontext.drawImage(tileimg, 0, 0);
        //这个Tile的参数
        var TILEWIDTH = 48;
        var TILEX = Math.ceil(img_width/TILEWIDTH);
		var TILEY = Math.ceil(img_height/TILEWIDTH);
		
        var lineCanvas = document.getElementById("mainline");
        var linecontext = lineCanvas.getContext("2d");
        drawVirtualLine(linecontext, TILEX, TILEY, TILEWIDTH);
        //selRect = new selectedRect(linecontext, "tile", TILEWIDTH);
        mouseListen();
        registerEventChanged('tileWidth', function(){
            let w = $('#tileWidth').val();
            linecontext.clearRect(0,0,$("#mainline").width(),$("#mainline").height());
            TILEWIDTH = w;
            TILEX = Math.ceil(img_width/TILEWIDTH);
			TILEY = Math.ceil(img_height/TILEWIDTH);
            console.log("repaint the line", TILEX, TILEY, TILEWIDTH);
            drawVirtualLine(linecontext, TILEX, TILEY, TILEWIDTH);
        });
    }
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