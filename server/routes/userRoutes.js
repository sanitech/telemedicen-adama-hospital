const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { 
  isAuthenticated, 
  isPatient, 
  isAdmin 
} = require('../middleware/auth');
const {
  validateUserRegistration,
  validateDoctorRegistration,
  validateAdminRegistration,
  validateUserLogin,
  validateChangePassword,
  validateProfileUpdate
} = require('../middleware/validation');

// Public routes
router.post('/register', validateUserRegistration, userController.registerUser);
router.post('/login', validateUserLogin, userController.loginUser);

// Protected routes
router.get('/profile', isAuthenticated, userController.getUserProfile);
router.put('/profile', isAuthenticated, validateProfileUpdate, userController.updateUserProfile);
router.put('/change-password', isAuthenticated, validateChangePassword, userController.changePassword);
router.get('/doctors', isAuthenticated, isPatient, userController.listDoctors);
router.get('/doctors/all', isAuthenticated, userController.listDoctors);

// Admin routes
router.post('/admin/register-doctor', isAuthenticated, isAdmin, validateDoctorRegistration, userController.registerDoctor);
router.post('/admin/register-admin', isAuthenticated, isAdmin, validateAdminRegistration, userController.registerAdmin);
router.get('/admin/users', isAuthenticated, isAdmin, userController.getAllUsers);
router.put('/admin/users/:id', isAuthenticated, isAdmin, userController.updateUserAccount);
router.delete('/admin/users/:id', isAuthenticated, isAdmin, userController.deleteUserAccount);
router.post('/admin/approve-doctor/:id', isAuthenticated, isAdmin, userController.approveDoctor);

module.exports = router; 