// app/routes/systemRoutes.js
import express from 'express';
import { getSystemInfo, getDirectoryContents, getPeers } from '../controllers/systemController.js';

const router = express.Router();

// GET /system-info
router.get('/system-info', getSystemInfo);

// GET /directory-contents
router.get('/directory-contents', getDirectoryContents);

// GET /peers
router.get('/peers', getPeers);

export default router;
