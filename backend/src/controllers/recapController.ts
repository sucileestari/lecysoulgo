import type {
  Request,
  Response,
} from "express";

import {
  createRecaps,
  deleteRecap,
  getRecapsByBatch,
  markRecapAsCheckedOut,
} from "../services/recapService.js";

/* =========================================
   GET RECAPS BY BATCH
========================================= */

/**
 * GET /api/recaps?batch_id=xxx
 *
 * Mengambil semua rekapan berdasarkan
 * batch.
 */
export async function listRecaps(
  req: Request,
  res: Response,
) {
  try {
    const batchId =
      req.query.batch_id;

    /* -------------------------------------
       Validate batch_id
    ------------------------------------- */

    if (
      typeof batchId !== "string" ||
      !batchId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "batch_id wajib diisi.",
      });
    }

    /* -------------------------------------
       Get recaps
    ------------------------------------- */

    const data =
      await getRecapsByBatch(
        batchId,
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "listRecaps error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data rekapan.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   CREATE RECAPS
========================================= */

/**
 * POST /api/recaps
 *
 * Content-Type:
 * application/json
 *
 * Body:
 *
 * {
 *   "batch_id": "...",
 *   "member_ids": [
 *     "...",
 *     "..."
 *   ],
 *   "detail_barang": "Photocard Album A",
 *   "qty": 2,
 *   "harga_barang": 20000,
 *   "persentase_dp": 50
 * }
 *
 * Satu request dapat membuat
 * beberapa rekapan sekaligus.
 */
export async function createRecapsHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      batch_id,
      member_ids,
      detail_barang,
      qty,
      harga_barang,
      persentase_dp,
    } = req.body;

    /* -------------------------------------
       Validate batch_id
    ------------------------------------- */

    if (
      typeof batch_id !== "string" ||
      !batch_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "batch_id wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate member_ids
    ------------------------------------- */

    if (
      !Array.isArray(
        member_ids,
      ) ||
      member_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimal pilih satu pembeli.",
      });
    }

    /*
     * Pastikan semua member ID
     * berupa string.
     */
    if (
      member_ids.some(
        (memberId) =>
          typeof memberId !==
            "string" ||
          !memberId.trim(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID pembeli tidak valid.",
      });
    }

    /* -------------------------------------
       Validate detail barang
    ------------------------------------- */

    if (
      typeof detail_barang !==
        "string" ||
      !detail_barang.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Detail barang wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate qty
    ------------------------------------- */

    if (
      typeof qty !== "number" ||
      !Number.isInteger(
        qty,
      ) ||
      qty <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Qty harus berupa angka lebih dari 0.",
      });
    }

    /* -------------------------------------
       Validate harga
    ------------------------------------- */

    if (
      typeof harga_barang !==
        "number" ||
      !Number.isFinite(
        harga_barang,
      ) ||
      harga_barang < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Harga barang tidak valid.",
      });
    }

    /* -------------------------------------
       Validate persentase DP
    ------------------------------------- */

    if (
      typeof persentase_dp !==
        "number" ||
      !Number.isFinite(
        persentase_dp,
      ) ||
      persentase_dp < 0 ||
      persentase_dp > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Persentase DP harus antara 0 sampai 100.",
      });
    }

    /* -------------------------------------
       Create recaps
    ------------------------------------- */

    const data =
      await createRecaps({
        batch_id:
          batch_id.trim(),

        member_ids:
          member_ids.map(
            (
              memberId: string,
            ) =>
              memberId.trim(),
          ),

        detail_barang:
          detail_barang.trim(),

        qty,

        harga_barang,

        persentase_dp,
      });

    return res.status(201).json({
      success: true,
      data,
      message:
        "Rekapan berhasil ditambahkan.",
    });
  } catch (error) {
    console.error(
      "createRecapsHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menambahkan rekapan.";

    /* -------------------------------------
       Known validation errors
    ------------------------------------- */

    if (
      message ===
        "Batch tidak ditemukan." ||
      message ===
        "Member tidak ditemukan."
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
   MARK RECAP AS CO
========================================= */

/**
 * PATCH /api/recaps/:id/co
 *
 * Menandai barang sebagai sudah CO.
 *
 * Tidak menerima body.
 *
 * Flow:
 *
 * Belum CO
 *    ↓
 * PATCH
 *    ↓
 * Sudah CO
 *
 * Hanya dapat dilakukan jika:
 *
 * DP = paid
 * Pelunasan = paid
 *
 * Tidak ada operasi:
 *
 * Sudah CO → Belum CO
 */
export async function markRecapAsCheckedOutHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    /* -------------------------------------
       VALIDATE ID
    ------------------------------------- */

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID rekapan wajib diisi.",
      });
    }

    /* -------------------------------------
       MARK AS CO
    ------------------------------------- */

    const data =
      await markRecapAsCheckedOut(
        id.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
      message:
        "Barang berhasil ditandai sebagai Sudah CO.",
    });
  } catch (error) {
    console.error(
      "markRecapAsCheckedOutHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menandai barang sebagai Sudah CO.";

    /* -------------------------------------
       400 VALIDATION
    ------------------------------------- */

    if (
      message ===
        "ID rekapan wajib diisi." ||
      message ===
        "Barang ini sudah ditandai sebagai Sudah CO." ||
      message ===
        "Barang belum dapat ditandai CO karena DP belum dibayar." ||
      message ===
        "Barang belum dapat ditandai CO karena Pelunasan belum dibayar."
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /* -------------------------------------
       404 NOT FOUND
    ------------------------------------- */

    if (
      message ===
        "Rekapan tidak ditemukan."
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    /* -------------------------------------
       500 SERVER ERROR
    ------------------------------------- */

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   DELETE RECAP
========================================= */

/**
 * DELETE /api/recaps/:id
 *
 * Menghapus satu rekapan.
 */
export async function deleteRecapHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    /* -------------------------------------
       Validate ID
    ------------------------------------- */

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID rekapan wajib diisi.",
      });
    }

    /* -------------------------------------
       Delete recap
    ------------------------------------- */

    await deleteRecap(id);

    return res.status(200).json({
      success: true,
      message:
        "Rekapan berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "deleteRecapHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menghapus rekapan.";

    /* -------------------------------------
       Recap not found
    ------------------------------------- */

    if (
      message ===
      "Rekapan tidak ditemukan."
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