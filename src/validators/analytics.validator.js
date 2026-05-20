import { query, param } from 'express-validator';

export const analyticsQueryValidator = [
  param('id')
    .notEmpty().withMessage('Website ID is required')
    .isMongoId().withMessage('Invalid website ID format'),

  query('period')
    .optional()
    .isInt({ min: 1, max: 8760 }).withMessage('Period must be between 1 and 8760 hours (1 year)')
    .toInt(),

  query('interval')
    .optional()
    .isIn(['hour', 'day', 'week']).withMessage('Interval must be one of: hour, day, week'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.endDate && new Date(value) > new Date(req.query.endDate)) {
        throw new Error('Start date must be before end date');
      }
      return true;
    }),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

export const incidentsQueryValidator = [
  param('id')
    .notEmpty().withMessage('Website ID is required')
    .isMongoId().withMessage('Invalid website ID format'),

  query('days')
    .optional()
    .isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
    .toInt(),

  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Page must be between 1 and 1000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt()
];

export const logsQueryValidator = [
  param('id')
    .notEmpty().withMessage('Website ID is required')
    .isMongoId().withMessage('Invalid website ID format'),

  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Page must be between 1 and 1000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 }).withMessage('Limit must be between 1 and 200')
    .toInt(),

  query('status')
    .optional()
    .isIn(['UP', 'DOWN', 'SLOW']).withMessage('Status must be one of: UP, DOWN, SLOW'),

  query('startDate')
    .optional()
    .isISO8601().withMessage('Start date must be a valid ISO 8601 date'),

  query('endDate')
    .optional()
    .isISO8601().withMessage('End date must be a valid ISO 8601 date'),

  query('minResponseTime')
    .optional()
    .isInt({ min: 0 }).withMessage('Minimum response time must be a positive number'),

  query('maxResponseTime')
    .optional()
    .isInt({ min: 0 }).withMessage('Maximum response time must be a positive number')
];

export const dashboardSummaryValidator = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 1000 }).withMessage('Page must be between 1 and 1000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
    .toInt(),

  query('status')
    .optional()
    .isIn(['UP', 'DOWN', 'SLOW', 'UNKNOWN']).withMessage('Status must be one of: UP, DOWN, SLOW, UNKNOWN')
];