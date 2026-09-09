import { supabase } from "../config/supabase.js";

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
   GET ALL PRODUCT COSTS
========================================= */

export async function getProductCosts(): Promise<
  ProductCost[]
> {
  const { data, error } =
    await supabase
      .from("product_costs")
      .select("*")
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
  if (!batchId.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  const { data, error } =
    await supabase
      .from("product_costs")
      .select("*")
      .eq("batch_id", batchId.trim())
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

  if (
    !Number.isInteger(input.qty) ||
    input.qty <= 0
  ) {
    throw new Error(
      "Qty harus berupa bilangan bulat lebih besar dari 0.",
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

  if (!input.transaction_date?.trim()) {
    throw new Error(
      "Tanggal transaksi wajib diisi.",
    );
  }

  if (!input.bank_account_id?.trim()) {
    throw new Error(
      "Bank pembayaran wajib dipilih.",
    );
  }

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
     modal_per_qty_rounded merupakan
     generated column di database.

     Karena itu kedua field tersebut
     TIDAK dikirim saat INSERT.
  ------------------------------------- */

  const { data, error } =
    await supabase
      .from("product_costs")
      .insert({
        batch_id: batchId,

        total_modal:
          input.total_modal,

        qty:
          input.qty,

        transaction_date:
          input.transaction_date.trim(),

        bank_account_id:
          input.bank_account_id.trim(),
      })
      .select("*")
      .single();

  if (error) {
    console.error(
      "createProductCost error:",
      error,
    );

    if (
      error.code === "23505"
    ) {
      throw new Error(
        "Batch ini sudah memiliki data modal penjualan.",
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
      "Qty harus berupa bilangan bulat lebih besar dari 0.",
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

  if (!input.transaction_date?.trim()) {
    throw new Error(
      "Tanggal transaksi wajib diisi.",
    );
  }

  if (!input.bank_account_id?.trim()) {
    throw new Error(
      "Bank pembayaran wajib dipilih.",
    );
  }

  /* -------------------------------------
     UPDATE

     modal_per_qty dan
     modal_per_qty_rounded merupakan
     generated column di database.

     Database akan menghitung ulang
     secara otomatis berdasarkan:
     - total_modal
     - qty
  ------------------------------------- */

  const { data, error } =
    await supabase
      .from("product_costs")
      .update({
        total_modal:
          input.total_modal,

        qty:
          input.qty,

        transaction_date:
          input.transaction_date.trim(),

        bank_account_id:
          input.bank_account_id.trim(),

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", id.trim())
      .select("*")
      .single();

  if (error) {
    console.error(
      "updateProductCost error:",
      error,
    );

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
  if (!id.trim()) {
    throw new Error(
      "ID modal penjualan wajib diisi.",
    );
  }

  const { error } =
    await supabase
      .from("product_costs")
      .delete()
      .eq("id", id.trim());

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