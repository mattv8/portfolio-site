// Wait for images to load then execute scripts
$( document ).ready(function() {
    $('.hexagons').hexagons().ready(function() {// Set up hexagons
        
        $('.hex.running').each(function(){
            $(this).find('.hex_inner').css("background-color", "green");
        })
        
        $('.hex.stopped').each(function(){
            $(this).find('.hex_inner').css("background-color", "gray");
        })

        const animTime = 500;// This must be same as CSS .flip and .flip-back time
        $('.hex_inner').on({
            mouseenter: function () {
                const parent = $(this).closest('.hex');
                if(!parent.hasClass('flipped')){
                    parent.addClass('flip');
                    setTimeout(function() {
                        parent.find('.inner-title').hide();
                        parent.find('.inner-text-flipped').show();
                        setTimeout(function() {
                            parent.addClass('flipped');
                        }.bind(this), animTime/2);
                    }.bind(this), animTime/2);
                }
            },
            mouseleave: function () {
                const parent = $(this).closest('.hex');
                if(parent.hasClass('flipped')){
                    parent.addClass('flip-back');
                    setTimeout(function() {
                        parent.find('.inner-text-flipped').hide();
                        parent.find('.inner-title').show();
                        setTimeout(function() {
                            parent.removeClass('flip flipped flip-back');
                        }.bind(this), animTime/2);
                    }.bind(this), animTime/2);
                }
            }
        });

    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

});