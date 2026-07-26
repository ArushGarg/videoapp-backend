const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');


const router = express.Router();


const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
};


router.post('/register', async (req, res) => {
  try {

    const { username, email, password } = req.body;


    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }


    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ message: 'Email already in use' });
    }


    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({ message: 'Username already taken' });
    }


    const hashedPassword = await bcrypt.hash(password, 12);


    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Return the user data and a token
    res.status(201).json({
      message: 'Account created successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare entered password with stored hashed password
    // bcrypt.compare() returns true if they match
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Update online status
    user.isOnline = true;
    await user.save();

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
      },
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

const { protect } = require('../middleware/auth');

router.get('/me', protect, async (req, res) => {
  // req.user is set by our protect middleware
  res.json({ user: req.user });
});

module.exports = router;