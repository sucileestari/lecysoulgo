import { Router } from "express";

import {
  getManualShippingBatchesHandler,
  getManualShippingBatchByIdHandler,
  createManualShippingBatchHandler,
  updateManualShippingBatchHandler,
  deleteManualShippingBatchHandler,
} from "../controllers/manualShippingBatchController.js";

const router = Router();

/* =========================================
   GET ALL BATCHES
========================================= */

/**
 * GET /api/manual-shipping-batches
 *
 * Mengambil seluruh batch pengiriman manual.
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
 * Mengambil satu batch berdasarkan ID.
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
 * Memperbarui data batch pengiriman.
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
 * Menghapus batch pengiriman.
 */
router.delete(
  "/:id",
  deleteManualShippingBatchHandler,
);

/* =========================================
   EXPORT
========================================= */

export default router;