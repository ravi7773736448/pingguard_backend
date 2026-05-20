import { Router } from 'express';
import { register, login, logout, getCurrentUser, googleCallback, forgotPassword, resetPassword, updateProfile, changePassword, uploadProfileImage } from '../controllers/auth.controller.js';
import { registerValidator, loginValidator } from '../validators/auth.validator.js';
import { handleValidationErrors } from '../utils/validation-error-handler.js';
import { authenticate } from '../middleware/auth.middleware.js';
import passport from 'passport';
import multer from 'multer';

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/
    const extname = allowedTypes.test(file.originalname.toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error('Only image files are allowed!'))
  }
})

const router = Router();

router.post('/register', registerValidator, handleValidationErrors, register);

router.post('/login', loginValidator, handleValidationErrors, login);

router.post('/forgot-password', forgotPassword);

router.post('/reset-password', resetPassword);

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' }));

router.get("/google/callback",
    passport.authenticate("google",{session:false,failureRedirect: "https://pingguard-frontend.vercel.app/login?error=auth_failed"}),
    googleCallback
)

router.post('/logout', logout);

router.get('/me', authenticate, getCurrentUser);

router.put('/profile', authenticate, updateProfile);

router.put('/change-password', authenticate, changePassword);

router.post('/upload-avatar', authenticate, upload.single('avatar'), uploadProfileImage);

export default router;