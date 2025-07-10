const Appointment = require('../models/appointment');
const User = require('../models/user');

// Book appointment
const bookAppointment = async (req, res) => {
  try {
    const { doctorId, dateTime, note } = req.body;
    const patientId = req.user._id; 

    console.log(req.body);
    // Check if doctor exists and is a doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    // Check if appointment time is in the future
    const appointmentDate = new Date(dateTime);
    if (appointmentDate <= new Date()) {
      return res.status(400).json({ message: 'Appointment must be in the future' });
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      doctorId,
      dateTime: {
        $gte: new Date(appointmentDate.getTime() - 30 * 60000), // 30 minutes before
        $lte: new Date(appointmentDate.getTime() + 30 * 60000)  // 30 minutes after
      },
      status: { $in: ['pending', 'confirmed'] }
    });

    if (conflictingAppointment) {
      return res.status(400).json({ message: 'Time slot not available' });
    }

    // Create appointment
    const appointment = new Appointment({
      patientId,
      doctorId,
      dateTime: appointmentDate,
      note
    });

    await appointment.save();

    // Populate user details
    await appointment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', select: 'name email specialty' }
    ]);

    res.status(201).json({
      message: 'Appointment booked successfully',
      appointment
    });
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  } 
};

// Get user's appointments
const getMyAppointments = async (req, res) => {
  try {
    const userId = req.user._id;
    const { status, upcoming } = req.query;

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

    // Filter upcoming appointments
    if (upcoming === 'true') {
      filter.dateTime = { $gte: new Date() };
    }

    const appointments = await Appointment.find(filter)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .sort({ dateTime: 1 });

    res.json(appointments);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update appointment status (doctor only)
const updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'confirmed', 'paid', 'consultation', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is the doctor for this appointment
    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    appointment.status = status;
    await appointment.save();

    // Populate user details
    await appointment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', select: 'name email specialty' }
    ]);

    res.json({
      message: 'Appointment status updated successfully',
      appointment
    });
  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get appointment by ID
const getAppointmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const appointment = await Appointment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is authorized to view this appointment
    const isAuthorized = 
      appointment.patientId._id.toString() === userId.toString() ||
      appointment.doctorId._id.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(appointment);
  } catch (error) {
    console.error('Get appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  bookAppointment,
  getMyAppointments,
  updateAppointmentStatus,
  getAppointmentById
}; 