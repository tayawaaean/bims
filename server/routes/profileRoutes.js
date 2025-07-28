const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadLogo'); // Multer config
const ctrl = require('../controllers/barangayProfileController');

router.get('/', ctrl.getProfile);
router.put('/', protect, adminOnly, ctrl.updateProfile);
router.post('/logo', protect, adminOnly, upload.single('logo'), ctrl.uploadLogo);

module.exports = router;