MTile = {
    file : "BasicMap.png",
    imgWidth : 0, //真实图片大小
    imgHeight: 0,
    TileX : 12, //图像切块
    TileY : 3,
    TileWidth : 0,  //图像需要支持长方形吗
    subBlock : 4,   //如果图像只是正方形，那这样就可以
    tiles : [
        {
            id : 0,
            blocks : [1, 0, 1, 0, ...],
        },
        {
            id : 1,
            blocks : [1, 0, 1, 0, ...],
        },
        //...
    ]
};