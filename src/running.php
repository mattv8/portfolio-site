<?php
#==============================================================================
# Configuration
#==============================================================================
require_once(__DIR__ . '/vendor/autoload.php');
require_once(__DIR__ . '/conf/config.php');
require_once(__DIR__ . '/lib/functions.php');
require_once(__DIR__ . '/lib/cache.php');

// Initialize cache for lazy loading and performance optimization
$cache = new SimpleCache($_SERVER['DOCUMENT_ROOT'] . '/cache');

#==============================================================================
# Fitbit API with OAuth 2.0
#==============================================================================

// Create instance of Fitbit OAuth Client
$fitbitClient = new FitbitOAuthClient($fitbit_creds);

class FitbitOAuthClient
{
    private const API_BASE_URL = 'https://api.fitbit.com';
    private const AUTH_URI     = 'https://www.fitbit.com/oauth2/authorize';
    private const TOKEN_PATH   = '/oauth2/token';

    private $credentials;
    protected $cookieName = 'fitbit_tokens';

    public function __construct(array $creds)
    {
        // merge your incoming creds with our defaults
        $this->credentials = array_merge([
            'api_base_url' => self::API_BASE_URL,
            'auth_uri'     => self::AUTH_URI,
            'token_uri'    => self::API_BASE_URL . self::TOKEN_PATH,
        ], $creds);

        $this->getTokens();
    }

