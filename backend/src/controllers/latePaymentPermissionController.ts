import type {
  Request,
  Response,
} from "express";

import {
  getLatePaymentPermissions,
  getLatePaymentRecapOptions,
  createLatePaymentPermission,
  getCustomerLatePaymentPermissions,
  getCustomerLatePaymentRecapOptions,
  createCustomerLatePaymentPermission,
} from "../services/latePaymentPermissionService.js";

/* =========================================
   CUSTOMER REQUEST
========================================= */

type CustomerRequest =
  Request & {
    customer?: {
      member_id?: string | null;
      user_type?: string | null;
    };
  };

/* =========================================
   CUSTOMER MEMBER ID
========================================= */

function getCustomerMemberId(
  req: CustomerRequest,
): string | null {
  const memberId =
    req.customer?.member_id;

  if (
    typeof memberId !==
      "string" ||
    !memberId.trim()
  ) {
    return null;
  }

  return memberId.trim();
}

/* =========================================
   GET ALL PERMISSIONS
========================================= */

/**
 * GET /api/late-payment-permissions
 *
 * Mengambil seluruh data ijin telat bayar.
 *
 * Status permission:
 *
 * - unpaid
 * - paid
 *
 * Status "paid" tidak lagi diubah
 * secara manual dari controller.
 *
 * Status akan mengikuti hasil sinkronisasi
 * payment terkait.
 */
