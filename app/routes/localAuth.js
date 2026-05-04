import express from 'express';
import {
  postLocalForgotPassword,
  postLocalResetPassword
} from '../controllers/localAuthController.js';

const router = express.Router();

router.post('/forgot-password', postLocalForgotPassword);
router.post('/reset-password', postLocalResetPassword);

export default router;
