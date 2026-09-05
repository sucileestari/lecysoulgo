import type { Request, Response } from "express";

import {
  createPayment,
  generatePaymentLink,
  getPaymentsByRecapId,
  getRecapPaymentSummary,
  handleMidtransNotification,
  simulatePaymentSuccess,
} from "../services/paymentService.js";

import type { MidtransNotification } from "../services/midtransService.js";

/* =========================================
   GET PAYMENT SUMMARY
========================================= */

export async function getRecapPaymentSummaryHandler(
  req: Request,
  res: Response,
) {
  try {
    const recapIdParam =
      req.params.recapId;

    if (
      typeof recapIdParam !==
        "string" ||
      !recapIdParam.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID rekapan wajib diisi.",
      });
    }

    const data =
      await getRecapPaymentSummary(
        recapIdParam.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getRecapPaymentSummaryHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil summary pembayaran.",
    });
  }
}

/* =========================================
   GET PAYMENT HISTORY
========================================= */

export async function getPaymentsByRecapHandler(
  req: Request,
  res: Response,
) {
  try {
    const recapIdParam =
      req.params.recapId;

    if (
      typeof recapIdParam !==
        "string" ||
      !recapIdParam.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID rekapan wajib diisi.",
      });
    }

    const data =
      await getPaymentsByRecapId(
        recapIdParam.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getPaymentsByRecapHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil riwayat pembayaran.",
    });
  }
}

/* =========================================
   CREATE PAYMENT
========================================= */

export async function createPaymentHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      recap_id,
      payment_type,
    } = req.body;

    if (
      typeof recap_id !==
        "string" ||
      !recap_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID rekapan wajib diisi.",
      });
    }

    if (
      payment_type !== "DP" &&
      payment_type !==
        "PELUNASAN"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tipe pembayaran tidak valid.",
      });
    }

    const data =
      await createPayment({
        recap_id:
          recap_id.trim(),
        payment_type,
      });

    return res.status(201).json({
      success: true,
      data,
      message:
        "Pembayaran berhasil dibuat.",
    });
  } catch (error) {
    console.error(
      "createPaymentHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal membuat pembayaran.";

    const lowerMessage =
      message.toLowerCase();

    if (
      lowerMessage.includes(
        "sudah dibayar",
      ) ||
      lowerMessage.includes(
        "harus dibayar terlebih dahulu",
      ) ||
      lowerMessage.includes(
        "tidak valid",
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   GENERATE MIDTRANS PAYMENT LINK
========================================= */

export async function generatePaymentLinkHandler(
  req: Request,
  res: Response,
) {
  try {
    const idParam =
      req.params.id;

    if (
      typeof idParam !==
        "string" ||
      !idParam.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID pembayaran wajib diisi.",
      });
    }

    const data =
      await generatePaymentLink(
        idParam.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
      message:
        "Payment Link Midtrans berhasil dibuat.",
    });
  } catch (error) {
    console.error(
      "generatePaymentLinkHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal membuat Payment Link Midtrans.";

    const lowerMessage =
      message.toLowerCase();

    if (
      lowerMessage.includes(
        "tidak ditemukan",
      ) ||
      lowerMessage.includes(
        "sudah lunas",
      ) ||
      lowerMessage.includes(
        "sudah dibayar",
      ) ||
      lowerMessage.includes(
        "sudah dibatalkan",
      ) ||
      lowerMessage.includes(
        "wajib diisi",
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   MIDTRANS WEBHOOK
========================================= */

export async function midtransWebhookHandler(
  req: Request,
  res: Response,
) {
  try {
    const notification =
      req.body as MidtransNotification;

    console.log(
      "Midtrans webhook received:",
      {
        order_id:
          notification?.order_id,
        transaction_status:
          notification?.transaction_status,
        transaction_id:
          notification?.transaction_id,
      },
    );

    const payment =
      await handleMidtransNotification(
        notification,
      );

    /**
     * Midtrans cukup menerima HTTP 200.
     *
     * Tidak perlu mengembalikan seluruh
     * data payment ke Midtrans.
     */
    return res.status(200).json({
      success: true,
      message:
        "Midtrans notification berhasil diproses.",
      data: {
        payment_id:
          payment.id,
        status:
          payment.status,
      },
    });
  } catch (error) {
    console.error(
      "midtransWebhookHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal memproses notification Midtrans.";

    /**
     * Signature invalid / payload invalid
     * = 400
     */
    if (
      message.toLowerCase().includes(
        "signature",
      ) ||
      message.toLowerCase().includes(
        "order_id",
      ) ||
      message.toLowerCase().includes(
        "gross_amount",
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /**
     * Payment/order tidak ditemukan.
     *
     * Tetap return 400 karena notification
     * tersebut tidak dapat diproses.
     */
    if (
      message.toLowerCase().includes(
        "tidak ditemukan",
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   SIMULATE PAYMENT SUCCESS
========================================= */

export async function simulatePaymentSuccessHandler(
  req: Request,
  res: Response,
) {
  try {
    const idParam =
      req.params.id;

    if (
      typeof idParam !==
        "string" ||
      !idParam.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID pembayaran wajib diisi.",
      });
    }

    const data =
      await simulatePaymentSuccess(
        idParam.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
      message:
        "Pembayaran berhasil disimulasikan sebagai paid.",
    });
  } catch (error) {
    console.error(
      "simulatePaymentSuccessHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mensimulasikan pembayaran.",
    });
  }
}