    // Check if the user is authenticated
    public function isAuthenticated(): bool
    {
        $logId = isset($_GET['activityId']) ? (int)$_GET['activityId'] : null;
        $cacheFile = __DIR__ . "/cache/{$logId}.tcx";
        if (file_exists($cacheFile)) {
            return true;
        }

        $this->getTokens();

        if (empty($this->credentials['access_token'])) {
            return false;
        }

        $obtained = (int)($this->credentials['obtained_at'] ?? 0);
        $lifetime = (int)($this->credentials['expires_in'] ?? 0);

        // still valid?
        if (time() < $obtained + $lifetime) {
            return true;
        }

        // expired → try refresh
        try {
            $this->refreshToken();
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    // Start the OAuth authorization flow
    public function getAuthorizationUrl()
    {
        $params = [
            'page' => 'running',
            'request' => 'authorize',
            'response_type' => 'code',
            'client_id' => $this->credentials['client_id'],
            'scope' => $this->credentials['scope'],
            'expires_in' => '86400' // 24 hours
        ];

        return $this->credentials['auth_uri'] . '?' . http_build_query($params);
    }

    // Handle the OAuth callback and exchange code for tokens
    public function handleCallback($code)
    {
        if (empty($code)) {
            throw new Exception('Authorization code is missing');
        }

        $ch = curl_init($this->credentials['token_uri']);

        $postFields = [
            'grant_type' => 'authorization_code',
            'client_id' => $this->credentials['client_id'],
            'code' => $code
        ];

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Basic ' . base64_encode($this->credentials['client_id'] . ':' . $this->credentials['client_secret']),
            'Content-Type: application/x-www-form-urlencoded'
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode != 200) {
            throw new Exception('Failed to get access token: ' . $response);
        }

        $tokenData = json_decode($response, true);

        if (!isset($tokenData['access_token'])) {
            throw new Exception('Access token not found in response');
        }

        // Add timestamp to track token age
        $tokenData['timestamp'] = time();

        // Save tokens
        $this->saveTokens($tokenData);

        return $tokenData;
    }

    // Get stored tokens
    protected function getTokens(): array
    {
        $data = [];
        if (!empty($_COOKIE[$this->cookieName])) {
            $data = json_decode($_COOKIE[$this->cookieName], true) ?: [];
            $this->credentials = array_merge($this->credentials, $data);
        }
        return $data;
    }

    // Save tokens to cookie
    protected function saveTokens(array $tokenData)
    {
        $tokenData['obtained_at'] = time();

        // merge into credentials
        $this->credentials = array_merge($this->credentials, $tokenData);

        $expire = $tokenData['obtained_at'] + (int)$tokenData['expires_in'];

        setcookie(
            $this->cookieName,
            json_encode($tokenData),
            $expire,
            '/',       // path
            '',        // domain
            true,      // secure
            true       // HttpOnly
        );
    }

    // Refresh the access token when expired
    public function refreshToken(): array
    {
        // ensure we have the latest from cookie
        $this->getTokens();

        $now       = time();
        $obtained  = (int)($this->credentials['obtained_at'] ?? 0);
        $lifetime  = (int)($this->credentials['expires_in'] ?? 0);
        $buffer    = 30; // seconds before real expiry to refresh

        // if not yet expired (minus buffer), return existing
        if ($now < $obtained + $lifetime - $buffer) {
            return [
                'access_token'  => $this->credentials['access_token'],
                'refresh_token' => $this->credentials['refresh_token'],
                'expires_in'    => $this->credentials['expires_in'],
                'obtained_at'   => $this->credentials['obtained_at'],
            ];
        }

        // → expired (or about to): perform the refresh
        $ch = curl_init($this->credentials['token_uri']);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'grant_type'    => 'refresh_token',
            'refresh_token' => $this->credentials['refresh_token'],
            'client_id'     => $this->credentials['client_id'],
        ]));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Basic ' . base64_encode($this->credentials['client_id'] . ':' . $this->credentials['client_secret']),
            'Content-Type: application/x-www-form-urlencoded'
        ]);

        $resp = curl_exec($ch);
        $data = json_decode($resp, true);
        if (isset($data['errors'])) {
            throw new \Exception($data['errors'][0]['message']);
        }

        // save new tokens + timestamp into cookie
        $this->saveTokens($data);

        return $data;
    }

    /**
     * Make an authenticated API request.
     *
     * Automatically handles OAuth refresh, JSON decoding for JSON endpoints,
     * and raw XML return for TCX endpoints.
     *
     * @param string $endpoint   API path, e.g. "/user/-/activities/123.tcx"
     * @param string $method     "GET" or "POST"
     * @param array  $params     Query or body parameters
     * @return array             ['code'=>int, 'data'=>mixed]
     */
    public function makeRequest(string $endpoint, string $method = 'GET', array $params = []): array
    {
        if (!$this->isAuthenticated()) {
            throw new Exception('Not authenticated');
        }

        // Refresh tokens if expired
        $tokens   = $this->getTokens();
        $tokenAge = time() - ($tokens['obtained_at'] ?? 0);
        if ($tokenAge > ($tokens['expires_in'] ?? 28800)) {
            $tokens = $this->refreshToken();
        }

        // Build URL (with query for GET)
        $url = $this->credentials['api_base_url'] . $endpoint;
        if ($method === 'GET' && $params) {
            $url .= '?' . http_build_query($params);
        }

        // Determine headers
        $headers = [
            'Authorization: Bearer ' . $this->credentials['access_token'],
        ];
        // If TCX endpoint, ask for XML
        if (stripos($endpoint, '.tcx') !== false) {
            $headers[] = 'Accept: application/vnd.garmin.tcx+xml';              // media type for TCX :contentReference[oaicite:7]{index=7}
        } else {
            $headers[] = 'Content-Type: application/json';
        }

        // Execute cURL
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        if ($method === 'POST') {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        }
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $response = curl_exec($ch);
        $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        // On 401, refresh and retry once
        if ($code === 401) {
            $this->refreshToken();
            return $this->makeRequest($endpoint, $method, $params);
        }

        // Return raw for TCX, JSON‑decoded for others
        $data = (stripos($endpoint, '.tcx') !== false)
            ? $response
            : json_decode($response, true);

        return ['code' => $code, 'data' => $data];
    }

    // Get list of activities (runs) with cache handling and delta-sync
