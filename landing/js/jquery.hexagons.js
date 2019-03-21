(function($) {

$.fn.hexagons = function(options) {
	
	// Defaults (global)
	var settings = $.extend({
		hexWidth: 250,
		margin: 10,
	}, options);
	
	// Experimental colorThief
	// Create colorThief object
	//var colorThief = new ColorThief();

	function initialise(element) {

		var width = 0;
		var hexWidth = 0;
		var hexHeight = 0;
		var hex_index = 0;
		var metric_idx = 1; // iterates through number of panels
		var n_panels = 11; // Number of metric panels on dashboard
		var textHeight = 1; // initialize hex scale factor
//		var $wrapper = null;

		/**
		 * All DOM building must go here. Function is called at end of script.
		 * This is to prevent half-loading of the page.
		 */
		function buildHtml(){

			// add the 2 other boxes
//			$(element).find('.hex').wrapAll('<div class="hexagons-inner-wrapper"></div>');
//			$wrapper = $(element).find('.hexagons');

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
				
				// TODO: Make .logo have index of 1 so it appears at the top when re-flowing
				var bg_img_src = $(this).find('.bg').attr('src');//Get uri's of class='bg' images
				var hvr_img_src = $(this).find('.hvr').attr('src');//Get uri's of class='hvr' images
				
				if(bg_img_src !== undefined){ //if image is defined
					// Experimental colorThief
					//var img_obj = new Image(100, 100); //Build image object
					//img_obj.src = bg_img_src; //Attach bg image uri

					// Attach bg image and drop shadow
					$(this).find('.hex_inner').attr('style', 'background-image: url("'+bg_img_src+'");');
					$(this).attr('style', 'filter: drop-shadow(-5px 5px 10px black);');

					if($(this).find('span').length > 0){ // If span is defined
						$(this).find('.inner-span .inner-text').html($(this).find('span').html());
					}else{
						$(this).find('.inner-span').remove();
					} // end if					
				} // end if
				
				if(hvr_img_src !== undefined){ //if image is defined
					// Experimental colorThief
					//var color = colorThief.getColor(img_obj); // Get the dominant color of image

					$(this).mouseenter(function(){
						$(this).find('.inner-span').attr('style', 'background-image: url("'+hvr_img_src+'");');
						//$(this).find('.inner-span').attr('style', 'transition: background-color 0.5s ease;  background-color: rgb(' + color + ')');
					})
					$(this).mouseleave(function(){
						//$(this).find('.inner-text').attr('style', 'transition: color 0.5s ease;  color:inherit');
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
			
			//$(element).find('img, span, .inner-span').hide(); //hide .inner-span
			$(element).find('img, span, link').hide();
			
		} //end buildHtml
		
		
//		var invisible = $(element).find('.invisible');
//		var logo = $(element).find('.logo');
		
		/**
		 * Update all scale values
		 */
		function updateScales(hexWidth){			
//			hexWidth = settings.hexWidth*scale;
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
//				logo.insertBefore('.hexagons');
			}else { 
				hexWidth = settings.hexWidth;
//				invisible.appendTo("hexagons");
			}
			updateScales(hexWidth); //call function above
												
//			$wrapper.width(width); //load initial hex wrapper div size (preallocate)
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

//			$wrapper
//				.width(cols * (hexWidth / 4 * 3 + settings.margin) + hexWidth / 4)
//				.height((row + 1) * (hexHeight + settings.margin) + hexHeight / 2);
			
		}

		$(window).resize(function(){ // call reorder function when window resizes
			reorder(true); //Set "animate" to true by default
		});
		
		// Mouseover events (faster)
		/*$(element).find('.hex').mouseenter(function(){
			//$(this).find('.inner-text').attr('style', 'transition: color 0.5s ease;  color:white');
			$(this).find('.inner-span').attr('style', 'transition: background-color 0.5s ease;  background-color: #A31F20');
		});

		$(element).find('.hex').mouseleave(function(){
			//$(this).find('.inner-text').attr('style', 'transition: color 0.5s ease;  color:inherit');
			$(this).find('.inner-span').attr('style', 'transition: background-color 0.5s ease;  background-color:none');
		});*/

		buildHtml(); // Build the DOM
		reorder(true);
	}

	return this.each(function() {
		initialise(this);
	});

}

}(jQuery));