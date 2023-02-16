// Wait for images to load then execute scripts
$( document ).ready(function() {
    $('.hexagons').hexagons(function() {// Set up hexagons
        
        $('.hex.running').each(function(){
            $(this).find('.hex_inner').css("background-color", "green");
        })
        
        $('.hex.stopped').each(function(){
            $(this).find('.hex_inner').css("background-color", "gray");
        })

    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

});