import { Router } from "express";

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
   GET SHIPMENTS BY BATCH
========================================= */

/**
 * GET /api/manual-shipments?batch_id=UUID
 *
 * Mengambil seluruh pengiriman
 * berdasarkan batch.
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
