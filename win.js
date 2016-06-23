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