import { body, param } from 'express-validator';

const ALLOWED_PROTOCOLS = ['http:', 'https:'];

const isValidUrl = (value) => {
  if (!value) return false;

  try {
    const url = new URL(value);
    return ALLOWED_PROTOCOLS.includes(url.protocol);
  } catch {
    return false;
  }
};

const isNotLocalhost = (value) => {
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return !['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(hostname);
  } catch {
    return false;
  }
};

export const createWebsiteValidator = [
  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .custom(isValidUrl).withMessage('Please provide a valid URL (http or https)')
    .isLength({ max: 2048 }).withMessage('URL must not exceed 2048 characters'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters')
    .escape(),

  body('checkInterval')
    .optional()
    .isInt({ min: 10, max: 3600 }).withMessage('Check interval must be between 10 and 3600 seconds'),

  body('responseThreshold')
    .optional()
    .isInt({ min: 500, max: 30000 }).withMessage('Response threshold must be between 500 and 30000 ms'),

  body('alertEnabled')
    .optional()
    .isBoolean().withMessage('alertEnabled must be a boolean value'),

  body('region')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Region must not exceed 50 characters')
    .escape(),

  body('method')
    .optional()
    .trim()
    .isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).withMessage('Method must be GET, POST, PUT, PATCH, or DELETE'),

  body('headers')
    .optional()
    .custom((value) => {
      if (value !== undefined && value !== null && typeof value !== 'object') {
        throw new Error('Headers must be a valid key-value object');
      }
      return true;
    }),

  body('body')
    .optional()
    .isString().withMessage('Request body payload must be a string'),

  body('expectedStatus')
    .optional()
    .isInt({ min: 100, max: 599 }).withMessage('Expected status must be between 100 and 599'),

  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 30000 }).withMessage('Timeout must be between 1000 and 30000 ms'),

  body('responseValidationType')
    .optional()
    .trim()
    .isIn(['CONTAINS', 'JSON_MATCH', 'NONE']).withMessage('Response validation type must be CONTAINS, JSON_MATCH, or NONE'),

  body('responseValidationValue')
    .optional()
    .isString().withMessage('Response validation value must be a string')
    .custom((value, { req }) => {
      if (req.body.responseValidationType === 'JSON_MATCH') {
        try {
          JSON.parse(value);
        } catch {
          throw new Error('Response validation value must be a valid JSON string when type is JSON_MATCH');
        }
      }
      return true;
    })
];

export const updateWebsiteValidator = [
  param('id')
    .notEmpty().withMessage('Website ID is required')
    .isMongoId().withMessage('Invalid website ID format'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters')
    .escape(),

  body('checkInterval')
    .optional()
    .isInt({ min: 10, max: 3600 }).withMessage('Check interval must be between 10 and 3600 seconds'),

  body('responseThreshold')
    .optional()
    .isInt({ min: 500, max: 30000 }).withMessage('Response threshold must be between 500 and 30000 ms'),

  body('alertEnabled')
    .optional()
    .isBoolean().withMessage('alertEnabled must be a boolean value'),

  body('region')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Region must not exceed 50 characters')
    .escape(),

  body('isPaused')
    .optional()
    .isBoolean().withMessage('isPaused must be a boolean value'),

  body('method')
    .optional()
    .trim()
    .isIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).withMessage('Method must be GET, POST, PUT, PATCH, or DELETE'),

  body('headers')
    .optional()
    .custom((value) => {
      if (value !== undefined && value !== null && typeof value !== 'object') {
        throw new Error('Headers must be a valid key-value object');
      }
      return true;
    }),

  body('body')
    .optional()
    .isString().withMessage('Request body payload must be a string'),

  body('expectedStatus')
    .optional()
    .isInt({ min: 100, max: 599 }).withMessage('Expected status must be between 100 and 599'),

  body('timeout')
    .optional()
    .isInt({ min: 1000, max: 30000 }).withMessage('Timeout must be between 1000 and 30000 ms'),

  body('responseValidationType')
    .optional()
    .trim()
    .isIn(['CONTAINS', 'JSON_MATCH', 'NONE']).withMessage('Response validation type must be CONTAINS, JSON_MATCH, or NONE'),

  body('responseValidationValue')
    .optional()
    .isString().withMessage('Response validation value must be a string')
    .custom((value, { req }) => {
      if (req.body.responseValidationType === 'JSON_MATCH') {
        try {
          JSON.parse(value);
        } catch {
          throw new Error('Response validation value must be a valid JSON string when type is JSON_MATCH');
        }
      }
      return true;
    })
];

export const websiteIdValidator = [
  param('id')
    .notEmpty().withMessage('Website ID is required')
    .isMongoId().withMessage('Invalid website ID format')
];

export const triggerCheckValidator = [
  param('id')
    .notEmpty().withMessage('Website ID is required')
    .isMongoId().withMessage('Invalid website ID format'),

  body('force')
    .optional()
    .isBoolean().withMessage('force must be a boolean value')
];