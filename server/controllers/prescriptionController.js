const Prescription = require('../models/prescription');
const Appointment = require('../models/appointment');
const User = require('../models/user');

// Create prescription
const createPrescription = async (req, res) => {
  try {
    const { appointmentId, diagnosis, medications, instructions, followUpDate, notes } = req.body;
    const doctorId = req.user._id;

    // Check if appointment exists and belongs to the doctor
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.doctorId.toString() !== doctorId.toString()) {
      return res.status(403).json({ message: 'Not authorized to create prescription for this appointment' });
    }

    if (appointment.status !== 'consultation') {
      return res.status(400).json({ message: 'Appointment must be in consultation status' });
    }

    // Check if prescription already exists
    const existingPrescription = await Prescription.findOne({ appointmentId });
    if (existingPrescription) {
      return res.status(400).json({ message: 'Prescription already exists for this appointment' });
    }

    // Create prescription
    const prescription = new Prescription({
      appointmentId,
      doctorId,
      patientId: appointment.patientId,
      diagnosis,
      medications,
      instructions,
      followUpDate: followUpDate ? new Date(followUpDate) : null,
      notes
    });

    await prescription.save();

    // Populate prescription details
    await prescription.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', select: 'name email specialty' },
      { path: 'appointmentId' }
    ]);

    res.status(201).json({
      message: 'Prescription created successfully',
      prescription
    });
  } catch (error) {
    console.error('Create prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get prescription by ID
const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const prescription = await Prescription.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .populate('appointmentId');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check if user is authorized to view this prescription
    const isAuthorized = 
      prescription.patientId._id.toString() === userId.toString() ||
      prescription.doctorId._id.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(prescription);
  } catch (error) {
    console.error('Get prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's prescriptions
const getMyPrescriptions = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status } = req.query;

    let filter = {};
    
    // Filter by user role
    if (req.user.role === 'patient') {
      filter.patientId = userId;
    } else if (req.user.role === 'doctor') {
      filter.doctorId = userId;
    }

    // Filter by status
    if (status) {
      filter.status = status;
    }

    const prescriptions = await Prescription.find(filter)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .populate('appointmentId')
      .sort({ createdAt: -1 });

    res.json(prescriptions);
  } catch (error) {
    console.error('Get prescriptions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update prescription
const updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { diagnosis, medications, instructions, followUpDate, notes, status } = req.body;
    const userId = req.user._id;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }

    // Check if user is authorized to update this prescription
    const isAuthorized = 
      prescription.doctorId.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update prescription fields
    if (diagnosis) prescription.diagnosis = diagnosis;
    if (medications) prescription.medications = medications;
    if (instructions) prescription.instructions = instructions;
    if (followUpDate) prescription.followUpDate = new Date(followUpDate);
    if (notes) prescription.notes = notes;
    if (status) prescription.status = status;

    await prescription.save();

    // Populate prescription details
    await prescription.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', select: 'name email specialty' },
      { path: 'appointmentId' }
    ]);

    res.json({
      message: 'Prescription updated successfully',
      prescription
    });
  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Start consultation (update appointment status)
const startConsultation = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is the doctor for this appointment
    if (appointment.doctorId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (appointment.status !== 'paid') {
      return res.status(400).json({ message: 'Appointment must be paid before starting consultation' });
    }

    appointment.status = 'consultation';
    await appointment.save();

    // Populate appointment details
    await appointment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', select: 'name email specialty' }
    ]);

    res.json({
      message: 'Consultation started successfully',
      appointment
    });
  } catch (error) {
    console.error('Start consultation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get prescription by appointmentId
const getPrescriptionByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const prescription = await Prescription.findOne({ appointmentId })
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .populate('appointmentId');
    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found' });
    }
    // Only allow patient, doctor, or admin to view
    const userId = req.user._id;
    if (
      prescription.patientId._id.toString() !== userId.toString() &&
      prescription.doctorId._id.toString() !== userId.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(prescription);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPrescription,
  getPrescriptionById,
  getMyPrescriptions,
  updatePrescription,
  startConsultation,
  getPrescriptionByAppointment,
}; 