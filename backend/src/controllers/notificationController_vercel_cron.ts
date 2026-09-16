import type {
  Request,
  Response,
} from "express";

import {
  processWhatsAppAutomations,
} from "../services/notificationSchedulerService.js";

/* =========================================
   PROCESS WHATSAPP AUTOMATIONS
========================================= */

export async function processWhatsAppAutomationsHandler(
  req: Request,
  res: Response,
) {
  try {
    const cronSecret =
      process.env.CRON_SECRET?.trim();

    const authorization =
      req.headers.authorization;

    if (
      !cronSecret ||
      authorization !==
        `Bearer ${cronSecret}`
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Unauthorized.",
      });
    }

    const result =
      await processWhatsAppAutomations();

    return res.status(200).json({
      success: true,
      message:
        "Automation WhatsApp berhasil diproses.",
      data: result,
    });
  } catch (error) {
    console.error(
      "processWhatsAppAutomationsHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal memproses automation WhatsApp.",
    });
  }
}
