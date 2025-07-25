const { body, validationResult } = require('express-validator');

const registerValidationRules = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),

  body('username')
    .notEmpty().withMessage('Username is required')
    .isAlphanumeric().withMessage('Username must be alphanumeric')
    .isLength({ min: 4 }).withMessage('Username must be at least 4 characters'),

  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),

  body('role')
    .optional()
    .isIn(['admin', 'staff', 'official', 'resident'])
    .withMessage('Invalid role value')
];

const validateRegister = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));
    return res.status(422).json({
      message: 'Validation failed',
      errors: extractedErrors
    });
  }
  next();
};

module.exports = {
  registerValidationRules,
  validateRegister
};
