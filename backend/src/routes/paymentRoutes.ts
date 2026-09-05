import { Router } from "express";

import {
  createPaymentHandler,
  generatePaymentLinkHandler,
  getPaymentsByRecapHandler,
  getRecapPaymentSummaryHandler,
  midtransWebhookHandler,
  simulatePaymentSuccessHandler,
} from "../controllers/paymentController.js";

const router =
  Router();

/* =========================================
   MIDTRANS WEBHOOK
========================================= */

/**
 * Endpoint ini dipanggil langsung
 * oleh Midtrans.
 *
 * Tidak menggunakan auth admin.
 */
router.post(
  "/midtrans/webhook",
  midtransWebhookHandler,
);

/* =========================================
   PAYMENT
========================================= */

router.get(
  "/recap/:recapId",
  getRecapPaymentSummaryHandler,
);

router.get(
  "/recap/:recapId/history",
  getPaymentsByRecapHandler,
);

router.post(
  "/",
  createPaymentHandler,
);

router.post(
  "/:id/generate-link",
  generatePaymentLinkHandler,
);

/* =========================================
   DEVELOPMENT ONLY
========================================= */

router.post(
  "/:id/simulate-success",
  simulatePaymentSuccessHandler,
);

export default router;