export async function getLatePaymentPermissionsHandler(
  _req: Request,
  res: Response,
) {
  try {
    const data =
      await getLatePaymentPermissions();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getLatePaymentPermissionsHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data ijin telat bayar.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   GET RECAP OPTIONS
========================================= */

/**
 * GET /api/late-payment-permissions/recap-options
 *
 * Mengambil:
 *
 * - semua member
 * - barang yang memenuhi syarat
 *
 * BUSINESS RULE:
 *
 * 1. DP belum paid
 *    → tampilkan DP.
 *
 * 2. DP sudah paid + Pelunasan belum paid
 *    → tampilkan Pelunasan.
 *
 * 3. DP dan Pelunasan sudah paid
 *    → tidak ditampilkan.
 *
 * 4. Pengajuan hanya boleh jika
 *    tanggal pembayaran masih memenuhi
 *    batas minimal H-2.
 *
 * 5. Member yang masih punya permission
 *    unpaid tetap dikembalikan dalam
 *    daftar member.
 *
 *    Frontend bertugas menampilkannya
 *    sebagai disabled.
 */
export async function getLatePaymentRecapOptionsHandler(
  _req: Request,
  res: Response,
) {
  try {
    const data =
      await getLatePaymentRecapOptions();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getLatePaymentRecapOptionsHandler error:",
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
   CREATE PERMISSION
========================================= */

/**
 * POST /api/late-payment-permissions
 *
 * Body:
 *
 * {
 *   "member_id": "...",
 *   "items": [
 *     {
 *       "recap_id": "...",
 *       "payment_type": "DP"
 *     }
 *   ],
 *   "reason": "...",
 *   "payment_date": "2026-09-10"
 * }
 *
 * Satu request dapat berisi
 * beberapa barang/payment.
 *
 * RULE:
 *
 * Satu member hanya boleh mempunyai
 * satu permission dengan status unpaid.
 *
 * Validasi tersebut dilakukan di service.
 */
export async function createLatePaymentPermissionHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      member_id,
      items,
      reason,
      payment_date,
    } = req.body;

    /* -------------------------------------
       Validate member_id
    ------------------------------------- */

    if (
      typeof member_id !==
        "string" ||
      !member_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID anggota wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate items
    ------------------------------------- */

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimal satu barang harus dipilih.",
      });
    }

    /*
     * Pastikan setiap item memiliki
     * recap_id dan payment_type.
     */
    const invalidItem =
      items.some(
        (item) =>
          !item ||
          typeof item !==
            "object" ||
          typeof item.recap_id !==
            "string" ||
          !item.recap_id.trim() ||
          (
            item.payment_type !==
              "DP" &&
            item.payment_type !==
              "PELUNASAN"
          ),
      );

    if (
      invalidItem
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Detail barang atau tipe pembayaran tidak valid.",
      });
    }

    /* -------------------------------------
       Validate reason
    ------------------------------------- */

    if (
      typeof reason !==
        "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Alasan telat wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate payment_date
    ------------------------------------- */

    if (
      typeof payment_date !==
        "string" ||
      !payment_date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Perkiraan tanggal pembayaran wajib diisi.",
      });
    }

    /* -------------------------------------
       Normalize items
    ------------------------------------- */

    const normalizedItems =
      items.map(
        (item) => ({
          recap_id:
            item.recap_id.trim(),

          payment_type:
            item.payment_type,
        }),
      );

    /* -------------------------------------
       CREATE
    ------------------------------------- */

    const data =
      await createLatePaymentPermission({
        member_id:
          member_id.trim(),

        items:
          normalizedItems,

        reason:
          reason.trim(),

        payment_date:
          payment_date.trim(),
      });

    return res.status(201).json({
      success: true,

      data,

      message:
        "Ijin telat bayar berhasil diajukan.",
    });
  } catch (error) {
    console.error(
      "createLatePaymentPermissionHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengajukan ijin telat bayar.";

    /* =====================================
       BUSINESS VALIDATION ERRORS
    ====================================== */

    const businessErrors = [
      "ID anggota wajib diisi.",
      "Minimal satu barang harus dipilih.",
      "Alasan telat wajib diisi.",
      "Perkiraan tanggal pembayaran wajib diisi.",
      "Barang yang sama tidak boleh dipilih dua kali.",
      "Data anggota tidak ditemukan.",
      "Sebagian rekapan yang dipilih tidak ditemukan.",
      "Rekapan tidak ditemukan.",
      "Semua barang harus milik member yang sama.",
      "Tanggal pembayaran terakhir tidak ditemukan.",
      "Tanggal DP terakhir",
      "Tanggal pelunasan terakhir",
      "Pengajuan untuk",
      "Perkiraan tanggal pembayaran paling cepat",
      "Perkiraan tanggal pembayaran maksimal",
      "Perkiraan tanggal pembayaran tidak boleh sebelum hari ini.",
      "Member ini masih memiliki ijin telat bayar yang belum diselesaikan.",
    ];

    const isBusinessError =
      businessErrors.some(
        (errorMessage) =>
          message ===
            errorMessage ||
          message.startsWith(
            errorMessage,
          ),
      );

    if (
      isBusinessError
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /* =====================================
       SERVER ERROR
    ====================================== */

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   CUSTOMER - GET OWN PERMISSIONS
========================================= */

/**
 * GET /api/customer/late-payment-permissions
 *
 * Hanya mengambil data ijin telat bayar
 * milik customer yang sedang login.
 *
 * member_id diambil dari JWT customer.
 */
export async function getCustomerLatePaymentPermissionsHandler(
  req: CustomerRequest,
  res: Response,
) {
  try {
    const memberId =
      getCustomerMemberId(req);

    if (!memberId) {
      return res.status(401).json({
        success: false,
        message:
          "Session customer tidak valid.",
      });
    }

    const data =
      await getCustomerLatePaymentPermissions(
        memberId,
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getCustomerLatePaymentPermissionsHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data ijin telat bayar.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   CUSTOMER - GET RECAP OPTIONS
========================================= */

/**
 * GET /api/customer/late-payment-permissions/recap-options
 *
 * Hanya mengambil:
 *
 * - member milik customer
 * - barang/rekapan milik customer
 *   yang memenuhi syarat.
 *
 * member_id diambil dari JWT customer.
 */
export async function getCustomerLatePaymentRecapOptionsHandler(
  req: CustomerRequest,
  res: Response,
) {
  try {
    const memberId =
      getCustomerMemberId(req);

    if (!memberId) {
      return res.status(401).json({
        success: false,
        message:
          "Session customer tidak valid.",
      });
    }

    const data =
      await getCustomerLatePaymentRecapOptions(
        memberId,
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getCustomerLatePaymentRecapOptionsHandler error:",
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
   CUSTOMER - CREATE PERMISSION
========================================= */

/**
 * POST /api/customer/late-payment-permissions
 *
 * Body:
 *
 * {
 *   "items": [
 *     {
 *       "recap_id": "...",
 *       "payment_type": "DP"
 *     }
 *   ],
 *   "reason": "...",
 *   "payment_date": "2026-09-10"
 * }
 *
 * Customer TIDAK mengirim member_id
 * sebagai sumber otorisasi.
 *
 * member_id selalu diambil dari JWT
 * customer yang sedang login.
 */
export async function createCustomerLatePaymentPermissionHandler(
  req: CustomerRequest,
  res: Response,
) {
  try {
    const memberId =
      getCustomerMemberId(req);

    if (!memberId) {
      return res.status(401).json({
        success: false,
        message:
          "Session customer tidak valid.",
      });
    }

    const {
      items,
      reason,
      payment_date,
    } = req.body;

    /* -------------------------------------
       Validate items
    ------------------------------------- */

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimal satu barang harus dipilih.",
      });
    }

    /*
     * Pastikan setiap item memiliki
     * recap_id dan payment_type.
     */
    const invalidItem =
      items.some(
        (item) =>
          !item ||
          typeof item !==
            "object" ||
          typeof item.recap_id !==
            "string" ||
          !item.recap_id.trim() ||
          (
            item.payment_type !==
              "DP" &&
            item.payment_type !==
              "PELUNASAN"
          ),
      );

    if (
      invalidItem
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Detail barang atau tipe pembayaran tidak valid.",
      });
    }

    /* -------------------------------------
       Validate reason
    ------------------------------------- */

    if (
      typeof reason !==
        "string" ||
      !reason.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Alasan telat wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate payment_date
    ------------------------------------- */

    if (
      typeof payment_date !==
        "string" ||
      !payment_date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Perkiraan tanggal pembayaran wajib diisi.",
      });
    }

    /* -------------------------------------
       Normalize items
    ------------------------------------- */

    const normalizedItems =
      items.map(
        (item) => ({
          recap_id:
            item.recap_id.trim(),

          payment_type:
            item.payment_type,
        }),
      );

    /* -------------------------------------
       CREATE
    ------------------------------------- */

    const data =
      await createCustomerLatePaymentPermission(
        memberId,
        {
          items:
            normalizedItems,

          reason:
            reason.trim(),

          payment_date:
            payment_date.trim(),
        },
      );

    return res.status(201).json({
      success: true,

      data,

      message:
        "Ijin telat bayar berhasil diajukan.",
    });
  } catch (error) {
    console.error(
      "createCustomerLatePaymentPermissionHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengajukan ijin telat bayar.";

    /* =====================================
       BUSINESS VALIDATION ERRORS
    ====================================== */

    const businessErrors = [
      "Minimal satu barang harus dipilih.",
      "Alasan telat wajib diisi.",
      "Perkiraan tanggal pembayaran wajib diisi.",
      "Barang yang sama tidak boleh dipilih dua kali.",
      "Data anggota tidak ditemukan.",
      "Sebagian rekapan yang dipilih tidak ditemukan.",
      "Rekapan tidak ditemukan.",
      "Semua barang harus milik member yang sama.",
      "Tanggal pembayaran terakhir tidak ditemukan.",
      "Tanggal DP terakhir",
      "Tanggal pelunasan terakhir",
      "Pengajuan untuk",
      "Perkiraan tanggal pembayaran paling cepat",
      "Perkiraan tanggal pembayaran maksimal",
      "Perkiraan tanggal pembayaran tidak boleh sebelum hari ini.",
      "Member ini masih memiliki ijin telat bayar yang belum diselesaikan.",
    ];

    const isBusinessError =
      businessErrors.some(
        (errorMessage) =>
          message ===
            errorMessage ||
          message.startsWith(
            errorMessage,
          ),
      );

    if (
      isBusinessError
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    /* =====================================
       SERVER ERROR
    ====================================== */

    return res.status(500).json({
      success: false,
      message,
    });
  }
}