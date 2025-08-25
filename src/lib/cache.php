<?php

/**
 * Generic file-based caching system for expensive operations
 * Designed to be reusable across the entire application
 */
class SimpleCache {
    private $cache_dir;
    private $default_ttl;

    // Predefined cache TTL constants for different data types
    const TTL_FAST = 60;         // 1 minute - for rapidly changing data
    const TTL_NORMAL = 300;      // 5 minutes - for moderately changing data
    const TTL_SLOW = 900;        // 15 minutes - for slowly changing data
    const TTL_STATIC = 3600;     // 1 hour - for relatively static data
    const TTL_DAILY = 86400;     // 24 hours - for daily data
    const TTL_MONTHLY = 2592000; // 30 days - for very static data like activity details

    public function __construct($cache_dir = null, $default_ttl = self::TTL_NORMAL) {
        $this->cache_dir = $cache_dir ?: $_SERVER['DOCUMENT_ROOT'] . '/cache';
        $this->default_ttl = $default_ttl;

        if (!is_dir($this->cache_dir)) {
            mkdir($this->cache_dir, 0755, true);
        }

        // No automatic/probabilistic cleanup - cleanup only occurs when explicitly called
    }

    /**
     * Get cached data if it exists and hasn't expired
     * @param string $key Cache key
     * @param int|null $max_age Maximum age in seconds (null uses default)
     * @return mixed|null Cached data or null if not found/expired
     */
    public function get($key, $max_age = null) {
        $max_age = $max_age ?: $this->default_ttl;
        $cache_file = $this->getCacheFilePath($key);

        if (!file_exists($cache_file)) {
            return null;
        }

        $file_age = time() - filemtime($cache_file);
        if ($file_age > $max_age) {
            @unlink($cache_file); // Delete expired file immediately
            return null;
        }

        $data = file_get_contents($cache_file);
        if ($data === false) {
            error_log("SimpleCache: Failed to read cache file: $cache_file (key: $key)");
            @unlink($cache_file); // Delete corrupted file
            return null;
        }

        $unserialized = @unserialize($data);
        if ($unserialized === false) {
            $file_size = filesize($cache_file);
            $data_preview = substr($data, 0, 200);
            error_log("SimpleCache: Corrupted cache file detected and deleted: $cache_file (key: $key, size: $file_size bytes, preview: " . addslashes($data_preview) . ")");
            @unlink($cache_file); // Delete corrupted file
            return null;
        }

        return isset($unserialized['data']) ? $unserialized['data'] : $unserialized;
    }

    /**
     * Get cached data without expiry check (for unauthenticated users)
     * @param string $key Cache key
     * @return mixed|null Cached data or null if not found
     */
    public function getNoExpiry($key) {
        $cache_file = $this->getCacheFilePath($key);

        if (!file_exists($cache_file)) {
            return null;
        }

        $data = file_get_contents($cache_file);
        if ($data === false) {
            error_log("SimpleCache: Failed to read cache file: $cache_file (key: $key)");
            return null;
        }

        $unserialized = @unserialize($data);
        if ($unserialized === false) {
            error_log("SimpleCache: Corrupted cache file detected: $cache_file (key: $key)");
            return null;
        }

        return isset($unserialized['data']) ? $unserialized['data'] : $unserialized;
    }

    /**
     * Store data in cache
     * @param string $key Cache key
     * @param mixed $data Data to cache
     * @param array $metadata Optional metadata (tags, dependencies, etc.)
     * @return bool Success status
     */
    public function set($key, $data, $metadata = []) {
        $cache_file = $this->getCacheFilePath($key);
        $cache_data = [
            'data' => $data,
            'timestamp' => time(),
            'metadata' => $metadata
        ];

        $result = file_put_contents($cache_file, serialize($cache_data));

        return $result !== false;
    }

    /**
     * Get data from cache or execute callback to generate and cache it
     * @param string $key Cache key
     * @param callable $callback Function to generate data if not cached
     * @param int|null $max_age Cache TTL in seconds
     * @param array $metadata Optional metadata for the cache entry
     * @return mixed Cached or generated data
     */
    public function remember($key, callable $callback, $max_age = null, $metadata = []) {
        $cached = $this->get($key, $max_age);

        if ($cached !== null) {
            return isset($cached['data']) ? $cached['data'] : $cached;
        }

        $data = $callback();
        $this->set($key, $data, $metadata);
        return $data;
    }

    /**
     * Delete specific cache entry
     * @param string $key Cache key
     * @return bool Success status
     */
    public function delete($key) {
        $cache_file = $this->getCacheFilePath($key);
        return file_exists($cache_file) ? @unlink($cache_file) : true;
    }

    /**
     * Clear cache entries by tag
     * @param string $tag Tag to clear
     * @return int Number of files cleared
     */
    public function clearByTag($tag) {
        $cleared = 0;
        $files = glob($this->cache_dir . '/*.cache');

        foreach ($files as $file) {
            $data = @unserialize(file_get_contents($file));
            if ($data && isset($data['metadata']['tags']) && in_array($tag, $data['metadata']['tags'])) {
                if (@unlink($file)) {
                    $cleared++;
                }
            }
        }

        return $cleared;
    }

    /**
     * Clear expired cache files
     * @param int|null $max_age Maximum age for cleanup (null uses default)
     * @return int Number of files cleared
     */
    public function cleanup($max_age = null) {
        $max_age = $max_age ?: $this->default_ttl;
        $cleared = 0;
        $current_time = time();

        // Get all cache files
        $files = glob($this->cache_dir . '/*.cache');

        foreach ($files as $file) {
            $file_age = $current_time - filemtime($file);
            if ($file_age > $max_age) {
                if (@unlink($file)) {
                    $cleared++;
                }
            }
        }

        return $cleared;
    }

    /**
     * Clear all cache files
     * @return int Number of files cleared
     */
    public function flush() {
        $cleared = 0;
        $files = glob($this->cache_dir . '/*.cache');

        foreach ($files as $file) {
            if (@unlink($file)) {
                $cleared++;
            }
        }

        return $cleared;
    }

    /**
     * Get cache statistics
     * @return array Cache stats
     */
    public function getStats() {
        $files = glob($this->cache_dir . '/*.cache');
        $total_size = 0;
        $expired_count = 0;

        foreach ($files as $file) {
            $total_size += filesize($file);
            if (time() - filemtime($file) > $this->default_ttl) {
                $expired_count++;
            }
        }

        return [
            'total_files' => count($files),
            'expired_files' => $expired_count,
            'total_size_bytes' => $total_size,
            'total_size_mb' => round($total_size / (1024 * 1024), 2),
            'cache_dir' => $this->cache_dir
        ];
    }

    /**
     * Generate cache file path from key
     * @param string $key Cache key
     * @return string Full file path
     */
    private function getCacheFilePath($key) {
        return $this->cache_dir . '/' . md5($key) . '.cache';
    }
}
