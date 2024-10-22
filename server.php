<?php
#==============================================================================
# Configuration
#==============================================================================
require_once($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/conf/config.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/lib/functions.php');


#==============================================================================
# Influx Config
#==============================================================================

// Load the InfluxDB library
use InfluxDB2\Client;
use InfluxDB2\Model\WritePrecision;

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

    #
    #   Availability Calculations
    #
    $HAdays = 30; // days to calculate availability
    $samp = 10; // Samples every 10 seconds

    $q1 = 'from(bucket: "proxmox")
        |> range(start: -' . $HAdays . 'd)
        |> filter(fn: (r) => r["_measurement"] == "system")
        |> filter(fn: (r) => r["_field"] == "status")
        |> filter(fn: (r) => r["_value"] == "running")
        |> group(columns: ["host"])
        |> count()
        ';

    $q2 = 'from(bucket: "proxmox")
        |> range(start: -' . $HAdays . 'd)
        |> filter(fn: (r) => r["_measurement"] == "system")
        |> filter(fn: (r) => r["_field"] == "status")
        |> filter(fn: (r) => r["_value"] == "stopped")
        |> group(columns: ["host"])
        |> count()
        ';

    // Execute the queries
    $r_running = $queryApi->queryStream($q1);
    $r_stopped = $queryApi->queryStream($q2);

    $servers = array();
    foreach ($r_running->each() as $record) {
        $host = $record->values['host'];
        $count = $record->getValue();
        $servers[$host]['running_count'] = $count;
        // echo "(Running) Host: $host Count: $count <br>";
    }
    foreach ($r_stopped->each() as $record) {
        $host = $record->values['host'];
        $count = $record->getValue();
        $servers[$host]['stopped_count'] = $count;
        // echo "(Stopped) Host: $host Count: $count <br>";
    }
    foreach ($servers as $host => $record) {
        $total_samples = $HAdays * 60 * 24 * (60 / $samp);
        $delta = $total_samples - ($record['running_count'] + $record['stopped_count']);

        $delta = max(0, $delta); // Ensure delta is not negative

        // Calculate availability, handle division by zero
        if (($record['running_count'] + $record['stopped_count'] + $delta) != 0) {
            $availability = $record['running_count'] / ($record['running_count'] + $record['stopped_count'] + $delta);
        } else {
            $availability = 0;
        }

        $servers[$host]['availability'] = number_format($availability, 6);
        // echo "Host: $host Avail: $availability <br>";
    }

    #
    #   System Information
    #
    $queryFlux2 = 'from(bucket: "proxmox")
        |> range(start: -1m)
        |> filter(fn: (r) => r["host"] != "Janeway" and r["host"] != "Sisko" and r["host"] != "Picard")
        |> filter(fn: (r) => r["host"] != "ceph" and r["host"] != "cephfs" and r["host"] != "shared-nfs")
        |> filter(fn: (r) => r["_measurement"] == "system")
        |> last()
        ';

    // Execute the query
    $results = $queryApi->queryStream($queryFlux2);
    foreach ($results->each() as $record) {
        $servers[$record['host']][$record->getField()] = $record->getValue();
        if ($record->getField() == 'uptime') {
            $servers[$record['host']]['uptimeHR'] = secondsToTime($record->getValue());
        }
        // echo "Value: " . $record->getValue()." Field: ".$record->getField()." Host: ".$record['host']."<br>";
    }
    // echo "<pre>";
    // print_r($servers);
    // echo "</pre>";
    $smarty->assign('servers', $servers);
}

# Handle AJAX requests to query for chart data
if ($request === 'getChartData') {

    $host = $_GET["serverName"];
    $timezone = isset($_GET["timezone"]) ? $_GET["timezone"] : 'America/Denver';
    $duration = 1;

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
    $server['diskpercent'] = array_combine(
        array_keys($server['disk']),
        array_map(function ($disk, $maxDisk) {
            return $disk / $maxDisk;
        }, $server['disk'], $server['maxdisk'])
    );

    $server['mempercent'] = array_combine(
        array_keys($server['mem']),
        array_map(function ($disk, $maxDisk) {
            return $disk / $maxDisk;
        }, $server['mem'], $server['maxmem'])
    );

    // echo "<pre>";
    // print_r($server);

    echo json_encode(['data' => $server]);
}
