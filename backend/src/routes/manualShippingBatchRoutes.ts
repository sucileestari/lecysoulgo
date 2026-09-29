import { Router } from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  authenticateCustomer,
} from "../middleware/customerAuthMiddleware.js";

import {
  createManualShippingBatchHandler,
  deleteManualShippingBatchHandler,
  getManualShippingBatchByIdHandler,
  getManualShippingBatchesHandler,
  updateManualShippingBatchHandler,
} from "../controllers/manualShippingBatchController.js";

const router = Router();

/* =========================================
   ADMIN ROUTES
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
 * GET /api/manual-shipping-batches
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
   CUSTOMER ROUTES
========================================= */

export const customerManualShippingBatchRoutes =
  Router();

customerManualShippingBatchRoutes.use(
  authenticateCustomer,
);

/* =========================================
   CUSTOMER - GET ALL BATCHES
========================================= */

/**
 * GET /api/customer/manual-shipping-batches
 *
 * Customer hanya membutuhkan daftar batch.
 *
 * Batch tidak memiliki member_id,
 * sehingga tidak ada filtering member
 * pada level batch.
 */
customerManualShippingBatchRoutes.get(
  "/manual-shipping-batches",
  getManualShippingBatchesHandler,
);

/* =========================================
   CUSTOMER - GET BATCH BY ID
========================================= */

/**
 * GET /api/customer/manual-shipping-batches/:id
 */
customerManualShippingBatchRoutes.get(
  "/manual-shipping-batches/:id",
  getManualShippingBatchByIdHandler,
);

/* =========================================
   EXPORT
========================================= */

export default router;