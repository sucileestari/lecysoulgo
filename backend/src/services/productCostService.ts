import { supabase } from "../config/supabase.js";

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
   HELPERS
========================================= */

function normalizeNumber(
  value: number,
): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return value;
}

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
    input.total_modal <= 0
  ) {
    throw new Error(
      "Total modal harus lebih besar dari 0.",
    );
  }

  const expectedTotalModal =
    input.modal_beli +
    input.tax;

  if (
    input.total_modal !==
    expectedTotalModal
  ) {
    throw new Error(
      "Total modal tidak sesuai dengan Modal Beli + Tax.",
    );
  }

  if (
    !Number.isInteger(
      input.qty,
    ) ||
    input.qty <= 0
  ) {
    throw new Error(
      "Qty harus berupa bilangan bulat lebih besar dari 0.",
    );
  }

  if (
    !input.transaction_date?.trim()
  ) {
    throw new Error(
      "Tanggal transaksi wajib diisi.",
    );
  }

  if (
    !input.bank_account_id?.trim()
  ) {
    throw new Error(
      "Bank pembayaran wajib dipilih.",
    );
  }
}

/* =========================================
   GET ALL PRODUCT COSTS
========================================= */

export async function getProductCosts(): Promise<
  ProductCost[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("product_costs")
    .select(
      `
        id,
        batch_id,
        modal_beli,
        tax,
        total_modal,
        qty,
        transaction_date,
        bank_account_id,
        modal_per_qty,
        modal_per_qty_rounded,
        created_at,
        updated_at
      `,
    )
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getProductCosts error:",
      error,
    );

    throw new Error(
      "Gagal mengambil data modal penjualan.",
    );
  }

  return (data ?? []) as ProductCost[];
}

/* =========================================
   GET PRODUCT COST BY BATCH
========================================= */

export async function getProductCostByBatchId(
  batchId: string,
): Promise<ProductCost | null> {
  const normalizedBatchId =
    batchId?.trim();

  if (!normalizedBatchId) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("product_costs")
    .select(
      `
        id,
        batch_id,
        modal_beli,
        tax,
        total_modal,
        qty,
        transaction_date,
        bank_account_id,
        modal_per_qty,
        modal_per_qty_rounded,
        created_at,
        updated_at
      `,
    )
    .eq(
      "batch_id",
      normalizedBatchId,
    )
    .maybeSingle();

  if (error) {
    console.error(
      "getProductCostByBatchId error:",
      error,
    );

    throw new Error(
      "Gagal mengambil data modal batch.",
    );
  }

  return data as ProductCost | null;
}

/* =========================================
   CREATE PRODUCT COST
========================================= */

export async function createProductCost(
  input: CreateProductCostInput,
): Promise<ProductCost> {
  const batchId =
    input.batch_id?.trim();

  if (!batchId) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  const modalBeli =
    normalizeNumber(
      input.modal_beli,
    );

  const tax =
    normalizeNumber(
      input.tax,
    );

  const totalModal =
    normalizeNumber(
      input.total_modal,
    );

  validateProductCostInput({
    modal_beli:
      modalBeli,

    tax:
      tax,

    total_modal:
      totalModal,

    qty:
      input.qty,

    transaction_date:
      input.transaction_date,

    bank_account_id:
      input.bank_account_id,
  });

  /* -------------------------------------
     CHECK EXISTING
  ------------------------------------- */

  const existing =
    await getProductCostByBatchId(
      batchId,
    );

  if (existing) {
    throw new Error(
      "Batch ini sudah memiliki data modal penjualan.",
    );
  }

  /* -------------------------------------
     INSERT

     modal_per_qty dan
     modal_per_qty_rounded tetap
     dihitung oleh generated column
     di database berdasarkan:

     total_modal / qty

     Jadi kedua field tersebut
     TIDAK dikirim saat INSERT.
  ------------------------------------- */

  const {
    data,
    error,
  } = await supabase
    .from("product_costs")
    .insert({
      batch_id:
        batchId,

      modal_beli:
        modalBeli,

      tax:
        tax,

      total_modal:
        totalModal,

      qty:
        input.qty,

      transaction_date:
        input.transaction_date.trim(),

      bank_account_id:
        input.bank_account_id.trim(),
    })
    .select(
      `
        id,
        batch_id,
        modal_beli,
        tax,
        total_modal,
        qty,
        transaction_date,
        bank_account_id,
        modal_per_qty,
        modal_per_qty_rounded,
        created_at,
        updated_at
      `,
    )
    .single();

  if (error) {
    console.error(
      "createProductCost error:",
      error,
    );

    if (
      error.code ===
      "23505"
    ) {
      throw new Error(
        "Batch ini sudah memiliki data modal penjualan.",
      );
    }

    if (
      error.code ===
      "23514"
    ) {
      throw new Error(
        "Data modal tidak valid. Pastikan Total Modal = Modal Beli + Tax.",
      );
    }

    throw new Error(
      error.message ||
        "Gagal menyimpan modal penjualan.",
    );
  }

  return data as ProductCost;
}

