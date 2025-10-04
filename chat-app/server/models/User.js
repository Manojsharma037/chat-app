// models/User.js (Example - adjust to your actual model)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Assuming you use bcrypt for password hashing

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    email: { // <-- Add this field
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/.+@.+\..+/, 'Please fill a valid email address'], // Basic email validation
    },
    password: {
        type: String,
        required: true,
    },
    // Add any other fields like profile picture, status, etc.
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);