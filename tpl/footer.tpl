{* Footer Script *}
{literal}
<script type="text/javascript">
  // Wait for images to load then execute scripts
  $('.hexagons').waitForImages(function() {
    $('.hexagons').hexagons(); // Set up hexagons
    $('.hexagons').fadeIn(10); // Fade in when loaded
  });
  
  // Play video after it has finished loading
  var e = document.getElementById("bgvideo");
  e.style.opacity = 0;
  var vid = document.getElementById("bgvideo");
  var tim = setInterval(function() {
    if ( vid.readyState === 4) {
      clearInterval(tim);
      fade(e);
    }
  }, 100);
  function fade(element) {
    var op = 0;
    var timer = setInterval(function() {
      if (op >= 1) clearInterval(timer);
      element.style.opacity = op;
      element.style.filter = 'alpha(opacity=' + op * 100 + ")";
      op += op * 0.1 || 0.1;
    }, 20);
  }
</script>
{/literal}

{* Load Page-specific Modals *}
{if file_exists("tpl/modals/modal.$page.tpl")}
  {include file="tpl/modals/modal.$page.tpl"}
{/if}

</html>
