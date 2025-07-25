const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser
} = require('../controllers/authController');

const {
  registerValidationRules,
  validateRegister
} = require('../middlewares/validateRegister');

router.post('/register', registerValidationRules, validateRegister, registerUser);
router.post('/login', loginUser);
router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

module.exports = router;
