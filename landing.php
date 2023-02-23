<?php
#==============================================================================
# Configuration
#==============================================================================
require_once($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/conf/config.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/lib/functions.php');

#==============================================================================
# Image 'Smart Random' Algorithm
#==============================================================================
$images = ['programming', 'engineering', 'server', 'devops', 'livestreaming', 'bio'];

if (!isset($_SESSION['previous_image'])) {
    $_SESSION['previous_image'] = array_fill_keys($images, ''); // Initialize the previous image array in the session
}

$_image = array();
foreach ($images as $image) { // Iterate over each image
    $files = glob($_SERVER['DOCUMENT_ROOT'] . '/assets/images/landing/' . $image . '_*.jpg'); // Get list of matching files
    $count = count($files);

    if ($count > 0) { // If there are files in the list
        do {
            $random_file_index = array_rand($files); // select a random file index
            $selected_file = str_replace($_SERVER['DOCUMENT_ROOT'] . '/', '', $files[$random_file_index]); // get the selected file path
        } while ($selected_file == $_SESSION['previous_image'][$image] && $count > 1); // repeat until the selected file is different from the previous one

        $_image[$image] = $selected_file; // Assign the selected file path to the $_image array
        $_SESSION['previous_image'][$image] = $selected_file; // Save previous image variable in the session
    }
}

$smarty->assign('image', $_image);
