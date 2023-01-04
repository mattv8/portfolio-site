<?php

#==============================================================================
# Configuration
#==============================================================================
require_once($_SERVER['DOCUMENT_ROOT'].'/conf/config.php');
require_once($_SERVER['DOCUMENT_ROOT'].'/lib/functions.php');

#==============================================================================
# PVE API cURL Commands
#==============================================================================

$pveURL = $pve_creds['pveURL'];
$ticket = pveTicket($pve_creds,$pve_ticket);// Request an API ticket
// echo $ticket;

$servers = pveQuery($pveURL, $ticket, "nodes");
foreach($servers as $server) {
    echo "Node: ".$server['node']." ID: ".$server['id']."<br>";

    $LXCs = pveQuery($pveURL, $ticket, "nodes/".$server['node']."/lxc");
    foreach($LXCs as $lxc){
        $status = pveQuery($pveURL, $ticket, "nodes/".$server['node']."/lxc/".$lxc['vmid']."/status/current");
        echo "LXC name: ".$lxc['name']." LXC id: ".$lxc['vmid']." Status: ".$status['status']."<br>";
    }

    $VMs = pveQuery($pveURL, $ticket, "nodes/".$server['node']."/qemu");
    foreach($VMs as $vm){
        $status = pveQuery($pveURL, $ticket, "nodes/".$server['node']."/qemu/".$vm['vmid']."/status/current");
        echo "VM name: ".$vm['name']." VM id: ".$vm['vmid']." Status: ".$status['status']."<br>";
    }

}

