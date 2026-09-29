import { supabase } from "../config/supabase.js";

import type {
  Country,
} from "./batchService.js";

/* =========================================
   TYPES
========================================= */

export type RecapHistoryAction =
  | "CREATE"
  | "DELETE"
  | "GENERATE_PAYMENT_LINK"
  | "COPY_PAYMENT_LINK"
  | "SEND_WHATSAPP";

export type RecapHistoryData = {
  id?: string;
  batch_id?: string;
  member_id?: string;
  detail_barang?: string;
  qty?: number;
  harga_barang?: number;
  total_harga?: number;
  persentase_dp?: number;
  total_dp?: number;
  sisa_pelunasan?: number;
  created_at?: string;
  updated_at?: string;
  public_token?: string;
  sudah_co?: boolean;
  max_timbun?: string | null;
  payment_id?: string;
  payment_type?: "DP" | "PELUNASAN" | string;
  member_name?: string | null;
  member_phone?: string | null;
  member?: {
    id?: string;
    name?: string;
    phone?: string;
    type?: string;
  } | null;
  [key: string]: unknown;
};

export type RecordRecapHistoryInput = {
  recapId: string | null;
  batchId: string | null;
  batchName: string;
  country: Country;
  action: RecapHistoryAction;
  oldData: RecapHistoryData | null;
  newData: RecapHistoryData | null;
  adminId: string;
  adminName: string;
};

export type RecapHistory = {
  id: string;
  recap_id: string | null;
  batch_id: string | null;
  admin_id: string | null;
  admin_name: string;
  batch_name: string;
  country: Country;
  action: RecapHistoryAction;
  old_data: RecapHistoryData | null;
  new_data: RecapHistoryData | null;
  created_at: string;
};

/* =========================================
   RECORD RECAP HISTORY
========================================= */

export async function recordRecapHistory(
  input: RecordRecapHistoryInput,
): Promise<void> {
  const { error } = await supabase
    .from("recap_histories")
    .insert({
      recap_id: input.recapId,
      batch_id: input.batchId,
      admin_id: input.adminId,
      admin_name: input.adminName,
      batch_name: input.batchName,
      country: input.country,
      action: input.action,
      old_data: input.oldData,
      new_data: input.newData,
    });

  if (error) {
    console.error("Gagal menyimpan riwayat rekapan:", error);
  }
}

/* =========================================
   GET RECAP HISTORY BY BATCH
========================================= */

export async function getRecapHistoriesByBatchId(
  batchId: string,
): Promise<RecapHistory[]> {
  const { data, error } = await supabase
    .from("recap_histories")
    .select("*")
    .eq("batch_id", batchId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Gagal mengambil riwayat rekapan: ${error.message}`,
    );
  }

  return (data ?? []) as RecapHistory[];
}

/* =========================================
   GET ALL RECAP HISTORY BY COUNTRY
========================================= */

export async function getRecapHistoriesByCountry(
  country: Country,
): Promise<RecapHistory[]> {
  const { data, error } = await supabase
    .from("recap_histories")
    .select("*")
    .eq("country", country)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(
      `Gagal mengambil riwayat rekapan: ${error.message}`,
    );
  }

  return (data ?? []) as RecapHistory[];
}
