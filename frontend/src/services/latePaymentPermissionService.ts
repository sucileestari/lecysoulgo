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

export type LatePaymentStatus =
  | "unpaid"
  | "paid";

export type LatePaymentType =
  | "DP"
  | "PELUNASAN";

/* =========================================
   PERMISSION ITEM
========================================= */

export type LatePaymentPermissionItem = {
  id: string;

  permission_id: string;

  recap_id: string;

  payment_type: LatePaymentType;

  created_at: string;

  recap?: {
    id: string;

    detail_barang: string;

    member_id: string;
  } | null;
};

/* =========================================
   PERMISSION
========================================= */

export type LatePaymentPermission = {
  id: string;

  member_id: string;

  reason: string;

  payment_date: string;

  payment_status: LatePaymentStatus;

  paid_at: string | null;

  created_at: string;

  updated_at: string;

  member?: {
    id: string;

    name: string;

    phone: string;
  } | null;

  items: LatePaymentPermissionItem[];
};

/* =========================================
   RECAP OPTION
========================================= */

export type LatePaymentRecapOption = {
  recap_id: string;

  member_id: string;

  member_name: string;

  detail_barang: string;

  payment_type: LatePaymentType;

  /**
   * Tanggal maksimal pembayaran
   * untuk payment tersebut.
   */
  reference_date: string;

  /**
   * Batas maksimal tanggal pembayaran
   * untuk pengajuan ijin.
   *
   * Nilai ini = reference_date + 14 hari.
   */
  max_payment_date: string;

  batch_id: string;
};

/* =========================================
   RECAP OPTIONS RESPONSE
========================================= */

/**
 * Response:
 *
 * GET
 * /api/late-payment-permissions/recap-options
 *
 * members:
 * Semua member yang pernah memiliki
 * rekapan.
 *
 * items:
 * Hanya barang/payment yang memenuhi
 * syarat untuk pengajuan ijin.
 */
export type LatePaymentRecapOptionsResponse = {
  members: {
    id: string;

    name: string;

    phone: string;
  }[];

  items: LatePaymentRecapOption[];
};

/* =========================================
   CREATE INPUT
========================================= */

export type CreateLatePaymentPermissionInput = {
  member_id: string;

  items: {
    recap_id: string;

    payment_type: LatePaymentType;
  }[];

  reason: string;

  payment_date: string;
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
   PARSE RESPONSE
========================================= */

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let result: ApiResponse<T>;

  try {
    result =
      await response.json();
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status}).`,
    );
  }

  /* ---------------------------------------
     HTTP ERROR
  --------------------------------------- */

  if (!response.ok) {
    throw new Error(
      !result.success
        ? result.message ||
            `Request gagal (${response.status}).`
        : `Request gagal (${response.status}).`,
    );
  }

  /* ---------------------------------------
     API ERROR
  --------------------------------------- */

  if (!result.success) {
    throw new Error(
      result.message ||
        "Request gagal.",
    );
  }

  return result.data;
}

/* =========================================
   GET ALL PERMISSIONS
========================================= */

/**
 * GET:
 * /api/late-payment-permissions
 *
 * Mengambil seluruh data ijin telat bayar.
 *
 * Status yang dikembalikan:
 *
 * - unpaid
 * - paid
 *
 * Status paid berasal dari backend dan
 * tidak diubah secara manual dari frontend.
 */
export async function getLatePaymentPermissions(): Promise<
  LatePaymentPermission[]
> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/late-payment-permissions`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  return parseResponse<
    LatePaymentPermission[]
  >(response);
}

/* =========================================
   GET RECAP OPTIONS
========================================= */

/**
 * GET:
 * /api/late-payment-permissions/recap-options
 *
 * Response:
 *
 * {
 *   members: [...],
 *   items: [...]
 * }
 *
 * members:
 * Semua member yang pernah mempunyai
 * rekapan.
 *
 * items:
 * Hanya barang/payment yang memenuhi
 * syarat pengajuan ijin.
 *
 * Business rule dari backend:
 *
 * 1. DP belum paid
 *    -> DP dapat dipilih.
 *
 * 2. DP sudah paid dan
 *    Pelunasan belum paid
 *    -> Pelunasan dapat dipilih.
 *
 * 3. DP dan Pelunasan sudah paid
 *    -> tidak ditampilkan.
 *
 * 4. Tanggal maksimal pembayaran
 *    harus memenuhi aturan H-2.
 *
 * 5. Member yang sudah mempunyai
 *    permission unpaid tetap dikembalikan
 *    pada daftar members.
 *
 *    Frontend menampilkannya sebagai
 *    disabled.
 */
