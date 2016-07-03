$(window).resize(function () { 
    $('#maincontent').css('height', $(window).height() - $('#statusbar').outerHeight() + 'px');
    $('#statusbar').css('top', $(window).height() - $('#statusbar').outerHeight() + 'px');
});

function navshow(){
    $('.nav').animate({
        width:'180px',
        opacity: '1'
    });
}

function navhide(){
    $('.nav').animate({
        width:'0px',
        opacity: '0'
    });
}

function prosetshow(){
    $('.proset').animate({
        width:'180px',
        opacity: '1'
    });
}

function prosethide(){
    $('.proset').animate({
        width:'0px',
        opacity: '0'
    });
}

//list-item
function newListItem(name, icon){
    let item = $('<div class="list-item"><span><img src="assets/img/close.png"></span><i>hahaha.png</i></div>');
    let textbox = item.children("i");
    textbox.text(name);
    if(icon){
        let iconbox = item.children("span").children("img");
        iconbox.attr("src", icon);
    }
    return item
}

function getListName(item){
    let textbox = item.children("i");
    return textbox.text();
}

function addToListContainer(listname, item){
    $("#" + listname).append(item);
}

function addListTextFunc(item, func){
    item.children("i").dblclick(func);
}

function putListTextArg(item, key, value){
    item.children("i").attr(key, value);
}

function addListIconFunc(item, func){
    item.children("span").children("img").click(func);
}