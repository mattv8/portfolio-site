$(document).ready(function() {

	// Wait for images to load then execute scripts
	$('.hexagons').waitForImages(function() {
		$('.hexagons').hexagons(function(elems) {// Set up hexagons
			var center = elems[_.findKey(elems, {class:'logo'})].corner;// Save centerpoint
			var animating = _.remove(elems, function(e) { return !(e.class === 'logo' || e.class === 'invisible'); });// Remove invisible and logo classes
			animating.forEach( function(e) {
				$('.hexagons').hover(function() {
					expand(e.selector, center, e.corner, 25, 1);
				}, function() {
					expand(e.selector, center, e.corner, 0, 1);
				});
			});
			  
		});
		$('.hexagons').fadeIn(10); // Fade in when loaded
	});

	// Play video after it has finished loading
	var e = document.getElementById("bgvideo");
	if(e) {
		e.style.opacity = 0;
		var vid = document.getElementById("bgvideo");
		var tim = setInterval(function() {
			if (vid.readyState === 4) {
				clearInterval(tim);
				fade(e);
			}
		}, 100);
	}

});// END $(document).ready( )
// This function calculates the slope of the line between the center and start points and uses it to determine the direction of the animation.
function expand(selector, center, start, animationDistance, timing) {
	let slope = (start.top - center.top) / (start.left - center.left);
	
	// Set the direction of the animation. 1 for right or up, -1 for left or down
	let direction = 1;
	if (center.left > start.left) {
	  direction = -1;
	}
	
	let newLeft = start.left;
	let newTop = start.top;
	
	// If the start and center points have the same x coordinate, move vertically
	if (start.left === center.left) {
	  if (center.top > start.top) {
		direction = -1;
	  }
	  newTop = start.top + direction * animationDistance;
	} else {
	  newLeft = start.left + direction * animationDistance / Math.sqrt(1 + slope * slope);
	  newTop = start.top + direction * slope * animationDistance / Math.sqrt(1 + slope * slope);
	}

	// jQuery's animate method to animate the element to the new position
	$(selector).animate({
	  left: newLeft,
	  top: newTop
	}, {
	  duration: timing * 1000,
	  easing: "swing"
	});
  }