/* =========================================
   UPDATE PRODUCT COST
========================================= */

export async function updateProductCost(
  id: string,
  input: UpdateProductCostInput,
): Promise<ProductCost> {
  const normalizedId =
    id?.trim();

  if (!normalizedId) {
    throw new Error(
      "ID modal penjualan wajib diisi.",
    );
  }

  const modalBeli =
    normalizeNumber(
      input.modal_beli,
    );

  const tax =
    normalizeNumber(
      input.tax,
    );

  const totalModal =
    normalizeNumber(
      input.total_modal,
    );

  validateProductCostInput({
    modal_beli:
      modalBeli,

    tax:
      tax,

    total_modal:
      totalModal,

    qty:
      input.qty,

    transaction_date:
      input.transaction_date,

    bank_account_id:
      input.bank_account_id,
  });

  /* -------------------------------------
     UPDATE

     Database akan menghitung ulang:

     modal_per_qty =
       total_modal / qty

     modal_per_qty_rounded =
       ceil(
         (total_modal / qty) / 1000
       ) * 1000
  ------------------------------------- */

  const {
    data,
    error,
  } = await supabase
    .from("product_costs")
    .update({
      modal_beli:
        modalBeli,

      tax:
        tax,

      total_modal:
        totalModal,

      qty:
        input.qty,

      transaction_date:
        input.transaction_date.trim(),

      bank_account_id:
        input.bank_account_id.trim(),

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      normalizedId,
    )
    .select(
      `
        id,
        batch_id,
        modal_beli,
        tax,
        total_modal,
        qty,
        transaction_date,
        bank_account_id,
        modal_per_qty,
        modal_per_qty_rounded,
        created_at,
        updated_at
      `,
    )
    .single();

  if (error) {
    console.error(
      "updateProductCost error:",
      error,
    );

    if (
      error.code ===
      "23514"
    ) {
      throw new Error(
        "Data modal tidak valid. Pastikan Total Modal = Modal Beli + Tax.",
      );
    }

    throw new Error(
      error.message ||
        "Gagal memperbarui modal penjualan.",
    );
  }

  return data as ProductCost;
}

/* =========================================
   DELETE PRODUCT COST
========================================= */

export async function deleteProductCost(
  id: string,
): Promise<void> {
  const normalizedId =
    id?.trim();

  if (!normalizedId) {
    throw new Error(
      "ID modal penjualan wajib diisi.",
    );
  }

  const {
    error,
  } = await supabase
    .from("product_costs")
    .delete()
    .eq(
      "id",
      normalizedId,
    );

  if (error) {
    console.error(
      "deleteProductCost error:",
      error,
    );

    throw new Error(
      "Gagal menghapus modal penjualan.",
    );
  }
}