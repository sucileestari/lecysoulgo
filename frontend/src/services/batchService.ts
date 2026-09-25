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

  /*
   * Admin yang menangani nyelem.
   */
  admin_nyelem_id: string | null;

  /*
   * Admin yang menangani rekap.
   */
  admin_rekap_id: string | null;

  /*
   * URL gambar dari backend.
   */
  image_url: string | null;

  /*
   * Total seluruh qty rekapan
   * yang menggunakan batch ini.
   */
  total_order: number;

  created_at: string;

  updated_at: string;
};

/* =========================================
   CREATE BATCH INPUT
========================================= */

export type CreateBatchInput = {
  country: Country;

  name: string;

  type: string;

  last_payment_dp: string;

  last_payment_pelunasan?: string | null;

  /*
   * Admin yang menangani nyelem.
   */
  admin_nyelem_id: string | null;

  /*
   * Admin yang menangani rekap.
   */
  admin_rekap_id: string | null;

  status?: BatchStatus;

  image?: File | null;
};

/* =========================================
   UPDATE BATCH INPUT
========================================= */

export type UpdateBatchInput = {
  name: string;

  type: string;

  last_payment_pelunasan?: string | null;

  status: BatchStatus;

  image?: File | null;
};

/* =========================================
   API RESPONSE TYPES
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
    localStorage.getItem("auth_token");

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
): Promise<ApiResponse<T>> {
  let result: unknown;

  try {
    result = await response.json();
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status})`,
    );
  }

  if (!response.ok) {
    const errorResponse =
      result as ApiError;

    throw new Error(
      errorResponse.message ||
        `Request gagal dengan status ${response.status}`,
    );
  }

  return result as ApiResponse<T>;
}

/* =========================================
   GET BATCHES
========================================= */

/**
 * GET /api/batches?country=china
 *
 * Mengambil seluruh batch
 * berdasarkan country.
 */
export async function getBatches(
  country: Country,
): Promise<Batch[]> {
  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/batches?country=${encodeURIComponent(
      country,
    )}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result =
    await parseResponse<Batch[]>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal mengambil data batch",
    );
  }

  return result.data;
}

/* =========================================
   GET BATCH BY ID
========================================= */

/**
 * GET /api/batches/:id
 */
export async function getBatchById(
  id: string,
): Promise<Batch> {
  if (!id.trim()) {
    throw new Error(
      "ID batch wajib diisi",
    );
  }

  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/batches/${encodeURIComponent(
      id,
    )}`,
    {
      method: "GET",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result =
    await parseResponse<Batch>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal mengambil data batch",
    );
  }

  return result.data;
}

/* =========================================
   CREATE BATCH
========================================= */

/**
 * POST /api/batches
 *
 * Menggunakan multipart/form-data
 * karena dapat mengirim gambar.
 */
export async function createBatch(
  input: CreateBatchInput,
): Promise<Batch> {
  const token = getAuthToken();

  const formData =
    new FormData();

  formData.append(
    "country",
    input.country,
  );

  formData.append(
    "name",
    input.name,
  );

  formData.append(
    "type",
    input.type,
  );

  formData.append(
    "last_payment_dp",
    input.last_payment_dp,
  );

  /*
   * Admin Nyelem.
   */
  formData.append(
    "admin_nyelem_id",
    input.admin_nyelem_id ?? "",
  );

  /*
   * Admin Rekap.
   */
  formData.append(
    "admin_rekap_id",
    input.admin_rekap_id ?? "",
  );

  /*
   * Tanggal pelunasan optional.
   */
  if (
    input.last_payment_pelunasan
  ) {
    formData.append(
      "last_payment_pelunasan",
      input.last_payment_pelunasan,
    );
  }

  /*
   * Default status.
   */
  formData.append(
    "status",
    input.status ??
      "Sudah di Order",
  );

  /*
   * Upload gambar jika ada.
   */
  if (input.image) {
    formData.append(
      "image",
      input.image,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/batches`,
    {
      method: "POST",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    },
  );

  const result =
    await parseResponse<Batch>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal menambahkan batch",
    );
  }

  return result.data;
}

/* =========================================
   UPDATE BATCH
========================================= */

/**
 * PUT /api/batches/:id
 *
 * Field yang dapat diedit:
 *
 * - name
 * - type
 * - last_payment_pelunasan
 * - status
 * - image
 *
 * last_payment_dp sengaja
 * tidak dikirim karena tidak boleh
 * diedit.
 */
export async function updateBatch(
  id: string,
  input: UpdateBatchInput,
): Promise<Batch> {
  if (!id.trim()) {
    throw new Error(
      "ID batch wajib diisi",
    );
  }

  const token = getAuthToken();

  const formData =
    new FormData();

  formData.append(
    "name",
    input.name,
  );

  formData.append(
    "type",
    input.type,
  );

  /*
   * Pelunasan boleh kosong.
   */
  formData.append(
    "last_payment_pelunasan",
    input.last_payment_pelunasan ??
      "",
  );

  formData.append(
    "status",
    input.status,
  );

  /*
   * Gambar hanya dikirim
   * jika user memilih gambar baru.
   */
  if (input.image) {
    formData.append(
      "image",
      input.image,
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/batches/${encodeURIComponent(
      id,
    )}`,
    {
      method: "PUT",

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    },
  );

  const result =
    await parseResponse<Batch>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal mengupdate batch",
    );
  }

  return result.data;
}

/* =========================================
   DELETE BATCH
========================================= */

/**
 * DELETE /api/batches/:id
 */
export async function deleteBatch(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "ID batch wajib diisi",
    );
  }

  const token = getAuthToken();

  const response = await fetch(
    `${API_BASE_URL}/api/batches/${encodeURIComponent(
      id,
    )}`,
    {
      method: "DELETE",

      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const result =
    await parseResponse<null>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal menghapus batch",
    );
  }
}
