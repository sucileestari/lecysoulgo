import { Router } from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  createManualShippingBatchHandler,
  deleteManualShippingBatchHandler,
  getManualShippingBatchByIdHandler,
  getManualShippingBatchesHandler,
  updateManualShippingBatchHandler,
} from "../controllers/manualShippingBatchController.js";

const router = Router();

/* =========================================
   ALL ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET ALL BATCHES
========================================= */

/**
 * GET /api/manual-shipping-batches
 *
 * Mengambil seluruh batch pengiriman manual.
 *
 * Tidak membutuhkan batch_id.
 */
router.get(
  "/",
  getManualShippingBatchesHandler,
);

/* =========================================
   GET BATCH BY ID
========================================= */

/**
 * GET /api/manual-shipping-batches/:id
 *
 * Mengambil satu batch pengiriman manual.
 */
router.get(
  "/:id",
  getManualShippingBatchByIdHandler,
);

/* =========================================
   CREATE BATCH
========================================= */

/**
 * POST /api/manual-shipping-batches
 *
 * Membuat batch pengiriman manual baru.
 */
router.post(
  "/",
  createManualShippingBatchHandler,
);

/* =========================================
   UPDATE BATCH
========================================= */

/**
 * PUT /api/manual-shipping-batches/:id
 *
 * Mengubah batch pengiriman manual.
 */
router.put(
  "/:id",
  updateManualShippingBatchHandler,
);

/* =========================================
   DELETE BATCH
========================================= */

/**
 * DELETE /api/manual-shipping-batches/:id
 *
 * Menghapus batch pengiriman manual.
 */
router.delete(
  "/:id",
  deleteManualShippingBatchHandler,
);

/* =========================================
   EXPORT
========================================= */

export default router;