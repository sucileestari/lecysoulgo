import {
  Router,
} from "express";

import {
  getNotificationLogsHandler,
  getNotificationLogSummaryHandler,
  processWhatsAppAutomationsHandler,
  retryNotificationLogHandler,
} from "../controllers/notificationController.js";

import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

/* =========================================
   GET NOTIFICATION LOGS
========================================= */

router.get(
  "/logs",
  authenticate,
  getNotificationLogsHandler,
);

/* =========================================
   GET NOTIFICATION LOG SUMMARY
========================================= */

router.get(
  "/logs/summary",
  authenticate,
  getNotificationLogSummaryHandler,
);

/* =========================================
   RETRY FAILED NOTIFICATION
========================================= */

router.post(
  "/logs/:id/retry",
  authenticate,
  retryNotificationLogHandler,
);

/* =========================================
   PROCESS WHATSAPP AUTOMATIONS
========================================= */

/**
 * GET /api/notifications/process
 *
 * Dipanggil oleh Vercel Cron
 * untuk memproses automation WhatsApp.
 */

router.get(
  "/process",
  processWhatsAppAutomationsHandler,
);

export default router;
