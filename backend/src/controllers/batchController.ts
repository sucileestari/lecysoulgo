import type {
  Request,
  Response,
} from "express";

import {
  createBatch,
  deleteBatch,
  deleteBatchImage,
  getBatchById,
  getBatchesByCountry,
  updateBatch,
  uploadBatchImage,
} from "../services/batchService.js";

import type {
  BatchStatus,
  Country,
} from "../services/batchService.js";

/* =========================================
   CONSTANT
========================================= */

const VALID_COUNTRIES: Country[] = [
  "china",
  "indonesia",
  "jepang",
  "korea",
  "thailand",
];

const VALID_STATUSES: BatchStatus[] = [
  "Akan di Order",
  "Sudah di Order",
  "Sudah sampai di WH",
  "Sudah sampai di INA",
  "Sudah sampai di Admin",
];

/* =========================================
   HELPER VALIDATION
========================================= */

function isValidCountry(
  value: unknown,
): value is Country {
  return (
    typeof value === "string" &&
    VALID_COUNTRIES.includes(
      value as Country,
    )
  );
}

function isValidStatus(
  value: unknown,
): value is BatchStatus {
  return (
    typeof value === "string" &&
    VALID_STATUSES.includes(
      value as BatchStatus,
    )
  );
}

/* =========================================
   GET ALL BATCHES
========================================= */

/**
 * GET /api/batches?country=china
 */
export async function listBatches(
  req: Request,
  res: Response,
) {
  try {
    const country =
      req.query.country;

    /* -------------------------------------
       Validate country
    ------------------------------------- */

    if (!isValidCountry(country)) {
      return res.status(400).json({
        success: false,
        message:
          "Country tidak valid.",
      });
    }

    /* -------------------------------------
       Get batches
    ------------------------------------- */

    const data =
      await getBatchesByCountry(
        country,
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "listBatches error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data batch.";

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
 * GET /api/batches/:id
 */
export async function showBatch(
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
          "ID batch wajib diisi.",
      });
    }

    /* -------------------------------------
       Get batch
    ------------------------------------- */

    const data =
      await getBatchById(
        id.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "showBatch error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data batch.";

    return res.status(404).json({
      success: false,
      message:
        "Batch tidak ditemukan.",
    });
  }
}

/* =========================================
   CREATE BATCH
========================================= */

