const { body, validationResult } = require('express-validator');

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
};

// User registration validation (only for patients)
const validateUserRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Valid age required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  handleValidationErrors
];

// Doctor registration validation (admin only)
const validateDoctorRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Valid age required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('specialty').isLength({ min: 2, max: 100 }).withMessage('Specialty must be 2-100 characters'),
  body('availability').optional().isArray().withMessage('Availability must be an array'),
  handleValidationErrors
];

// Admin registration validation (admin only)
const validateAdminRegistration = [
  body('name').trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Valid age required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  handleValidationErrors
];

// User login validation
const validateUserLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
  handleValidationErrors
];

// Change password validation
const validateChangePassword = [
  body('currentPassword').notEmpty().withMessage('Current password required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  handleValidationErrors
];

// Appointment validation
const validateAppointment = [
  body('doctorId').isMongoId().withMessage('Valid doctor ID required'),
  body('dateTime').isISO8601().withMessage('Valid date and time required'),
  body('note').optional().isLength({ max: 500 }).withMessage('Note too long'),
  handleValidationErrors
];

// Message validation
const validateMessage = [
  body('receiverId').isMongoId().withMessage('Valid receiver ID required'),
  body('content').trim().isLength({ min: 1, max: 1000 }).withMessage('Message must be 1-1000 characters'),
  handleValidationErrors
];

// Post validation
const validatePost = [
  body('content').trim().isLength({ min: 10, max: 5000 }).withMessage('Content must be 10-5000 characters'),
  handleValidationErrors
];

// Profile update validation
const validateProfileUpdate = [
  body('name').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Name must be 2-50 characters'),
  body('phoneNumber').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('age').optional().isInt({ min: 1, max: 120 }).withMessage('Valid age required'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('specialty').optional().isLength({ min: 2, max: 100 }).withMessage('Specialty must be 2-100 characters'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateDoctorRegistration,
  validateAdminRegistration,
  validateUserLogin,
  validateChangePassword,
  validateAppointment,
  validateMessage,
  validatePost,
  validateProfileUpdate
}; 