// app/routes/adminRoutes.js
import express from 'express';
import { getSystemInfo } from '../controllers/adminController.js';

const router = express.Router();

// GET /admin/system-info
router.get('/system-info', getSystemInfo);
// GET /admin/systemInfo
router.get('/systemInfo', getSystemInfo);
// GET /admin/directory-contents (placeholder, implement as needed)
router.get('/directory-contents', async (req, res) => {
  res.status(501).json({ success: false, error: 'Not implemented' });
});

export default router;
