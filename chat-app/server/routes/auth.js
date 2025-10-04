// chat-app/server/routes/auth.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth'); // <-- ADD THIS LINE

// Utility to generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1h', // Token expires in 1 hour
    });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    // Basic validation
    if (!username || !email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // Check if user with email already exists
        let userByEmail = await User.findOne({ email });
        if (userByEmail) {
            return res.status(400).json({ msg: 'User with this email already exists' });
        }

        // Check if user with username already exists
        let userByUsername = await User.findOne({ username });
        if (userByUsername) {
            return res.status(400).json({ msg: 'User with this username already exists' });
        }

        // Create new user
        const user = new User({ username, email, password }); // Password will be hashed by pre-save hook

        await user.save();

        const token = generateToken(user._id);

        // Respond with user data and token
        res.status(201).json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token,
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).json({ msg: 'Please enter all fields' });
    }

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check password
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        const token = generateToken(user._id);

        // Respond with user data and token
        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token,
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});

// @route   GET /api/auth/me
// @desc    Get logged-in user data (based on token)
// @access  Private (requires authentication)
router.get('/me', auth, async (req, res) => { // 'auth' middleware is used here
    try {
        // req.user is set by the auth middleware
        // It already excludes the password
        res.json(req.user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;