<!DOCTYPE html>
<html lang="en">
<head>

  <title>{$site_title}</title>
  <meta charset="utf-8" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="author" content="Matthew P. Visnovsky" />
  
  {* CSS Libraries *}
  {* <link rel="stylesheet" type="text/css" href="lib/bootstrap5/css/bootstrap.min.css" />
  <link rel="stylesheet" type="text/css" href="lib/font-awesome5/css/all.min.css" />
  <link rel="stylesheet" type="text/css" href="lib/datatables/css/dataTables.bootstrap5.min.css" />
  <link rel="stylesheet" type="text/css" href="lib/datepicker-lightpick/css/lightpick.css" />
  <link rel="stylesheet" type="text/css" href="lib/select2/css/select2.min.css" /> *}

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
  <script src="lib/jquery3/js/jquery-3.6.1.min.js"></script>
  {* <script src="lib/bootstrap5/js/bootstrap.bundle.min.js"></script>
  <script src="lib/datatables/js/datatables.min.js"></script>
  <script src="lib/datatables/js/dataTables.bootstrap5.min.js"></script>
  <script src="lib/moment/moment.min.js"></script>
  <script src="lib/datepicker-lightpick/js/lightpick.js"></script>
  <script src="lib/select2/js/select2.full.min.js"></script> *}
	<script src="lib/wait-for-images/wait-for-images.min.js"></script>
	<script src="lib/color-thief/color-thief.min.js"></script>
  {if file_exists('js/all.min.js')}
  <script src="js/all.min.js"></script>
  {else}
  <script src="js/functions.js"></script>
	<script src="js/hexagons.js"></script>
	<script src="js/server.js"></script>
  {/if}

	{literal}
  <style>.hexagons{display:none;}</style>

	<script async src="https://www.googletagmanager.com/gtag/js?id=UA-136799599-1"></script>
	<script>
	  window.dataLayer = window.dataLayer || [];
	  function gtag(){dataLayer.push(arguments);}
	  gtag('js', new Date());
	  gtag('config', 'UA-136799599-1');
	</script>
  {/literal}

</head>



