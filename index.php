<?php

#==============================================================================
# Configuration
#==============================================================================
require_once($_SERVER['DOCUMENT_ROOT'].'/conf/config.php');
require_once($_SERVER['DOCUMENT_ROOT'].'/lib/functions.php');


#==============================================================================
# Smarty Environment
#==============================================================================
require_once(SMARTY);

$compile_dir = $smarty_compile_dir ? $smarty_compile_dir : $_SERVER['DOCUMENT_ROOT'].'/cache';
$cache_dir = $smarty_cache_dir ? $smarty_cache_dir : $_SERVER['DOCUMENT_ROOT'].'/cache/smarty';

$smarty = new Smarty();
$smarty->escape_html = true;
$smarty->setTemplateDir($_SERVER['DOCUMENT_ROOT'].'/tpl');
$smarty->setCompileDir($compile_dir);
$smarty->setCacheDir($cache_dir);


#==============================================================================
# Logging
#==============================================================================
error_reporting(0);
if ($debug) {
    error_reporting(E_ALL);
}
$smarty->assign('debug',$debug);
$smarty->debugging = $smarty_debug;


#==============================================================================
# Misc Configurations
#==============================================================================

# Assign configuration variables
$smarty->assign('js_config',$js_config);// Javascript Config Object
$smarty->assign('site_title',$site_title);
$smarty->assign('default_page',$default_page);


#==============================================================================
# Route to page
#==============================================================================
$page = $default_page;
if (isset($_GET["page"]) and $_GET["page"]) { 
    $page = $_GET["page"];
    if ( file_exists($page.".php") ) { require_once($page.".php"); }
}
$smarty->assign('page',$page);

# Display
$smarty->display('index.tpl');

?>
