<?php
/**
 * SecretsService
 * PHP version 5
 *
 * @category Class
 * @package  InfluxDB2
 * @author   OpenAPI Generator team
 * @link     https://openapi-generator.tech
 */

/**
 * InfluxDB OSS API Service
 *
 * The InfluxDB v2 API provides a programmatic interface for all interactions with InfluxDB. Access the InfluxDB API using the `/api/v2/` endpoint.
 *
 * OpenAPI spec version: 2.0.0
 * 
 * Generated by: https://openapi-generator.tech
 * OpenAPI Generator version: 3.3.4
 */

/**
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

namespace InfluxDB2\Service;

use InfluxDB2\DefaultApi;
use InfluxDB2\HeaderSelector;
use InfluxDB2\ObjectSerializer;

/**
 * SecretsService Class Doc Comment
 *
 * @category Class
 * @package  InfluxDB2
 * @author   OpenAPI Generator team
 * @link     https://openapi-generator.tech
 */
class SecretsService
{
    /**
     * @var DefaultApi
     */
    protected $defaultApi;

    /**
     * @var HeaderSelector
     */
    protected $headerSelector;

    /**
     * @param DefaultApi $defaultApi
     * @param HeaderSelector  $selector
     */
    public function __construct(DefaultApi $defaultApi)
    {
        $this->defaultApi = $defaultApi;
        $this->headerSelector = new HeaderSelector();
    }


    /**
     * Operation deleteOrgsIDSecretsID
     *
     * Delete a secret from an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  string $secret_id The secret ID. (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return void
     */
    public function deleteOrgsIDSecretsID($org_id, $secret_id, $zap_trace_span = null)
    {
        $this->deleteOrgsIDSecretsIDWithHttpInfo($org_id, $secret_id, $zap_trace_span);
    }

    /**
     * Operation deleteOrgsIDSecretsIDWithHttpInfo
     *
     * Delete a secret from an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  string $secret_id The secret ID. (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return array of null, HTTP status code, HTTP response headers (array of strings)
     */
    public function deleteOrgsIDSecretsIDWithHttpInfo($org_id, $secret_id, $zap_trace_span = null)
    {
        $request = $this->deleteOrgsIDSecretsIDRequest($org_id, $secret_id, $zap_trace_span);

        $response = $this->defaultApi->sendRequest($request);

        return [null, $response->getStatusCode(), $response->getHeaders()];
    }

    /**
     * Create request for operation 'deleteOrgsIDSecretsID'
     *
     * @param  string $org_id The organization ID. (required)
     * @param  string $secret_id The secret ID. (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InvalidArgumentException
     * @return \Psr\Http\Message\RequestInterface
     */
    protected function deleteOrgsIDSecretsIDRequest($org_id, $secret_id, $zap_trace_span = null)
    {
        // verify the required parameter 'org_id' is set
        if ($org_id === null || (is_array($org_id) && count($org_id) === 0)) {
            throw new \InvalidArgumentException(
                'Missing the required parameter $org_id when calling deleteOrgsIDSecretsID'
            );
        }
        // verify the required parameter 'secret_id' is set
        if ($secret_id === null || (is_array($secret_id) && count($secret_id) === 0)) {
            throw new \InvalidArgumentException(
                'Missing the required parameter $secret_id when calling deleteOrgsIDSecretsID'
            );
        }

        $resourcePath = '/api/v2/orgs/{orgID}/secrets/{secretID}';
        $queryParams = [];
        $headerParams = [];
        $httpBody = '';
        $multipart = false;

        // header params
        if ($zap_trace_span !== null) {
            $headerParams['Zap-Trace-Span'] = ObjectSerializer::toHeaderValue($zap_trace_span);
        }

        // path params
        if ($org_id !== null) {
            $resourcePath = str_replace(
                '{' . 'orgID' . '}',
                ObjectSerializer::toPathValue($org_id),
                $resourcePath
            );
        }
        // path params
        if ($secret_id !== null) {
            $resourcePath = str_replace(
                '{' . 'secretID' . '}',
                ObjectSerializer::toPathValue($secret_id),
                $resourcePath
            );
        }

        // body params
        $_tempBody = null;

        if ($multipart) {
            $headers = $this->headerSelector->selectHeadersForMultipart(
                ['application/json']
            );
        } else {
            $headers = $this->headerSelector->selectHeaders(
                ['application/json'],
                []
            );
        }

        // for model (json/xml)
        if (isset($_tempBody)) {
            // $_tempBody is the method argument, if present
            if ($headers['Content-Type'] === 'application/json') {
                $httpBody = json_encode(ObjectSerializer::sanitizeForSerialization($_tempBody));
            } else {
                $httpBody = $_tempBody;
            }
        }

        $headers = array_merge(
            $headerParams,
            $headers
        );

        return $this->defaultApi->createRequest('DELETE', $resourcePath, $httpBody, $headers, $queryParams);
    }

