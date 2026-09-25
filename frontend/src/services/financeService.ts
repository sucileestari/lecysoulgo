const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur.",
  );
}

/* =========================================
   TYPES
========================================= */

export type FinanceTransactionType =
  | "income"
  | "expense"
  | "transfer";

export type FinanceTransaction = {
  id: string;
  transaction_date: string;
  type: FinanceTransactionType;
  description: string;
  amount: number;
  from_bank_account_id: string | null;
  to_bank_account_id: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceBankAccount = {
  id: string;
  name: string;
  account_number: string | null;
  is_active: boolean;
  balance: number;
  total_income: number;
  total_expense: number;
  total_transfer_in: number;
  total_transfer_out: number;
};

export type FinanceSummary = {
  total_balance: number;
  total_income: number;
  total_expense: number;
  total_transfer: number;
};

export type FinanceData = {
  summary: FinanceSummary;
  bank_accounts: FinanceBankAccount[];
  transactions: FinanceTransaction[];
};

/* =========================================
   CREATE FINANCE TRANSACTION INPUT
========================================= */

export type CreateFinanceTransactionInput = {
  transaction_date: string;
  type: FinanceTransactionType;
  description: string;
  amount: number;
  from_bank_account_id?: string | null;
  to_bank_account_id?: string | null;
  reference_type?: string | null;
  reference_id?: string | null;
};

/* =========================================
   AUTH TOKEN
========================================= */

function getAuthToken(): string {
  const token = localStorage.getItem("auth_token");

  if (!token) {
    throw new Error(
      "Token tidak ditemukan. Silakan login kembali.",
    );
  }

  return token;
}

/* =========================================
   GET FINANCE DATA
========================================= */

export async function getFinanceData(): Promise<FinanceData> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/finance`,
    {
      method: "GET",
      headers: {
        "Content-Type":
          "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ||
        "Gagal mengambil data keuangan.",
    );
  }

  return result?.data as FinanceData;
}

/* =========================================
   CREATE FINANCE TRANSACTION
========================================= */

export async function createFinanceTransaction(
  input: CreateFinanceTransactionInput,
): Promise<FinanceTransaction> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/finance`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    },
  );

  const result =
    await response.json();

  if (!response.ok) {
    throw new Error(
      result?.message ||
        "Gagal membuat transaksi keuangan.",
    );
  }

  return result?.data as FinanceTransaction;
}
