// Wait for images to load then execute scripts
$( document ).ready(function() {
    $('.hexagons').hexagons(function() {// Set up hexagons
        
        $('.hex.running').each(function(){
            $(this).find('.hex_inner').css("background-color", "green");
        })
        
        $('.hex.stopped').each(function(){
            $(this).find('.hex_inner').css("background-color", "gray");
        })

		// Hex Flip
		$('.hex').each(function(hexId){
			const $hex = $(this);
            const animTime = 500;// This must be same as CSS .flip and .flip-back time
            $hex.find('.inner-text-flipped').attr('id', `fliptext-${hexId}`).wrapInner('<span></span>') // wrap the <span></span>
            if ($hex.hasClass('flip')) {
                $hex.find('.hex_inner').on({
                    mouseenter: function () {
                        if(!$hex.hasClass('flipped')){
                            $hex.addClass('flipping');
                            setTimeout(function() {
                                $hex.find('.inner-title').hide();
                                $hex.find('.inner-text-flipped').show();
                                $hex.css('filter', 'url(#rounded-edges)  drop-shadow(5px 5px 10px black)');
                                setTimeout(function() {
                                    $hex.addClass('flipped');
                                }.bind(this), animTime/2);
                            }.bind(this), animTime/2);
                        }
                    },
                    mouseleave: function () {
                        if($hex.hasClass('flipped')){
                            $hex.addClass('flip-back');
                            setTimeout(function() {
                                $hex.find('.inner-title').show();
                                $hex.find('.inner-text-flipped').hide();
                                $hex.css('filter', 'url(#rounded-edges) drop-shadow(-5px 5px 10px black)');
                                setTimeout(function() {
                                    $hex.removeClass('flipping flipped flip-back');
                                }.bind(this), animTime/2);
                            }.bind(this), animTime/2);
                        }
                    }
                });
            }
        });

    });
    $('.hexagons').fadeIn(10); // Fade in when loaded

});