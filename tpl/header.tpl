<!DOCTYPE html>
<html lang="en">
<head>

  <title>{$site_title}</title>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="author" content="Matthew P. Visnovsky" />
  
  {* CSS Libraries *}
  <link rel="stylesheet" type="text/css" href="css/hexagons.css" />
  <link rel="stylesheet" type="text/css" href="css/all.css" />

  {* Fonts *}
  <link rel="stylesheet" href="https://fonts.googleapis.com/css?family=Bungee" >

  {* Load Javascript Config Object *}
  <script>
    "use strict";
    window.GLOBAL = {}; // GLOBAL Object namespace
    GLOBAL.config = {$js_config|json_encode nofilter};

    {if !isset($debug) or !$debug }{literal}
      const msg = "The console has been disabled for security purposes.";
      const console = {
        log : function(){ return msg; },
        warn : function(){ return msg; },
        error : function(){ return msg; },
        time : function(){ return msg; },
        timeEnd : function(){ return msg; },
      };
    {/literal}{/if}
  </script>

  {* Javascript Libraries*}
  <script src="vendor/jquery3/js/jquery-3.6.1.min.js"></script>
	<script src="vendor/wait-for-images/wait-for-images.min.js"></script>
	<script src="vendor/color-thief/color-thief.min.js"></script>
	<script src="vendor/lodash/lodash.min.js"></script>
  {if file_exists('js/functions.min.js')}
  <script src="js/functions.min.js"></script>
  {else}
  <script src="js/functions.js"></script>
  {/if}

	{literal}
  <style>.hexagons{display:none;}</style>

  <script>
    $(document).ready(function() {
      loadVideo('bgvideo');
    });
  </script>

	<script async src="https://www.googletagmanager.com/gtag/js?id=UA-136799599-1"></script>
	<script>
	  window.dataLayer = window.dataLayer || [];
	  function gtag(){dataLayer.push(arguments);}
	  gtag('js', new Date());
	  gtag('config', 'UA-136799599-1');
	</script>
  {/literal}

</head>



