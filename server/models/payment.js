const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true 
  },
  currency: { 
    type: String, 
    default: 'ETB' 
  },
  paymentMethod: { 
    type: String, 
    enum: ['telebirr', 'cbe_birr', 'dashen_bank', 'awash_bank', 'bank_of_abyssinia', 'united_bank', 'lion_bank', 'cooperative_bank', 'nib_bank', 'wegagen_bank'], 
    required: true 
  },
  transactionId: { 
    type: String, 
    required: true, 
    unique: true 
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed', 'cancelled'], 
    default: 'pending' 
  },
  paymentDetails: {
    phoneNumber: String,
    accountNumber: String,
    bankName: String,
    referenceNumber: String,
  },
  notes: String,
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update the updatedAt field before saving
paymentSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Payment', paymentSchema); 