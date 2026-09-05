import type {
  Request,
  Response,
} from "express";

import {
  createManualShippingBatch,
  getManualShippingBatches,
  getManualShippingBatchById,
  updateManualShippingBatch,
  deleteManualShippingBatch,
  type ManualShippingBatchStatus,
} from "../services/manualShippingBatchService.js";

/* =========================================
   TYPES
========================================= */

const VALID_STATUSES: ManualShippingBatchStatus[] = [
  "Aktif",
  "Selesai",
  "Dibatalkan",
];

function isValidStatus(
  status: unknown,
): status is ManualShippingBatchStatus {
  return (
    typeof status === "string" &&
    VALID_STATUSES.includes(
      status as ManualShippingBatchStatus,
    )
  );
}

/* =========================================
   GET ALL BATCHES
========================================= */

/**
 * GET /api/manual-shipping-batches
 *
 * Mengambil seluruh batch pengiriman manual.
 */
export async function getManualShippingBatchesHandler(
  _req: Request,
  res: Response,
) {
  try {
    const data =
      await getManualShippingBatches();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getManualShippingBatchesHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data batch pengiriman.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   GET BATCH BY ID
========================================= */

/**
 * GET /api/manual-shipping-batches/:id
 *
 * Mengambil satu batch berdasarkan ID.
 */
export async function getManualShippingBatchByIdHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID batch wajib diisi.",
      });
    }

    const data =
      await getManualShippingBatchById(
        id.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getManualShippingBatchByIdHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil detail batch pengiriman.";

    if (
      message ===
      "Batch pengiriman tidak ditemukan."
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   CREATE BATCH
========================================= */

/**
 * POST /api/manual-shipping-batches
 *
 * Body:
 *
 * {
 *   "event_name": "KPOP FEST 2026",
 *   "start_date": "2026-09-01",
 *   "end_date": "2026-09-07",
 *   "status": "Aktif"
 * }
 */
export async function createManualShippingBatchHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      event_name,
      start_date,
      end_date,
      status,
    } = req.body;

    /* -------------------------------------
       EVENT NAME
    ------------------------------------- */

    if (
      typeof event_name !==
        "string" ||
      !event_name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nama Event wajib diisi.",
      });
    }

    /* -------------------------------------
       START DATE
    ------------------------------------- */

    if (
      typeof start_date !==
        "string" ||
      !start_date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tanggal mulai event wajib diisi.",
      });
    }

    /* -------------------------------------
       END DATE
    ------------------------------------- */

    if (
      typeof end_date !==
        "string" ||
      !end_date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tanggal berakhir event wajib diisi.",
      });
    }

    /* -------------------------------------
       STATUS
    ------------------------------------- */

    if (
      !isValidStatus(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status batch tidak valid.",
      });
    }

    /* -------------------------------------
       CREATE
    ------------------------------------- */

    const data =
      await createManualShippingBatch({
        event_name:
          event_name.trim(),

        start_date:
          start_date.trim(),

        end_date:
          end_date.trim(),

        status,
      });

    return res.status(201).json({
      success: true,
      data,
      message:
        "Batch pengiriman berhasil ditambahkan.",
    });
  } catch (error) {
    console.error(
      "createManualShippingBatchHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menambahkan batch pengiriman.";

    /* -------------------------------------
       VALIDATION ERROR
    ------------------------------------- */

    const validationMessages = [
      "Nama Event wajib diisi.",
      "Nama Event maksimal 255 karakter.",
      "Tanggal mulai event wajib diisi.",
      "Tanggal berakhir event wajib diisi.",
      "Tanggal mulai event tidak valid.",
      "Tanggal berakhir event tidak valid.",
      "Tanggal berakhir event tidak boleh sebelum tanggal mulai event.",
      "Status batch tidak valid.",
      "Data batch wajib diisi.",
    ];

    if (
      validationMessages.includes(
        message,
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   UPDATE BATCH
========================================= */

/**
 * PUT /api/manual-shipping-batches/:id
 *
 * Body:
 *
 * {
 *   "event_name": "KPOP FEST 2026",
 *   "start_date": "2026-09-01",
 *   "end_date": "2026-09-08",
 *   "status": "Aktif"
 * }
 *
 * Semua field bersifat optional.
 */
export async function updateManualShippingBatchHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID batch wajib diisi.",
      });
    }

    const {
      event_name,
      start_date,
      end_date,
      status,
    } = req.body;

    /* -------------------------------------
       VALIDATE PROVIDED FIELDS
    ------------------------------------- */

    if (
      event_name !==
        undefined &&
      (
        typeof event_name !==
          "string" ||
        !event_name.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nama Event tidak valid.",
      });
    }

    if (
      start_date !==
        undefined &&
      (
        typeof start_date !==
          "string" ||
        !start_date.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tanggal mulai event tidak valid.",
      });
    }

    if (
      end_date !==
        undefined &&
      (
        typeof end_date !==
          "string" ||
        !end_date.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tanggal berakhir event tidak valid.",
      });
    }

    if (
      status !==
        undefined &&
      !isValidStatus(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status batch tidak valid.",
      });
    }

    /* -------------------------------------
       BUILD INPUT
    ------------------------------------- */

    const updateInput: {
      event_name?: string;
      start_date?: string;
      end_date?: string;
      status?: ManualShippingBatchStatus;
    } = {};

    if (
      event_name !==
      undefined
    ) {
      updateInput.event_name =
        event_name.trim();
    }

    if (
      start_date !==
      undefined
    ) {
      updateInput.start_date =
        start_date.trim();
    }

    if (
      end_date !==
      undefined
    ) {
      updateInput.end_date =
        end_date.trim();
    }

    if (
      status !==
      undefined
    ) {
      updateInput.status =
        status;
    }

    /* -------------------------------------
       UPDATE
    ------------------------------------- */

    const data =
      await updateManualShippingBatch(
        id.trim(),
        updateInput,
      );

    return res.status(200).json({
      success: true,
      data,
      message:
        "Batch pengiriman berhasil diperbarui.",
    });
  } catch (error) {
    console.error(
      "updateManualShippingBatchHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal memperbarui batch pengiriman.";

    /* -------------------------------------
       NOT FOUND
    ------------------------------------- */

    if (
      message ===
      "Batch pengiriman tidak ditemukan."
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    /* -------------------------------------
       VALIDATION
    ------------------------------------- */

    const validationMessages = [
      "ID batch wajib diisi.",
      "Nama Event tidak valid.",
      "Nama Event wajib diisi.",
      "Nama Event maksimal 255 karakter.",
      "Tanggal mulai event tidak valid.",
      "Tanggal berakhir event tidak valid.",
      "Tanggal berakhir event tidak boleh sebelum tanggal mulai event.",
      "Status batch tidak valid.",
      "Data perubahan batch wajib diisi.",
    ];

    if (
      validationMessages.includes(
        message,
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   DELETE BATCH
========================================= */

/**
 * DELETE /api/manual-shipping-batches/:id
 *
 * Menghapus batch pengiriman.
 *
 * Semua shipment di dalam batch
 * akan ikut terhapus karena foreign key
 * menggunakan ON DELETE CASCADE.
 */
export async function deleteManualShippingBatchHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID batch wajib diisi.",
      });
    }

    await deleteManualShippingBatch(
      id.trim(),
    );

    return res.status(200).json({
      success: true,
      message:
        "Batch pengiriman berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "deleteManualShippingBatchHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menghapus batch pengiriman.";

    /* -------------------------------------
       NOT FOUND
    ------------------------------------- */

    if (
      message ===
      "Batch pengiriman tidak ditemukan."
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}