public function getActivities($beforeDate = null, $limit = null, $offset = 0): array
{
    $cacheDir    = __DIR__ . '/cache';
    $limit       = $limit ?? 19; // Default to 18 activities per page
    $offset      = $offset ?? 0;

    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0755, true);
    }

    $cacheFile = "$cacheDir/activities_all_{$limit}.json";

    // Unauthenticated: serve most recent cache file
    if (!$this->isAuthenticated()) {
        $files = glob("$cacheDir/activities_*.json");
        if ($files) {
            usort($files, fn($a, $b) => filemtime($b) <=> filemtime($a));
            $raw      = json_decode(file_get_contents($files[0]), true);
            $formatted = [];
            foreach (($raw['activities'] ?? []) as $act) {
                if (stripos($act['activityName'], 'run') !== false) {
                    $formatted[] = $this->formatActivityForDisplay($act);
                }
            }
            // Sort by most recent first (descending by date/time)
            usort($formatted, fn($a, $b) => strtotime($b['date'] . ' ' . $b['time']) <=> strtotime($a['date'] . ' ' . $a['time']));

            // Apply offset and limit for pagination
            $totalCount = count($formatted);
            $formatted = array_slice($formatted, $offset, $limit);

            return [
                'code'          => 200,
                'data'          => $formatted,
                'cached'        => true,
                'lastCacheDate' => date('Y-m-d H:i:s', filemtime($files[0])),
                'nextDate'      => end($formatted)['date'] ?? null,
                'totalCount'    => $totalCount,
                'hasMore'       => ($offset + $limit) < $totalCount,
            ];
        }

        return [
            'code'          => 200,
            'data'          => [],
            'cached'        => true,
            'lastCacheDate' => null,
            'nextDate'      => null,
        ];
    }

    // Authenticated: fetch fresh, cache, format
    $response = $this->makeRequest(
        '/1/user/-/activities/list.json',
        'GET',
        [
            'afterDate'  => '2020-01-01',  // Get activities after this date to go far back
            'sort'       => 'desc',        // Most recent first
            'limit'      => 100,           // Fetch more to ensure we get enough running activities
            'offset'     => 0,
        ]
    );

    if ($response['code'] === 200 && isset($response['data']['activities'])) {
        file_put_contents($cacheFile, json_encode($response['data']));

        $formatted = [];
        foreach ($response['data']['activities'] as $act) {
            if (stripos($act['activityName'], 'run') !== false) {
                $formatted[] = $this->formatActivityForDisplay($act);
            }
        }

        // Sort by most recent first (descending by date/time)
        usort($formatted, fn($a, $b) => strtotime($b['date'] . ' ' . $b['time']) <=> strtotime($a['date'] . ' ' . $a['time']));

        // Apply offset and limit for pagination
        $totalCount = count($formatted);
        $formatted = array_slice($formatted, $offset, $limit);

        return [
            'code'          => 200,
            'data'          => $formatted,
            'cached'        => false,
            'lastCacheDate' => date('Y-m-d H:i:s'),
            'nextDate'      => end($formatted)['date'] ?? null,
            'totalCount'    => $totalCount,
            'hasMore'       => ($offset + $limit) < $totalCount,
        ];
    }

    // Fallback on error
    return [
        'code'          => $response['code'] ?? 500,
        'data'          => [],
        'cached'        => false,
        'lastCacheDate' => null,
        'nextDate'      => null,
    ];
}

    // Helper function to format activity data consistently
    private function formatActivityForDisplay($activity)
    {
        // Distance is already in kilometers based on distanceUnit, convert to miles
        $distanceKm = $activity['distance'] ?? 0;
        $distanceMiles = $distanceKm * 0.621371; // Convert kilometers to miles
        $durationSeconds = ($activity['duration'] ?? 0) / 1000;
        $paceMinPerMile = ($distanceMiles > 0) ? $durationSeconds / 60 / $distanceMiles : 0;

        // Format pace as MM:SS
        $paceMinutes = floor($paceMinPerMile);
        $paceSeconds = round(($paceMinPerMile - $paceMinutes) * 60);
        $paceFormatted = sprintf('%d:%02d', $paceMinutes, $paceSeconds);

        return [
            'id' => $activity['logId'],
            'date' => date('Y-m-d', strtotime($activity['startTime'])),
            'time' => date('H:i:s', strtotime($activity['startTime'])),
            'distance' => round($distanceMiles, 2), // Round to 2 decimal places
            'duration' => gmdate('H:i:s', $durationSeconds), // Format duration in H:i:s
            'pace' => $paceMinPerMile, // Raw pace value in minutes per mile
            'paceFormatted' => $paceFormatted, // Formatted pace as MM:SS
            'activityName' => $activity['activityName'] ?? 'Unknown Activity',
            'type' => $activity['activityName'] ?? 'Unknown Activity', // Add type field for easier access
            'summary' => sprintf('%s - %.1f mi in %s (pace %s/mi)',
                $activity['activityName'] ?? 'Unknown Activity',
                $distanceMiles,
                gmdate('H:i:s', $durationSeconds),
                $paceFormatted
            )
        ];
    }

    public function getActivityDetails(int $logId): \SimpleXMLElement
    {
        $cacheFile = __DIR__ . "/cache/{$logId}.tcx";

        // Fetch & cache if missing
        if (!file_exists($cacheFile) || filesize($cacheFile) === 0) {
            $userId    = $this->credentials['user_id'] ?? '-';
            $endpoint = "/1/user/{$userId}/activities/{$logId}.tcx";
            $params   = ['includePartialTCX' => 'true'];

            $resp = $this->makeRequest($endpoint, 'GET', $params);
            if ($resp['code'] !== 200) {
                throw new \Exception("Failed fetching TCX (HTTP {$resp['code']})");
            }

            @mkdir(dirname($cacheFile), 0755, true);
            file_put_contents($cacheFile, $resp['data']);  // now contains XML :contentReference[oaicite:9]{index=9}
        }

        libxml_use_internal_errors(true);
        $tcx = simplexml_load_file($cacheFile);
        if ($tcx === false) {
            throw new \Exception("Failed parsing TCX for logId {$logId}");
        }
        return $tcx;
    }

    /**
     * Extract heart‑rate time series from cached TCX.
     */
    public function getHeartRateTimeSeries(int $logId): array
    {
        $tcx = $this->getActivityDetails($logId);
        $hrData = [];

        // Register namespace for XPath queries
        $tcx->registerXPathNamespace('tcx', 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2');

        // Use XPath to find all Trackpoint elements with HeartRateBpm
        $trackpoints = $tcx->xpath('//tcx:Trackpoint[tcx:HeartRateBpm]');

        foreach ($trackpoints as $tp) {
            $time = (string)$tp->Time;
            $hr = (int)$tp->HeartRateBpm->Value;

            $hrData[] = [
                'time'  => date('H:i:s', strtotime($time)),
                'value' => $hr
            ];
        }

        return $hrData;
    }

    /**
     * Extract SpO₂ data from TCX extensions if present.
     * If not, returns empty—Fitbit TCX may not include SpO₂.
     */
    public function getSpO2Data(int $logId): array
    {
        $tcx = $this->getActivityDetails($logId);
        $spo2Data = [];

        // Register namespace for XPath queries
        $tcx->registerXPathNamespace('tcx', 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2');

        // Look for extension elements that might contain SpO2 data
        $trackpoints = $tcx->xpath('//tcx:Trackpoint[tcx:Extensions/*/SpO2Percentage]');

        foreach ($trackpoints as $tp) {
            $time = (string)$tp->Time;

            // Navigate through extensions to find SpO2
            $extensions = $tp->Extensions->children();
            foreach ($extensions as $ext) {
                if (isset($ext->SpO2Percentage)) {
                    $spo2Data[] = [
                        'time'  => date('H:i:s', strtotime($time)),
                        'value' => (float)$ext->SpO2Percentage
                    ];
                    break;
                }
            }
        }

        return $spo2Data;
    }

    /**
     * Extract temperature data from TCX extensions if present.
     */
    public function getTemperatureData(int $logId): array
    {
        $tcx = $this->getActivityDetails($logId);
        $tempData = [];

        // Register namespace for XPath queries
        $tcx->registerXPathNamespace('tcx', 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2');

        // Look for extension elements that might contain Temperature data
        $trackpoints = $tcx->xpath('//tcx:Trackpoint[tcx:Extensions/*/Temperature]');

        foreach ($trackpoints as $tp) {
            $time = (string)$tp->Time;

            // Navigate through extensions to find Temperature
            $extensions = $tp->Extensions->children();
            foreach ($extensions as $ext) {
                if (isset($ext->Temperature)) {
                    $tempData[] = [
                        'time'  => date('H:i:s', strtotime($time)),
                        'value' => (float)$ext->Temperature
                    ];
                    break;
                }
            }
        }

        return $tempData;
    }

    /**
     * Get activity summary information from TCX
     */
    public function getActivitySummary(int $logId): array
    {
        $tcx = $this->getActivityDetails($logId);

        // Register namespace for XPath queries
        $tcx->registerXPathNamespace('tcx', 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2');

        // Extract activity ID (start time)
        $activityNode = $tcx->xpath('//tcx:Activity');
        if (empty($activityNode)) {
            throw new \Exception("No Activity element found in TCX");
        }

        $activity = $activityNode[0];
        $startTime = (string)$activity->Id;

        // Extract lap information - sum all laps in case there are multiple
        $lapNodes = $tcx->xpath('//tcx:Lap');
        if (empty($lapNodes)) {
            throw new \Exception("No Lap element found in TCX");
        }

        $totalTimeSeconds = 0;
        $distanceMeters = 0;
        $calories = 0;

        foreach ($lapNodes as $lap) {
            $totalTimeSeconds += (float)$lap->TotalTimeSeconds;
            $distanceMeters += (float)$lap->DistanceMeters;
            $calories += (int)$lap->Calories;
        }

        // Convert values for display - Fix conversion factor to match formatActivityForDisplay
        $distanceMiles = $distanceMeters * 0.000621371; // Convert meters to miles
        $durationFormatted = gmdate('H:i:s', $totalTimeSeconds); // Format duration as H:i:s
        $paceMinPerMile = ($distanceMiles > 0) ? ($totalTimeSeconds / 60) / $distanceMiles : 0; // Pace in minutes per mile

        // Format pace as MM:SS
        $paceMinutes = floor($paceMinPerMile);
        $paceSeconds = round(($paceMinPerMile - $paceMinutes) * 60);
        $paceFormatted = sprintf('%d:%02d', $paceMinutes, $paceSeconds);

        return [
            'startTime' => $startTime,
            'activityDate' => date('Y-m-d', strtotime($startTime)),
            'durationSeconds' => $totalTimeSeconds,
            'durationFormatted' => $durationFormatted,
            'distanceMeters' => $distanceMeters,
            'distanceMiles' => round($distanceMiles, 2),
            'calories' => $calories,
            'paceMinPerMile' => $paceMinPerMile,
            'paceFormatted' => $paceFormatted
        ];
    }

    /**
     * Helper: low‑level cURL fetch returning raw response body.
     */
    protected function apiGetRaw(string $url, array $headers): string
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

        // — DEV ONLY: ignore self‑signed certs on localhost
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);

        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $resp = curl_exec($ch);
        if ($resp === false) {
            $err = curl_error($ch);
            curl_close($ch);
            throw new \Exception("cURL error: {$err}");
        }

        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code < 200 || $code >= 300) {
            throw new \Exception("API GET failed ({$code}): {$resp}");
        }
        return $resp;
    }

}

