import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type ManualShippingBatchStatus =
  | "Aktif"
  | "Selesai"
  | "Dibatalkan";

export type ManualShippingBatch = {
  id: string;

  event_name: string;

  start_date: string;

  end_date: string;

  status: ManualShippingBatchStatus;

  created_at: string;

  updated_at: string;
};

export type CreateManualShippingBatchInput = {
  event_name: string;

  start_date: string;

  end_date: string;

  status: ManualShippingBatchStatus;
};

export type UpdateManualShippingBatchInput = {
  event_name?: string;

  start_date?: string;

  end_date?: string;

  status?: ManualShippingBatchStatus;
};

/* =========================================
   CONSTANTS
========================================= */

const VALID_STATUSES: ManualShippingBatchStatus[] = [
  "Aktif",
  "Selesai",
  "Dibatalkan",
];

/* =========================================
   VALIDATION HELPERS
========================================= */

/**
 * Validasi status batch.
 */
function isValidStatus(
  status: string,
): status is ManualShippingBatchStatus {
  return VALID_STATUSES.includes(
    status as ManualShippingBatchStatus,
  );
}

/**
 * Validasi tanggal format YYYY-MM-DD.
 */
function isValidDate(
  value: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  return !Number.isNaN(
    date.getTime(),
  );
}

/**
 * Validasi event name.
 */
function validateEventName(
  eventName: string,
): string {
  const value =
    eventName.trim();

  if (!value) {
    throw new Error(
      "Nama Event wajib diisi.",
    );
  }

  if (value.length > 255) {
    throw new Error(
      "Nama Event maksimal 255 karakter.",
    );
  }

  return value;
}

/**
 * Validasi tanggal batch.
 */
function validateDateRange(
  startDate: string,
  endDate: string,
): void {
  if (!isValidDate(startDate)) {
    throw new Error(
      "Tanggal mulai event tidak valid.",
    );
  }

  if (!isValidDate(endDate)) {
    throw new Error(
      "Tanggal berakhir event tidak valid.",
    );
  }

  const start =
    new Date(
      `${startDate}T00:00:00`,
    );

  const end =
    new Date(
      `${endDate}T00:00:00`,
    );

  if (end < start) {
    throw new Error(
      "Tanggal berakhir event tidak boleh sebelum tanggal mulai event.",
    );
  }
}

/**
 * Validasi status.
 */
function validateStatus(
  status: string,
): ManualShippingBatchStatus {
  if (
    !isValidStatus(status)
  ) {
    throw new Error(
      "Status batch tidak valid.",
    );
  }

  return status;
}

/**
 * Validasi UUID sederhana.
 */
function validateId(
  id: string,
): string {
  const value =
    id.trim();

  if (!value) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  return value;
}

/* =========================================
   CREATE BATCH
========================================= */

/**
 * Membuat batch pengiriman manual baru.
 */
export async function createManualShippingBatch(
  input: CreateManualShippingBatchInput,
): Promise<ManualShippingBatch> {
  /* -------------------------------------
     Validate input
  ------------------------------------- */

  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Data batch wajib diisi.",
    );
  }

  const eventName =
    validateEventName(
      input.event_name,
    );

  if (
    !input.start_date?.trim()
  ) {
    throw new Error(
      "Tanggal mulai event wajib diisi.",
    );
  }

  if (
    !input.end_date?.trim()
  ) {
    throw new Error(
      "Tanggal berakhir event wajib diisi.",
    );
  }

  const startDate =
    input.start_date.trim();

  const endDate =
    input.end_date.trim();

  validateDateRange(
    startDate,
    endDate,
  );

  const status =
    validateStatus(
      input.status,
    );

  /* -------------------------------------
     Insert
  ------------------------------------- */

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "manual_shipping_batches",
      )
      .insert({
        event_name:
          eventName,

        start_date:
          startDate,

        end_date:
          endDate,

        status,
      })
      .select(`
        id,
        event_name,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      `)
      .single();

  if (
    error ||
    !data
  ) {
    console.error(
      "createManualShippingBatch error:",
      error,
    );

    throw new Error(
      `Gagal membuat batch pengiriman: ${
        error?.message ??
        "Unknown error"
      }`,
    );
  }

  return data as ManualShippingBatch;
}

/* =========================================
   GET ALL BATCHES
========================================= */

