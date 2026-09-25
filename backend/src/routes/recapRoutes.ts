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
  listRecaps,
  markRecapAsCheckedOutHandler,
} from "../controllers/recapController.js";

const router = Router();

/* =========================================
   ALL ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
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