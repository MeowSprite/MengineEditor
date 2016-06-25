//const ipc = require('electron').ipcRender
const remote = require('electron').remote;
const ipc = require('electron').ipcRenderer;

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

$(function(){
    var curWin = remote.getCurrentWindow();
    var mainWin = remote.BrowserWindow.fromId(curWin.mainWinID);
    if(!curWin.hasOwnProperty('img')){
        return;
    }

    //处理输入图像
    $("#maindisplay").attr("src", curWin.img.toDataURL());
    var img_width = curWin.img.getSize().width;
    var img_height = curWin.img.getSize().height;
    //状态栏信息显示图片大小
    $('#imgSize').text('['+img_width + ', ' + img_height + ']');

    //这个Tile的参数
    var TILEWIDTH = 48;
    var TILEX = Math.ceil(img_width/TILEWIDTH);
    var TILEY = Math.ceil(img_height/TILEWIDTH);

    //属性内初始化Tile属性
    $('#tileWidth').val(TILEWIDTH);

    //初始化canvas画布大小
    $("#main").attr("width", img_width);
    $("#main").attr("height", img_height);
    $("#mainline").attr("width", img_width);
    $("#mainline").attr("height", img_height);

    //初始化canvas图像内容
    var tileCanvas = document.getElementById("main");
    var tilecontext = tileCanvas.getContext("2d");
    var tileimg = document.getElementById("maindisplay");
    tilecontext.drawImage(tileimg, 0, 0);
    var lineCanvas = document.getElementById("mainline");
    var linecontext = lineCanvas.getContext("2d");
    drawVirtualLine(linecontext, TILEX, TILEY, TILEWIDTH);

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
        $(".drawdisplay").attr("width", img_width * scaleIndex / 100);
        $(".drawdisplay").attr("height", img_height * scaleIndex / 100);
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
        linecontext.clearRect(0,0,$("#mainline").width(),$("#mainline").height());
        TILEWIDTH = w;
        TILEX = Math.ceil(img_width/TILEWIDTH);
        TILEY = Math.ceil(img_height/TILEWIDTH);
        //console.log("repaint the line", TILEX, TILEY, TILEWIDTH);
        drawVirtualLine(linecontext, TILEX, TILEY, TILEWIDTH);
        maindisplaylineData = lineCanvas.toDataURL();
        $("#maindisplayline").attr("src", maindisplaylineData);
        //
        selRect.tileWidth = TILEWIDTH;
    });

    //状态栏事件绑定
    $('#scaletray').click(function (e) { 
        e.preventDefault();
        scaleIndex = 100;
        scaleDisplay();
    });

    //初始化状态栏的鼠标坐标值
    $('#cursorCoordinate').text('[0, 0]');

    var selRect = new selectedRect(lineCanvas, 'maindisplayline', TILEWIDTH);

    //编辑Block模式
    var isBlockOpen = false;
    var blockNum = 4;
    $('#blockNum').val(blockNum);
    var blockWidth = TILEWIDTH/blockNum;
    $('#blockMode').change(function (e) { 
        e.preventDefault();
        isBlockOpen = $('#blockMode')[0].checked;
        $('#blockMode').blur();
        //显示block线框
        if(isBlockOpen){
            console.log('block', isBlockOpen, blockWidth, blockNum);
            drawVirtualLine(linecontext, TILEX*blockNum, TILEY*blockNum, blockWidth, true);
            maindisplaylineData = lineCanvas.toDataURL();
            $("#maindisplayline").attr("src", maindisplaylineData);
        }
        else{
            linecontext.clearRect(0, 0, TILEX * TILEWIDTH, TILEY * TILEWIDTH);
            selRect.select(0,0,0,0);
        }
        
    });

    //函数定义区
    function mouseListen(){
        var drawStart = false;
        var tileDownX = -1;
        var tileDownY = -1;
        var tileMove = false;

        $("#maindisplayline").mousedown(function (e) {
            if(!isBlockOpen){
                let mx = e.pageX - $("#maindisplayline").offset().left;
                let my = e.pageY - $("#maindisplayline").offset().top;
                tileDownX= parseInt(mx / (TILEWIDTH * scaleIndex / 100));
                tileDownY = parseInt(my / (TILEWIDTH * scaleIndex / 100));
                tileMove = true;
                //console.log(tileDownX + ',' + tileDownY);
                selRect.select(tileDownX, tileDownY, 1, 1);
                postToRemoteData(tileDownX, tileDownY, 1, 1);
                $('#selectRect').text('[' + tileDownX + ', ' + tileDownY + ', 0, 0 ]');
            } else{
                //补充Block模式
            }

        });

        $("#maindisplayline").mousemove(function(e){
            if(!isBlockOpen){
                let mx = e.pageX - $("#maindisplayline").offset().left;
                let my = e.pageY - $("#maindisplayline").offset().top;
                grid_num_x= parseInt(mx / (TILEWIDTH * scaleIndex / 100));
                grid_num_y = parseInt(my / (TILEWIDTH * scaleIndex / 100));
                //这里可以添加状态栏，信息显示
                $('#cursorCoordinate').text('['+grid_num_x + ', ' + grid_num_y + ']');
                if(!tileMove)
                    return;

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
        selData.tileWidth = TILEWIDTH;
        mainWin.webContents.send('tile-selected', selData);
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