import {
  Router,
} from "express";

import {
  processWhatsAppAutomationsHandler,
} from "../controllers/notificationController.js";

const router = Router();

/* =========================================
   PROCESS WHATSAPP AUTOMATIONS
========================================= */

/**
 * GET /api/notifications/process
 *
 * Dipanggil oleh Vercel Cron.
 *
 * Jadwal:
 * 03:00 UTC = 10:00 WIB
 * 15:00 UTC = 22:00 WIB
 */

router.get(
  "/process",
  processWhatsAppAutomationsHandler,
);

export default router;