/**
 * Mengambil seluruh batch pengiriman manual.
 *
 * Urutan:
 * batch terbaru dibuat ditampilkan
 * terlebih dahulu.
 */
export async function getManualShippingBatches(): Promise<
  ManualShippingBatch[]
> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "manual_shipping_batches",
      )
      .select(`
        id,
        event_name,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    console.error(
      "getManualShippingBatches error:",
      error,
    );

    throw new Error(
      `Gagal mengambil data batch pengiriman: ${error.message}`,
    );
  }

  return (
    data ??
    []
  ) as ManualShippingBatch[];
}

/* =========================================
   GET BATCH BY ID
========================================= */

/**
 * Mengambil satu batch berdasarkan ID.
 */
export async function getManualShippingBatchById(
  id: string,
): Promise<ManualShippingBatch> {
  const validId =
    validateId(id);

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "manual_shipping_batches",
      )
      .select(`
        id,
        event_name,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      `)
      .eq(
        "id",
        validId,
      )
      .single();

  if (
    error ||
    !data
  ) {
    console.error(
      "getManualShippingBatchById error:",
      error,
    );

    throw new Error(
      "Batch pengiriman tidak ditemukan.",
    );
  }

  return data as ManualShippingBatch;
}

/* =========================================
   UPDATE BATCH
========================================= */

/**
 * Mengubah data batch.
 *
 * Hanya field yang dikirim yang akan
 * diubah.
 */
export async function updateManualShippingBatch(
  id: string,
  input: UpdateManualShippingBatchInput,
): Promise<ManualShippingBatch> {
  const validId =
    validateId(id);

  /* -------------------------------------
     Validate input
  ------------------------------------- */

  if (
    !input ||
    typeof input !== "object"
  ) {
    throw new Error(
      "Data perubahan batch wajib diisi.",
    );
  }

  /* -------------------------------------
     Get existing batch
  ------------------------------------- */

  const existingBatch =
    await getManualShippingBatchById(
      validId,
    );

  /* -------------------------------------
     Build new values
  ------------------------------------- */

  const nextEventName =
    input.event_name !==
    undefined
      ? validateEventName(
          input.event_name,
        )
      : existingBatch.event_name;

  const nextStartDate =
    input.start_date !==
    undefined
      ? input.start_date.trim()
      : existingBatch.start_date;

  const nextEndDate =
    input.end_date !==
    undefined
      ? input.end_date.trim()
      : existingBatch.end_date;

  const nextStatus =
    input.status !==
    undefined
      ? validateStatus(
          input.status,
        )
      : existingBatch.status;

  /* -------------------------------------
     Validate dates
  ------------------------------------- */

  validateDateRange(
    nextStartDate,
    nextEndDate,
  );

  /* -------------------------------------
     Update
  ------------------------------------- */

  const updatedAt =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "manual_shipping_batches",
      )
      .update({
        event_name:
          nextEventName,

        start_date:
          nextStartDate,

        end_date:
          nextEndDate,

        status:
          nextStatus,

        updated_at:
          updatedAt,
      })
      .eq(
        "id",
        validId,
      )
      .select(`
        id,
        event_name,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      `)
      .single();

  if (
    error ||
    !data
  ) {
    console.error(
      "updateManualShippingBatch error:",
      error,
    );

    throw new Error(
      `Gagal memperbarui batch pengiriman: ${
        error?.message ??
        "Unknown error"
      }`,
    );
  }

  return data as ManualShippingBatch;
}

/* =========================================
   DELETE BATCH
========================================= */

/**
 * Menghapus batch pengiriman.
 *
 * Karena manual_shipments.batch_id
 * menggunakan ON DELETE CASCADE,
 * seluruh pengiriman di dalam batch
 * juga akan ikut terhapus.
 */
export async function deleteManualShippingBatch(
  id: string,
): Promise<void> {
  const validId =
    validateId(id);

  /* -------------------------------------
     Ensure batch exists
  ------------------------------------- */

  await getManualShippingBatchById(
    validId,
  );

  /* -------------------------------------
     Delete
  ------------------------------------- */

  const {
    error,
  } =
    await supabase
      .from(
        "manual_shipping_batches",
      )
      .delete()
      .eq(
        "id",
        validId,
      );

  if (error) {
    console.error(
      "deleteManualShippingBatch error:",
      error,
    );

    throw new Error(
      `Gagal menghapus batch pengiriman: ${error.message}`,
    );
  }
}