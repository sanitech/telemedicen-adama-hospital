const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const { 
  isAuthenticated, 
  isPatient, 
  isDoctor 
} = require('../middleware/auth');
const { validateAppointment } = require('../middleware/validation');

// Patient routes
router.post('/book', isAuthenticated, isPatient, appointmentController.bookAppointment);

// General routes (for both patients and doctors)
router.get('/my', isAuthenticated, appointmentController.getMyAppointments);
router.get('/:id', isAuthenticated, appointmentController.getAppointmentById);

// Doctor routes
router.put('/:id', isAuthenticated, isDoctor, appointmentController.updateAppointmentStatus);

module.exports = router; 