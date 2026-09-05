import { Router } from "express";
import { sendWhatsAppHandler } from "../controllers/whatsappController.js";

const router = Router();

router.post("/send", sendWhatsAppHandler);

export default router;