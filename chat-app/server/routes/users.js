// chat-app/server/routes/users.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth'); // If you implement auth middleware
// This is a test comment line. Please delete me later.

// @route   GET /api/users
// @desc    Get all users (contacts)
// @access  Private (if using auth middleware)
router.get('/', auth, async (req, res) => {
    try {
        // Find all users except the currently authenticated one (req.user._id)
        const users = await User.find({ _id: { $ne: req.user._id } }).select('-password'); // Exclude password
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;