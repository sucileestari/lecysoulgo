import type {
  Request,
  Response,
} from "express";

import {
  getActiveBankAccounts,
} from "../services/bankAccountService.js";

/* =========================================
   GET ACTIVE BANK ACCOUNTS
========================================= */

export async function listActiveBankAccountsHandler(
  _req: Request,
  res: Response,
) {
  try {
    const data =
      await getActiveBankAccounts();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "listActiveBankAccountsHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data rekening aktif.",
    });
  }
}