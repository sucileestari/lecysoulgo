const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur di environment variables.",
  );
}

/* =========================================
   TYPES
========================================= */

export type ProductCost = {
  id: string;
  batch_id: string;

  total_modal: number;
  qty: number;

  transaction_date: string | null;
  bank_account_id: string | null;

  modal_per_qty: number;
  modal_per_qty_rounded: number;

  created_at: string;
  updated_at: string;
};

export type CreateProductCostInput = {
  batch_id: string;
  total_modal: number;
  qty: number;

  transaction_date: string;
  bank_account_id: string;
};

export type UpdateProductCostInput = {
  total_modal: number;
  qty: number;

  transaction_date: string;
  bank_account_id: string;
};

/* =========================================
   API RESPONSE
========================================= */

type ApiSuccess<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiError = {
  success: false;
  message?: string;
};

type ApiResponse<T> =
  | ApiSuccess<T>
  | ApiError;

/* =========================================
   AUTH TOKEN
========================================= */

function getAuthToken(): string {
  const token =
    localStorage.getItem(
      "auth_token",
    );

  if (!token) {
    throw new Error(
      "Token tidak ditemukan. Silakan login kembali.",
    );
  }

  return token;
}

/* =========================================
   PARSE RESPONSE
========================================= */

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let result: ApiResponse<T>;

  try {
    result =
      (await response.json()) as ApiResponse<T>;
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      !result.success
        ? result.message ||
            `Request gagal (${response.status}).`
        : `Request gagal (${response.status}).`,
    );
  }

  if (!result.success) {
    throw new Error(
      result.message ||
        "Request gagal.",
    );
  }

  return result.data;
}

/* =========================================
   GET ALL
========================================= */

export async function getProductCosts(): Promise<
  ProductCost[]
> {
  const token =
    getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/product-costs`,
    {
      method: "GET",

      headers: {
        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
    },
  );

  return parseResponse<ProductCost[]>(
    response,
  );
}

/* =========================================
   GET BY BATCH
========================================= */

export async function getProductCostByBatchId(
  batchId: string,
): Promise<ProductCost | null> {
  if (!batchId.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/product-costs/batch/${encodeURIComponent(
      batchId.trim(),
    )}`,
    {
      method: "GET",

      headers: {
        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
    },
  );

  return parseResponse<ProductCost | null>(
    response,
  );
}

/* =========================================
   CREATE
========================================= */

export async function createProductCost(
  input: CreateProductCostInput,
): Promise<ProductCost> {
  if (!input.batch_id.trim()) {
    throw new Error(
      "Batch wajib dipilih.",
    );
  }

  if (
    !Number.isInteger(input.qty) ||
    input.qty <= 0
  ) {
    throw new Error(
      "Qty harus lebih besar dari 0.",
    );
  }

  if (
    !Number.isFinite(
      input.total_modal,
    ) ||
    input.total_modal <= 0
  ) {
    throw new Error(
      "Modal beli harus lebih besar dari 0.",
    );
  }

  if (!input.transaction_date.trim()) {
    throw new Error(
      "Tanggal transaksi wajib diisi.",
    );
  }

  if (!input.bank_account_id.trim()) {
    throw new Error(
      "Bank pembayaran wajib dipilih.",
    );
  }

  const token =
    getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/product-costs`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        batch_id:
          input.batch_id.trim(),

        total_modal:
          input.total_modal,

        qty: input.qty,

        transaction_date:
          input.transaction_date.trim(),

        bank_account_id:
          input.bank_account_id.trim(),
      }),
    },
  );

  return parseResponse<ProductCost>(
    response,
  );
}

/* =========================================
   UPDATE
========================================= */

export async function updateProductCost(
  id: string,
  input: UpdateProductCostInput,
): Promise<ProductCost> {
  if (!id.trim()) {
    throw new Error(
      "ID modal penjualan wajib diisi.",
    );
  }

  if (
    !Number.isInteger(input.qty) ||
    input.qty <= 0
  ) {
    throw new Error(
      "Qty harus lebih besar dari 0.",
    );
  }

  if (
    !Number.isFinite(
      input.total_modal,
    ) ||
    input.total_modal <= 0
  ) {
    throw new Error(
      "Modal beli harus lebih besar dari 0.",
    );
  }

  if (!input.transaction_date.trim()) {
    throw new Error(
      "Tanggal transaksi wajib diisi.",
    );
  }

  if (!input.bank_account_id.trim()) {
    throw new Error(
      "Bank pembayaran wajib dipilih.",
    );
  }

  const token =
    getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/product-costs/${encodeURIComponent(
      id.trim(),
    )}`,
    {
      method: "PUT",

      headers: {
        "Content-Type":
          "application/json",

        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        total_modal:
          input.total_modal,

        qty: input.qty,

        transaction_date:
          input.transaction_date.trim(),

        bank_account_id:
          input.bank_account_id.trim(),
      }),
    },
  );

  return parseResponse<ProductCost>(
    response,
  );
}

/* =========================================
   DELETE
========================================= */

export async function deleteProductCost(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "ID modal penjualan wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/product-costs/${encodeURIComponent(
      id.trim(),
    )}`,
    {
      method: "DELETE",

      headers: {
        Accept:
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },
    },
  );

  await parseResponse<null>(
    response,
  );
}
