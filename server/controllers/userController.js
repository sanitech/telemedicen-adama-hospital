const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { generateToken } = require('../utils/jwt');

// Register new user (only patients can register themselves, doctors must be registered by admin)
const registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, age, gender } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: 'patient', // Only patients can register
      age,
      gender
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Register new doctor
const registerDoctor = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, age, gender, specialty, availability } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create doctor
    const doctor = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: 'doctor',
      age,
      gender,
      specialty,
      availability
    });

    await doctor.save();

    res.status(201).json({
      message: 'Doctor registered successfully',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        role: doctor.role,
        specialty: doctor.specialty
      }
    });
  } catch (error) {
    console.error('Doctor registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Register new admin
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, age, gender } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      role: 'admin',
      age,
      gender
    });

    await admin.save();

    res.status(201).json({
      message: 'Admin registered successfully',
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Admin registration error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Update user account
const updateUserAccount = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, phoneNumber, age, gender, specialty, availability } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (age !== undefined) updateData.age = age;
    if (gender) updateData.gender = gender;
    if (specialty) updateData.specialty = specialty;
    if (availability) updateData.availability = availability;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    console.error('Update user account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Admin: Delete user account
const deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Login user
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const { name, phoneNumber, age, gender, specialty } = req.body;
    const updateData = {};

    if (name) updateData.name = name;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (age) updateData.age = age;
    if (gender) updateData.gender = gender;
    if (specialty && req.user.role === 'doctor') updateData.specialty = specialty;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// List doctors (for patients)
const listDoctors = async (req, res) => {
  try {
    const { specialty } = req.query;
    const filter = { role: 'doctor' };
    
    if (specialty) {
      filter.specialty = { $regex: specialty, $options: 'i' };
    }

    const doctors = await User.find(filter)
      .select('name email phoneNumber specialty availability')
      .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    console.error('List doctors error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve doctor (admin only)
const approveDoctor = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await User.findById(id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found' });
    }

    if (doctor.role !== 'doctor') {
      return res.status(400).json({ message: 'User is not a doctor' });
    }

    // Add approval logic here if needed
    // For now, just return success
    res.json({
      message: 'Doctor approved successfully',
      doctor: {
        id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        specialty: doctor.specialty
      }
    });
  } catch (error) {
    console.error('Approve doctor error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Change password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Find user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    user.password = hashedPassword;
    await user.save();

    res.json({
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  registerUser,
  registerDoctor,
  registerAdmin,
  getAllUsers,
  updateUserAccount,
  deleteUserAccount,
  loginUser,
  getUserProfile,
  updateUserProfile,
  changePassword,
  listDoctors,
  approveDoctor
}; 