import { Router } from "express";

import {
  getNotificationLogsHandler,
  getNotificationLogSummaryHandler,
  processWhatsAppAutomationsHandler,
  retryNotificationLogHandler,
} from "../controllers/notificationController.js";

import { authenticate } from "../middleware/authMiddleware.js";

import { requirePermission } from "../middleware/permissionMiddleware.js";

const router = Router();

/* =========================================
   GET NOTIFICATION LOGS
========================================= */

router.get(
  "/logs",
  authenticate,
  requirePermission("notification_log.view"),
  getNotificationLogsHandler,
);

/* =========================================
   GET NOTIFICATION LOG SUMMARY
========================================= */

router.get(
  "/logs/summary",
  authenticate,
  requirePermission("notification_log.view"),
  getNotificationLogSummaryHandler,
);

/* =========================================
   RETRY FAILED NOTIFICATION
========================================= */

router.post(
  "/logs/:id/retry",
  authenticate,
  requirePermission("notification_log.manage"),
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
 *
 * Endpoint ini tidak menggunakan authenticate()
 * karena dipanggil oleh cron, bukan user session.
 *
 * IMPORTANT:
 * Endpoint harus tetap melakukan validasi khusus
 * untuk memastikan request benar-benar berasal
 * dari Vercel Cron / trusted scheduler.
 */

router.get(
  "/process",
  processWhatsAppAutomationsHandler,
);

export default router;