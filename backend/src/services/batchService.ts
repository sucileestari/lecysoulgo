import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type BatchStatus =
  | "Akan di Order"
  | "Sudah di Order"
  | "Sudah sampai di WH"
  | "Sudah sampai di INA"
  | "Sudah sampai di Admin";

export type Country =
  | "china"
  | "indonesia"
  | "jepang"
  | "korea"
  | "thailand";

export type Batch = {
  id: string;
  country: Country;
  name: string;
  type: string;
  last_payment_dp: string;
  last_payment_pelunasan: string | null;
  status: BatchStatus;
  image_path: string | null;
  admin_nyelem_id: string | null;
  admin_rekap_id: string | null;
  image_url: string | null;
  total_order: number;
  created_at: string;
  updated_at: string;
};

export type CreateBatchInput = {
  country: Country;
  name: string;
  type: string;
  last_payment_dp: string;
  last_payment_pelunasan?: string | null;
  admin_nyelem_id: string;
  admin_rekap_id: string;
  status?: BatchStatus;
};

export type UpdateBatchInput = {
  name?: string;
  type?: string;
  last_payment_pelunasan?: string | null;
  status?: BatchStatus;
};

/* =========================================
   CONSTANT
========================================= */

const BUCKET_NAME = "batch-images";

/* =========================================
   IMAGE URL
========================================= */

function getBatchImageUrl(
  imagePath: string | null,
): string | null {
  if (!imagePath) {
    return null;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL;

  if (!supabaseUrl) {
    return null;
  }

  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${imagePath}`;
}

/* =========================================
   TOTAL ORDER
========================================= */

export async function getTotalOrderByBatchId(
  batchId: string,
): Promise<number> {
  const { data, error } =
    await supabase
      .from("recaps")
      .select("qty")
      .eq("batch_id", batchId);

  if (error) {
    throw new Error(
      `Gagal menghitung total order: ${error.message}`,
    );
  }

  return (data ?? []).reduce(
    (total, recap) => {
      return (
        total +
        Number(recap.qty ?? 0)
      );
    },
    0,
  );
}

async function getTotalOrdersByBatchIds(
  batchIds: string[],
): Promise<Map<string, number>> {
  const totalOrderMap =
    new Map<string, number>();

  if (batchIds.length === 0) {
    return totalOrderMap;
  }

  const { data, error } =
    await supabase
      .from("recaps")
      .select(`
        batch_id,
        qty
      `)
      .in(
        "batch_id",
        batchIds,
      );

  if (error) {
    throw new Error(
      `Gagal mengambil total order: ${error.message}`,
    );
  }

  for (const recap of data ?? []) {
    const batchId =
      String(recap.batch_id);

    const qty =
      Number(recap.qty ?? 0);

    const currentTotal =
      totalOrderMap.get(batchId) ?? 0;

    totalOrderMap.set(
      batchId,
      currentTotal + qty,
    );
  }

  return totalOrderMap;
}

/* =========================================
   GET BATCHES BY COUNTRY
========================================= */

export async function getBatchesByCountry(
  country: Country,
): Promise<Batch[]> {
  const { data, error } =
    await supabase
      .from("batches")
      .select("*")
      .eq("country", country)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    throw new Error(
      `Gagal mengambil data batch: ${error.message}`,
    );
  }

  const batches = data ?? [];

  const batchIds =
    batches.map((batch) =>
      String(batch.id),
    );

  const totalOrderMap =
    await getTotalOrdersByBatchIds(
      batchIds,
    );

  return batches.map(
    (batch) => ({
      ...batch,

      image_url:
        getBatchImageUrl(
          batch.image_path,
        ),

      total_order:
        totalOrderMap.get(
          String(batch.id),
        ) ?? 0,
    }),
  ) as Batch[];
}

/* =========================================
   GET BATCH BY ID
========================================= */

export async function getBatchById(
  id: string,
): Promise<Batch> {
  const { data, error } =
    await supabase
      .from("batches")
      .select("*")
      .eq("id", id)
      .single();

  if (error) {
    throw new Error(
      `Gagal mengambil data batch: ${error.message}`,
    );
  }

  const totalOrder =
    await getTotalOrderByBatchId(id);

  return {
    ...data,

    image_url:
      getBatchImageUrl(
        data.image_path,
      ),

    total_order:
      totalOrder,
  } as Batch;
}

/* =========================================
   UPLOAD IMAGE
========================================= */

export async function uploadBatchImage(
  file: Buffer,
  country: Country,
  originalFileName: string,
): Promise<string> {
  /*
   * Bersihkan nama file.
   */
  const safeFileName =
    originalFileName
      .replace(
        /[^a-zA-Z0-9._-]/g,
        "-",
      )
      .toLowerCase();

  /*
   * Ambil extension.
   */
  const extension =
    safeFileName
      .split(".")
      .pop()
      ?.toLowerCase();

  /*
   * Tentukan MIME type.
   */
  let contentType = "image/jpeg";

  if (
    extension === "jpg" ||
    extension === "jpeg"
  ) {
    contentType = "image/jpeg";
  }

  if (extension === "png") {
    contentType = "image/png";
  }

  if (extension === "webp") {
    contentType = "image/webp";
  }

  /*
   * Pastikan filename punya extension.
   */
  const finalFileName =
    safeFileName.includes(".")
      ? safeFileName
      : `${safeFileName}.jpg`;

  /*
   * Path unik.
   */
  const filePath =
    `${country}/${Date.now()}-${finalFileName}`;

  /*
   * Convert Buffer ke Uint8Array.
   *
   * Lebih aman untuk upload
   * menggunakan Supabase Storage.
   */
  const fileData =
    new Uint8Array(file);

  /*
   * Upload ke Supabase.
   */
  const { error } =
    await supabase.storage
      .from(BUCKET_NAME)
      .upload(
        filePath,
        fileData,
        {
          contentType,
          upsert: false,
        },
      );

  if (error) {
    throw new Error(
      `Gagal upload gambar batch: ${error.message}`,
    );
  }

  return filePath;
}

/* =========================================
   CREATE BATCH
========================================= */

export async function createBatch(
  input: CreateBatchInput,
  imagePath?: string | null,
): Promise<Batch> {
  const payload = {
    country: input.country,

    name: input.name.trim(),

    type: input.type.trim(),

    last_payment_dp:
      input.last_payment_dp,

    last_payment_pelunasan:
      input.last_payment_pelunasan ||
      null,

    admin_nyelem_id:
      input.admin_nyelem_id,

    admin_rekap_id:
      input.admin_rekap_id,

    status:
      input.status ??
      "Sudah di Order",

    image_path:
      imagePath ?? null,
  };

  const { data, error } =
    await supabase
      .from("batches")
      .insert(payload)
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Gagal membuat batch: ${error.message}`,
    );
  }

  return {
    ...data,

    image_url:
      getBatchImageUrl(
        data.image_path,
      ),

    total_order: 0,
  } as Batch;
}

