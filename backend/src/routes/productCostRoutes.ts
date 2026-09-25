import { Router } from "express";

import {
  createProductCostHandler,
  deleteProductCostHandler,
  listProductCosts,
  showProductCostByBatch,
  updateProductCostHandler,
} from "../controllers/productCostController.js";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

const router = Router();

/* =========================================
   ALL ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET ALL PRODUCT COSTS
   GET /api/product-costs
========================================= */

/**
 * GET /api/product-costs
 *
 * Mengambil seluruh data modal penjualan.
 *
 * Hanya membutuhkan login.
 * Tidak menggunakan modal.view karena
 * data ini dibutuhkan oleh halaman Gaji Karyawan
 * yang tidak memiliki permission khusus.
 */
router.get(
  "/",
  listProductCosts,
);

/* =========================================
   GET PRODUCT COST BY BATCH
   GET /api/product-costs/batch/:batchId
========================================= */

/**
 * GET /api/product-costs/batch/:batchId
 *
 * Mengambil data modal berdasarkan
 * satu batch.
 *
 * Hanya membutuhkan login.
 */
router.get(
  "/batch/:batchId",
  showProductCostByBatch,
);

/* =========================================
   CREATE PRODUCT COST
   POST /api/product-costs
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
 *
 * Membutuhkan permission modal.create.
 */
router.post(
  "/",
  requirePermission(
    "modal.create",
  ),
  createProductCostHandler,
);

/* =========================================
   UPDATE PRODUCT COST
   PUT /api/product-costs/:id
========================================= */

/**
 * PUT /api/product-costs/:id
 *
 * Body:
 * {
 *   total_modal: number,
 *   qty: number
 * }
 *
 * Membutuhkan permission modal.edit.
 */
router.put(
  "/:id",
  requirePermission(
    "modal.edit",
  ),
  updateProductCostHandler,
);

/* =========================================
   DELETE PRODUCT COST
   DELETE /api/product-costs/:id
========================================= */

/**
 * DELETE /api/product-costs/:id
 *
 * Membutuhkan permission modal.delete.
 */
router.delete(
  "/:id",
  requirePermission(
    "modal.delete",
  ),
  deleteProductCostHandler,
);

export default router;