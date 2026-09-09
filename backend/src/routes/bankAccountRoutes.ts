import { Router } from "express";

import {
  listActiveBankAccountsHandler,
} from "../controllers/bankAccountController.js";

import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

/* =========================================
   GET ACTIVE BANK ACCOUNTS
========================================= */

/**
 * GET /api/bank-accounts/active
 *
 * Mengambil seluruh rekening
 * yang aktif untuk digunakan
 * pada dropdown.
 */

router.get(
  "/active",
  authenticate,
  listActiveBankAccountsHandler,
);

export default router;