import mongoose from 'mongoose';

export const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} parameter is required`,
        errors: [{ field: paramName, message: 'ID is required' }]
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        errors: [{
          field: paramName,
          message: 'Invalid ID format. Must be a valid MongoDB ObjectId (24 hex characters)',
          value: id
        }]
      });
    }

    next();
  };
};

export const validateMultipleObjectIds = (paramNames = []) => {
  return (req, res, next) => {
    const errors = [];

    for (const paramName of paramNames) {
      const id = req.params[paramName];

      if (id && !mongoose.Types.ObjectId.isValid(id)) {
        errors.push({
          field: paramName,
          message: `Invalid ${paramName} format`,
          value: id
        });
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format',
        errors
      });
    }

    next();
  };
};

export const validateObjectIdBody = (fieldName) => {
  return (req, res, next) => {
    const value = req.body[fieldName];

    if (!value) {
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${fieldName} format`,
        errors: [{
          field: fieldName,
          message: `Invalid ${fieldName}. Must be a valid MongoDB ObjectId`,
          value
        }]
      });
    }

    next();
  };
};

export const validateObjectIdQuery = (fieldName) => {
  return (req, res, next) => {
    const value = req.query[fieldName];

    if (!value) {
      return next();
    }

    if (!mongoose.Types.ObjectId.isValid(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${fieldName} format`,
        errors: [{
          field: fieldName,
          message: `Invalid ${fieldName}. Must be a valid MongoDB ObjectId`,
          value
        }]
      });
    }

    next();
  };
};