/**
 * POST /api/batches
 *
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
export async function createBatchHandler(
  req: Request,
  res: Response,
) {
  let uploadedImagePath:
    | string
    | null = null;

  try {
    const {
      country,
      name,
      type,
      last_payment_dp,
      last_payment_pelunasan,
      status,
    } = req.body;

    /* -------------------------------------
       Validate country
    ------------------------------------- */

    if (!isValidCountry(country)) {
      return res.status(400).json({
        success: false,
        message:
          "Country tidak valid.",
      });
    }

    /* -------------------------------------
       Validate name
    ------------------------------------- */

    if (
      typeof name !== "string" ||
      !name.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nama batch wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate type
    ------------------------------------- */

    if (
      typeof type !== "string" ||
      !type.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Jenis barang wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate DP date
    ------------------------------------- */

    if (
      typeof last_payment_dp !==
        "string" ||
      !last_payment_dp.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tanggal pembayaran DP wajib diisi.",
      });
    }

    /* -------------------------------------
       Validate status
    ------------------------------------- */

    if (
      status !== undefined &&
      status !== "" &&
      !isValidStatus(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status batch tidak valid.",
      });
    }

    /* -------------------------------------
       Get uploaded file
    ------------------------------------- */

    const file =
      req.file;

    /* -------------------------------------
       Upload image
    ------------------------------------- */

    if (file) {
      uploadedImagePath =
        await uploadBatchImage(
          file.buffer,
          country,
          file.originalname,
        );
    }

    /* -------------------------------------
       Create batch
    ------------------------------------- */

    const data =
      await createBatch(
        {
          country,

          name:
            name.trim(),

          type:
            type.trim(),

          last_payment_dp,

          last_payment_pelunasan:
            typeof last_payment_pelunasan ===
              "string" &&
            last_payment_pelunasan.trim()
              ? last_payment_pelunasan
              : null,

          status:
            isValidStatus(status)
              ? status
              : "Sudah di Order",
        },

        uploadedImagePath,
      );

    return res.status(201).json({
      success: true,
      data,
      message:
        "Batch berhasil ditambahkan.",
    });
  } catch (error) {
    console.error(
      "createBatchHandler error:",
      error,
    );

    /*
     * Jika database gagal,
     * hapus gambar yang sudah
     * terlanjur diupload.
     */
    if (uploadedImagePath) {
      try {
        await deleteBatchImage(
          uploadedImagePath,
        );
      } catch (cleanupError) {
        console.error(
          "Gagal menghapus gambar setelah create batch gagal:",
          cleanupError,
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menambahkan batch.";

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
 * PUT /api/batches/:id
 *
 * multipart/form-data
 *
 * Fields:
 * - name
 * - type
 * - last_payment_pelunasan
 * - status
 * - image
 */
export async function updateBatchHandler(
  req: Request,
  res: Response,
) {
  let newImagePath:
    | string
    | undefined;

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
          "ID batch wajib diisi.",
      });
    }

    /* -------------------------------------
       Get existing batch
    ------------------------------------- */

    const existingBatch =
      await getBatchById(
        id.trim(),
      );

    /* -------------------------------------
       Get request body
    ------------------------------------- */

    const {
      name,
      type,
      last_payment_pelunasan,
      status,
    } = req.body;

    /* -------------------------------------
       Validate name
    ------------------------------------- */

    if (
      name !== undefined &&
      (
        typeof name !== "string" ||
        !name.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nama batch tidak valid.",
      });
    }

    /* -------------------------------------
       Validate type
    ------------------------------------- */

    if (
      type !== undefined &&
      (
        typeof type !== "string" ||
        !type.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Jenis barang tidak valid.",
      });
    }

    /* -------------------------------------
       Validate status
    ------------------------------------- */

    if (
      status !== undefined &&
      status !== "" &&
      !isValidStatus(status)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Status batch tidak valid.",
      });
    }

    /* -------------------------------------
       Get uploaded file
    ------------------------------------- */

    const file =
      req.file;

    /* -------------------------------------
       Upload new image
    ------------------------------------- */

    if (file) {
      newImagePath =
        await uploadBatchImage(
          file.buffer,
          existingBatch.country,
          file.originalname,
        );
    }

    /* -------------------------------------
       Update batch

       IMPORTANT:
       newImagePath dikirim sebagai
       parameter KETIGA.
    ------------------------------------- */

    const data =
      await updateBatch(
        id.trim(),

        {
          name:
            typeof name === "string"
              ? name.trim()
              : undefined,

          type:
            typeof type === "string"
              ? type.trim()
              : undefined,

          last_payment_pelunasan:
            last_payment_pelunasan !==
            undefined
              ? (
                  typeof last_payment_pelunasan ===
                    "string" &&
                  last_payment_pelunasan.trim()
                    ? last_payment_pelunasan
                    : null
                )
              : undefined,

          status:
            isValidStatus(status)
              ? status
              : undefined,
        },

        /*
         * INI YANG PENTING
         */
        newImagePath,
      );

    /* -------------------------------------
       Delete old image

       Hanya setelah database berhasil
       diupdate.
    ------------------------------------- */

    if (
      newImagePath &&
      existingBatch.image_path &&
      existingBatch.image_path !==
        newImagePath
    ) {
      try {
        await deleteBatchImage(
          existingBatch.image_path,
        );
      } catch (cleanupError) {
        console.error(
          "Gambar lama gagal dihapus:",
          cleanupError,
        );
      }
    }

    return res.status(200).json({
      success: true,
      data,
      message:
        "Batch berhasil diperbarui.",
    });
  } catch (error) {
    console.error(
      "updateBatchHandler error:",
      error,
    );

    /*
     * Jika gambar baru sudah terupload
     * tetapi proses update database gagal,
     * hapus gambar baru.
     */
    if (newImagePath) {
      try {
        await deleteBatchImage(
          newImagePath,
        );
      } catch (cleanupError) {
        console.error(
          "Gagal cleanup gambar baru:",
          cleanupError,
        );
      }
    }

    const message =
      error instanceof Error
        ? error.message
        : "Gagal memperbarui batch.";

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
 * DELETE /api/batches/:id
 */
export async function deleteBatchHandler(
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
          "ID batch wajib diisi.",
      });
    }

    /* -------------------------------------
       Check batch exists
    ------------------------------------- */

    await getBatchById(
      id.trim(),
    );

    /* -------------------------------------
       Delete batch
    ------------------------------------- */

    await deleteBatch(
      id.trim(),
    );

    return res.status(200).json({
      success: true,
      message:
        "Batch berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "deleteBatchHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menghapus batch.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}