<?php
/**
 * Cache Management Utility
 * Simple command-line and web interface for cache operations
 */

require_once(__DIR__ . '/../lib/cache.php');

// Handle web requests
if (isset($_GET['action'])) {
    header('Content-Type: application/json');

    $cache = new SimpleCache();
    $action = $_GET['action'];

    try {
        switch ($action) {
            case 'stats':
                $stats = $cache->getStats();
                echo json_encode(['success' => true, 'stats' => $stats]);
                break;

            case 'cleanup':
                $max_age = isset($_GET['max_age']) ? (int)$_GET['max_age'] : SimpleCache::TTL_SLOW;
                $cleared = $cache->cleanup($max_age);
                echo json_encode(['success' => true, 'cleared' => $cleared]);
                break;

            case 'clear_tag':
                $tag = $_GET['tag'] ?? '';
                if (!$tag) {
                    throw new Exception('Tag parameter required');
                }
                $cleared = $cache->clearByTag($tag);
                echo json_encode(['success' => true, 'cleared' => $cleared]);
                break;

            case 'flush':
                $cleared = $cache->flush();
                echo json_encode(['success' => true, 'cleared' => $cleared]);
                break;

            default:
                throw new Exception('Invalid action');
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// Command line interface
if (php_sapi_name() === 'cli') {
    $cache = new SimpleCache();

    $action = $argv[1] ?? 'stats';

    switch ($action) {
        case 'stats':
            $stats = $cache->getStats();
            echo "📊 Cache Statistics:\n";
            echo "   Total files: {$stats['total_files']}\n";
            echo "   Expired files: {$stats['expired_files']}\n";
            echo "   Total size: {$stats['total_size_mb']} MB\n";
            echo "   Cache directory: {$stats['cache_dir']}\n";
            break;

        case 'cleanup':
            $max_age = isset($argv[2]) ? (int)$argv[2] : SimpleCache::TTL_SLOW;
            $cleared = $cache->cleanup($max_age);
            echo "🧹 Cleaned up $cleared expired cache files\n";
            break;

        case 'clear':
            $tag = $argv[2] ?? '';
            if ($tag) {
                $cleared = $cache->clearByTag($tag);
                echo "🗑️  Cleared $cleared cache files with tag: $tag\n";
            } else {
                echo "Usage: php cache-manager.php clear <tag>\n";
            }
            break;

        case 'flush':
            $cleared = $cache->flush();
            echo "🔥 Flushed all $cleared cache files\n";
            break;

        default:
            echo "Usage: php cache-manager.php [action] [parameters]\n";
            echo "Actions:\n";
            echo "  stats              - Show cache statistics\n";
            echo "  cleanup [max_age]  - Clean up expired files\n";
            echo "  clear <tag>        - Clear files with specific tag\n";
            echo "  flush              - Clear all cache files\n";
    }

    exit;
}

// Simple web interface
?>
<!DOCTYPE html>
<html>
<head>
    <title>Cache Manager</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .stats { background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0; }
        button { padding: 10px 15px; margin: 5px; background: #007cba; color: white; border: none; border-radius: 3px; cursor: pointer; }
        button:hover { background: #005a87; }
        .danger { background: #dc3545; }
        .danger:hover { background: #c82333; }
        #output { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0; min-height: 100px; white-space: pre-wrap; }
    </style>
</head>
<body>
    <h1>🗃️ Cache Manager</h1>

    <div class="stats" id="stats">
        <h3>Cache Statistics</h3>
        <div id="stats-content">Loading...</div>
    </div>

    <div>
        <h3>Actions</h3>
        <button onclick="loadStats()">📊 Refresh Stats</button>
        <button onclick="cleanup()">🧹 Cleanup Expired</button>
        <button onclick="clearTag('servers')">🗑️ Clear Server Cache</button>
        <button onclick="clearTag('charts')">📈 Clear Chart Cache</button>
        <button onclick="flush()" class="danger">🔥 Flush All Cache</button>
    </div>

    <div id="output"></div>

    <script>
        const output = document.getElementById('output');
        const statsContent = document.getElementById('stats-content');

        function log(message) {
            output.textContent += new Date().toLocaleTimeString() + ': ' + message + '\n';
            output.scrollTop = output.scrollHeight;
        }

        async function apiCall(action, params = {}) {
            const url = new URL(window.location);
            url.searchParams.set('action', action);
            Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));

            try {
                const response = await fetch(url);
                const data = await response.json();

                if (data.success) {
                    return data;
                } else {
                    throw new Error(data.error);
                }
            } catch (error) {
                log('Error: ' + error.message);
                throw error;
            }
        }

        async function loadStats() {
            try {
                const data = await apiCall('stats');
                const stats = data.stats;
                statsContent.innerHTML = `
                    <strong>Total files:</strong> ${stats.total_files}<br>
                    <strong>Expired files:</strong> ${stats.expired_files}<br>
                    <strong>Total size:</strong> ${stats.total_size_mb} MB<br>
                    <strong>Cache directory:</strong> ${stats.cache_dir}
                `;
                log('Cache stats refreshed');
            } catch (error) {
                log('Failed to load stats');
            }
        }

        async function cleanup() {
            try {
                const data = await apiCall('cleanup');
                log(`Cleaned up ${data.cleared} expired files`);
                loadStats();
            } catch (error) {
                log('Failed to cleanup cache');
            }
        }

        async function clearTag(tag) {
            try {
                const data = await apiCall('clear_tag', {tag});
                log(`Cleared ${data.cleared} files with tag: ${tag}`);
                loadStats();
            } catch (error) {
                log(`Failed to clear cache for tag: ${tag}`);
            }
        }

        async function flush() {
            if (confirm('Are you sure you want to clear ALL cache files? This cannot be undone.')) {
                try {
                    const data = await apiCall('flush');
                    log(`Flushed ${data.cleared} cache files`);
                    loadStats();
                } catch (error) {
                    log('Failed to flush cache');
                }
            }
        }

        // Load initial stats
        loadStats();
    </script>
</body>
</html>
