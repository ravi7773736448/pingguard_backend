export const validatePagination = (options = {}) => {
  const {
    defaultPage = 1,
    defaultLimit = 20,
    maxLimit = 100,
    maxPage = 10000
  } = options;

  return (req, res, next) => {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);

    let errors = [];

    if (req.query.page !== undefined && (isNaN(page) || page < 1)) {
      errors.push({
        field: 'page',
        message: 'Page must be a positive integer',
        value: req.query.page
      });
    }

    if (req.query.limit !== undefined && (isNaN(limit) || limit < 1)) {
      errors.push({
        field: 'limit',
        message: 'Limit must be a positive integer',
        value: req.query.limit
      });
    }

    if (page > maxPage) {
      errors.push({
        field: 'page',
        message: `Page cannot exceed ${maxPage}`,
        value: page
      });
    }

    if (limit > maxLimit) {
      errors.push({
        field: 'limit',
        message: `Limit cannot exceed ${maxLimit}`,
        value: limit
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors
      });
    }

    req.pagination = {
      page: isNaN(page) || page < 1 ? defaultPage : page,
      limit: isNaN(limit) || limit < 1 ? defaultLimit : limit
    };

    next();
  };
};

export const validatePeriod = (options = {}) => {
  const {
    defaultPeriod = 24,
    maxPeriod = 8760,
    minPeriod = 1
  } = options;

  return (req, res, next) => {
    const period = parseInt(req.query.period);
    const days = parseInt(req.query.days);

    let errors = [];
    let value, field;

    if (req.query.period !== undefined) {
      value = period;
      field = 'period';
    } else if (req.query.days !== undefined) {
      value = days;
      field = 'days';
    } else {
      req.period = defaultPeriod;
      return next();
    }

    if (isNaN(value) || value < minPeriod) {
      errors.push({
        field,
        message: `${field} must be at least ${minPeriod}`,
        value
      });
    }

    if (value > maxPeriod) {
      errors.push({
        field,
        message: `${field} cannot exceed ${maxPeriod}`,
        value
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors
      });
    }

    req.period = value;

    next();
  };
};

export const validateSort = (allowedFields = []) => {
  return (req, res, next) => {
    const sort = req.query.sort;
    const order = req.query.order?.toLowerCase();

    if (!sort) {
      return next();
    }

    const errors = [];

    if (allowedFields.length > 0 && !allowedFields.includes(sort)) {
      errors.push({
        field: 'sort',
        message: `Sort field must be one of: ${allowedFields.join(', ')}`,
        value: sort
      });
    }

    if (order && !['asc', 'desc'].includes(order)) {
      errors.push({
        field: 'order',
        message: 'Order must be either "asc" or "desc"',
        value: order
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid query parameters',
        errors
      });
    }

    req.sort = {
      field: sort,
      order: order || 'desc'
    };

    next();
  };
};

export const validateStatus = (allowedStatuses = []) => {
  return (req, res, next) => {
    const status = req.query.status;

    if (!status) {
      return next();
    }

    if (allowedStatuses.length > 0 && !allowedStatuses.includes(status.toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status parameter',
        errors: [{
          field: 'status',
          message: `Status must be one of: ${allowedStatuses.join(', ')}`,
          value: status
        }]
      });
    }

    req.query.status = status.toUpperCase();

    next();
  };
};

export const validateBoolean = (fields = []) => {
  return (req, res, next) => {
    const errors = [];

    for (const field of fields) {
      const value = req.query[field] || req.body[field];

      if (value !== undefined && value !== null && value !== '') {
        if (typeof value === 'string') {
          if (!['true', 'false', '0', '1', 'yes', 'no'].includes(value.toLowerCase())) {
            errors.push({
              field,
              message: `${field} must be a boolean value`,
              value
            });
          }
        } else if (typeof value !== 'boolean') {
          errors.push({
            field,
            message: `${field} must be a boolean value`,
            value
          });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid parameter type',
        errors
      });
    }

    next();
  };
};

export const validateNumberRange = (fieldName, options = {}) => {
  const { min = 0, max = Infinity } = options;

  return (req, res, next) => {
    let value;
    let source = 'query';

    if (req.body && req.body[fieldName] !== undefined) {
      value = req.body[fieldName];
      source = 'body';
    } else if (req.query[fieldName] !== undefined) {
      value = req.query[fieldName];
    }

    if (value === undefined || value === null) {
      return next();
    }

    const numValue = parseFloat(value);

    if (isNaN(numValue)) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must be a number`,
        errors: [{ field: fieldName, message: 'Invalid number format', value }]
      });
    }

    if (numValue < min || numValue > max) {
      return res.status(400).json({
        success: false,
        message: `${fieldName} must be between ${min} and ${max}`,
        errors: [{ field: fieldName, message: `Value out of range (${min}-${max})`, value }]
      });
    }

    req.body[fieldName] = numValue;
    next();
  };
};