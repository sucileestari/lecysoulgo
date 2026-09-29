import { Router } from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

import {
  createRecapsHandler,
  deleteRecapHandler,
  listRecapHistories,
  listRecapHistoriesByCountry,
  listRecaps,
  markRecapAsCheckedOutHandler,
  recordCopyPaymentLinkHistoryHandler,
} from "../controllers/recapController.js";

const router = Router();

/* =========================================
   ALL ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET RECAP HISTORIES BY BATCH
========================================= */

/**
 * GET /api/recaps/history?batch_id=UUID
 *
 * Mengambil seluruh riwayat rekapan
 * berdasarkan batch.
 */
router.get(
  "/history",
  requirePermission(
    "recaps.view",
  ),
  listRecapHistories,
);

/* =========================================
   GET ALL RECAP HISTORIES BY COUNTRY
========================================= */

/**
 * GET /api/recaps/history/country?country=china
 *
 * Mengambil seluruh riwayat rekapan
 * berdasarkan country.
 */
router.get(
  "/history/country",
  requirePermission(
    "recaps.view",
  ),
  listRecapHistoriesByCountry,
);

/* =========================================
   RECORD COPY PAYMENT LINK HISTORY
========================================= */

/**
 * POST /api/recaps/payment-link/copy-history
 *
 * Mencatat riwayat ketika admin berhasil
 * menyalin Payment Link.
 */
router.post(
  "/payment-link/copy-history",
  requirePermission(
    "recaps.view",
  ),
  recordCopyPaymentLinkHistoryHandler,
);

/* =========================================
   GET RECAPS BY BATCH
========================================= */

/**
 * GET /api/recaps?batch_id=UUID
 *
 * Mengambil seluruh rekapan
 * berdasarkan batch.
 */
router.get(
  "/",
  requirePermission(
    "recaps.view",
  ),
  listRecaps,
);

/* =========================================
   CREATE RECAPS
========================================= */

/**
 * POST /api/recaps
 *
 * Menambahkan rekapan.
 *
 * Satu request bisa berisi
 * beberapa member_id.
 */
router.post(
  "/",
  requirePermission(
    "recaps.create",
  ),
  createRecapsHandler,
);

/* =========================================
   MARK RECAP AS CO
========================================= */

/**
 * PATCH /api/recaps/:id/co
 *
 * Menandai satu barang sebagai
 * sudah CO.
 *
 * Hanya dapat dilakukan jika:
 *
 * DP        = paid
 * Pelunasan = paid
 *
 * Setelah menjadi Sudah CO,
 * tidak dapat dikembalikan menjadi Belum.
 */
router.patch(
  "/:id/co",
  markRecapAsCheckedOutHandler,
);

/* =========================================
   DELETE RECAP
========================================= */

/**
 * DELETE /api/recaps/:id
 *
 * Menghapus satu rekapan.
 */
router.delete(
  "/:id",
  requirePermission(
    "recaps.delete",
  ),
  deleteRecapHandler,
);

/* =========================================
   EXPORT
========================================= */

export default router;
