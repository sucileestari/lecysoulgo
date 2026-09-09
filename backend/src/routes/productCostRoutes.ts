import { Router } from "express";

import {
  createProductCostHandler,
  deleteProductCostHandler,
  listProductCosts,
  showProductCostByBatch,
  updateProductCostHandler,
} from "../controllers/productCostController.js";

const router = Router();

/* =========================================
   GET ALL PRODUCT COSTS
========================================= */

/**
 * GET /api/product-costs
 *
 * Mengambil seluruh data modal penjualan.
 */
router.get(
  "/",
  listProductCosts,
);

/* =========================================
   GET PRODUCT COST BY BATCH
========================================= */

/**
 * GET /api/product-costs/batch/:batchId
 *
 * Mengambil data modal berdasarkan
 * satu batch.
 */
router.get(
  "/batch/:batchId",
  showProductCostByBatch,
);

/* =========================================
   CREATE PRODUCT COST
========================================= */

/**
 * POST /api/product-costs
 *
 * Body:
 * {
 *   batch_id: string,
 *   total_modal: number,
 *   qty: number
 * }
 */
router.post(
  "/",
  createProductCostHandler,
);

/* =========================================
   UPDATE PRODUCT COST
========================================= */

/**
 * PUT /api/product-costs/:id
 *
 * Body:
 * {
 *   total_modal: number,
 *   qty: number
 * }
 */
router.put(
  "/:id",
  updateProductCostHandler,
);

/* =========================================
   DELETE PRODUCT COST
========================================= */

/**
 * DELETE /api/product-costs/:id
 */
router.delete(
  "/:id",
  deleteProductCostHandler,
);

export default router;