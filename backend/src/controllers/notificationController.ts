import type { Request, Response } from "express";
import crypto from "node:crypto";

import {
  processWhatsAppAutomations,
} from "../services/notificationSchedulerService.js";

import {
  getNotificationLogs,
  retryNotificationLog,
  type NotificationLogFilter,
} from "../services/notificationService.js";

/* =========================================
   VERIFY VERCEL CRON
========================================= */

function isValidCronRequest(
  req: Request,
): boolean {
  const cronSecret =
    process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    console.error(
      "CRON_SECRET is not configured.",
    );

    return false;
  }

  const authorization =
    req.headers.authorization;

  if (
    typeof authorization !== "string" ||
    !authorization.startsWith("Bearer ")
  ) {
    return false;
  }

  const providedToken =
    authorization.slice("Bearer ".length).trim();

  if (!providedToken) {
    return false;
  }

  const expectedBuffer =
    Buffer.from(cronSecret, "utf8");

  const providedBuffer =
    Buffer.from(providedToken, "utf8");

  if (
    expectedBuffer.length !==
    providedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    providedBuffer,
  );
}

/* =========================================
   PROCESS WHATSAPP AUTOMATIONS
========================================= */

export async function processWhatsAppAutomationsHandler(
  req: Request,
  res: Response,
) {
  if (!isValidCronRequest(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized.",
    });
  }

  try {
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

/* =========================================
   GET NOTIFICATION LOGS
========================================= */

export async function getNotificationLogsHandler(
  req: Request,
  res: Response,
) {
  try {
    const page = Number(
      req.query.page ?? 1,
    );

    const limit = Number(
      req.query.limit ?? 10,
    );

    const notificationType =
      typeof req.query.notification_type ===
        "string" &&
      (
        req.query.notification_type ===
          "RECAP_PAYMENT" ||
        req.query.notification_type ===
          "DUE_DATE_REMINDER"
      )
        ? req.query.notification_type
        : undefined;

    const status =
      typeof req.query.status ===
        "string" &&
      [
        "scheduled",
        "sent",
        "failed",
        "skipped",
      ].includes(req.query.status)
        ? (req.query.status as NotificationLogFilter["status"])
        : undefined;

    const filters: NotificationLogFilter = {
      page:
        Number.isFinite(page)
          ? page
          : 1,
      limit:
        Number.isFinite(limit)
          ? limit
          : 10,
      dateFrom:
        typeof req.query.date_from ===
          "string"
          ? req.query.date_from
          : undefined,
      dateTo:
        typeof req.query.date_to ===
          "string"
          ? req.query.date_to
          : undefined,
      notificationType,
      status,
      buyer:
        typeof req.query.buyer ===
          "string"
          ? req.query.buyer
          : undefined,
    };

    const data =
      await getNotificationLogs(
        filters,
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getNotificationLogsHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil notification log.",
    });
  }
}

/* =========================================
   GET NOTIFICATION LOG SUMMARY
========================================= */

export async function getNotificationLogSummaryHandler(
  req: Request,
  res: Response,
) {
  try {
    const notificationType =
      typeof req.query.notification_type ===
        "string" &&
      (
        req.query.notification_type ===
          "RECAP_PAYMENT" ||
        req.query.notification_type ===
          "DUE_DATE_REMINDER"
      )
        ? req.query.notification_type
        : undefined;

    const status =
      typeof req.query.status ===
        "string" &&
      [
        "scheduled",
        "sent",
        "failed",
        "skipped",
      ].includes(req.query.status)
        ? (req.query.status as NotificationLogFilter["status"])
        : undefined;

    const filters: NotificationLogFilter = {
      page: 1,
      limit: 1,
      dateFrom:
        typeof req.query.date_from ===
          "string"
          ? req.query.date_from
          : undefined,
      dateTo:
        typeof req.query.date_to ===
          "string"
          ? req.query.date_to
          : undefined,
      notificationType,
      status,
      buyer:
        typeof req.query.buyer ===
          "string"
          ? req.query.buyer
          : undefined,
    };

    const result =
      await getNotificationLogs(
        filters,
      );

    return res.status(200).json({
      success: true,
      data: result.summary,
    });
  } catch (error) {
    console.error(
      "getNotificationLogSummaryHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil summary notification log.",
    });
  }
}

/* =========================================
   RETRY FAILED NOTIFICATION
========================================= */

export async function retryNotificationLogHandler(
  req: Request,
  res: Response,
) {
  try {
    const id =
      Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

    if (!id?.trim()) {
      return res.status(400).json({
        success: false,
        message:
          "ID notification log wajib diisi.",
      });
    }

    const data =
      await retryNotificationLog(
        id.trim(),
      );

    return res.status(200).json({
      success: data.status === "sent",
      data,
      message:
        data.status === "sent"
          ? "WhatsApp berhasil dikirim ulang."
          : "WhatsApp gagal dikirim ulang.",
    });
  } catch (error) {
    console.error(
      "retryNotificationLogHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengirim ulang WhatsApp.";

    const statusCode =
      message ===
      "Notification log tidak ditemukan."
        ? 404
        : message ===
            "Notification hanya dapat dikirim ulang ketika statusnya failed."
          ? 400
          : 500;

    return res.status(statusCode).json({
      success: false,
      message,
    });
  }
}