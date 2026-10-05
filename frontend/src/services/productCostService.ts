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

  modal_beli: number;
  tax: number;
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

  modal_beli: number;
  tax: number;
  total_modal: number;

  qty: number;

  transaction_date: string;
  bank_account_id: string;
};

export type UpdateProductCostInput = {
  modal_beli: number;
  tax: number;
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
   VALIDATE PRODUCT COST INPUT
========================================= */

function validateProductCostInput(
  input: {
    modal_beli: number;
    tax: number;
    total_modal: number;
    qty: number;
    transaction_date: string;
    bank_account_id: string;
  },
): void {
  if (
    !Number.isFinite(
      input.modal_beli,
    ) ||
    input.modal_beli <= 0
  ) {
    throw new Error(
      "Modal beli harus lebih besar dari 0.",
    );
  }

  if (
    !Number.isFinite(
      input.tax,
    ) ||
    input.tax < 0
  ) {
    throw new Error(
      "Tax tidak valid. Isi 0 jika tidak ada tax.",
    );
  }

  if (
    !Number.isFinite(
      input.total_modal,
    ) ||
    input.total_modal < 0
  ) {
    throw new Error(
      "Total modal tidak valid.",
    );
  }

  const calculatedTotalModal =
    input.modal_beli +
    input.tax;

  if (
    input.total_modal !==
    calculatedTotalModal
  ) {
    throw new Error(
      "Total modal harus sama dengan Modal Beli + Tax.",
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
  const batchId =
    input.batch_id.trim();

  if (!batchId) {
    throw new Error(
      "Batch wajib dipilih.",
    );
  }

  validateProductCostInput({
    modal_beli:
      input.modal_beli,

    tax:
      input.tax,

    total_modal:
      input.total_modal,

    qty:
      input.qty,

    transaction_date:
      input.transaction_date,

    bank_account_id:
      input.bank_account_id,
  });

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
          batchId,

        modal_beli:
          input.modal_beli,

        tax:
          input.tax,

        total_modal:
          input.total_modal,

        qty:
          input.qty,

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
  const normalizedId =
    id.trim();

  if (!normalizedId) {
    throw new Error(
      "ID modal penjualan wajib diisi.",
    );
  }

  validateProductCostInput({
    modal_beli:
      input.modal_beli,

    tax:
      input.tax,

    total_modal:
      input.total_modal,

    qty:
      input.qty,

    transaction_date:
      input.transaction_date,

    bank_account_id:
      input.bank_account_id,
  });

  const token =
    getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/product-costs/${encodeURIComponent(
      normalizedId,
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
        modal_beli:
          input.modal_beli,

        tax:
          input.tax,

        total_modal:
          input.total_modal,

        qty:
          input.qty,

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
  const normalizedId =
    id.trim();

  if (!normalizedId) {
    throw new Error(
      "ID modal penjualan wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/product-costs/${encodeURIComponent(
      normalizedId,
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