    /**
     * Operation getOrgsIDSecrets
     *
     * List all secret keys for an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return \InfluxDB2\Model\SecretKeysResponse|\InfluxDB2\Model\Error
     */
    public function getOrgsIDSecrets($org_id, $zap_trace_span = null)
    {
        list($response) = $this->getOrgsIDSecretsWithHttpInfo($org_id, $zap_trace_span);
        return $response;
    }

    /**
     * Operation getOrgsIDSecretsWithHttpInfo
     *
     * List all secret keys for an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return array of \InfluxDB2\Model\SecretKeysResponse|\InfluxDB2\Model\Error, HTTP status code, HTTP response headers (array of strings)
     */
    public function getOrgsIDSecretsWithHttpInfo($org_id, $zap_trace_span = null)
    {
        $request = $this->getOrgsIDSecretsRequest($org_id, $zap_trace_span);

        $response = $this->defaultApi->sendRequest($request);

        $returnType = '\InfluxDB2\Model\SecretKeysResponse';
        $responseBody = $response->getBody();
        if ($returnType === '\SplFileObject') {
            $content = $responseBody; //stream goes to serializer
        } else {
            $content = $responseBody->getContents();
        }

        return [
            ObjectSerializer::deserialize($content, $returnType, []),
            $response->getStatusCode(),
            $response->getHeaders()
        ];
    }

    /**
     * Create request for operation 'getOrgsIDSecrets'
     *
     * @param  string $org_id The organization ID. (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InvalidArgumentException
     * @return \Psr\Http\Message\RequestInterface
     */
    protected function getOrgsIDSecretsRequest($org_id, $zap_trace_span = null)
    {
        // verify the required parameter 'org_id' is set
        if ($org_id === null || (is_array($org_id) && count($org_id) === 0)) {
            throw new \InvalidArgumentException(
                'Missing the required parameter $org_id when calling getOrgsIDSecrets'
            );
        }

        $resourcePath = '/api/v2/orgs/{orgID}/secrets';
        $queryParams = [];
        $headerParams = [];
        $httpBody = '';
        $multipart = false;

        // header params
        if ($zap_trace_span !== null) {
            $headerParams['Zap-Trace-Span'] = ObjectSerializer::toHeaderValue($zap_trace_span);
        }

        // path params
        if ($org_id !== null) {
            $resourcePath = str_replace(
                '{' . 'orgID' . '}',
                ObjectSerializer::toPathValue($org_id),
                $resourcePath
            );
        }

        // body params
        $_tempBody = null;

        if ($multipart) {
            $headers = $this->headerSelector->selectHeadersForMultipart(
                ['application/json']
            );
        } else {
            $headers = $this->headerSelector->selectHeaders(
                ['application/json'],
                []
            );
        }

        // for model (json/xml)
        if (isset($_tempBody)) {
            // $_tempBody is the method argument, if present
            if ($headers['Content-Type'] === 'application/json') {
                $httpBody = json_encode(ObjectSerializer::sanitizeForSerialization($_tempBody));
            } else {
                $httpBody = $_tempBody;
            }
        }

        $headers = array_merge(
            $headerParams,
            $headers
        );

        return $this->defaultApi->createRequest('GET', $resourcePath, $httpBody, $headers, $queryParams);
    }

    /**
     * Operation patchOrgsIDSecrets
     *
     * Update secrets in an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  map[string,string] $request_body Secret key value pairs to update/add (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return void
     */
    public function patchOrgsIDSecrets($org_id, $request_body, $zap_trace_span = null)
    {
        $this->patchOrgsIDSecretsWithHttpInfo($org_id, $request_body, $zap_trace_span);
    }

    /**
     * Operation patchOrgsIDSecretsWithHttpInfo
     *
     * Update secrets in an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  map[string,string] $request_body Secret key value pairs to update/add (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return array of null, HTTP status code, HTTP response headers (array of strings)
     */
    public function patchOrgsIDSecretsWithHttpInfo($org_id, $request_body, $zap_trace_span = null)
    {
        $request = $this->patchOrgsIDSecretsRequest($org_id, $request_body, $zap_trace_span);

        $response = $this->defaultApi->sendRequest($request);

        return [null, $response->getStatusCode(), $response->getHeaders()];
    }

