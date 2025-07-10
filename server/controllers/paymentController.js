const Payment = require('../models/payment');
const Appointment = require('../models/appointment');
const User = require('../models/user');

// Generate unique transaction ID
const generateTransactionId = () => {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TXN${timestamp}${random}`;
};

// Create payment for appointment
const createPayment = async (req, res) => {
  try {
    const { appointmentId, paymentMethod, paymentDetails } = req.body;
    const patientId = req.user._id;

    // Check if appointment exists and belongs to the patient
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctorId', 'name email specialty');
    
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== patientId.toString()) {
      return res.status(403).json({ message: 'Not authorized to pay for this appointment' });
    }

    if (appointment.status !== 'confirmed') {
      return res.status(400).json({ message: 'Appointment must be confirmed before payment' });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ appointmentId });
    if (existingPayment) {
      // If payment exists and is completed, don't allow new payment
      if (existingPayment.status === 'completed') {
        return res.status(400).json({ message: 'Payment already completed for this appointment' });
      }
      
      // If payment exists and is pending, don't allow new payment
      if (existingPayment.status === 'pending') {
        return res.status(400).json({ message: 'Payment already exists for this appointment' });
      }
      
      // If payment is failed or cancelled, allow creating a new one
      if (existingPayment.status === 'failed' || existingPayment.status === 'cancelled') {
        // Update the existing payment instead of creating a new one
        existingPayment.paymentMethod = paymentMethod;
        existingPayment.paymentDetails = paymentDetails;
        existingPayment.transactionId = generateTransactionId();
        existingPayment.status = 'pending';
        existingPayment.notes = '';
        existingPayment.updatedAt = new Date();
        
        await existingPayment.save();
        
        // Populate payment details
        await existingPayment.populate([
          { path: 'patientId', select: 'name email' },
          { path: 'doctorId', select: 'name email specialty' },
          { path: 'appointmentId' }
        ]);

        res.status(200).json({
          message: 'Payment updated successfully',
          payment: existingPayment
        });
        return;
      }
    }

    // Calculate payment amount (you can customize this based on doctor specialty, etc.)
    const baseAmount = 500; // Base consultation fee in ETB
    const amount = baseAmount;

    // Create payment
    const payment = new Payment({
      appointmentId,
      patientId,
      doctorId: appointment.doctorId._id,
      amount,
      paymentMethod,
      transactionId: generateTransactionId(),
      paymentDetails,
      status: 'pending'
    });

    await payment.save();

    // Populate payment details
    await payment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', select: 'name email specialty' },
      { path: 'appointmentId' }
    ]);

    res.status(201).json({
      message: 'Payment created successfully',
      payment
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment by ID
const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const payment = await Payment.findById(id)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .populate('appointmentId');

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user is authorized to view this payment
    const isAuthorized = 
      payment.patientId._id.toString() === userId.toString() ||
      payment.doctorId._id.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's payments
const getMyPayments = async (req, res) => {
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

    const payments = await Payment.find(filter)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .populate('appointmentId')
      .sort({ createdAt: -1 });

    res.json(payments);
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update payment status (simulate payment processing)
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!['pending', 'completed', 'failed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }

    // Check if user is authorized to update this payment
    const isAuthorized = 
      payment.patientId.toString() === req.user._id.toString() ||
      payment.doctorId.toString() === req.user._id.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    payment.status = status;
    if (notes) {
      payment.notes = notes;
    }

    await payment.save();

    // If payment is completed, update appointment status to 'paid'
    if (status === 'completed') {
      await Appointment.findByIdAndUpdate(payment.appointmentId, { 
        status: 'paid' 
      });
    }

    // Populate payment details
    await payment.populate([
      { path: 'patientId', select: 'name email' },
      { path: 'doctorId', select: 'name email specialty' },
      { path: 'appointmentId' }
    ]);

    res.json({
      message: 'Payment status updated successfully',
      payment
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment methods
const getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = [
      {
        id: 'telebirr',
        name: 'Telebirr',
        description: 'Ethio Telecom Mobile Money',
        icon: '📱',
        instructions: 'Send money to 0912345678'
      },
      {
        id: 'cbe_birr',
        name: 'CBE Birr',
        description: 'Commercial Bank of Ethiopia',
        icon: '🏦',
        instructions: 'Transfer to account: 1000123456789'
      },
      {
        id: 'dashen_bank',
        name: 'Dashen Bank',
        description: 'Dashen Bank Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 1234567890'
      },
      {
        id: 'awash_bank',
        name: 'Awash Bank',
        description: 'Awash Bank Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 0987654321'
      },
      {
        id: 'bank_of_abyssinia',
        name: 'Bank of Abyssinia',
        description: 'Bank of Abyssinia Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 1122334455'
      },
      {
        id: 'united_bank',
        name: 'United Bank',
        description: 'United Bank Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 5566778899'
      },
      {
        id: 'lion_bank',
        name: 'Lion Bank',
        description: 'Lion Bank Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 6677889900'
      },
      {
        id: 'cooperative_bank',
        name: 'Cooperative Bank',
        description: 'Cooperative Bank Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 7788990011'
      },
      {
        id: 'nib_bank',
        name: 'NIB Bank',
        description: 'NIB Bank Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 8899001122'
      },
      {
        id: 'wegagen_bank',
        name: 'Wegagen Bank',
        description: 'Wegagen Bank Transfer',
        icon: '🏦',
        instructions: 'Transfer to account: 9900112233'
      }
    ];

    res.json(paymentMethods);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get payment status for appointment
const getPaymentByAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const userId = req.user._id;

    // Check if appointment exists and user is authorized
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Check if user is authorized to view this appointment's payment
    const isAuthorized = 
      appointment.patientId.toString() === userId.toString() ||
      appointment.doctorId.toString() === userId.toString() ||
      req.user.role === 'admin';

    if (!isAuthorized) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const payment = await Payment.findOne({ appointmentId })
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email specialty')
      .populate('appointmentId');

    if (!payment) {
      return res.status(404).json({ message: 'No payment found for this appointment' });
    }

    res.json(payment);
  } catch (error) {
    console.error('Get payment by appointment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createPayment,
  getPaymentById,
  getMyPayments,
  updatePaymentStatus,
  getPaymentMethods,
  getPaymentByAppointment
}; 