(function($) {

$.fn.hexagons = function(options) {
	
	// Defaults (global)
	var settings = $.extend({
		hexWidth: 250,
		margin: 10,
	}, options);

	function initialise(element) {

		var width = 0;
		var hexWidth = 0;
		var hexHeight = 0;
		var hex_index = 0;
		var metric_idx = 1; // iterates through number of panels
		var n_panels = 11; // Number of metric panels on dashboard
		var textHeight = 1; // initialize hex scale factor

		/**
		 * All DOM building must go here. Function is called at end of script.
		 * This is to prevent half-loading of the page.
		 */
		function buildHtml(){

			$(element).find('.hex').append('<div class="hex_l"></div>');
			$(element).find('.hex_l').append('<div class="hex_r"></div>');
			$(element).find('.hex_r').append('<div class="hex_inner"></div>');
			$(element).find('.hex_inner').append('<div class="inner-span"><div class="inner-text"></div></div>');

			// Hex Links
			$(element).find('.link').each(function(){
				var link = $(this).find("link").attr("href"); // Find its associated anchor
				$(this).find('.hex_inner').wrap('<a href="'+link+'" class="link"></a>'); // wrap the <a></a>
			})
			
			// Hex generic with images
			$(element).find('.hex').each(function(){
				
				hex_index = hex_index + 1; // iterate hex index counter (counts total # of hexagons)
				var bg_img_src = $(this).find('.bg').attr('src');//Get uri's of class='bg' images
				var hvr_img_src = $(this).find('.hvr').attr('src');//Get uri's of class='hvr' images
				
				// For hexagons with links or solid color hover backgrounds
				if(bg_img_src !== undefined){ //if image is defined
					// colorThief variables
					var img_obj = new Image(360, 360); // build image object
					img_obj.src = bg_img_src; //attach bg image uri
					var colorThief = new ColorThief(); // initialize colorThief
					var color = colorThief.getColor(img_obj); // Get the dominant color of image
										
					// Attach bg image and drop shadow
					$(this).find('.hex_inner').attr('style', 'background-image: url("'+bg_img_src+'");');
					$(this).attr('style', 'filter: drop-shadow(-5px 5px 10px black);');

					if($(this).find('span').length > 0){ // If span is defined
						$(this).find('.inner-span .inner-text').html($(this).find('span').html());
					}else{
						$(this).find('.inner-span').remove();
					} // end if

					// When hovering, show dominant color of image
					$(this).mouseenter(function(){
						$(this).find('.inner-span').attr('style', 'transition: background-color 0.5s ease;  background-color: rgb(' + color + ')');
					});
					$(this).mouseleave(function(){
						$(this).find('.inner-span').attr('style', 'transition: background-color 0.5s ease;  background-color:none');
					});

				} // end if
				
				// For hexagons with an image when hovering
				if(hvr_img_src !== undefined){ //if image is defined
					$(this).mouseenter(function(){
						$(this).find('.inner-span').attr('style', 'background-image: url("'+hvr_img_src+'");');
					})
					$(this).mouseleave(function(){
						$(this).find('.inner-span').attr('style', 'background-image: none');
					})
				} // end if
				
			})
			
			// Hex metrics
			$(element).find('.metrics').each(function(){
				var metric_state = "https://metrics.sonic-server.net/render/d-solo/L7ksDAjmz/website-status-page?refresh=15m&orgId=1&panelId="+metric_idx+"&width=220&height=220&tz=America%2FDenver";
				var metric_avail = "https://metrics.sonic-server.net/render/d-solo/L7ksDAjmz/website-status-page?refresh=15m&orgId=1&panelId="+(metric_idx+n_panels)+"&width=220&height=220&tz=America%2FDenver";

				// Attach bg image
				$(this).find('.hex_inner').attr('style', 'background-image: url("'+metric_state+'");');
				
				$(this).mouseenter(function(){
					$(this).find('.inner-span').attr('style', 'background-image: url("'+metric_avail+'");');
				})
				$(this).mouseleave(function(){
					$(this).find('.inner-span').attr('style', 'background-image: none');
				})				
				
				if($(this).find('span').length > 0){ // If span is defined
						$(this).find('.inner-span .inner-text').html($(this).find('span').html());
					}else{
						$(this).find('.inner-span').remove();
				} // end if
				
				metric_idx = metric_idx + 1; // iterate metric counter
			})
			
			$(element).find('img, span, link').hide();
			
		} //end buildHtml
				
		/**
		 * Update all scale values
		 */
		function updateScales(hexWidth){			
			hexHeight = ( Math.sqrt(3) * hexWidth ) / 2;
			textHeight = hexHeight*.13; //pixel height of text is percentage of hex height
			$(element).find('.hex').width(hexWidth).height(hexHeight);
			$(element).find('.hex_l, .hex_r').width(hexWidth).height(hexHeight);
			$(element).find('.hex_inner').width(hexWidth).height(hexHeight);
			$(element).find('.hexagons, .inner-text').css({'fontSize': textHeight});
		}

		/**
		 * Div re-size animation function. Returns updated div dimensions.
		 */
		function reorder(animate){

			width = $(element).width(); //get width of hexagons wrapper div

			//TODO: make .invisible elements come back when up-sizing window
			if($(window).width() < 1200) { //increase hex scale at break-point (for mobile)
				hexWidth = width/2 + settings.margin*4;
				$(element).find('.invisible').detach();
				$(element).find('.logo').detach();
			}else { 
				hexWidth = settings.hexWidth;
			}
			updateScales(hexWidth); //call function above
												
			var row = 0; // current row
			var upDown = 1; // 1 is down
			var left = 0; // pos left
			var top = 0; // pos top
			var cols = 0; // start at col 0

			$(element).find('.hex').each(function(){

				top = ( row * (hexHeight + settings.margin) ) + (upDown * (hexHeight / 2 + (settings.margin / 2))); //determines top margin of hexagons

				if(animate == true){ //animate if specified
					$(this).stop(true, false);
					$(this).animate({'left': left, 'top': top});
				}else{
					$(this).css('left', left).css('top', top);
				}

				left = left + ( hexWidth - hexWidth / 4 + settings.margin ); //determines left margin of hexagons
				upDown = (upDown + 1) % 2; //determines up/down in-line alignment of hexagons
				
				if(row == 0){ // if first row
					cols = cols + 1;
				}
				
				if(left + hexWidth > width){ //if subsequent column
					left = 0;
					row = row + 1;
					upDown = 1;
				}
				
			});	
		}

		$(window).resize(function(){ // call reorder function when window resizes
			reorder(true); //Set "animate" to true by default
		});

		buildHtml(); // Build the DOM
		reorder(true);
	}

	return this.each(function() {
		initialise(this);
	});

}

}(jQuery));