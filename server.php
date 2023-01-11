<?php
#==============================================================================
# Configuration
#==============================================================================
require_once($_SERVER['DOCUMENT_ROOT'].'/vendor/autoload.php');


#==============================================================================
# PVE API cURL Commands
#==============================================================================

$pveURL = $pve_creds['pveURL'];
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
$HAdays = 60;// days to calculate availability
$samp = 10;// Samples every 10 seconds
$queryFlux = 'from(bucket: "proxmox")
|> range(start: -'.$HAdays.'d)
|> filter(fn: (r) => r["_measurement"] == "system")
|> filter(fn: (r) => r["_field"] == "status")
// |> filter(fn: (r) => r["_value"] == "running")
|> count()
|> filter(fn: (r) => r["_value"] > '.strval(($HAdays/10)*$samp*60*24).')
';

// Execute the query
$results = $queryApi->queryStream($queryFlux);
$servers = array();
foreach ($results->each() as $record)
{
    $count = $record->getValue();
    $avail = number_format($count/(($HAdays)*60/$samp*60*24),4);
    $servers[$record['host']] = array('availability'=>$avail);
    // echo "Count: " . $count." Avail: ".$avail." Host: ".$record['host']."<br>";
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
foreach ($results->each() as $record)
{
    $servers[$record['host']][$record->getField()] = $record->getValue();
    if($record->getField() == 'uptime'){
        $servers[$record['host']]['uptimeHR'] = secondsToTime($record->getValue());
    }
    // echo "Value: " . $record->getValue()." Field: ".$record->getField()." Host: ".$record['host']."<br>";
}
$smarty->assign('servers',$servers);

