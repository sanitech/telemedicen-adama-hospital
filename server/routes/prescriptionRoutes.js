const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { 
  isAuthenticated, 
  isDoctor 
} = require('../middleware/auth');

// Doctor routes
router.post('/create', isAuthenticated, isDoctor, prescriptionController.createPrescription);
router.put('/:id', isAuthenticated, isDoctor, prescriptionController.updatePrescription);
router.post('/appointment/:appointmentId/start-consultation', isAuthenticated, isDoctor, prescriptionController.startConsultation);

// General routes
router.get('/my', isAuthenticated, prescriptionController.getMyPrescriptions);
router.get('/:id', isAuthenticated, prescriptionController.getPrescriptionById);
router.get('/by-appointment/:appointmentId', isAuthenticated, prescriptionController.getPrescriptionByAppointment);

module.exports = router; 