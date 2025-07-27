const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const path = require('path');
const connectDB = require('./config/db');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize app
const app = express();

// Rate limiter (basic security)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 100, // max 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false
});

// Slow down repeated requests (to avoid brute force)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (used, req) => {
    const delayAfter = req.slowDown.limit;
    return (used - delayAfter) * 500;
  }
});

// Middleware
app.use(cors({
  origin: 'http://localhost:3000', // frontend URL
  credentials: true
}));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(limiter);
app.use(speedLimiter);

// Serve static files (e.g. avatars)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const residentRoutes = require('./routes/residentRoutes');
const householdRoutes = require('./routes/householdRoutes');
const documentRoutes = require('./routes/documentRoutes');
// Add more route files here (e.g. residentRoutes, announcementRoutes, etc.)

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/residents', residentRoutes);
app.use('/api/households', householdRoutes);
app.use('/api/documents', documentRoutes);


// Root
app.get('/', (req, res) => {
  res.send('📌 Barangay BIMS API is running...');
});

// Error handling fallback
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ message: 'Something went wrong.' });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
