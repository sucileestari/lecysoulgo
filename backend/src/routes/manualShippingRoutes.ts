import { Router } from "express";

import {
  authenticate,
} from "../middleware/authMiddleware.js";

import {
  createManualShipmentHandler,
  deleteManualShipmentHandler,
  getManualShipmentByIdHandler,
  getManualShipmentOptionsHandler,
  listManualShipmentsHandler,
  updateManualShipmentHandler,
} from "../controllers/manualShippingController.js";

const router = Router();

/* =========================================
   ALL ROUTES REQUIRE LOGIN
========================================= */

router.use(
  authenticate,
);

/* =========================================
   GET SHIPMENTS BY BATCH
========================================= */

/**
 * GET /api/manual-shipments?batch_id=UUID
 *
 * Mengambil seluruh pengiriman
 * berdasarkan batch.
 *
 * Tidak menggunakan permission
 * shipping.view karena permission
 * tersebut tidak terdaftar di database.
 */
router.get(
  "/",
  listManualShipmentsHandler,
);

/* =========================================
   GET OPTIONS
========================================= */

/**
 * GET /api/manual-shipments/options
 * GET /api/manual-shipments/options?batch_id=UUID
 *
 * Digunakan untuk kebutuhan
 * dropdown pada modal Tambah Pengiriman.
 *
 * Tidak menggunakan permission
 * shipping.view karena permission
 * tersebut tidak terdaftar di database.
 */
router.get(
  "/options",
  getManualShipmentOptionsHandler,
);

/* =========================================
   GET SHIPMENT BY ID
========================================= */

/**
 * GET /api/manual-shipments/:id
 *
 * Mengambil satu data pengiriman.
 *
 * Tidak menggunakan permission
 * shipping.view karena permission
 * tersebut tidak terdaftar di database.
 */
router.get(
  "/:id",
  getManualShipmentByIdHandler,
);

/* =========================================
   CREATE SHIPMENT
========================================= */

/**
 * POST /api/manual-shipments
 *
 * Menambahkan pengiriman baru.
 */
router.post(
  "/",
  createManualShipmentHandler,
);

/* =========================================
   UPDATE SHIPMENT
========================================= */

/**
 * PUT /api/manual-shipments/:id
 *
 * Memperbarui data pengiriman.
 */
router.put(
  "/:id",
  updateManualShipmentHandler,
);

/* =========================================
   DELETE SHIPMENT
========================================= */

/**
 * DELETE /api/manual-shipments/:id
 *
 * Menghapus satu data pengiriman.
 */
router.delete(
  "/:id",
  deleteManualShipmentHandler,
);

/* =========================================
   EXPORT
========================================= */

export default router;