// Wait for images to load then execute scripts
$(document).ready(function () {

    $('.hexagons').hexagons(function () {// Set up hexagons

        $('.hex.running').each(function () {
            $(this).find('.hex_inner').css("background-color", "green");
        })

        $('.hex.stopped').each(function () {
            $(this).find('.hex_inner').css("background-color", "gray");
        })

    }, {
        hexWidth: 250,
    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

});


function openServerDetails(hex, serverName) {
    console.log(hex, $(hex).find('.hex_inner'))
    var time = .5;

    $(hex).parent()
        .toggleClass('centered')
        .css('transition', `all ${time}s ease-in-out`);
    $(hex).find('.hex_inner')
        .toggleClass('squared')
        .css('transition', `all ${time}s ease-in-out`)
        .off('mouseenter mouseleave')

    console.log(serverName);

}