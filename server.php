<?php
#==============================================================================
# Configuration
#==============================================================================
require_once($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/conf/config.php');
require_once($_SERVER['DOCUMENT_ROOT'] . '/lib/functions.php');

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


#==============================================================================
# Influx Queries
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

#
#   Availability Calculations
#
$HAdays = 60; // days to calculate availability
$samp = 10; // Samples every 10 seconds

$q1 = 'from(bucket: "proxmox")
|> range(start: -' . $HAdays . 'd)
|> filter(fn: (r) => r["_measurement"] == "system")
|> filter(fn: (r) => r["_field"] == "status")
|> filter(fn: (r) => r["_value"] == "running")
|> count()
';

$q2 = 'from(bucket: "proxmox")
|> range(start: -' . $HAdays . 'd)
|> filter(fn: (r) => r["_measurement"] == "system")
|> filter(fn: (r) => r["_field"] == "status")
|> filter(fn: (r) => r["_value"] == "stopped")
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
}
foreach ($r_stopped->each() as $record) {
    $host = $record->values['host'];
    $count = $record->getValue();
    $servers[$host]['stopped_count'] = $count;
}
foreach ($servers as $host => $record) {
    $delta = $HAdays * 60 * 24 * (60 / $samp) - ($record['running_count'] + $record['stopped_count']); // Represents InfluxDB or node downtime
    $availability = $record['running_count'] / ($record['running_count'] + $record['stopped_count'] + $delta);
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
$smarty->assign('servers', $servers);
