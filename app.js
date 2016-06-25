const ipc = require('electron').ipcRenderer;

function navBar(){
    
}

function StateBar(){

}

function mainForm() {
    this.tileX;
    this.tileY;
    this.tileWidth;
    const drawer = require ("./drawer.js");

    this.init = function() {
        
    }

    this.drawInit = function (){
        var tileCanvas = document.getElementById("mainline");
		var tilecontext = tileCanvas.getContext("2d");
        console.log(this);
        console.log(this.tileX, this.tileY, this.tileWidth);
        $("#mainline").attr("width", this.tileX * this.tileWidth ); //注意canvas只能通过html属性来设置宽高，否者图像会拉伸
		$("#mainline").attr("height", this.tileY * this.tileWidth );
        $("#drawingArea").height(this.tileY * this.tileWidth);
        $("#drawingArea").width(this.tileX * this.tileWidth);
        drawer.drawVirtualLine(tilecontext, this.tileX, this.tileY, this.tileWidth);
    }
    
    ipc.on('newMap', function(event, msg){
        //$("#new").show();
        navshow();
    });

    ipc.on('tile-selected', function(event, selData){
        console.log(event, selData);
    });

    $(window).keyup(function (e) { 
       //console.log(e);
       switch (e.keyCode) {
           case 27: //esc
                navhide();
               break;

           default:
               break;
       }
    });

    var that = this;    //可以通过that的方式，将对象传给外部函数
    $('#newBtn').click(function(e){
        e.preventDefault();
        that.tileX = $('#newx').val();
        that.tileY = $('#newy').val();
        that.tileWidth = $('#newwidth').val();
        $('#newx').val("");
        $('#newy').val("");
        $('#newwidth').val("");
        navhide();
        that.drawInit();
    });
    console.log(this);
}

$(document).ready(function () {
    var main = new mainForm();
});