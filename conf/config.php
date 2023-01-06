<?php
#==============================================================================
# Portfolio Website Configuration
#
#==============================================================================

# Debug mode
$debug = false;
$smarty_debug = false;

# Cache directory
$smarty_compile_dir = "cache";
$smarty_cache_dir = "cache/smarty";

$site_title = "Portfolio | Landing";

# If desired, specify an associative array to be JSON encoded and passed to Javascript (loaded in header.tpl)
#   Example: $js_config_obj = array('foo1'=>'bar1', 'foo2'=>'bar2');
#   Load from any Javascript file like 'js_config_obj.autofill_attributes'
$js_config = array('');

# Allow to override current settings with local configuration
if (file_exists ($_SERVER['DOCUMENT_ROOT'].'/conf/config.local.php')) {
    include ($_SERVER['DOCUMENT_ROOT'].'/conf/config.local.php');
}

# Smarty
if (!defined("SMARTY")) {
    define("SMARTY", "vendor/smarty/Smarty.class.php");
}

?>