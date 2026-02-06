// app/routes/systemRoutes.js
import express from 'express';
import { getSystemInfo, getDirectoryContents } from '../controllers/systemController.js';

const router = express.Router();

// GET /system-info
router.get('/system-info', getSystemInfo);

// GET /directory-contents
router.get('/directory-contents', getDirectoryContents);

export default router;
