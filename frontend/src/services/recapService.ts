/* =========================================
   API BASE URL
========================================= */

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

export type Recap = {
  id: string;

  batch_id: string;

  member_id: string;

  detail_barang: string;

  qty: number;

  harga_barang: number;

  total_harga: number;

  persentase_dp: number;

  total_dp: number;

  sisa_pelunasan: number;

  /*
   * Status Checkout (CO).
   *
   * false = Belum
   * true  = Sudah
   */
  sudah_co: boolean;

  created_at: string;

  updated_at: string;

  member?: {
    id: string;

    name: string;

    phone: string;
  } | null;
};

/* =========================================
   CREATE INPUT
========================================= */

export type CreateRecapInput = {
  batch_id: string;

  /*
   * Bisa memilih lebih dari satu member.
   */
  member_ids: string[];

  detail_barang: string;

  qty: number;

  harga_barang: number;

  persentase_dp: number;
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
   PARSE RESPONSE
========================================= */

async function parseResponse<T>(
  response: Response,
): Promise<ApiResponse<T>> {
  let result: unknown;

  try {
    result =
      await response.json();
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
   GET RECAPS BY BATCH
========================================= */

/**
 * Mengambil semua rekapan
 * berdasarkan batch.
 *
 * GET:
 * /api/recaps?batch_id=UUID
 */
export async function getRecaps(
  batchId: string,
): Promise<Recap[]> {
  if (!batchId.trim()) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/recaps?batch_id=${encodeURIComponent(
        batchId,
      )}`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const result =
    await parseResponse<
      Recap[]
    >(response);

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal mengambil data rekapan.",
    );
  }

  return result.data;
}

/* =========================================
   CREATE RECAPS
========================================= */

/**
 * Menambahkan rekapan.
 *
 * Satu request dapat memiliki
 * beberapa member.
 *
 * POST:
 * /api/recaps
 */
export async function createRecaps(
  input: CreateRecapInput,
): Promise<Recap[]> {
  /* -------------------------------------
     Validation
  ------------------------------------- */

  if (
    !input.batch_id.trim()
  ) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  if (
    !Array.isArray(
      input.member_ids,
    ) ||
    input.member_ids.length === 0
  ) {
    throw new Error(
      "Minimal pilih satu pembeli.",
    );
  }

  if (
    !input.detail_barang.trim()
  ) {
    throw new Error(
      "Detail barang wajib diisi.",
    );
  }

  if (
    !Number.isInteger(
      input.qty,
    ) ||
    input.qty <= 0
  ) {
    throw new Error(
      "Qty harus lebih besar dari 0.",
    );
  }

  if (
    !Number.isFinite(
      input.harga_barang,
    ) ||
    input.harga_barang < 0
  ) {
    throw new Error(
      "Harga barang tidak valid.",
    );
  }

  if (
    !Number.isFinite(
      input.persentase_dp,
    ) ||
    input.persentase_dp < 0 ||
    input.persentase_dp > 100
  ) {
    throw new Error(
      "Persentase DP harus antara 0 sampai 100.",
    );
  }

  /* -------------------------------------
     Request
  ------------------------------------- */

  const response =
    await fetch(
      `${API_BASE_URL}/api/recaps`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body: JSON.stringify({
          batch_id:
            input.batch_id,

          member_ids:
            input.member_ids,

          detail_barang:
            input.detail_barang.trim(),

          qty:
            input.qty,

          harga_barang:
            input.harga_barang,

          persentase_dp:
            input.persentase_dp,
        }),
      },
    );

  const result =
    await parseResponse<
      Recap[]
    >(response);

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal menambahkan rekapan.",
    );
  }

  return result.data;
}

/* =========================================
   MARK RECAP AS CO
========================================= */

/**
 * Menandai satu barang sebagai
 * sudah CO.
 *
 * PATCH:
 * /api/recaps/:id/co
 *
 * Flow:
 *
 * Belum
 *   ↓
 * klik button
 *   ↓
 * Sudah
 *
 * Endpoint backend juga memastikan:
 * - DP sudah paid
 * - Pelunasan sudah paid
 * - belum pernah CO sebelumnya
 *
 * Tidak ada endpoint untuk:
 * Sudah → Belum
 */
export async function markRecapAsCheckedOut(
  id: string,
): Promise<Recap> {
  /* -------------------------------------
     Validation
  ------------------------------------- */

  if (!id.trim()) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  /* -------------------------------------
     Request
  ------------------------------------- */

  const response =
    await fetch(
      `${API_BASE_URL}/api/recaps/${encodeURIComponent(
        id.trim(),
      )}/co`,
      {
        method: "PATCH",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  /* -------------------------------------
     Parse response
  ------------------------------------- */

  const result =
    await parseResponse<
      Recap
    >(response);

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal menandai barang sebagai Sudah CO.",
    );
  }

  return result.data;
}

/* =========================================
   DELETE RECAP
========================================= */

/**
 * Menghapus satu rekapan.
 *
 * DELETE:
 * /api/recaps/:id
 */
export async function deleteRecap(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/recaps/${encodeURIComponent(
        id,
      )}`,
      {
        method: "DELETE",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  const result =
    await parseResponse<unknown>(
      response,
    );

  if (!result.success) {
    throw new Error(
      result.message ||
        "Gagal menghapus rekapan.",
    );
  }
}