/*
    Javascript Functions
*/

function goToPage(page,selector) {
  
  // Redirect to root if page is null
  if(page == null){ window.location.href = '/'; return; }

  // Get logo selector
  const logo = $('.logo');
  
  // Else route to specified page asynchronously
  $.ajax({
    url: 'index.php',
    type: 'GET',
    data: { page: page },
    beforeSend: function() {// Start loading animation
      if (logo) { rotate(logo,500); }
      else { showLoadingAnimation(); }
    },
    complete: function() {// Stop loading animation
      document.getElementById('loading-animation').style.display = 'none';// Hide the loading animation
    },
    success: function(response) {
      if(selector){ 
        $(selector).html(response); // Swap selector for response, which is a tpl
      } else {
        $(document.body).fadeOut(500, function() {
          var newPage = document.open("text/html", "replace");// Create the new page
          newPage.write(response);// Write the new TPL to the page
          newPage.close();// Finish
          $(document.body).fadeIn(500);// Display
        });
      }
      history.pushState(page, null, '/?page=' + page);// add the page to the browser's history
    },
  });
}


function fade(element) {
  var op = 0;
  var timer = setInterval(function() {
    if (op >= 1) clearInterval(timer);
    element.style.opacity = op;
    element.style.filter = 'alpha(opacity=' + op * 100 + ")";
    op += op * 0.1 || 0.1;
  }, 20);
}


// Continuously Rotate Function
var step = 0;
function rotate(selector,time) {
  if(selector){
    const element = selector.get(0);
    element.style.transition = 'transform 0.75s cubic-bezier(.61,.01,.41,.99)';
    element.style.setProperty('transform-style', 'preserve-3d');
    element.style.setProperty('perspective', '1000px');
    element.style.transform = `rotateY(${step}deg)`;
    step += 180;
    setTimeout(rotate, time, selector, (step)?time:step);
  }
}

//Loading Animation
function showLoadingAnimation() {
  document.getElementById('loading-animation').style.display = 'block';
}


function centerpoint(element) {
	var position = element.position();
	var width = element.width();
	var height = element.height();
	return center = {
	  left: position.left + width / 2,
	  top: position.top + height / 2
	}
}


function drawDot(xy, parent, rad) {
  var radius = (rad)?rad:5;// Default 5px
	var dot = document.createElement("div");
	dot.style.width = radius + "px";
	dot.style.height = radius + "px";
	dot.style.borderRadius = "50%";
	dot.style.background = "red";
	dot.style.position = "absolute";
	dot.style.left = xy.left - radius/2 + "px";
	dot.style.top = xy.top - radius/2 + "px";
	parent.append(dot);
}
