const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  appointmentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Appointment', 
    required: true 
  },
  doctorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  patientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  diagnosis: { 
    type: String, 
    required: true 
  },
  medications: [{
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    frequency: { type: String, required: true },
    duration: { type: String, required: true },
    instructions: { type: String },
    quantity: { type: String }
  }],
  instructions: { 
    type: String 
  },
  followUpDate: { 
    type: Date 
  },
  notes: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['active', 'completed', 'cancelled'], 
    default: 'active' 
  },
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
prescriptionSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Prescription', prescriptionSchema); 