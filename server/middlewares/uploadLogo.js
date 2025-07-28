const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/logos/');
  },
  filename: function (req, file, cb) {
    // Example: logo-20250728-123456.png
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type, only images allowed!'), false);
  }
};

const upload = multer({ storage, fileFilter });

module.exports = upload;