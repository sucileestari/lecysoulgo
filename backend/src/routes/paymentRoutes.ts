import { Router } from "express";

import {
  createPaymentHandler,
  generatePaymentLinkHandler,
  getManualShipmentPaymentHandler,
  getManualShipmentPaymentSummaryHandler,
  getPaymentsByRecapHandler,
  getRecapPaymentSummaryHandler,
  midtransWebhookHandler,
} from "../controllers/paymentController.js";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

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
  authenticate,
  getRecapPaymentSummaryHandler,
);

router.get(
  "/recap/:recapId/history",
  authenticate,
  getPaymentsByRecapHandler,
);

/* =========================================
   MANUAL SHIPMENT PAYMENT
========================================= */

router.get(
  "/manual-shipment/:shipmentId",
  authenticate,
  getManualShipmentPaymentHandler,
);

router.get(
  "/manual-shipment/:shipmentId/summary",
  authenticate,
  getManualShipmentPaymentSummaryHandler,
);

/* =========================================
   CREATE PAYMENT
========================================= */

router.post(
  "/",
  authenticate,
  requirePermission("payments.create"),
  createPaymentHandler,
);

/* =========================================
   GENERATE MIDTRANS PAYMENT LINK
========================================= */

router.post(
  "/:id/generate-link",
  authenticate,
  requirePermission("payments.create"),
  generatePaymentLinkHandler,
);

export default router;