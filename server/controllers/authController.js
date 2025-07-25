const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const auditLog = require('../utils/auditLogger'); // ✅ import audit logger

// Helper: Generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Helper: Create access token
const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m'
  });
};

// Helper: Create refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || '7d'
  });
};

// Register New User
exports.registerUser = async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Check for duplicate username or email
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      logger.warn(`Duplicate username attempt: ${username}`);
      return res.status(409).json({
        message: 'Username already exists',
        field: 'username'
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      logger.warn(`Duplicate email attempt: ${email}`);
      return res.status(409).json({
        message: 'Email already exists',
        field: 'email'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const user = new User({
      name,
      username,
      email,
      password: hashedPassword,
      role
    });

    await user.save();

    logger.info(`📝 User registered and pending approval: ${email} (${role})`);
    await auditLog(user._id, 'User Registration', `Registered as ${role}, pending approval`);

    res.status(201).json({
      message: 'Registration successful. Pending admin approval.',
      approvalStatus: user.isApproved
    });

  } catch (error) {
    logger.error(`❌ Registration error: ${error.message}`);
    res.status(500).json({ message: 'Server error during registration.' });
  }
};

// 🔐 Login
exports.loginUser = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }]
    });

    if (!user) {
      logger.warn(`Login failed: No user ${identifier}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isApproved) {
      return res.status(403).json({ message: 'Account not yet approved' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn(`Invalid login for ${user.email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    logger.info(`✅ ${user.email} logged in`);
    await auditLog(user._id, 'User Login', `Logged in with ${identifier}`);

    // Set HTTP-only cookie with refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    res.status(500).json({ message: 'Login failed' });
  }
};

// 🔁 Refresh Token
exports.refreshToken = (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) return res.status(401).json({ message: 'No refresh token' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    const accessToken = generateAccessToken(decoded.id);

    auditLog(decoded.id, 'Refresh Token', 'Issued new access token'); // ✅ log refresh

    return res.status(200).json({ accessToken });
  } catch (err) {
    return res.status(403).json({ message: 'Invalid refresh token' });
  }
};

// 🚪 Logout
exports.logoutUser = (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  res.clearCookie('refreshToken');

  // Try to decode the token to log user logout (optional)
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    auditLog(decoded.id, 'Logout', 'User logged out');
  } catch (e) {
    // Skip logging if token is missing or invalid
  }

  res.status(200).json({ message: 'Logged out successfully' });
};
