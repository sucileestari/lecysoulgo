import type {
  Request,
  Response,
} from "express";

import {
  createProductCost,
  deleteProductCost,
  getProductCostByBatchId,
  getProductCosts,
  updateProductCost,
  type CreateProductCostInput,
  type UpdateProductCostInput,
} from "../services/productCostService.js";

/* =========================================
   GET ALL PRODUCT COSTS
========================================= */

export async function listProductCosts(
  _req: Request,
  res: Response,
) {
  try {
    const data =
      await getProductCosts();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "listProductCosts error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data modal penjualan.",
    });
  }
}

/* =========================================
   GET PRODUCT COST BY BATCH
========================================= */

export async function showProductCostByBatch(
  req: Request,
  res: Response,
) {
  try {
    const batchId = Array.isArray(
      req.params.batchId,
    )
      ? req.params.batchId[0]
      : req.params.batchId;

    if (
      !batchId ||
      !batchId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID batch wajib diisi.",
      });
    }

    const data =
      await getProductCostByBatchId(
        batchId.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "showProductCostByBatch error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data modal batch.",
    });
  }
}

/* =========================================
   CREATE PRODUCT COST
========================================= */

export async function createProductCostHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      batch_id,
      total_modal,
      qty,
      transaction_date,
      bank_account_id,
    } = req.body as Partial<CreateProductCostInput>;

    /* -------------------------------------
       VALIDATION
    ------------------------------------- */

    if (
      typeof batch_id !== "string" ||
      !batch_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID batch wajib diisi.",
      });
    }

    const totalModalNumber =
      Number(total_modal);

    if (
      !Number.isFinite(
        totalModalNumber,
      ) ||
      totalModalNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Modal beli harus lebih besar dari 0.",
      });
    }

    const qtyNumber =
      Number(qty);

    if (
      !Number.isInteger(
        qtyNumber,
      ) ||
      qtyNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Qty harus berupa bilangan bulat lebih besar dari 0.",
      });
    }

    if (
      typeof transaction_date !==
        "string" ||
      !transaction_date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tanggal transaksi wajib diisi.",
      });
    }

    if (
      typeof bank_account_id !==
        "string" ||
      !bank_account_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rekening pembayaran wajib dipilih.",
      });
    }

    /* -------------------------------------
       CREATE
    ------------------------------------- */

    const data =
      await createProductCost({
        batch_id:
          batch_id.trim(),

        total_modal:
          totalModalNumber,

        qty:
          qtyNumber,

        transaction_date:
          transaction_date.trim(),

        bank_account_id:
          bank_account_id.trim(),
      });

    return res.status(201).json({
      success: true,
      data,
      message:
        "Modal penjualan berhasil ditambahkan.",
    });
  } catch (error) {
    console.error(
      "createProductCostHandler error:",
      error,
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal menambahkan modal penjualan.",
    });
  }
}

/* =========================================
   UPDATE PRODUCT COST
========================================= */

export async function updateProductCostHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID modal penjualan wajib diisi.",
      });
    }

    const {
      total_modal,
      qty,
      transaction_date,
      bank_account_id,
    } = req.body as Partial<UpdateProductCostInput>;

    const totalModalNumber =
      Number(total_modal);

    if (
      !Number.isFinite(
        totalModalNumber,
      ) ||
      totalModalNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Modal beli harus lebih besar dari 0.",
      });
    }

    const qtyNumber =
      Number(qty);

    if (
      !Number.isInteger(
        qtyNumber,
      ) ||
      qtyNumber <= 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Qty harus berupa bilangan bulat lebih besar dari 0.",
      });
    }

    if (
      typeof transaction_date !==
        "string" ||
      !transaction_date.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tanggal transaksi wajib diisi.",
      });
    }

    if (
      typeof bank_account_id !==
        "string" ||
      !bank_account_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Rekening pembayaran wajib dipilih.",
      });
    }

    /* -------------------------------------
       UPDATE
    ------------------------------------- */

    const data =
      await updateProductCost(
        id.trim(),
        {
          total_modal:
            totalModalNumber,

          qty:
            qtyNumber,

          transaction_date:
            transaction_date.trim(),

          bank_account_id:
            bank_account_id.trim(),
        },
      );

    return res.status(200).json({
      success: true,
      data,
      message:
        "Modal penjualan berhasil diperbarui.",
    });
  } catch (error) {
    console.error(
      "updateProductCostHandler error:",
      error,
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal memperbarui modal penjualan.",
    });
  }
}

/* =========================================
   DELETE PRODUCT COST
========================================= */

export async function deleteProductCostHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(
      req.params.id,
    )
      ? req.params.id[0]
      : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID modal penjualan wajib diisi.",
      });
    }

    await deleteProductCost(
      id.trim(),
    );

    return res.status(200).json({
      success: true,
      message:
        "Modal penjualan berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "deleteProductCostHandler error:",
      error,
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal menghapus modal penjualan.",
    });
  }
}