    /**
     * Create request for operation 'patchOrgsIDSecrets'
     *
     * @param  string $org_id The organization ID. (required)
     * @param  map[string,string] $request_body Secret key value pairs to update/add (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InvalidArgumentException
     * @return \Psr\Http\Message\RequestInterface
     */
    protected function patchOrgsIDSecretsRequest($org_id, $request_body, $zap_trace_span = null)
    {
        // verify the required parameter 'org_id' is set
        if ($org_id === null || (is_array($org_id) && count($org_id) === 0)) {
            throw new \InvalidArgumentException(
                'Missing the required parameter $org_id when calling patchOrgsIDSecrets'
            );
        }
        // verify the required parameter 'request_body' is set
        if ($request_body === null || (is_array($request_body) && count($request_body) === 0)) {
            throw new \InvalidArgumentException(
                'Missing the required parameter $request_body when calling patchOrgsIDSecrets'
            );
        }

        $resourcePath = '/api/v2/orgs/{orgID}/secrets';
        $queryParams = [];
        $headerParams = [];
        $httpBody = '';
        $multipart = false;

        // header params
        if ($zap_trace_span !== null) {
            $headerParams['Zap-Trace-Span'] = ObjectSerializer::toHeaderValue($zap_trace_span);
        }

        // path params
        if ($org_id !== null) {
            $resourcePath = str_replace(
                '{' . 'orgID' . '}',
                ObjectSerializer::toPathValue($org_id),
                $resourcePath
            );
        }

        // body params
        $_tempBody = null;
        if (isset($request_body)) {
            $_tempBody = $request_body;
        }

        if ($multipart) {
            $headers = $this->headerSelector->selectHeadersForMultipart(
                ['application/json']
            );
        } else {
            $headers = $this->headerSelector->selectHeaders(
                ['application/json'],
                ['application/json']
            );
        }

        // for model (json/xml)
        if (isset($_tempBody)) {
            // $_tempBody is the method argument, if present
            if ($headers['Content-Type'] === 'application/json') {
                $httpBody = json_encode(ObjectSerializer::sanitizeForSerialization($_tempBody));
            } else {
                $httpBody = $_tempBody;
            }
        }

        $headers = array_merge(
            $headerParams,
            $headers
        );

        return $this->defaultApi->createRequest('PATCH', $resourcePath, $httpBody, $headers, $queryParams);
    }

    /**
     * Operation postOrgsIDSecrets
     *
     * Delete secrets from an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  \InfluxDB2\Model\SecretKeys $secret_keys Secret key to delete (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return void
     */
    public function postOrgsIDSecrets($org_id, $secret_keys, $zap_trace_span = null)
    {
        $this->postOrgsIDSecretsWithHttpInfo($org_id, $secret_keys, $zap_trace_span);
    }

    /**
     * Operation postOrgsIDSecretsWithHttpInfo
     *
     * Delete secrets from an organization
     *
     * @param  string $org_id The organization ID. (required)
     * @param  \InfluxDB2\Model\SecretKeys $secret_keys Secret key to delete (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InfluxDB2\ApiException on non-2xx response
     * @throws \InvalidArgumentException
     * @return array of null, HTTP status code, HTTP response headers (array of strings)
     */
    public function postOrgsIDSecretsWithHttpInfo($org_id, $secret_keys, $zap_trace_span = null)
    {
        $request = $this->postOrgsIDSecretsRequest($org_id, $secret_keys, $zap_trace_span);

        $response = $this->defaultApi->sendRequest($request);

        return [null, $response->getStatusCode(), $response->getHeaders()];
    }

    /**
     * Create request for operation 'postOrgsIDSecrets'
     *
     * @param  string $org_id The organization ID. (required)
     * @param  \InfluxDB2\Model\SecretKeys $secret_keys Secret key to delete (required)
     * @param  string $zap_trace_span OpenTracing span context (optional)
     *
     * @throws \InvalidArgumentException
     * @return \Psr\Http\Message\RequestInterface
     */
    protected function postOrgsIDSecretsRequest($org_id, $secret_keys, $zap_trace_span = null)
    {
        // verify the required parameter 'org_id' is set
        if ($org_id === null || (is_array($org_id) && count($org_id) === 0)) {
            throw new \InvalidArgumentException(
                'Missing the required parameter $org_id when calling postOrgsIDSecrets'
            );
        }
        // verify the required parameter 'secret_keys' is set
        if ($secret_keys === null || (is_array($secret_keys) && count($secret_keys) === 0)) {
            throw new \InvalidArgumentException(
                'Missing the required parameter $secret_keys when calling postOrgsIDSecrets'
            );
        }

        $resourcePath = '/api/v2/orgs/{orgID}/secrets/delete';
        $queryParams = [];
        $headerParams = [];
        $httpBody = '';
        $multipart = false;

        // header params
        if ($zap_trace_span !== null) {
            $headerParams['Zap-Trace-Span'] = ObjectSerializer::toHeaderValue($zap_trace_span);
        }

        // path params
        if ($org_id !== null) {
            $resourcePath = str_replace(
                '{' . 'orgID' . '}',
                ObjectSerializer::toPathValue($org_id),
                $resourcePath
            );
        }

        // body params
        $_tempBody = null;
        if (isset($secret_keys)) {
            $_tempBody = $secret_keys;
        }

        if ($multipart) {
            $headers = $this->headerSelector->selectHeadersForMultipart(
                ['application/json']
            );
        } else {
            $headers = $this->headerSelector->selectHeaders(
                ['application/json'],
                ['application/json']
            );
        }

        // for model (json/xml)
        if (isset($_tempBody)) {
            // $_tempBody is the method argument, if present
            if ($headers['Content-Type'] === 'application/json') {
                $httpBody = json_encode(ObjectSerializer::sanitizeForSerialization($_tempBody));
            } else {
                $httpBody = $_tempBody;
            }
        }

        $headers = array_merge(
            $headerParams,
            $headers
        );

        return $this->defaultApi->createRequest('POST', $resourcePath, $httpBody, $headers, $queryParams);
    }

}
