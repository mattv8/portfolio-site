<?php

/**
 * File Encryption Utility
 * Handles on-the-fly encryption/decryption of cached files using AES-256-CBC
 */
class FileEncryption {
    private $key;
    private $cipher = 'aes-256-cbc';

    public function __construct($key) {
        if (strlen($key) < 32) {
            // Pad the key to ensure it's at least 32 characters
            $this->key = hash('sha256', $key, true);
        } else {
            $this->key = substr(hash('sha256', $key, true), 0, 32);
        }
    }

    /**
     * Encrypt data and return base64 encoded string
     * @param string $data Data to encrypt
     * @return string Base64 encoded encrypted data
     * @throws Exception If encryption fails
     */
    public function encrypt($data) {
        if (empty($data)) {
            return '';
        }

        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length($this->cipher));
        $encrypted = openssl_encrypt($data, $this->cipher, $this->key, 0, $iv);

        if ($encrypted === false) {
            throw new Exception('Encryption failed');
        }

        // Prepend IV to encrypted data and base64 encode
        return base64_encode($iv . $encrypted);
    }

    /**
     * Decrypt base64 encoded encrypted data
     * @param string $encryptedData Base64 encoded encrypted data
     * @return string Decrypted data
     * @throws Exception If decryption fails
     */
    public function decrypt($encryptedData) {
        if (empty($encryptedData)) {
            return '';
        }

        $data = base64_decode($encryptedData);
        if ($data === false) {
            throw new Exception('Invalid base64 data');
        }

        $iv_length = openssl_cipher_iv_length($this->cipher);
        $iv = substr($data, 0, $iv_length);
        $encrypted = substr($data, $iv_length);

        $decrypted = openssl_decrypt($encrypted, $this->cipher, $this->key, 0, $iv);

        if ($decrypted === false) {
            throw new Exception('Decryption failed');
        }

        return $decrypted;
    }

    /**
     * Encrypt and save data to file
     * @param string $filepath Path to save encrypted file
     * @param string $data Data to encrypt and save
     * @return bool Success status
     * @throws Exception If encryption or file write fails
     */
    public function encryptToFile($filepath, $data) {
        try {
            $encrypted = $this->encrypt($data);

            // Ensure directory exists
            $dir = dirname($filepath);
            if (!is_dir($dir)) {
                mkdir($dir, 0755, true);
            }

            $result = file_put_contents($filepath, $encrypted);
            return $result !== false;
        } catch (Exception $e) {
            error_log("FileEncryption: Failed to encrypt and save file '$filepath': " . $e->getMessage());
            return false;
        }
    }

    /**
     * Read and decrypt data from file
     * @param string $filepath Path to encrypted file
     * @return string|false Decrypted data or false on failure
     */
    public function decryptFromFile($filepath) {
        if (!file_exists($filepath)) {
            return false;
        }

        try {
            $encryptedData = file_get_contents($filepath);
            if ($encryptedData === false) {
                error_log("FileEncryption: Failed to read file '$filepath'");
                return false;
            }

            return $this->decrypt($encryptedData);
        } catch (Exception $e) {
            error_log("FileEncryption: Failed to decrypt file '$filepath': " . $e->getMessage());
            return false;
        }
    }

    /**
     * Check if a file is encrypted (basic heuristic check)
     * @param string $filepath Path to check
     * @return bool True if file appears to be encrypted
     */
    public function isEncrypted($filepath) {
        if (!file_exists($filepath)) {
            return false;
        }

        $sample = file_get_contents($filepath, false, null, 0, 100);
        if ($sample === false) {
            return false;
        }

        // Check if it looks like base64 (encrypted files will be base64 encoded)
        return base64_encode(base64_decode($sample, true)) === $sample;
    }
}
