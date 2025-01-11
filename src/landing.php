<?php
#==============================================================================
# Configuration
#==============================================================================
require_once(__DIR__ . '/vendor/autoload.php');
require_once(__DIR__ . '/conf/config.php');
require_once(__DIR__ . '/lib/functions.php');

#==============================================================================
# Image 'Smart Random' Algorithm
#==============================================================================
$categories = ['programming', 'engineering', 'server', 'film', 'livestreaming', 'resume'];

if (!isset($_SESSION['previous_image'])) {
    $_SESSION['previous_image'] = array_fill_keys($categories, ''); // Initialize the previous image array in the session
}

if (isset($_GET['previousImage']) and $_GET['previousImage']) {

    $error = '';
    $previousImage = $_GET['previousImage'];
    $regex = '/^([a-zA-Z0-9_-]+)(?=_)/';
    if (preg_match($regex, $previousImage, $matches)) {

        $category = $matches[0];
        $files = glob(__DIR__ . '/assets/images/landing/' . $category . '_*.jpg'); // Get list of matching files
        $count = count($files);

        do {
            $random_file_index = array_rand($files); // select a random file index
            $selected_file = str_replace(__DIR__ . '/', '', $files[$random_file_index]); // get the selected file path
        } while ($selected_file == 'assets/images/landing/' . $previousImage && $count > 1); // repeat until the selected file is different from the previous one

        $_SESSION['previous_image'][$category] = $selected_file; // Save previous image variable in the session

    } else {
        $error =  "ERROR: regex $regex did not match string $previousImage.";
    }

    echo json_encode(array('success' => ($error) ? false : true, 'newImage' => $selected_file, 'msg' => $error));
} else {

    ## IMAGE SETUP ##
    $image = array();
    foreach ($categories as $category) { // Iterate over each category
        $files = glob(__DIR__ . '/assets/images/landing/' . $category . '_*.jpg'); // Get list of matching files
        $count = count($files);

        if ($count > 0) { // If there are files in the list
            do {
                $random_file_index = array_rand($files); // select a random file index
                $selected_file = str_replace(__DIR__ . '/', '', $files[$random_file_index]); // get the selected file path
            } while ($selected_file == $_SESSION['previous_image'][$category] && $count > 1); // repeat until the selected file is different from the previous one

            $image[$category] = $selected_file; // Assign the selected file path to the $image array
            $_SESSION['previous_image'][$category] = $selected_file; // Save previous image variable in the session
        }
    }

    $smarty->assign('image', $image);
}

# Store GET request as variable to control which PHP is executed in this script.
if (isset($_GET["request"]) and $_GET["request"]) {
    $request = $_GET["request"];
}


if ($request === 'getInnerHTML') {
    $params = getParams($_GET); // Save GET parameters to assoc array
    $smarty->assign('params', $params); // Assign to Smarty
    $smarty->display("tpl/{$params['id']}.tpl"); // Send the page HTML
}


if ($request === 'getLastCommitTime') {

    // Gitlab API
    $data = gitlabCURL($gitlab_creds['URL'], $gitlab_creds['token'], $gitlab_creds['project'], 'jobs');

    // Check if data is successfully retrieved
    if ($data !== false) {
        // Extract the timestamp of the last completed CI/CD job
        foreach ($data as $pipeline) {
            if ($pipeline['stage'] === $gitlab_creds['stage'] && $pipeline['finished_at']) {
                echo json_encode(['last_commit' => date('F j, Y', strtotime($pipeline['finished_at']))]);
                return;// Exit
            }
        }
    }

    // If data retrieval fails, return current year as a fallback
    echo json_encode(['last_commit' => date('Y')]);
}
