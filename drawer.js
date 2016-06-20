exports.drawVirtualLine = function(context, x, y, width){
    context.beginPath();
    context.strokeStyle = "#000000";
    context.lineWidth = 2.0;
    let i;
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
};

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