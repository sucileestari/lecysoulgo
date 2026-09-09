import { Router } from "express";

import {
  getFinanceHandler,
  createFinanceTransactionHandler,
} from "../controllers/financeController.js";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

const router = Router();

/* =========================================
   GET FINANCE DATA
========================================= */

router.get(
  "/",
  authenticate,
  getFinanceHandler,
);

/* =========================================
   CREATE FINANCE TRANSACTION
========================================= */

router.post(
  "/",
  authenticate,
  createFinanceTransactionHandler,
);

export default router;