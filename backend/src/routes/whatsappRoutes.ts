import { Router } from "express";

import {
  sendWhatsAppHandler,
  getWhatsAppPaymentStatusHandler,
} from "../controllers/whatsappController.js";

import { authenticate } from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

const router = Router();

router.post(
  "/send",
  authenticate,
  requirePermission("payments.create"),
  sendWhatsAppHandler,
);

router.get(
  "/status/:payment_id",
  authenticate,
  requirePermission("payments.create"),
  getWhatsAppPaymentStatusHandler,
);

export default router;