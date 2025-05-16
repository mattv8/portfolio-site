<?php
#==============================================================================
# Configuration
#==============================================================================
require_once(__DIR__ . '/vendor/autoload.php');
require_once(__DIR__ . '/conf/config.php');
require_once(__DIR__ . '/lib/functions.php');

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
            'request' => 'auth',
            'response_type' => 'code',
            'client_id' => $this->credentials['client_id'],
            'redirect_uri' => $this->credentials['redirect_uri'],
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

    // Get list of activities (runs) with pagination support
    public function getActivities($beforeDate = null, $limit = 10)
    {
        $endpoint = '/1/user/-/activities/list.json';
        $params = [
            'beforeDate' => $beforeDate ?? date('Y-m-d'),
            'sort' => 'desc',
            'limit' => $limit,
            'offset' => 0
        ];

        return $this->makeRequest($endpoint, 'GET', $params);
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

        // Extract lap information
        $lapNode = $tcx->xpath('//tcx:Lap');
        if (empty($lapNode)) {
            throw new \Exception("No Lap element found in TCX");
        }

        $lap = $lapNode[0];
        $totalTimeSeconds = (float)$lap->TotalTimeSeconds;
        $distanceMeters = (float)$lap->DistanceMeters;
        $calories = (int)$lap->Calories;

        // Convert values for display
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

# Handle Fitbit OAuth flow
if ($request === 'authorize') {
    header('Content-Type: application/json');
    // redirect user to Fitbit’s consent page
    header('Location: ' . $fitbitClient->getAuthorizationUrl());
    exit;
}

# Receive the authorization code from Fitbit
if ($code) {
    try {
        $token = $fitbitClient->handleCallback($code);
        echo json_encode(['status' => 'success', 'token' => $token]);
        exit;
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
            $beforeDate = $_GET['beforeDate'] ?? null;
            $limit = $_GET['limit'] ?? 10;
            $result = $fitbitClient->getActivities($beforeDate, $limit);

            if ($result['code'] === 200) {
                // Format the data for display
                $formattedActivities = [];
                if (isset($result['data']['activities']) && is_array($result['data']['activities'])) {
                    foreach ($result['data']['activities'] as $activity) {
                        // Only include running activities
                        if (stripos($activity['activityName'], 'run') !== false) {

                            $distanceMiles = $activity['distance'] * 0.621371;
                            $durationSeconds = $activity['duration'] / 1000;
                            $paceMinPerMile = ($distanceMiles > 0) ? $durationSeconds / 60 / $distanceMiles : 0;

                            // Format pace as MM:SS
                            $paceMinutes = floor($paceMinPerMile);
                            $paceSeconds = round(($paceMinPerMile - $paceMinutes) * 60);
                            $paceFormatted = sprintf('%d:%02d', $paceMinutes, $paceSeconds);

                            $formattedActivities[] = [
                                'id' => $activity['logId'],
                                'date' => date('Y-m-d', strtotime($activity['startTime'])),
                                'time' => date('H:i:s', strtotime($activity['startTime'])),
                                'distance' => round($distanceMiles, 2), // Round to 2 decimal places
                                'duration' => gmdate('H:i:s', $durationSeconds), // Format duration in H:i:s
                                'pace' => $paceMinPerMile, // Raw pace value in minutes per mile
                                'paceFormatted' => $paceFormatted, // Formatted pace as MM:SS
                                'activityName' => $activity['activityName']
                            ];
                        }
                    }
                }

                $response = [
                    'status' => 'success',
                    'data' => $formattedActivities,
                    'nextDate' => !empty($formattedActivities) ? end($formattedActivities)['date'] : null
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
                // Get comprehensive activity summary from TCX
                $summary = $fitbitClient->getActivitySummary($activityId);

                // Extract detailed data series from TCX
                $heartRate    = $fitbitClient->getHeartRateTimeSeries($activityId);
                $spo2         = $fitbitClient->getSpO2Data($activityId);
                $temperature  = $fitbitClient->getTemperatureData($activityId);

                // Build formatted data for charts
                $chartData = [
                    'labels'      => array_map(function($dt) { return $dt['time']; }, $heartRate),
                    'heartRate'   => array_column($heartRate, 'value'),
                    'spo2'        => array_column($spo2, 'value'),
                    'temperature' => array_column($temperature, 'value'),
                ];

                echo json_encode([
                    'status'      => 'success',
                    'summary'     => $summary,
                    'heartRate'   => $heartRate,
                    'spo2'        => $spo2,
                    'temperature' => $temperature,
                    'chartData'   => $chartData
                ]);
            } catch (Exception $e) {
                echo json_encode([
                    'status'  => 'error',
                    'message' => $e->getMessage()
                ]);
            }
            exit;

        default:
            $response = ['status' => 'error', 'message' => 'Unknown request type'];
    }

    echo json_encode($response);
    exit;
}

// For direct template rendering (not AJAX)
if (!isset($_GET['request'])) {

}
