/*
	Hexagon Building Code
	Written by Matthew Visnovsky
*/

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
		var textHeight = 1;// initialize hex scale factor

		/*
		 * All DOM building must go here. Function is called at end of script.
		 * This is to prevent half-loading of the page.
		 */
		function buildHtml(){

			$(element).find('.hex').append('<div class="hex_l"></div>');
			$(element).find('.hex_l').append('<div class="hex_r"></div>');
			$(element).find('.hex_r').append('<div class="hex_inner"></div>');
			$(element).find('.hex_inner').append('<div class="inner-span"><div class="inner-title"></div></div>');
			$(element).find('.inner-span').append('<div class="inner-text"></div>');

			// Hex Links
			$(element).find('.link').each(function(){
				var link = $(this).find("link").attr("href"); // Find its associated anchor
				if(link) { $(this).find('.hex_inner').wrap('<a href="'+link+'" class="link"></a>'); } // wrap the <a></a>
			})
			
			// Hex Buttons
			$(element).find('.button').each(function(){
				var button = $(this).attr("onclick"); // Find its associated anchor
				if (button){
					$(this).removeAttr('onclick');// Remove the extra onclick action
					$(this).find('.hex_inner').wrap('<button onclick="'+button+'" class="button"></button>'); // wrap the <a></a>
				}
			})
			
			// Hex Image
			$(element).find('.hex').each(function(){
				
				hex_index = hex_index + 1; // iterate hex index counter (counts total # of hexagons)
				var bg_img_src = $(this).find('.bg').attr('src');//Get uri's of class='bg' images
				var hvr_img_src = $(this).find('.hvr').attr('src');//Get uri's of class='hvr' images
				var p = $(this).find('p').text();//Get uri's of class='hvr' images
				
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

					// When hovering, show dominant color of image
					$(this).mouseenter(function(){
						$(this).find('.inner-span').attr('style', 'transition: background-color 0.3s ease;  background-color: rgb(' + color + ')');
					});
					$(this).mouseleave(function(){
						$(this).find('.inner-span').attr('style', 'transition: background-color 0.3s ease;  background-color:none');
					});

				}
				
				// For hexagons with an image when hovering
				if(hvr_img_src !== undefined){// if hover image is defined
					$(this).mouseenter(function(){
						$(this).find('.inner-span').attr('style', 'background-image: url("'+hvr_img_src+'")');
					})
					$(this).mouseleave(function(){
						$(this).find('.inner-span').attr('style', 'background-image: none');
					})
				}

				// For hexagons with programmatically defined background colors
				if(bg_img_src === undefined) {// If image is not defined
					// Attach bg image and drop shadow
					$(this).find('.hex_inner').attr('style', 'background-color: white');
					$(this).attr('style', 'filter: drop-shadow(-5px 5px 10px black);');

				}

				// For hexagons with inner text
				if($(this).find('span').length > 0){ // If span is defined
					$(this).find('.inner-span .inner-title').html($(this).find('span').html());
				}else{
					$(this).find('.inner-span').remove();
				}

				// For hexagons with inner sub-text
				if($(this).find('p').length > 0){// If span is defined
					$(this).find('.inner-span .inner-text')
					.html($(this).find('p').html())
					.removeClass('inner-text')
					.addClass($(this).find('p').attr('class'));
					$(this).find('p').remove();
				}else{
					$(this).find('.inner-text').remove();
				}
				
			});// END $(element).find('.hex').each(function()
			
			$(element).find('img, span, link, p').hide();// Hide hex builder tags
			
			$('.invisible').hide();// Remove invisible elements
			
		}// END buildHtml()
				
		/*
		 * Update all scale values
		 */
		function updateScales(hexWidth){
			hexHeight = ( Math.sqrt(3) * hexWidth ) / 2;
			textHeight = hexHeight*.12;// pixel height of text is percentage of hex height
			$(element).find('.hex').width(hexWidth).height(hexHeight);
			$(element).find('.hex_l, .hex_r').width(hexWidth).height(hexHeight);
			$(element).find('.hex_inner').width(hexWidth).height(hexHeight);
			$(element).find('.hexagons, .inner-title').css({'fontSize': textHeight});
		}// END updateScales()

		/*
		 * Div re-size animation function. Returns updated div dimensions.
		 */
		function reorder(animate){

			width = $(element).width();// get width of hexagons wrapper div

			// TODO: make .invisible elements come back when up-sizing window
			if($(window).width() < 1200) {// increase hex scale at break-point (for mobile)
				hexWidth = width/2 + settings.margin*4;
				$(element).find('.invisible').detach();
				$(element).find('.logo').detach();
			}else { 
				hexWidth = settings.hexWidth;
			}
			updateScales(hexWidth);// call function above
												
			var row = 0;// start at row 0
			var col = 0;// start at col 0
			var offset = 1;// 1 is down
			var left = 0;// pos left
			var top = 0;// pos top

			$(element).find('.hex').each(function(){

				// console.log("Col: "+col, "Row: "+row);

				top = ( row * (hexHeight + settings.margin) ) + (offset * (hexHeight / 2 + (settings.margin / 2)));// determines top margin of hexagons
				offset ^= 1;// determines up/down in-line alignment of hexagons, alternating for every other column (using bitwise XOR "^" operator)
				
				// Set values
				if(animate == true){ //animate if specified
					$(this).stop(true, false);
					$(this).animate({'left': left, 'top': top});
				}else{
					$(this).css('left', left).css('top', top);
				}
				
				// Update values for the next iteration
				left += ( hexWidth - hexWidth / 4 + settings.margin );// determines left margin of hexagons
				
				if(left + hexWidth > width){// "Wrap" to next row
					left = col = 0;// Reset
					row++;// Move to next row
					offset = 1;// Reset offset
				} else {
					col++;// Move to next column
				}

			});
		} // END reorder(animate)

		$(window).resize(function(){ // call reorder function when window resizes
			reorder(true); //Set "animate" to true by default
		});

		buildHtml(); // Build the DOM
		reorder(false);
	} // END initialise(element)

	return this.each(function() {
		initialise(this);
	});

} // END function(options)

}(jQuery));
