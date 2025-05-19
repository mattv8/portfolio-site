{*Page specific CSS*}
<link rel="stylesheet" type="text/css" href="css/running.css" />

{*Page specific JS*}
{if file_exists('js/hexagons.min.js')}
	<script src="js/hexagons.min.js"></script>
{else}
	<script src="js/hexagons.js"></script>
{/if}
{if file_exists('js/running.min.js')}
    <script src="js/running.min.js"></script>
{else}
    <script src="js/running.js"></script>
{/if}

{if $debug}
    <style>
        .running {
            border-style: solid;
            border-width: 1px;
            border-color: green;
        }
    </style>
{/if}

{* Authentication Button - Preallocated for later use *}
<div class="auth-container">
    {if !$authenticated}
        <button id="fitbit-auth-btn" class="btn btn-primary" onclick="initiateAuth()">Connect Fitbit Account</button>
    {else}
        <span class="auth-status">Fitbit Connected</span>
    {/if}
</div>

<div class="hexagons running">
    {foreach from=$activities item=activity key=key}
        <div class="hex rounded flip button {$activity.activityName|lower|replace:' ':'-'}" onclick="openActivityDetails(this, '{$activity.id}')">
            <span>{$activity.activityName}<br>{$activity.date}</span>
            <p class="inner-text-flipped no-wrap">
                Time: {$activity.time}<br>
                Date: {$activity.date}<br>
                Distance: {$activity.distance} mi<br>
                Duration: {$activity.duration}<br>
                Pace: {$activity.paceFormatted} min/mi<br>
                Activity: {$activity.activityName}<br>
            </p>
        </div>
    {/foreach}
</div>

{* Activity Details Modal - Preallocated for later use *}
<div id="activity-details-modal" class="modal" style="display: none;">
    <div class="modal-content">
        <span class="close" onclick="closeActivityDetails()">&times;</span>
        <div id="activity-details-content">
            {* This will be populated with AJAX *}
        </div>
    </div>
</div>

{* Footer *}
<div class="cache-info">
    {if $lastCacheDate}
        <p>Activities last updated: {$lastCacheDate}</p>
    {else}
        <p>Activities cache: Not available</p>
    {/if}
</div>