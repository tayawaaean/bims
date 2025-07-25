const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory if not exists
const dir = './uploads/residents';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/residents');
  },
  filename: (req, file, cb) => {
    const uniqueName = `avatar-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter (images only)
const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .png, .jpg and .jpeg format allowed!'));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;
