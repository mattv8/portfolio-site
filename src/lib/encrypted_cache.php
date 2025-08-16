<?php

require_once(__DIR__ . '/encryption.php');

/**
 * Enhanced cache class with encryption support for sensitive data
 * Extends the basic SimpleCache functionality with encryption for specific file types
 */
class EncryptedCache {
    private $cache_dir;
    private $default_ttl;
    private $encryption;
    private $encrypted_extensions = ['tcx', 'json']; // File extensions to encrypt
    private static $cleanup_probability = 10;

    // Predefined cache TTL constants
    const TTL_FAST = 60;        // 1 minute
    const TTL_NORMAL = 300;     // 5 minutes
    const TTL_SLOW = 900;       // 15 minutes
    const TTL_STATIC = 3600;    // 1 hour
    const TTL_DAILY = 86400;    // 24 hours

    public function __construct($cache_dir = null, $default_ttl = self::TTL_NORMAL, $encryption_key = null) {
        $this->cache_dir = $cache_dir ?: $_SERVER['DOCUMENT_ROOT'] . '/cache';
        $this->default_ttl = $default_ttl;

        if ($encryption_key) {
            $this->encryption = new FileEncryption($encryption_key);
        }

        if (!is_dir($this->cache_dir)) {
            mkdir($this->cache_dir, 0755, true);
        }

        $this->probabilisticCleanup();
    }

    /**
     * Determine if a file should be encrypted based on its extension or content type
     * @param string $key Cache key or filename
     * @param mixed $data Data being cached (to detect JSON)
     * @return bool True if should be encrypted
     */
    private function shouldEncrypt($key, $data = null) {
        if (!$this->encryption) {
            return false;
        }

        // Check file extension
        $extension = strtolower(pathinfo($key, PATHINFO_EXTENSION));
        if (in_array($extension, $this->encrypted_extensions)) {
            return true;
        }

        // Check if data looks like JSON
        if (is_string($data) && $this->isJsonString($data)) {
            return true;
        }

        // Check if key suggests Fitbit data
        if (strpos($key, 'fitbit') !== false || strpos($key, 'tcx') !== false) {
            return true;
        }

        return false;
    }

    /**
     * Check if a string is valid JSON
     * @param string $string
     * @return bool
     */
    private function isJsonString($string) {
        if (!is_string($string)) {
            return false;
        }
        json_decode($string);
        return (json_last_error() == JSON_ERROR_NONE);
    }

    /**
     * Get cached data, with automatic decryption if needed
     * @param string $key Cache key
     * @param int|null $max_age Maximum age in seconds
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
            @unlink($cache_file);
            return null;
        }

        // Try to read and decrypt if needed
        $data = null;
        if ($this->encryption && $this->encryption->isEncrypted($cache_file)) {
            $data = $this->encryption->decryptFromFile($cache_file);
        } else {
            $data = file_get_contents($cache_file);
        }

        if ($data === false) {
            error_log("EncryptedCache: Failed to read cache file: $cache_file (key: $key)");
            @unlink($cache_file);
            return null;
        }

        // If it's serialized data, unserialize it
        $unserialized = @unserialize($data);
        if ($unserialized !== false) {
            $this->probabilisticCleanup();
            return isset($unserialized['data']) ? $unserialized['data'] : $unserialized;
        }

        // Return raw data for non-serialized content (like TCX/JSON files)
        $this->probabilisticCleanup();
        return $data;
    }

    /**
     * Store data in cache, with automatic encryption if needed
     * @param string $key Cache key
     * @param mixed $data Data to cache
     * @param array $metadata Optional metadata
     * @return bool Success status
     */
    public function set($key, $data, $metadata = []) {
        $cache_file = $this->getCacheFilePath($key);

        // Determine if we should encrypt this data
        $should_encrypt = $this->shouldEncrypt($key, $data);

        $result = false;
        if ($should_encrypt && $this->encryption) {
            // For raw data (like TCX XML or JSON strings), store directly encrypted
            if (is_string($data)) {
                $result = $this->encryption->encryptToFile($cache_file, $data);
            } else {
                // For complex data, serialize first then encrypt
                $cache_data = [
                    'data' => $data,
                    'timestamp' => time(),
                    'metadata' => $metadata
                ];
                $serialized = serialize($cache_data);
                $result = $this->encryption->encryptToFile($cache_file, $serialized);
            }
        } else {
            // Store unencrypted
            if (is_string($data) && (strpos($key, '.tcx') !== false || strpos($key, '.json') !== false)) {
                // Raw file data
                $result = file_put_contents($cache_file, $data) !== false;
            } else {
                // Serialized data
                $cache_data = [
                    'data' => $data,
                    'timestamp' => time(),
                    'metadata' => $metadata
                ];
                $result = file_put_contents($cache_file, serialize($cache_data)) !== false;
            }
        }

        $this->probabilisticCleanup();
        return $result;
    }

