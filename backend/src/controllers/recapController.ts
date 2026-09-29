import type {
  Request,
  Response,
} from "express";

import { supabase } from "../config/supabase.js";

import {
  getBatchById,
  type Country,
} from "../services/batchService.js";

import {
  createRecaps,
  deleteRecap,
  getRecapById,
  getRecapsByBatch,
  markRecapAsCheckedOut,
} from "../services/recapService.js";

import {
  getRecapHistoriesByBatchId,
  getRecapHistoriesByCountry,
  recordRecapHistory,
} from "../services/recapHistoryService.js";

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
   GET RECAP HISTORIES BY BATCH
========================================= */

/**
 * GET /api/recaps/history?batch_id=xxx
 *
 * Mengambil seluruh riwayat rekapan
 * berdasarkan batch.
 */
export async function listRecapHistories(
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
       Get recap histories
    ------------------------------------- */

    const data =
      await getRecapHistoriesByBatchId(
        batchId.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "listRecapHistories error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil riwayat rekapan.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   GET RECAP HISTORIES BY COUNTRY
========================================= */

/**
 * GET /api/recaps/history?country=china
 *
 * Mengambil seluruh riwayat rekapan
 * berdasarkan country.
 */
export async function listRecapHistoriesByCountry(
  req: Request,
  res: Response,
) {
  try {
    const country =
      req.query.country;

    /* -------------------------------------
       Validate country
    ------------------------------------- */

    const validCountries: Country[] = [
      "china",
      "indonesia",
      "jepang",
      "korea",
      "thailand",
    ];

    if (
      typeof country !== "string" ||
      !validCountries.includes(
        country as Country,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Country tidak valid.",
      });
    }

    /* -------------------------------------
       Get recap histories
    ------------------------------------- */

    const data =
      await getRecapHistoriesByCountry(
        country as Country,
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "listRecapHistoriesByCountry error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil riwayat rekapan.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   RECORD COPY PAYMENT LINK HISTORY
========================================= */

/**
 * POST /api/recaps/history/copy-payment-link
 *
 * Mencatat riwayat ketika admin berhasil
 * melakukan Copy Payment Link pada recap.
 *
 * Body:
 * {
 *   "payment_id": "..."
 * }
 */
export async function recordCopyPaymentLinkHistoryHandler(
  req: Request,
  res: Response,
) {
  try {
    const paymentId =
      req.body?.payment_id;

    /* -------------------------------------
       Validate payment_id
    ------------------------------------- */

    if (
      typeof paymentId !== "string" ||
      !paymentId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "payment_id wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate authenticated admin
    ------------------------------------- */

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message:
          "User tidak terautentikasi.",
      });
    }

    /* -------------------------------------
       Get payment
    ------------------------------------- */

    const {
      data: payment,
      error: paymentError,
    } = await supabase
      .from("payments")
      .select(`
        id,
        recap_id,
        payment_type,
        payment_url
      `)
      .eq(
        "id",
        paymentId.trim(),
      )
      .maybeSingle();

    if (paymentError) {
      throw new Error(
        `Gagal mengambil data pembayaran: ${paymentError.message}`,
      );
    }

    if (!payment) {
      return res.status(404).json({
        success: false,
        message:
          "Data pembayaran tidak ditemukan.",
      });
    }

    /* -------------------------------------
       Hanya payment dari recap
    ------------------------------------- */

    if (!payment.recap_id) {
      return res.status(400).json({
        success: false,
        message:
          "Payment ini bukan berasal dari rekapan.",
      });
    }

    /* -------------------------------------
       Pastikan Payment Link tersedia
    ------------------------------------- */

    if (
      typeof payment.payment_url !== "string" ||
      !payment.payment_url.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Payment Link belum tersedia.",
      });
    }

    /* -------------------------------------
       Get recap
    ------------------------------------- */

    const recap =
      await getRecapById(
        payment.recap_id,
      );

    /* -------------------------------------
       Get batch
    ------------------------------------- */

    const batch =
      await getBatchById(
        recap.batch_id,
      );

    /* -------------------------------------
       Get member
    ------------------------------------- */

    const {
      data: member,
      error: memberError,
    } = await supabase
      .from("members")
      .select(`
        id,
        name,
        phone
      `)
      .eq(
        "id",
        recap.member_id,
      )
      .maybeSingle();

    if (memberError) {
      throw new Error(
        `Gagal mengambil data member: ${memberError.message}`,
      );
    }

    /* -------------------------------------
       Record COPY history
    ------------------------------------- */

    await recordRecapHistory({
      recapId:
        recap.id,
      batchId:
        recap.batch_id,
      batchName:
        batch.name,
      country:
        batch.country,
      action:
        "COPY_PAYMENT_LINK",
      oldData:
        null,
      newData: {
        payment_id:
          payment.id,
        payment_type:
          payment.payment_type,
        member_name:
          member?.name ??
          null,
        member_phone:
          member?.phone ??
          null,
      },
      adminId:
        req.user.id,
      adminName:
        req.user.name,
    });

    return res.status(200).json({
      success: true,
      message:
        "Riwayat Copy Payment Link berhasil dicatat.",
    });
  } catch (error) {
    console.error(
      "recordCopyPaymentLinkHistoryHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mencatat riwayat Copy Payment Link.";

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

    /* -------------------------------------
       Record CREATE history
    ------------------------------------- */

    const admin = req.user;

    if (admin && data.length > 0) {
      try {
        const batch =
          await getBatchById(
            batch_id.trim(),
          );

        await Promise.all(
          data.map((recap) =>
            recordRecapHistory({
              recapId: recap.id,
              batchId: recap.batch_id,
              batchName: batch.name,
              country: batch.country,
              action: "CREATE",
              oldData: null,
              newData: recap,
              adminId: admin.id,
              adminName: admin.name,
            }),
          ),
        );
      } catch (historyError) {
        console.error(
          "Gagal mengambil data batch untuk riwayat rekapan:",
          historyError,
        );
      }
    }

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
        "Member tidak ditemukan." ||
      message ===
        "Member HNR tidak dapat dipilih sebagai pembeli rekapan."
    ) {
      return res.status(
        message ===
          "Batch tidak ditemukan."
          ? 404
          : 400,
      ).json({
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
    const id = Array.isArray(
      req.params.id,
    )
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
      "markRecapAsCheckedOut error:",
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
        "Rekapan tidak ditemukan." ||
      message.startsWith(
        "Rekapan tidak ditemukan:",
      )
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
    const id = Array.isArray(
      req.params.id,
    )
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
       Get recap snapshot before delete
    ------------------------------------- */

    const existingRecap =
      await getRecapById(
        id.trim(),
      );

    const batch =
      await getBatchById(
        existingRecap.batch_id,
      );

    /* -------------------------------------
       Delete recap
    ------------------------------------- */

    await deleteRecap(id);

    /* -------------------------------------
       Record DELETE history
    ------------------------------------- */

    if (req.user) {
      await recordRecapHistory({
        recapId: null,
        batchId: existingRecap.batch_id,
        batchName: batch.name,
        country: batch.country,
        action: "DELETE",
        oldData: existingRecap,
        newData: null,
        adminId: req.user.id,
        adminName: req.user.name,
      });
    }

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