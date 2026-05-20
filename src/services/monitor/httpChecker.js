import axios from 'axios';
import { ERROR_TYPES, HTTP_STATUS, MONITOR_CONFIG } from '../../config/constants/index.js';

export const executeCheck = async (monitor) => {
  const startTime = Date.now();
  
  const config = {
    method: monitor.method || 'GET',
    url: monitor.url,
    timeout: monitor.timeout || MONITOR_CONFIG.DEFAULT_TIMEOUT,
    headers: {
      'User-Agent': 'PingGuard/1.0 (API Health Checker)',
      ...(monitor.headers instanceof Map ? Object.fromEntries(monitor.headers) : monitor.headers)
    },
    validateStatus: () => true // Allow handling all status codes manually
  };

  if (monitor.body && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(config.method)) {
    try {
      config.data = typeof monitor.body === 'string' ? JSON.parse(monitor.body) : monitor.body;
      config.headers['Content-Type'] = 'application/json';
    } catch (e) {
      config.data = monitor.body; // fallback to raw string
    }
  }

  try {
    const response = await axios(config);
    const responseTime = Date.now() - startTime;
    const expected = monitor.expectedStatus || 200;

    if (response.status !== expected) {
      return {
        success: false,
        status: HTTP_STATUS.DOWN,
        statusCode: response.status,
        responseTime,
        errorType: ERROR_TYPES.HTTP_ERROR,
        message: `Expected status ${expected} but received ${response.status}`
      };
    }

    // Perform custom response body verification
    const validation = validateResponseBody(response, monitor);
    if (!validation.isValid) {
      return {
        success: false,
        status: HTTP_STATUS.DOWN,
        statusCode: response.status,
        responseTime,
        errorType: ERROR_TYPES.RESPONSE_VALIDATION_ERROR,
        message: validation.message
      };
    }

    const status = responseTime > MONITOR_CONFIG.SLOW_RESPONSE_THRESHOLD ? HTTP_STATUS.SLOW : HTTP_STATUS.UP;

    return {
      success: true,
      status,
      statusCode: response.status,
      responseTime,
      errorType: null
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    return handleNetworkError(error, responseTime);
  }
};

const validateResponseBody = (response, monitor) => {
  const { responseValidationType, responseValidationValue } = monitor;

  if (!responseValidationType || responseValidationType === 'NONE' || !responseValidationValue) {
    return { isValid: true };
  }

  const responseData = response.data;

  if (responseValidationType === 'CONTAINS') {
    const bodyStr = typeof responseData === 'string' ? responseData : JSON.stringify(responseData);
    if (!bodyStr.includes(responseValidationValue)) {
      return {
        isValid: false,
        message: `Expected response to contain text: "${responseValidationValue}"`
      };
    }
  } else if (responseValidationType === 'JSON_MATCH') {
    let expectedJson;
    try {
      expectedJson = typeof responseValidationValue === 'string'
        ? JSON.parse(responseValidationValue)
        : responseValidationValue;
    } catch (e) {
      return {
        isValid: false,
        message: `Invalid expected JSON pattern: ${e.message}`
      };
    }

    let actualJson = responseData;
    if (typeof actualJson === 'string') {
      try {
        actualJson = JSON.parse(actualJson);
      } catch {
        return {
          isValid: false,
          message: 'Response is not valid JSON'
        };
      }
    }

    // Custom deep partial equality matcher
    const deepPartialMatch = (target, spec) => {
      if (spec === null || spec === undefined) return true;
      if (typeof spec !== 'object') {
        return target === spec;
      }
      if (typeof target !== 'object' || target === null) {
        return false;
      }
      for (const key of Object.keys(spec)) {
        if (!deepPartialMatch(target[key], spec[key])) {
          return false;
        }
      }
      return true;
    };

    if (!deepPartialMatch(actualJson, expectedJson)) {
      return {
        isValid: false,
        message: `Response JSON does not match expected pattern: ${responseValidationValue}`
      };
    }
  }

  return { isValid: true };
};

const handleNetworkError = (error, responseTime) => {
  let statusCode = 503;
  let errorType = ERROR_TYPES.NETWORK_ERROR;

  if (error.code === 'ECONNABORTED') {
    statusCode = 408;
    errorType = ERROR_TYPES.TIMEOUT;
  } else if (error.code === 'ENOTFOUND') {
    errorType = ERROR_TYPES.DNS_ERROR;
  } else if (error.code === 'ECONNREFUSED') {
    errorType = ERROR_TYPES.CONNECTION_REFUSED;
  }

  return {
    success: false,
    status: HTTP_STATUS.DOWN,
    statusCode,
    responseTime,
    errorType,
    message: error.message
  };
};
