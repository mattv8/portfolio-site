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
      if (logo) { rotate(logo); }
      else { showLoadingAnimation(); }
    },
    complete: function() {// Stop loading animation
      if (!logo) { document.getElementById('loading-animation').style.display = 'none'; }// Hide the loading animation
    },
    success: function(response) {
      if(selector){ 
        $(selector).html(response); // Swap selector for response, which is a tpl
      } else {
        $('#body').fadeOut(function() {
          $(this).html(response).fadeIn();
        });
      }
      // history.pushState(page, null, '?page=' + page);// add the page to the browser's history
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
function rotate(selector) {
  if(selector){
    const element = selector.get(0);
    element.style.transition = 'transform 0.75s cubic-bezier(.59,.22,.36,.81)';
    element.style.setProperty('transform-style', 'preserve-3d');
    element.style.setProperty('perspective', '1000px');
    element.style.transform = 'rotateY(180deg)';
    setTimeout(function() {
      element.style.transform = 'rotateY(360deg)';
      setTimeout(rotate, 500);
    }, 500);
  }
}

//Loading Animation
function showLoadingAnimation() {
  document.getElementById('loading-animation').style.display = 'block';
}