    /**
     * Store raw file content (like TCX or JSON) with optional encryption
     * @param string $filepath Full path where to store the file
     * @param string $content File content
     * @return bool Success status
     */
    public function setRawFile($filepath, $content) {
        $should_encrypt = $this->shouldEncrypt($filepath, $content);

        if ($should_encrypt && $this->encryption) {
            return $this->encryption->encryptToFile($filepath, $content);
        } else {
            // Ensure directory exists
            $dir = dirname($filepath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            return file_put_contents($filepath, $content) !== false;
        }
    }

    /**
     * Read raw file content with automatic decryption
     * @param string $filepath Full path to the file
     * @return string|false File content or false on failure
     */
    public function getRawFile($filepath) {
        if (!file_exists($filepath)) {
            return false;
        }

        if ($this->encryption && $this->encryption->isEncrypted($filepath)) {
            return $this->encryption->decryptFromFile($filepath);
        } else {
            return file_get_contents($filepath);
        }
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
            return is_array($cached) && isset($cached['data']) ? $cached['data'] : $cached;
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
     * Generate cache file path from key
     * @param string $key Cache key
     * @return string Full path to cache file
     */
    private function getCacheFilePath($key) {
        // If key already looks like a full path, use it
        if (strpos($key, '/') !== false) {
            return $key;
        }

        // Otherwise, generate path in cache directory
        return $this->cache_dir . '/' . $key . (strpos($key, '.') === false ? '.cache' : '');
    }

    /**
     * Probabilistic cleanup to avoid performance impact
     */
    private function probabilisticCleanup() {
        if (rand(1, self::$cleanup_probability) === 1) {
            $this->cleanup();
        }
    }

    /**
     * Clear expired cache files
     * @param int|null $max_age Maximum age for cleanup
     * @return int Number of files cleared
     */
    public function cleanup($max_age = null) {
        $max_age = $max_age ?: $this->default_ttl;
        $cleared = 0;
        $files = glob($this->cache_dir . '/*');

        foreach ($files as $file) {
            if (is_file($file)) {
                $file_age = time() - filemtime($file);
                if ($file_age > $max_age) {
                    if (@unlink($file)) {
                        $cleared++;
                    }
                }
            }
        }

        return $cleared;
    }

    /**
     * Get cache statistics
     * @return array Cache statistics
     */
    public function getStats() {
        $files = glob($this->cache_dir . '/*');
        $total_size = 0;
        $file_count = 0;
        $encrypted_count = 0;

        foreach ($files as $file) {
            if (is_file($file)) {
                $file_count++;
                $total_size += filesize($file);

                if ($this->encryption && $this->encryption->isEncrypted($file)) {
                    $encrypted_count++;
                }
            }
        }

        return [
            'cache_dir' => $this->cache_dir,
            'file_count' => $file_count,
            'encrypted_count' => $encrypted_count,
            'total_size' => $total_size,
            'total_size_formatted' => $this->formatBytes($total_size)
        ];
    }

    /**
     * Format bytes into human readable format
     * @param int $bytes
     * @return string Formatted size
     */
    private function formatBytes($bytes) {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }
        return round($bytes, 2) . ' ' . $units[$i];
    }

    /**
     * Clear all cache files
     * @return int Number of files cleared
     */
    public function flush() {
        $cleared = 0;
        $files = glob($this->cache_dir . '/*');

        foreach ($files as $file) {
            if (is_file($file) && @unlink($file)) {
                $cleared++;
            }
        }

        return $cleared;
    }
}
