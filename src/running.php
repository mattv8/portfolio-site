<?php
#==============================================================================
# Configuration
#==============================================================================
require_once(__DIR__ . '/vendor/autoload.php');
require_once(__DIR__ . '/conf/config.php');
require_once(__DIR__ . '/lib/functions.php');
require_once(__DIR__ . '/lib/encrypted_cache.php');

// Running page configuration
define('INITIAL_HEXAGONS_COUNT', 18); // Number of hexagons loaded on initial page load

// Initialize encrypted cache for lazy loading and performance optimization
$cache = new EncryptedCache($_SERVER['DOCUMENT_ROOT'] . '/fitbit_cache', EncryptedCache::TTL_NORMAL, $encryption_key);

/**
 * Debug logging function that only logs when debug mode is enabled
 * @param string $message The message to log
 */
function debug_log($message) {
    global $debug;
    if ($debug === true) {
        error_log($message);
    }
}

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
        $this->getTokens();

        if (empty($this->credentials['access_token'])) {
            return false;
        }

        $obtained = (int)($this->credentials['obtained_at'] ?? 0);
        $lifetime = (int)($this->credentials['expires_in'] ?? 0);

        // still valid?
        if (time() < $obtained + $lifetime) {
            // Validate that the current token belongs to the allowed user
            if (!$this->validateAllowedUser($this->credentials['access_token'])) {
                // Clear invalid tokens
                $this->clearTokens();
                return false;
            }
            return true;
        }

        // expired → try refresh
        try {
            $this->refreshToken();
            // After refreshing, validate the user again
            if (!$this->validateAllowedUser($this->credentials['access_token'])) {
                $this->clearTokens();
                return false;
            }
            return true;
        } catch (\Exception $e) {
            return false;
        }
    }

    // Start the OAuth authorization flow
    public function getAuthorizationUrl()
    {
        $state = $_GET['state'] ?? null; // Get state from JavaScript

        $params = [
            'page' => 'running',
            'request' => 'authorize',
            'response_type' => 'code',
            'client_id' => $this->credentials['client_id'],
            'scope' => $this->credentials['scope'],
            'expires_in' => '86400' // 24 hours
        ];

        // Add state parameter if provided for CSRF protection
        if ($state) {
            $params['state'] = $state;
        }

        $authUrl = $this->credentials['auth_uri'] . '?' . http_build_query($params);
        return $authUrl;
    }

    // Handle the OAuth callback and exchange code for tokens
    public function handleCallback($code)
    {
        // Clean the code parameter to remove any URL fragments
        $code = trim($code);
        if (strpos($code, '#') !== false) {
            $code = substr($code, 0, strpos($code, '#'));
        }

        if (empty($code)) {
            throw new Exception('Authorization code is missing');
        }

        $ch = curl_init($this->credentials['token_uri']);

        $postFields = [
            'grant_type' => 'authorization_code',
            'client_id' => $this->credentials['client_id'],
            'code' => $code,
        ];

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postFields));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Basic ' . base64_encode($this->credentials['client_id'] . ':' . $this->credentials['client_secret']),
            'Content-Type: application/x-www-form-urlencoded'
        ]);

        // Set the correct CA bundle path
        curl_setopt($ch, CURLOPT_CAINFO, '/etc/ssl/certs/ca-certificates.crt');

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        // Check for cURL errors
        if (curl_errno($ch)) {
            $curlError = curl_error($ch);
            curl_close($ch);
            error_log("cURL error during token exchange: " . $curlError);
            throw new Exception('Failed to connect to Fitbit API: ' . $curlError);
        }

        curl_close($ch);

        if ($httpCode != 200) {
            // Add more specific error details
            $errorDetails = "HTTP $httpCode response from Fitbit: $response";
            error_log("Fitbit token exchange failed: " . $errorDetails);
            throw new Exception('Failed to get access token: ' . $errorDetails);
        }

        $tokenData = json_decode($response, true);

        if (!isset($tokenData['access_token'])) {
            throw new Exception('Access token not found in response');
        }

        // Validate that the authenticated user is the allowed user
        if (!$this->validateAllowedUser($tokenData['access_token'])) {
            throw new Exception('Access denied: This Fitbit account is not authorized to access this application. Only the specified account holder is allowed.');
        }

        // Add timestamp to track token age
        $tokenData['timestamp'] = time();

        // Save tokens
        $this->saveTokens($tokenData);

        return $tokenData;
    }

    // Validate that the authenticated user is the allowed user ID
    private function validateAllowedUser(string $accessToken): bool
    {
        $ch = curl_init(self::API_BASE_URL . '/1/user/-/profile.json');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $accessToken
        ]);

        // Set the correct CA bundle path
        curl_setopt($ch, CURLOPT_CAINFO, '/etc/ssl/certs/ca-certificates.crt');

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200) {
            error_log("Fitbit profile API returned HTTP code: " . $httpCode . ", Response: " . $response);
            return false;
        }

        $profileData = json_decode($response, true);

        // Check if the user ID matches our allowed user ID
        if (isset($profileData['user']['encodedId'])) {
            $apiUserId = trim($profileData['user']['encodedId']);
            $allowedUserId = $this->credentials['allowed_user_id'] ?? null;

            if (!$allowedUserId) {
                error_log("No allowed_user_id configured in Fitbit credentials");
                return false;
            }

            $isMatch = $apiUserId === $allowedUserId;

            if (!$isMatch) {
                error_log("Access denied for Fitbit user ID: '" . $apiUserId . "' (allowed: '" . $allowedUserId . "')");
            }

            return $isMatch;
        } else {
            error_log("No encodedId field found in profile data. Available fields: " . implode(', ', array_keys($profileData['user'] ?? [])));
        }

        return false;
    }

    // Get stored tokens
    protected function getTokens(): array
    {
        $data = [];
        $cookieExists = !empty($_COOKIE[$this->cookieName]);

        if ($cookieExists) {
            $cookieData = $_COOKIE[$this->cookieName];
            $data = json_decode($cookieData, true) ?: [];
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

    // Clear stored tokens
    protected function clearTokens()
    {
        // Clear the cookie
        setcookie(
            $this->cookieName,
            '',
            time() - 3600, // Expire in the past
            '/',           // path
            '',            // domain
            true,          // secure
            true           // HttpOnly
        );

        // Clear from credentials
        unset($this->credentials['access_token']);
        unset($this->credentials['refresh_token']);
        unset($this->credentials['obtained_at']);
        unset($this->credentials['expires_in']);
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

        // Set the correct CA bundle path
        curl_setopt($ch, CURLOPT_CAINFO, '/etc/ssl/certs/ca-certificates.crt');

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

        // Set the correct CA bundle path
        curl_setopt($ch, CURLOPT_CAINFO, '/etc/ssl/certs/ca-certificates.crt');

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
    // Unauthenticated users get cached data only (no cache invalidation)
    // Authenticated users get fresh data and update cache
    public function getActivities(int $limit = INITIAL_HEXAGONS_COUNT, int $offset = 0): array
    {
        $cacheDir    = __DIR__ . '/fitbit_cache';
        $offset      = $offset ?? 0;

        if (!is_dir($cacheDir)) {
            mkdir($cacheDir, 0755, true);
        }

        $cacheFile = "$cacheDir/activities_all_{$limit}.json";

        // Unauthenticated: serve most recent cache file (read-only, no invalidation)
    if (!$this->isAuthenticated()) {
        $files = glob("$cacheDir/activities_*.json");
        if ($files) {
            global $cache;
            usort($files, fn($a, $b) => filemtime($b) <=> filemtime($a));
            $cacheFilePath = $files[0];
            $rawContent = $cache->getRawFile($cacheFilePath);

            if ($rawContent === false) {
                error_log("Activities cache: Failed to read encrypted cache file: $cacheFilePath");
                return [
                    'code'          => 200,
                    'data'          => [],
                    'cached'        => true,
                    'lastCacheDate' => null,
                    'nextDate'      => null,
                    'error'         => 'Cache read error'
                ];
            }

            $raw = json_decode($rawContent, true);
            if ($raw === null) {
                $fileSize = filesize($cacheFilePath);
                $preview = substr($rawContent, 0, 200);
                error_log("Activities cache: Corrupted JSON cache file detected and will be skipped: $cacheFilePath (size: $fileSize bytes, preview: " . addslashes($preview) . ")");
                @unlink($cacheFilePath); // Remove corrupted cache
                return [
                    'code'          => 200,
                    'data'          => [],
                    'cached'        => true,
                    'lastCacheDate' => null,
                    'nextDate'      => null,
                    'error'         => 'Corrupted cache removed'
                ];
            }

            $formatted = [];
            foreach (($raw['activities'] ?? []) as $act) {
                if (stripos($act['activityName'], 'run') !== false) {
                    $activity = $this->formatActivityForDisplay($act);
                    // Apply same pace filter as template (pace <= 20 min/mile)
                    if ($activity['pace'] <= 20) {
                        $formatted[] = $activity;
                    }
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
                'lastCacheDate' => date('Y-m-d H:i:s', filemtime($cacheFilePath)),
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
            'hasMore'       => false,
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
        global $cache;
        $cacheWriteResult = $cache->setRawFile($cacheFile, json_encode($response['data']));
        if ($cacheWriteResult === false) {
            error_log("Activities cache: Failed to write encrypted cache file: $cacheFile");
        } else {
            $activityCount = count($response['data']['activities'] ?? []);
            error_log("Activities cache: Successfully cached $activityCount activities to $cacheFile");
        }

        $formatted = [];
        foreach ($response['data']['activities'] as $act) {
            if (stripos($act['activityName'], 'run') !== false) {
                $activity = $this->formatActivityForDisplay($act);
                // Apply same pace filter as template (pace <= 20 min/mile)
                if ($activity['pace'] <= 20) {
                    $formatted[] = $activity;
                }
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
        'hasMore'       => false,
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
            'duration' => gmdate('H:i:s', (int)$durationSeconds), // Format duration in H:i:s
            'pace' => $paceMinPerMile, // Raw pace value in minutes per mile
            'paceFormatted' => $paceFormatted, // Formatted pace as MM:SS
            'activityName' => $activity['activityName'] ?? 'Unknown Activity',
            'type' => $activity['activityName'] ?? 'Unknown Activity', // Add type field for easier access
            'summary' => sprintf('%s - %.1f mi in %s (pace %s/mi)',
                $activity['activityName'] ?? 'Unknown Activity',
                $distanceMiles,
                gmdate('H:i:s', (int)$durationSeconds),
                $paceFormatted
            )
        ];
    }

    public function getActivityDetails(int $logId): \SimpleXMLElement
    {
        global $cache;
        $cacheFile = __DIR__ . "/fitbit_cache/{$logId}.tcx";

        // Fetch & cache if missing - but only if authenticated
        if (!file_exists($cacheFile) || filesize($cacheFile) === 0) {
            // Prevent API calls for unauthenticated users
            if (!$this->isAuthenticated()) {
                throw new \Exception("Activity details not available in cache for unauthenticated user");
            }

            $userId    = $this->credentials['user_id'] ?? '-';
            $endpoint = "/1/user/{$userId}/activities/{$logId}.tcx";
            $params   = ['includePartialTCX' => 'true'];

            $resp = $this->makeRequest($endpoint, 'GET', $params);
            if ($resp['code'] !== 200) {
                throw new \Exception("Failed fetching TCX (HTTP {$resp['code']})");
            }

            // Use encrypted cache to save TCX file
            $cache->setRawFile($cacheFile, $resp['data']);
        }

        libxml_use_internal_errors(true);

        // Use encrypted cache to read TCX file
        $tcxContent = $cache->getRawFile($cacheFile);
        if ($tcxContent === false) {
            throw new \Exception("Failed reading cached TCX for logId {$logId}");
        }

        $tcx = simplexml_load_string($tcxContent);
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
        $durationFormatted = gmdate('H:i:s', (int)$totalTimeSeconds); // Format duration as H:i:s
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

        // Set the correct CA bundle path for SSL verification
        curl_setopt($ch, CURLOPT_CAINFO, '/etc/ssl/certs/ca-certificates.crt');

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
        if ($request) {
            echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
            exit;
        } else {
            // For non-AJAX requests, redirect with error parameter
            $errorMessage = urlencode($e->getMessage());
            header("Location: /?page=running&auth_error=" . $errorMessage);
            exit;
        }
    }
}

// Handle AJAX requests - allow some requests for unauthenticated users (cached data only)
if ($request) {
    header('Content-Type: application/json');
    $response = ['status' => 'error', 'message' => 'Invalid request'];

    // Requests that work with cached data for unauthenticated users
    $allowedUnauthenticatedRequests = ['getActivities', 'getActivityDetails', 'getActivitySummary'];

    // Check if user is authenticated for requests that require fresh data
    if (!$fitbitClient->isAuthenticated() && !in_array($request, $allowedUnauthenticatedRequests)) {
        echo json_encode(['status' => 'error', 'message' => 'Not authenticated', 'needs_auth' => true]);
        exit;
    }

    switch ($request) {
        case 'getActivities':
            $limit = (int)($_GET['limit'] ?? INITIAL_HEXAGONS_COUNT);
            $offset = (int)($_GET['offset'] ?? 0);

            // Log access for debugging
            if (!$fitbitClient->isAuthenticated()) {
                debug_log("Unauthenticated user requesting activities (limit: {$limit}, offset: {$offset}) - will serve cached data only");
            }

            $result = $fitbitClient->getActivities($limit, $offset);

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

                // For unauthenticated users, try cache with no expiry
                if (!$fitbitClient->isAuthenticated()) {
                    debug_log("Unauthenticated user requesting activity details for ID: {$activityId}");

                    $cached_result = $cache->getNoExpiry($details_cache_key);
                    if ($cached_result) {
                        debug_log("Serving cached activity details for unauthenticated user: {$activityId}");
                        echo json_encode($cached_result);
                        exit;
                    } else {
                        debug_log("No cached activity details available for unauthenticated user: {$activityId}");
                        echo json_encode([
                            'status'  => 'error',
                            'message' => 'Activity details not available in cache.'
                        ]);
                        exit;
                    }
                }

                // For authenticated users: Use 30-day cache, only fetch if doesn't exist
                $result = $cache->remember($details_cache_key, function() use ($fitbitClient, $activityId, $cache) {
                    debug_log("Fetching fresh activity details for authenticated user: {$activityId}");

                    // Try to reuse activity info from main activities cache first
                    $activities_cache_key = "activities_main_list";
                    $cached_activities = $cache->get($activities_cache_key, EncryptedCache::TTL_NORMAL);

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
                        $activities = $fitbitClient->getActivities(INITIAL_HEXAGONS_COUNT);
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

                    // Extract detailed data series from TCX (very expensive operations)
                    $heartRate    = $fitbitClient->getHeartRateTimeSeries($activityId);
                    $spo2         = $fitbitClient->getSpO2Data($activityId);
                    $temperature  = $fitbitClient->getTemperatureData($activityId);

                    // Build response
                    $chartData = null;
                    if (!empty($heartRate)) {
                        $chartData = [
                            'labels' => array_column($heartRate, 'time'),
                            'heartRate' => array_column($heartRate, 'value'),
                            'spo2' => !empty($spo2) ? array_column($spo2, 'value') : [],
                            'temperature' => !empty($temperature) ? array_column($temperature, 'value') : []
                        ];
                    }

                    $summary = $fitbitClient->getActivitySummary($activityId);
                    $summary['activityType'] = $activityName;

                    return [
                        'status' => 'success',
                        'summary' => $summary,
                        'chartData' => $chartData
                    ];                }, EncryptedCache::TTL_MONTHLY, ['tags' => ['activities', 'details', $activityId]]);

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
                // Use 1-hour cache TTL for activity summaries since they change frequently
                $cache_key = "activity_summary_{$activityId}";

                // For unauthenticated users, try cache with no expiry
                if (!$fitbitClient->isAuthenticated()) {
                    debug_log("Unauthenticated user requesting activity summary for ID: {$activityId}");

                    $activityData = $cache->getNoExpiry($cache_key);
                    if ($activityData) {
                        debug_log("Activity summary served from cache (no expiry) for ID: {$activityId}");
                        $response = ['success' => true, 'data' => $activityData];
                    } else {
                        debug_log("No cached activity summary available for unauthenticated user: {$activityId}");
                        $response = ['success' => false, 'error' => 'Activity summary not available in cache.'];
                    }
                } else {
                    // For authenticated users: Use 1-hour cache
                    $activityData = $cache->remember($cache_key, function() use ($fitbitClient, $activityId, $cache) {
                        debug_log("Authenticated user - populating activity summary cache for ID: {$activityId}");

                        // First try to get activity info from the main activities cache
                        $activities_cache_key = "activities_main_list";
                        $cached_activities = $cache->get($activities_cache_key, EncryptedCache::TTL_NORMAL);

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
                            $activities = $fitbitClient->getActivities(50);

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

                    }, EncryptedCache::TTL_STATIC, ['tags' => ['activities', 'running', $activityId]]);

                    if ($activityData) {
                        debug_log("Activity summary served from cache for authenticated user: {$activityId}");
                        $response = ['success' => true, 'data' => $activityData];
                    } else {
                        debug_log("Failed to get activity summary for authenticated user: {$activityId}");
                        $response = ['success' => false, 'error' => 'Activity summary not available.'];
                    }
                }

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

    // Use EncryptedCache for the main activities list to share with lazy loading
    $activities_cache_key = "activities_main_list";

    // Only clear stale empty cache if user is authenticated (unauthenticated users can't refetch)
    if ($fitbitClient->isAuthenticated()) {
        $cached = $cache->get($activities_cache_key, EncryptedCache::TTL_NORMAL);
        if ($cached !== null && isset($cached['data']) && empty($cached['data'])) {
            // We're authenticated but have empty cached data - clear it to force fresh fetch
            debug_log("Authenticated user: Clearing stale empty activities cache to force fresh fetch");
            $cache->delete($activities_cache_key);
        }
    }

    // Try to get from cache first
    $result = $cache->get($activities_cache_key, EncryptedCache::TTL_NORMAL);

    if ($result === null) {
        // No cache, fetch fresh data (only if authenticated)
        if ($fitbitClient->isAuthenticated()) {
            debug_log("Authenticated user: No cache found, fetching fresh data");
            $activities_data = $fitbitClient->getActivities();
        } else {
            debug_log("Unauthenticated user: No cache found, attempting to get data from getActivities()");
            $activities_data = $fitbitClient->getActivities();

            // If we got data for unauthenticated user, cache it in the main cache too
            if (!empty($activities_data['data']) && ($activities_data['code'] ?? 200) === 200) {
                $cache->set($activities_cache_key, $activities_data, ['tags' => ['activities', 'list']]);
                debug_log("Unauthenticated user: Cached activities data in main cache");
            }
        }

        // Only cache successful results with data
        if (!empty($activities_data['data']) && ($activities_data['code'] ?? 200) === 200) {
            $cache->set($activities_cache_key, $activities_data, ['tags' => ['activities', 'list']]);
            error_log("Cached successful activities result");
        } else {
            error_log("Not caching empty or error result from getActivities");
        }

        $result = $activities_data;
    }

    if (isset($result['data']) && is_array($result['data'])) {
        $activities = $result['data'];
        $lastCacheDate = $result['lastCacheDate'] ?? 'Cached';
    } else {
        // Handle case where result is directly an array of activities (cached data)
        if (is_array($result) && !empty($result) && isset($result[0]['id'])) {
            $activities = $result;

            // Find the most recent cache file to show accurate cache age
            $cacheFiles = glob(__DIR__ . '/fitbit_cache/activities_*.json');
            if ($cacheFiles) {
                // Sort by modification time, most recent first
                usort($cacheFiles, fn($a, $b) => filemtime($b) <=> filemtime($a));
                $lastCacheDate = date('Y-m-d H:i:s', filemtime($cacheFiles[0]));
            } else {
                $lastCacheDate = 'Cache files not found';
            }
        } else {
            error_log("Unexpected result structure: " . json_encode($result));
        }
    }

    // Assign activities to Smarty template
    $smarty->assign('activities', $activities);
    $smarty->assign('lastCacheDate', $lastCacheDate);
    $smarty->assign('auth_error', $_GET['auth_error'] ?? null);
}