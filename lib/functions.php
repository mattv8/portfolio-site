<?php
#==============================================================================
# Custom PHP functions
#
#==============================================================================

# Requests an API ticket.
function pveTicket($credentials, $oldTicket)
{

    $pveUN = $credentials['pveUN'];
    $pvePW = $credentials['pvePW'];

    if (empty($oldTicket['time']) or (time() - $oldTicket['time'] > 7200)) { // Two hours have elapsed or ticket doesn't exist

        $newTicket = '';
        $ch = curl_init(); // create a new cURL resource
        $options = array(
            CURLOPT_POSTFIELDS => "username=$pveUN&password=$pvePW",
            CURLOPT_RETURNTRANSFER => 1,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_URL => $credentials['pveURL'] . "/api2/json/access/ticket",
        );
        curl_setopt_array($ch, $options); // set URL and other appropriate options

        $result = curl_exec($ch); // execute the request

        curl_close($ch); // close cURL resource, and free up system resources
        if ($result === false) {
            echo "cURL Error: " . curl_error($ch);
        } else {
            $response = json_decode($result, true); // do something with the response
            $newTicket = $response['data']['ticket'];
            updateTicket($newTicket, 'pve_ticket');
        }
        return $newTicket;
    } else { // Less than two hours have elapsed since the last modification

        return $oldTicket['ticket'];
    }
}

# Saves the ticket to a config file
function updateTicket($newTicket, $var)
{
    $path = $_SERVER['DOCUMENT_ROOT'] . '/conf/config.local.php';
    $config = file_get_contents($path); // Read the contents of the config.local.php file

    // Use a single regex pattern to match both the 'ticket' and 'time' values
    $pattern = "/\\$$var\s*=\s*array\(\s*'ticket' => '(.*)',\s*'time' => '(.*)'\s*\);/i";

    // Use a callback function to perform the replacements
    $replacement = function ($matches) use ($newTicket, $var) {
        return "\$$var = array(\n\t'ticket' => '$newTicket',\n\t'time' => '" . time() . "'\n);";
    };

    // Perform all the replacements at once using preg_replace_callback
    $config = preg_replace_callback($pattern, $replacement, $config);

    // Write the updated contents to the config.local.php file
    file_put_contents($path, $config);
}

# Utility function to query the PVE API
# See: https://pve.proxmox.com/pve-docs/api-viewer/
function pveQuery($pveURL, $ticket, $path)
{

    $response = array();
    $ch = curl_init(); // create a new cURL resource
    $options = array(
        CURLOPT_URL => $pveURL . '/api2/json/' . $path,
        CURLOPT_RETURNTRANSFER => 1,
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => false,
        CURLOPT_COOKIE => "PVEAuthCookie=" . $ticket
    );
    curl_setopt_array($ch, $options);

    $result = curl_exec($ch); // execute the request

    curl_close($ch); // close cURL resource, and free up system resources

    if ($result === false) {
        echo "cURL Error: " . curl_error($ch);
    } else {
        $response = json_decode($result, true); // do something with the response
    }
    return $response['data'];
}

function secondsToTime($seconds)
{
    $dtF = new \DateTime('@0');
    $dtT = new \DateTime("@$seconds");
    return $dtF->diff($dtT)->format('%ad %hh %im');
}
