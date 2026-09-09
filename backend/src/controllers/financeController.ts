import {
  Request,
  Response,
} from "express";

import {
  createFinanceTransaction,
  CreateFinanceTransactionInput,
  getFinanceData,
} from "../services/financeService.js";

/* =========================================
   GET FINANCE DATA
========================================= */

/**
 * GET /api/finance
 *
 * Mengambil:
 * - summary keuangan
 * - saldo setiap rekening
 * - riwayat transaksi keuangan
 */
export async function getFinanceHandler(
  _req: Request,
  res: Response,
) {
  try {
    const data =
      await getFinanceData();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getFinanceHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data keuangan.",
    });
  }
}

/* =========================================
   CREATE FINANCE TRANSACTION
========================================= */

/**
 * POST /api/finance
 *
 * Membuat transaksi keuangan manual:
 *
 * income:
 * - to_bank_account_id wajib
 *
 * expense:
 * - from_bank_account_id wajib
 *
 * transfer:
 * - from_bank_account_id wajib
 * - to_bank_account_id wajib
 */
export async function createFinanceTransactionHandler(
  req: Request,
  res: Response,
) {
  try {
    const input =
      req.body as CreateFinanceTransactionInput;

    const transaction =
      await createFinanceTransaction(
        input,
      );

    return res.status(201).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    console.error(
      "createFinanceTransactionHandler error:",
      error,
    );

    return res.status(400).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal membuat transaksi keuangan.",
    });
  }
}