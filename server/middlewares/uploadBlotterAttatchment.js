const multer = require('multer');
const path = require('path');
const fs = require('fs');

const dir = './uploads/blotters';
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/blotters');
  },
  filename: (req, file, cb) => {
    const uniqueName = `blotter-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only .png, .jpg, .jpeg, and .pdf files allowed!'));
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;