const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = './uploads/announcements';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/announcements');
  },
  filename: (req, file, cb) => {
    const uniqueName = `announcement-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files allowed!'));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;