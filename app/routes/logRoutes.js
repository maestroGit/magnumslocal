// app/routes/logRoutes.js

import express from 'express';
import { buildLogHtml } from '../services/logService.js';

const createLogRouter = (logStore) => {
  const router = express.Router();

  // GET /logs
  router.get('/logs', (req, res) => {
    if (!logStore) {
      return res.status(503).json({ success: false, error: 'Log store not initialized' });
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(buildLogHtml(logStore));
  });

  return router;
};

export default createLogRouter;
