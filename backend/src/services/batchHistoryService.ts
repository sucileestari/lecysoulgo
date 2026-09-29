import { supabase } from "../config/supabase.js";

import type {
  Country,
} from "./batchService.js";

/* =========================================
   TYPES
========================================= */

export type BatchHistoryAction =
  | "CREATE"
  | "EDIT"
  | "DELETE";

export type BatchHistoryData = {
  id?: string;
  country?: Country;
  name?: string;
  type?: string;
  last_payment_dp?: string;
  last_payment_pelunasan?: string | null;
  status?: string;
  image_path?: string | null;
  created_at?: string;
  updated_at?: string;
  admin_nyelem_id?: string | null;
  admin_rekap_id?: string | null;
  [key: string]: unknown;
};

export type RecordBatchHistoryInput = {
  batchId: string | null;

  batchName: string;

  country: Country;

  action: BatchHistoryAction;

  oldData: BatchHistoryData | null;

  newData: BatchHistoryData | null;

  adminId: string;

  adminName: string;
};

export type BatchHistory = {
  id: string;

  batch_id: string | null;

  admin_id: string | null;

  admin_name: string;

  batch_name: string;

  country: Country;

  action: BatchHistoryAction;

  old_data: BatchHistoryData | null;

  new_data: BatchHistoryData | null;

  created_at: string;
};

/* =========================================
   RECORD HISTORY
========================================= */

export async function recordBatchHistory(
  input: RecordBatchHistoryInput,
): Promise<void> {
  const {
    error,
  } = await supabase
    .from("batch_histories")
    .insert({
      batch_id:
        input.batchId,

      admin_id:
        input.adminId,

      admin_name:
        input.adminName,

      batch_name:
        input.batchName,

      country:
        input.country,

      action:
        input.action,

      old_data:
        input.oldData,

      new_data:
        input.newData,
    });

  if (error) {
    /*
     * History adalah audit tambahan.
     *
     * Kegagalan menyimpan history
     * tidak boleh membuat operasi
     * CREATE / EDIT / DELETE batch
     * yang sudah berhasil menjadi gagal.
     */
    console.error(
      "Gagal menyimpan riwayat batch:",
      error,
    );
  }
}

/* =========================================
   GET HISTORY BY BATCH
========================================= */

export async function getBatchHistoryByBatchId(
  batchId: string,
): Promise<BatchHistory[]> {
  const {
    data,
    error,
  } = await supabase
    .from("batch_histories")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Gagal mengambil riwayat batch: ${error.message}`,
    );
  }

  return (data ?? []) as BatchHistory[];
}

/* =========================================
   GET HISTORY BY COUNTRY
========================================= */

export async function getBatchHistoriesByCountry(
  country: Country,
): Promise<BatchHistory[]> {
  const {
    data,
    error,
  } = await supabase
    .from("batch_histories")
    .select("*")
    .eq("country", country)
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(
      `Gagal mengambil riwayat batch: ${error.message}`,
    );
  }

  return (data ?? []) as BatchHistory[];
}
