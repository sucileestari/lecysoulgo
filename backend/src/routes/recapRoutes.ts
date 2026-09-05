import { Router } from "express";

import {
  createRecapsHandler,
  deleteRecapHandler,
  listRecaps,
  markRecapAsCheckedOutHandler,
} from "../controllers/recapController.js";

const router = Router();

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
  deleteRecapHandler,
);

/* =========================================
   EXPORT
========================================= */

export default router;