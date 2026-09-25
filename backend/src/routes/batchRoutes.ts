import { Router } from "express";
import multer from "multer";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  requirePermission,
} from "../middleware/permissionMiddleware.js";

import {
  createBatchHandler,
  deleteBatchHandler,
  listBatches,
  showBatch,
  updateBatchHandler,
} from "../controllers/batchController.js";

const router = Router();

/* =========================================
   MULTER CONFIGURATION
========================================= */

/*
 * File disimpan di memory sementara.
 *
 * Setelah itu file akan dikirim ke
 * Supabase Storage oleh controller/service.
 */
const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    /*
     * File yang diterima backend
     * maksimal 1 MB.
     *
     * Frontend melakukan compression
     * terlebih dahulu.
     */
    fileSize: 1 * 1024 * 1024,
  },

  fileFilter: (
    _req,
    file,
    callback,
  ) => {
    /*
     * Hanya file gambar yang diizinkan.
     */
    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (
      !allowedImageTypes.includes(
        file.mimetype,
      )
    ) {
      return callback(
        new Error(
          "File hanya boleh berupa JPG, JPEG, PNG, atau WebP.",
        ),
      );
    }

    callback(null, true);
  },
});

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
 * GET /api/batches?country=china
 *
 * Mengambil semua batch berdasarkan
 * negara.
 *
 * Tidak menggunakan permission batches.view
 * karena permission tersebut tidak terdaftar
 * di database.
 */
router.get(
  "/",
  listBatches,
);

/* =========================================
   GET BATCH BY ID
========================================= */

/**
 * GET /api/batches/:id
 *
 * Mengambil satu batch berdasarkan UUID.
 *
 * Tidak menggunakan permission batches.view
 * karena permission tersebut tidak terdaftar
 * di database.
 */
router.get(
  "/:id",
  showBatch,
);

/* =========================================
   CREATE BATCH
========================================= */

/**
 * POST /api/batches
 *
 * Content-Type:
 * multipart/form-data
 *
 * Fields:
 * - country
 * - name
 * - type
 * - last_payment_dp
 * - last_payment_pelunasan
 * - status
 * - image
 */
router.post(
  "/",
  requirePermission(
    "batches.create",
  ),
  upload.single("image"),
  createBatchHandler,
);

/* =========================================
   UPDATE BATCH
========================================= */

/**
 * PUT /api/batches/:id
 *
 * Content-Type:
 * multipart/form-data
 *
 * Fields:
 * - name
 * - type
 * - last_payment_pelunasan
 * - status
 * - image
 *
 * last_payment_dp tidak diubah
 * ketika Edit Batch.
 */
router.put(
  "/:id",
  requirePermission(
    "batches.edit",
  ),
  upload.single("image"),
  updateBatchHandler,
);

/* =========================================
   DELETE BATCH
========================================= */

/**
 * DELETE /api/batches/:id
 *
 * Menghapus:
 * 1. Data batch dari database.
 * 2. Gambar batch dari Supabase Storage.
 */
router.delete(
  "/:id",
  requirePermission(
    "batches.delete",
  ),
  deleteBatchHandler,
);

/* =========================================
   EXPORT
========================================= */

export default router;