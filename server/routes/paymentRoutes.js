const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { 
  isAuthenticated, 
  isPatient 
} = require('../middleware/auth');

// Get payment methods (public)
router.get('/methods', paymentController.getPaymentMethods);

// Patient routes
router.post('/create', isAuthenticated, isPatient, paymentController.createPayment);
router.get('/my', isAuthenticated, paymentController.getMyPayments);

// General routes
router.get('/:id', isAuthenticated, paymentController.getPaymentById);
router.put('/:id/status', isAuthenticated, paymentController.updatePaymentStatus);

// Get payment by appointment
router.get('/appointment/:appointmentId', isAuthenticated, paymentController.getPaymentByAppointment);

module.exports = router; 