import { body } from 'express-validator';

const sanitizeAndValidate = [
  body('email').trim().normalizeEmail(),
  body('username').trim().escape(),
  body('name').trim().escape()
];

export const registerValidator = [
  ...sanitizeAndValidate,
  body('username')
    .trim()
    .notEmpty().withMessage('Username is required')
    .isLength({ min: 2, max: 30 }).withMessage('Username must be between 2 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address')
    .isLength({ max: 254 }).withMessage('Email must not exceed 254 characters'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8, max: 128 }).withMessage('Password must be between 8 and 128 characters')
    .matches(/\d/).withMessage('Password must contain at least one number')
    .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
    .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter'),

  body('name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Name must not exceed 100 characters')
];

export const loginValidator = [
  ...sanitizeAndValidate,
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1 }).withMessage('Password cannot be empty')
];