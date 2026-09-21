import { Router } from "express";

import {
  sendWhatsAppHandler,
  getWhatsAppPaymentStatusHandler,
} from "../controllers/whatsappController.js";

const router = Router();

router.post(
  "/send",
  sendWhatsAppHandler,
);

router.get(
  "/status/:payment_id",
  getWhatsAppPaymentStatusHandler,
);

export default router;