export async function getLatePaymentRecapOptions(): Promise<LatePaymentRecapOptionsResponse> {
  const response =
    await fetch(
      `${API_BASE_URL}/api/late-payment-permissions/recap-options`,
      {
        method: "GET",

        headers: {
          Accept:
            "application/json",
        },
      },
    );

  return parseResponse<
    LatePaymentRecapOptionsResponse
  >(response);
}

/* =========================================
   CREATE PERMISSION
========================================= */

/**
 * POST:
 * /api/late-payment-permissions
 *
 * Membuat pengajuan ijin telat bayar.
 *
 * Nominal payment tidak dikirim dari sini.
 *
 * Backend akan menentukan validitas:
 *
 * - member
 * - item
 * - payment type
 * - H-2
 * - tanggal pembayaran
 * - satu member hanya memiliki
 *   satu permission unpaid
 */
export async function createLatePaymentPermission(
  input: CreateLatePaymentPermissionInput,
): Promise<LatePaymentPermission> {
  /* ---------------------------------------
     VALIDATE INPUT
  --------------------------------------- */

  if (
    !input ||
    typeof input !==
      "object"
  ) {
    throw new Error(
      "Data ijin telat bayar wajib diisi.",
    );
  }

  /* ---------------------------------------
     VALIDATE MEMBER
  --------------------------------------- */

  if (
    !input.member_id?.trim()
  ) {
    throw new Error(
      "Nama pembeli wajib dipilih.",
    );
  }

  /* ---------------------------------------
     VALIDATE ITEMS
  --------------------------------------- */

  if (
    !Array.isArray(
      input.items,
    ) ||
    input.items.length ===
      0
  ) {
    throw new Error(
      "Minimal satu barang harus dipilih.",
    );
  }

  /* ---------------------------------------
     VALIDATE ITEM
  --------------------------------------- */

  const hasInvalidItem =
    input.items.some(
      (item) =>
        !item ||
        typeof item.recap_id !==
          "string" ||
        !item.recap_id.trim() ||
        (
          item.payment_type !==
            "DP" &&
          item.payment_type !==
            "PELUNASAN"
        ),
    );

  if (
    hasInvalidItem
  ) {
    throw new Error(
      "Detail barang atau tipe pembayaran tidak valid.",
    );
  }

  /* ---------------------------------------
     VALIDATE DUPLICATE ITEM
  --------------------------------------- */

  const uniqueItems =
    new Set(
      input.items.map(
        (item) =>
          `${item.recap_id.trim()}:${item.payment_type}`,
      ),
    );

  if (
    uniqueItems.size !==
    input.items.length
  ) {
    throw new Error(
      "Barang yang sama tidak boleh dipilih dua kali.",
    );
  }

  /* ---------------------------------------
     VALIDATE REASON
  --------------------------------------- */

  if (
    !input.reason?.trim()
  ) {
    throw new Error(
      "Alasan telat wajib diisi.",
    );
  }

  /* ---------------------------------------
     VALIDATE PAYMENT DATE
  --------------------------------------- */

  if (
    !input.payment_date?.trim()
  ) {
    throw new Error(
      "Perkiraan tanggal pembayaran wajib diisi.",
    );
  }

  /* ---------------------------------------
     CREATE REQUEST
  --------------------------------------- */

  const response =
    await fetch(
      `${API_BASE_URL}/api/late-payment-permissions`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",
        },

        body: JSON.stringify({
          member_id:
            input.member_id.trim(),

          items:
            input.items.map(
              (item) => ({
                recap_id:
                  item.recap_id.trim(),

                payment_type:
                  item.payment_type,
              }),
            ),

          reason:
            input.reason.trim(),

          payment_date:
            input.payment_date.trim(),
        }),
      },
    );

  return parseResponse<
    LatePaymentPermission
  >(response);
}