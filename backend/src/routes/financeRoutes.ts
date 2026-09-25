import { Router } from "express";

import {
  getFinanceHandler,
  createFinanceTransactionHandler,
} from "../controllers/financeController.js";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

const router = Router();

/* =========================================
   GET FINANCE DATA
========================================= */

/**
 * GET /api/finance
 *
 * Digunakan oleh halaman:
 * - Gaji Karyawan
 * - Arus Dana / Keuangan
 *
 * Tidak menggunakan finance.view
 * karena halaman Gaji Karyawan tidak
 * menggunakan permission tersebut.
 */
router.get(
  "/",
  authenticate,
  getFinanceHandler,
);

/* =========================================
   CREATE FINANCE TRANSACTION
========================================= */

/**
 * POST /api/finance
 *
 * Membuat transaksi keuangan baru.
 */
router.post(
  "/",
  authenticate,
  requirePermission(
    "finance.create",
  ),
  createFinanceTransactionHandler,
);

export default router;