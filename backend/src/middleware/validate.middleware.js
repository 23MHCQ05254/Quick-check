import { ApiError } from '../utils/apiError.js';

export const validateBody = (schema) => (req, _res, next) => {
  const errors = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const value = req.body[field];
    const present = value !== undefined && value !== null && value !== '';

    if (rules.required && !present) {
      errors.push(`${field} is required`);
      return;
    }

    if (!present) return;

    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
    }

    if (rules.array && !Array.isArray(value)) {
      errors.push(`${field} must be an array`);
    }

    if (rules.maxLength && value.toString().length > rules.maxLength) {
      errors.push(`${field} must be ${rules.maxLength} characters or fewer`);
    }
  });

  if (errors.length) {
    next(new ApiError(400, 'Validation failed', errors));
    return;
  }

  next();
};

