/*
    Javascript Functions
*/
function goToPage(page,selector) {
  if(page == null){    
    window.location.href = '/';// redirect to index.php
    return;
  }
  $.ajax({
    url: 'index.php',
    type: 'GET',
    data: { page: page },
    success: function(response) {
      if(selector){ $(selector).html(response); }
      else {
        $('#body').fadeOut(function() {
          $(this).html(response).fadeIn();
        });
      }
      history.pushState(page, null, '?page=' + page);// add the page to the browser's history
    }
  });
}