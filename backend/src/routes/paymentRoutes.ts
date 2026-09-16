import { Router } from "express";

import {
  createPaymentHandler,
  generatePaymentLinkHandler,
  getManualShipmentPaymentHandler,
  getManualShipmentPaymentSummaryHandler,
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

/* =========================================
   MANUAL SHIPMENT PAYMENT
========================================= */

router.get(
  "/manual-shipment/:shipmentId",
  getManualShipmentPaymentHandler,
);

router.get(
  "/manual-shipment/:shipmentId/summary",
  getManualShipmentPaymentSummaryHandler,
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