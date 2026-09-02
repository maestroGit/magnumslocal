// app/routes/notificationRoutes.js
import express from 'express';
import { getNotifications, markNotificationsAsRead } from '../controllers/notificationController.js';

const router = express.Router();

// GET /notifications?wineryId=xxx
router.get('/notifications', getNotifications);

// POST /notifications/mark-as-read
router.post('/notifications/mark-as-read', markNotificationsAsRead);

export default router;