/* =========================================
   UPDATE BATCH
========================================= */

export async function updateBatch(
  id: string,
  input: UpdateBatchInput,
  imagePath?: string | null,
): Promise<Batch> {
  const payload: Record<
    string,
    unknown
  > = {};

  if (
    typeof input.name === "string"
  ) {
    payload.name =
      input.name.trim();
  }

  if (
    typeof input.type === "string"
  ) {
    payload.type =
      input.type.trim();
  }

  if (
    input.last_payment_pelunasan !==
    undefined
  ) {
    payload.last_payment_pelunasan =
      input.last_payment_pelunasan ||
      null;
  }

  if (
    input.status !== undefined
  ) {
    payload.status =
      input.status;
  }

  /*
   * Update gambar hanya jika
   * ada gambar baru.
   */
  if (
    imagePath !== undefined &&
    imagePath !== null
  ) {
    payload.image_path =
      imagePath;
  }

  const { data, error } =
    await supabase
      .from("batches")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

  if (error) {
    throw new Error(
      `Gagal mengupdate batch: ${error.message}`,
    );
  }

  const totalOrder =
    await getTotalOrderByBatchId(id);

  return {
    ...data,

    image_url:
      getBatchImageUrl(
        data.image_path,
      ),

    total_order:
      totalOrder,
  } as Batch;
}

/* =========================================
   DELETE IMAGE
========================================= */

export async function deleteBatchImage(
  imagePath: string,
): Promise<void> {
  const { error } =
    await supabase.storage
      .from(BUCKET_NAME)
      .remove([
        imagePath,
      ]);

  if (error) {
    throw new Error(
      `Gagal menghapus gambar batch: ${error.message}`,
    );
  }
}

/* =========================================
   DELETE BATCH
========================================= */

export async function deleteBatch(
  id: string,
): Promise<void> {
  const batch =
    await getBatchById(id);

  const { error } =
    await supabase
      .from("batches")
      .delete()
      .eq("id", id);

  if (error) {
    throw new Error(
      `Gagal menghapus batch: ${error.message}`,
    );
  }

  if (batch.image_path) {
    try {
      await deleteBatchImage(
        batch.image_path,
      );
    } catch (imageError) {
      console.error(
        "Batch terhapus, tetapi gambar gagal dihapus dari Storage:",
        imageError,
      );
    }
  }
}
