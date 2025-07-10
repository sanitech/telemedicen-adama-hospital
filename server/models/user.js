const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Make sure to hash the password before saving!
  phoneNumber: { type: String }, // Phone number for patients and doctors
  role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },
  age: { type: Number },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  specialty: { type: String }, // Only for doctors
  availability: [{ 
    day: String, 
    startTime: String, 
    endTime: String 
  }],
  createdAt: { type: Date, default: Date.now }
});

// Custom validation: specialty and availability only for doctors
userSchema.pre('save', function(next) {
  if (this.role !== 'doctor') {
    this.specialty = undefined;
    this.availability = undefined;
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