# ==============================================================================

// Handle Fitbit OAuth flow
if ($request === 'authorize') {
    header('Content-Type: application/json');
    // redirect user to Fitbit’s consent page
    header('Location: ' . $fitbitClient->getAuthorizationUrl());
    exit;
}

// Receive the authorization code from Fitbit
if ($code) {
    try {
        $token = $fitbitClient->handleCallback($code);
        if ($request) {
            echo json_encode(['status' => 'success', 'token' => $token]);
            exit;
        } else {
            header('Location: /?page=running');// Redirect to the main page
            exit;
        }
    } catch (Exception $e) {
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        exit;
    }
}

// Check if user is authenticated for non-auth actions
if ($request && !$fitbitClient->isAuthenticated()) {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated', 'needs_auth' => true]);
    exit;
}

// Handle AJAX requests
if ($request && $fitbitClient->isAuthenticated()) {
    header('Content-Type: application/json');
    $response = ['status' => 'error', 'message' => 'Invalid request'];

    switch ($request) {
        case 'getActivities':
            $limit = $_GET['limit'] ?? 19;
            $offset = $_GET['offset'] ?? 0;
            $result = $fitbitClient->getActivities(null, $limit, $offset);

            if ($result['code'] === 200) {
                $response = [
                    'status' => 'success',
                    'data' => $result['data'],
                    'nextDate' => !empty($result['data']) ? end($result['data'])['date'] : null,
                    'hasMore' => $result['hasMore'] ?? false,
                    'totalCount' => $result['totalCount'] ?? 0
                ];
            } else {
                $response = [
                    'status' => 'error',
                    'message' => 'Failed to fetch activities',
                    'code' => $result['code']
                ];
            }
            break;

        case 'getActivityDetails':
            $activityId = isset($_GET['activityId']) ? (int)$_GET['activityId'] : null;
            header('Content-Type: application/json');

            if (!$activityId) {
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Activity ID is required'
                ]);
                exit;
            }

            try {
                // Use comprehensive caching for activity details since TCX parsing is expensive
                $details_cache_key = "activity_details_{$activityId}";

                $result = $cache->remember($details_cache_key, function() use ($fitbitClient, $activityId, $cache) {
                    // Try to reuse activity info from main activities cache first
                    $activities_cache_key = "activities_main_list";
                    $cached_activities = $cache->get($activities_cache_key, SimpleCache::TTL_NORMAL);

                    $activityName = 'Activity';
                    if ($cached_activities && isset($cached_activities['data'])) {
                        foreach ($cached_activities['data'] as $activity) {
                            if ($activity['id'] == $activityId) {
                                $activityName = $activity['type'] ?? 'Activity';
                                break;
                            }
                        }
                    }

                    // If not in cache, fetch activities (this will also update the cache)
                    if ($activityName === 'Activity') {
                        $activities = $fitbitClient->getActivities(null, 20);
                        // Update the main activities cache
                        $cache->set($activities_cache_key, $activities, ['tags' => ['activities', 'list']]);

                        if (isset($activities['data'])) {
                            foreach ($activities['data'] as $activity) {
                                if ($activity['id'] == $activityId) {
                                    $activityName = $activity['type'] ?? 'Activity';
                                    break;
                                }
                            }
                        }
                    }

                    // Get comprehensive activity summary from TCX (expensive operation)
                    $summary = $fitbitClient->getActivitySummary($activityId);
                    $summary['activityType'] = $activityName; // Add activity type to summary

                    // Extract detailed data series from TCX (very expensive operations)
                    $heartRate    = $fitbitClient->getHeartRateTimeSeries($activityId);
                    $spo2         = $fitbitClient->getSpO2Data($activityId);
                    $temperature  = $fitbitClient->getTemperatureData($activityId);

                    // Build response
                    $chartData = null;
                    if (!empty($heartRate)) {
                        $chartData = [
                            'labels' => array_keys($heartRate),
                            'heartRate' => array_values($heartRate),
                            'spo2' => $spo2 ? array_values($spo2) : [],
                            'temperature' => $temperature ? array_values($temperature) : []
                        ];
                    }

                    return [
                        'status' => 'success',
                        'summary' => $summary,
                        'chartData' => $chartData
                    ];

                }, SimpleCache::TTL_STATIC, ['tags' => ['activities', 'details', $activityId]]);

                echo json_encode($result);

            } catch (Exception $e) {
                echo json_encode([
                    'status'  => 'error',
                    'message' => 'Failed to load activity details: ' . $e->getMessage()
                ]);
            }
            exit;

        case 'getActivitySummary':
            // Handle lazy loading requests for individual activity summaries
            $activityId = $_GET['host'] ?? $_GET['activityId'] ?? $_GET['identifier'] ?? null;

            if (!$activityId) {
                $response = ['success' => false, 'error' => 'Activity ID required'];
                break;
            }

            try {
                // Use longer cache TTL for activity summaries since they don't change often
                $cache_key = "activity_summary_{$activityId}";

                $activityData = $cache->remember($cache_key, function() use ($fitbitClient, $activityId, $cache) {
                    // First try to get activity info from the main activities cache
                    $activities_cache_key = "activities_main_list";
                    $cached_activities = $cache->get($activities_cache_key, SimpleCache::TTL_NORMAL);

                    $activityInfo = null;
                    if ($cached_activities && isset($cached_activities['data'])) {
                        foreach ($cached_activities['data'] as $activity) {
                            if ($activity['id'] == $activityId) {
                                $activityInfo = $activity;
                                break;
                            }
                        }
                    }

                    // If not found in cache, fetch fresh data
                    if (!$activityInfo) {
                        $activities = $fitbitClient->getActivities(null, 50);

                        // Cache the activities list for future use
                        $cache->set($activities_cache_key, $activities, ['tags' => ['activities', 'list']]);

                        if (isset($activities['data'])) {
                            foreach ($activities['data'] as $activity) {
                                if ($activity['id'] == $activityId) {
                                    $activityInfo = $activity;
                                    break;
                                }
                            }
                        }
                    }

                    if (!$activityInfo) {
                        throw new Exception('Activity not found');
                    }

                    // Get detailed activity summary
                    $summary = $fitbitClient->getActivitySummary($activityId);

                    return [
                        'activityType' => $activityInfo['type'] ?? 'Activity',
                        'distance' => $summary['distanceMiles'] ?? 0,
                        'duration' => $summary['durationFormatted'] ?? '0:00',
                        'pace' => $summary['paceFormatted'] ?? '--',
                        'calories' => $summary['calories'] ?? 0,
                        'date' => $activityInfo['date'] ?? date('Y-m-d'),
                        'summary' => $summary
                    ];

                }, SimpleCache::TTL_STATIC, ['tags' => ['activities', 'running', $activityId]]);

                $response = ['success' => true, 'data' => $activityData];

            } catch (Exception $e) {
                error_log("Failed to get activity summary for {$activityId}: " . $e->getMessage());
                $response = ['success' => false, 'error' => $e->getMessage()];
            }
            break;

        default:
            $response = ['status' => 'error', 'message' => 'Unknown request type'];
    }

    echo json_encode($response);
    exit;
}

#==============================================================================
# On Page Load
#==============================================================================

// Check if user is authenticated
$authenticated = $fitbitClient->isAuthenticated();
$smarty->assign('authenticated', $authenticated);

// If not handling a specific request, prepare data for the main template
if (!$request) {
    $activities = [];
    $lastCacheDate = null;

    // Use SimpleCache for the main activities list to share with lazy loading
    $activities_cache_key = "activities_main_list";

    $result = $cache->remember($activities_cache_key, function() use ($fitbitClient) {
        return $fitbitClient->getActivities();
    }, SimpleCache::TTL_NORMAL, ['tags' => ['activities', 'list']]);

    if (isset($result['data']) && is_array($result['data'])) {
        $activities = $result['data'];
        $lastCacheDate = $result['lastCacheDate'] ?? 'Cached';
    } else {
        // Handle case where result is directly an array of activities (cached data)
        if (is_array($result) && !empty($result) && isset($result[0]['id'])) {
            $activities = $result;
            $lastCacheDate = 'Cached from direct array';
        } else {
            error_log("Unexpected result structure: " . json_encode($result));
        }
    }

    // Assign activities to Smarty template
    $smarty->assign('activities', $activities);
    $smarty->assign('lastCacheDate', $lastCacheDate);
}