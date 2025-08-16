<?php
#==============================================================================
# Configuration
#==============================================================================
require_once($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/conf/config.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/lib/functions.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/lib/cache.php');

#==============================================================================
# Smarty Environment (for template rendering when not an API call)
#==============================================================================
if (!isset($_GET['action'])) {
    require_once(SMARTY);

    $compile_dir = $smarty_compile_dir ? $smarty_compile_dir : $_SERVER['DOCUMENT_ROOT'] . '/cache';
    $cache_dir = $smarty_cache_dir ? $smarty_cache_dir : $_SERVER['DOCUMENT_ROOT'] . '/cache/smarty';

    $smarty = new Smarty();
    $smarty->escape_html = true;
    $smarty->setTemplateDir($_SERVER['DOCUMENT_ROOT'] . '/tpl');
    $smarty->setCompileDir($compile_dir);
    $smarty->setCacheDir($cache_dir);

    // Logging
    error_reporting(0);
    if ($debug) {
        error_reporting(E_ALL);
    }
    $smarty->assign('debug', $debug);
    $smarty->debugging = $smarty_debug;

    // Assign configuration variables
    $smarty->assign('js_config', $js_config);
    $smarty->assign('site_title', $site_title);
    $smarty->assign('default_page', $default_page);
}

#==============================================================================
# Influx Config
#==============================================================================

// Load the InfluxDB library
use InfluxDB2\Client;
use InfluxDB2\Model\WritePrecision;

// Initialize cache system
$cache = new SimpleCache(null, SimpleCache::TTL_SLOW);

$client = new Client([
    "url" => $influx_creds['influxURL'],
    "token" => $influx_creds['influxToken'],
    "bucket" => "proxmox",
    "org" => "GalaxyClass",
    "precision" => WritePrecision::NS,
]);
$queryApi = $client->createQueryApi();

#==============================================================================
# PVE API cURL Commands
#==============================================================================

// $pveURL = $pve_creds['pveURL'];
// $pve_ticket = pveTicket($pve_creds,$pve_ticket);// Request an API ticket
// echo $pve_ticket;

// $servers = pveQuery($pveURL, $pve_ticket, "nodes");

// $i = 0;
// foreach($servers as $server) {
//     echo "Node: ".$server['node']." ID: ".$server['id']."<br>";
//     $nodes[$i]['name'] = $server['node'];
//     $nodes[$i]['id'] = $server['id'];

//     $LXCs = pveQuery($pveURL, $pve_ticket, "nodes/".$server['node']."/lxc");
//     foreach($LXCs as $lxc){
//         $status = pveQuery($pveURL, $pve_ticket, "nodes/".$server['node']."/lxc/".$lxc['vmid']."/status/current");
//         echo "LXC name: ".$lxc['name']." LXC id: ".$lxc['vmid']." Status: ".$status['status']."<br>";
//     }

//     $VMs = pveQuery($pveURL, $pve_ticket, "nodes/".$server['node']."/qemu");
//     foreach($VMs as $vm){
//         $status = pveQuery($pveURL, $pve_ticket, "nodes/".$server['node']."/qemu/".$vm['vmid']."/status/current");
//         echo "VM name: ".$vm['name']." VM id: ".$vm['vmid']." Status: ".$status['status']."<br>";
//     }
//     $i++;
// }
// print_r($nodes);
// $smarty->assign('servers',$nodes);


# Store GET request as variable to control which PHP is executed in this script.
if (isset($_GET["request"]) and $_GET["request"]) {
    $request = $_GET["request"];
} else {
    // For initial page load, only get minimal server list with caching
    $cache_key = 'servers_minimal_list';

    $servers = $cache->remember($cache_key, function() use ($queryApi) {
        // Get just the server names and current status for initial hexagon display
        $queryFlux = 'from(bucket: "proxmox")
            |> range(start: -5m)
            |> filter(fn: (r) => r["host"] != "Janeway" and r["host"] != "Sisko" and r["host"] != "Picard")
            |> filter(fn: (r) => r["host"] != "ceph" and r["host"] != "cephfs" and r["host"] != "shared-nfs")
            |> filter(fn: (r) => r["_measurement"] == "system")
            |> filter(fn: (r) => r["_field"] == "status")
            |> last()
            |> group(columns: ["host"])';

        $results = $queryApi->queryStream($queryFlux);
        $servers = [];

        foreach ($results->each() as $record) {
            $host = $record->values['host'];
            $servers[$host] = [
                'name' => $host,
                'status' => $record->getValue(),
                'type' => 'qemu', // Default type, can be enhanced later
                'lazy_load' => true // Flag to indicate this hex needs detailed data loaded
            ];
        }

        return $servers;

    }, SimpleCache::TTL_FAST, ['tags' => ['servers', 'initial']]);

    // Only assign to Smarty if it's initialized (not an API call)
    if (isset($smarty)) {
        $smarty->assign('servers', $servers);
    }
}

# Handle AJAX requests to query for chart data
if ($request === 'getChartData') {

    $host = $_GET["serverName"];
    $timezone = isset($_GET["timezone"]) ? $_GET["timezone"] : 'America/Denver';
    $duration = 1;

    // Use caching for chart data
    $cache_key = "chart_data_{$host}_{$duration}h";

    $server = $cache->remember($cache_key, function() use ($host, $duration, $timezone, $queryApi) {
        $q1 = 'from(bucket: "proxmox")
            |> range(start: - ' . $duration . 'h)
            |> filter(fn: (r) => r["host"] == "' . $host . '")
            |> filter(fn: (r) => r["_measurement"] == "system")
            |> sample(n: ' . $duration . ', pos: -1)
            ';

        // Execute the queries
        $results = $queryApi->queryStream($q1);

        $server = array();
        $today = new DateTime();
        $utcTimeZone = new DateTimeZone('UTC');
        $mstTimeZone = new DateTimeZone($timezone); // Adjust to your specific MST time zone

        foreach ($results->each() as $record) {
            $timestamp = $record['_time'];
            $dateTime = new DateTime($timestamp, $utcTimeZone);
            $dateTime->setTimezone($mstTimeZone); // Convert to MST

            // Check if the date is today
            $isToday = $dateTime->format('Y-m-d') === $today->format('Y-m-d');

            // Format the date based on whether it's today or not
            $formattedDate = $isToday
                ? $dateTime->format('h:i:s A') // Format to AM/PM
                : $dateTime->format('Y-m-d h:i:s A'); // Show full date and time in AM/PM

            $server[$record->getField()][$formattedDate] = $record->getValue();
        }

        // Math for human-readable outputs
        if (isset($server['disk']) && isset($server['maxdisk'])) {
            $server['diskpercent'] = array_combine(
                array_keys($server['disk']),
                array_map(function ($disk, $maxDisk) {
                    return $maxDisk > 0 ? $disk / $maxDisk : 0;
                }, $server['disk'], $server['maxdisk'])
            );
        }

        if (isset($server['mem']) && isset($server['maxmem'])) {
            $server['mempercent'] = array_combine(
                array_keys($server['mem']),
                array_map(function ($mem, $maxMem) {
                    return $maxMem > 0 ? $mem / $maxMem : 0;
                }, $server['mem'], $server['maxmem'])
            );
        }

        return $server;

    }, SimpleCache::TTL_FAST, ['tags' => ['charts', $host]]);

    echo json_encode(['data' => $server]);
}

#==============================================================================
# API Functions for lazy loading server data
#==============================================================================

/**
 * Get detailed server data including availability calculations
 */
function getServerDetails($host, $queryApi, $cache) {
    $cache_key = "server_details_{$host}";

    return $cache->remember($cache_key, function() use ($host, $queryApi) {
        $HAdays = 30; // days to calculate availability
        $samp = 10; // Samples every 10 seconds

        // Availability queries for this specific host
        $q_running = 'from(bucket: "proxmox")
            |> range(start: -' . $HAdays . 'd)
            |> filter(fn: (r) => r["host"] == "' . $host . '")
            |> filter(fn: (r) => r["_measurement"] == "system")
            |> filter(fn: (r) => r["_field"] == "status")
            |> filter(fn: (r) => r["_value"] == "running")
            |> count()';

        $q_stopped = 'from(bucket: "proxmox")
            |> range(start: -' . $HAdays . 'd)
            |> filter(fn: (r) => r["host"] == "' . $host . '")
            |> filter(fn: (r) => r["_measurement"] == "system")
            |> filter(fn: (r) => r["_field"] == "status")
            |> filter(fn: (r) => r["_value"] == "stopped")
            |> count()';

        // Current system info for this host
        $q_current = 'from(bucket: "proxmox")
            |> range(start: -1m)
            |> filter(fn: (r) => r["host"] == "' . $host . '")
            |> filter(fn: (r) => r["_measurement"] == "system")
            |> last()';

        // Execute queries
        $r_running = $queryApi->queryStream($q_running);
        $r_stopped = $queryApi->queryStream($q_stopped);
        $r_current = $queryApi->queryStream($q_current);

        $server_data = [
            'name' => $host,
            'loaded' => true
        ];

        // Process availability data
        $running_count = 0;
        $stopped_count = 0;

        foreach ($r_running->each() as $record) {
            $running_count = $record->getValue();
        }

        foreach ($r_stopped->each() as $record) {
            $stopped_count = $record->getValue();
        }

        // Calculate availability
        $total_samples = $HAdays * 60 * 24 * (60 / $samp);
        $delta = max(0, $total_samples - ($running_count + $stopped_count));

        if (($running_count + $stopped_count + $delta) != 0) {
            $availability = $running_count / ($running_count + $stopped_count + $delta);
        } else {
            $availability = 0;
        }

        $server_data['availability'] = number_format($availability, 6);

        // Process current system info
        foreach ($r_current->each() as $record) {
            $field = $record->getField();
            $value = $record->getValue();
            $server_data[$field] = $value;

            if ($field == 'uptime') {
                $server_data['uptimeHR'] = secondsToTime($value);
            }
        }

        return $server_data;

    }, SimpleCache::TTL_SLOW, ['tags' => ['servers', 'details', $host]]);
}

# Handle API requests for lazy loading
if (isset($_GET['action'])) {
    // Set JSON headers for API responses
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');

    // Handle preflight OPTIONS request
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(200);
        exit();
    }

    try {
        $action = $_GET['action'];

        switch ($action) {
            case 'details':
                $host = $_GET['host'] ?? null;
                if (!$host) {
                    throw new Exception('Host parameter required');
                }

                $server_details = getServerDetails($host, $queryApi, $cache);
                echo json_encode(['success' => true, 'data' => $server_details]);
                break;

            case 'chart':
                $host = $_GET['host'] ?? null;
                $duration = $_GET['duration'] ?? 1;
                $timezone = $_GET['timezone'] ?? 'America/Denver';

                if (!$host) {
                    throw new Exception('Host parameter required');
                }

                // Reuse existing chart data logic
                $cache_key = "chart_data_{$host}_{$duration}h";

                $server = $cache->remember($cache_key, function() use ($host, $duration, $timezone, $queryApi) {
                    $q1 = 'from(bucket: "proxmox")
                        |> range(start: - ' . $duration . 'h)
                        |> filter(fn: (r) => r["host"] == "' . $host . '")
                        |> filter(fn: (r) => r["_measurement"] == "system")
                        |> sample(n: ' . $duration . ', pos: -1)
                        ';

                    $results = $queryApi->queryStream($q1);
                    $server = array();
                    $today = new DateTime();
                    $utcTimeZone = new DateTimeZone('UTC');
                    $targetTimeZone = new DateTimeZone($timezone);

                    foreach ($results->each() as $record) {
                        $timestamp = $record['_time'];
                        $dateTime = new DateTime($timestamp, $utcTimeZone);
                        $dateTime->setTimezone($targetTimeZone);

                        $isToday = $dateTime->format('Y-m-d') === $today->format('Y-m-d');
                        $formattedDate = $isToday
                            ? $dateTime->format('h:i:s A')
                            : $dateTime->format('Y-m-d h:i:s A');

                        $server[$record->getField()][$formattedDate] = $record->getValue();
                    }

                    // Calculate percentage values
                    if (isset($server['disk']) && isset($server['maxdisk'])) {
                        $server['diskpercent'] = array_combine(
                            array_keys($server['disk']),
                            array_map(function ($disk, $maxDisk) {
                                return $maxDisk > 0 ? $disk / $maxDisk : 0;
                            }, $server['disk'], $server['maxdisk'])
                        );
                    }

                    if (isset($server['mem']) && isset($server['maxmem'])) {
                        $server['mempercent'] = array_combine(
                            array_keys($server['mem']),
                            array_map(function ($mem, $maxMem) {
                                return $maxMem > 0 ? $mem / $maxMem : 0;
                            }, $server['mem'], $server['maxmem'])
                        );
                    }

                    return $server;

                }, SimpleCache::TTL_FAST, ['tags' => ['servers', 'charts', $host]]);

                echo json_encode(['success' => true, 'data' => $server]);
                break;

            case 'cache_stats':
                // Utility endpoint to check cache performance
                $stats = $cache->getStats();
                echo json_encode(['success' => true, 'cache_stats' => $stats]);
                break;

            case 'cache_clear':
                // Clear server-related cache (useful for debugging)
                $cleared = $cache->clearByTag('servers');
                echo json_encode(['success' => true, 'cleared_files' => $cleared]);
                break;

            default:
                throw new Exception('Invalid action');
        }

    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }

    // Exit after handling API request to prevent template rendering
    exit();
}

// Render template if not an API call and Smarty is initialized
if (isset($smarty)) {
    $page_content = $smarty->fetch('server.tpl');
    $smarty->assign('page_content', $page_content);
}
?>
