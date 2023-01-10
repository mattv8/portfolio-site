// Wait for images to load then execute scripts
$( document ).ready(function() {
    $('.hexagons').hexagons().ready(function() {// Set up hexagons

        $('.hex.running').each(function(){
            // Attach bg image
            $(this).find('.hex_inner').css("background-color", "green");
        })
        
        $('.hex.stopped').each(function(){
            // Attach bg image
            $(this).find('.hex_inner').css("background-color", "red");
        })

        $('.hex_inner').on({
            mouseenter: function () {
                const parent = $(this).closest('.hex');
                var flipText = parent.find('span').text() + '-hover';
                if(!parent.hasClass('flipped')){
                    parent.addClass('flip');
                    setTimeout(function() {
                        parent.find('.inner-text, .inner-p').hide();
                        if (!parent.find('.inner-text-hover').length){
                            parent.find('.inner-span').append('<div class="inner-text-hover">'+flipText+'</div>');
                        }
                    }.bind(this), 140);
                    setTimeout(function() {
                        parent.addClass('flipped');
                    }.bind(this), 500);
                }
            },
            mouseleave: function () {
                const parent = $(this).closest('.hex');
                if(parent.hasClass('flipped')){
                    parent.addClass('flip-back');
                    setTimeout(function() {
                        parent.find('.inner-text-hover').remove();
                        parent.find('.inner-text, .inner-p').show();
                    }.bind(this), 140);
                    setTimeout(function() {
                        parent.removeClass('flip flipped flip-back');
                    }.bind(this), 500);
                }
            }
        });

    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

});