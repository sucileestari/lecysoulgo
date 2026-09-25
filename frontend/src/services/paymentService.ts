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

export type PaymentType =
  | "DP"
  | "PELUNASAN";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "unpaid";

export type LatePaymentPermissionSummary = {
  id: string;

  payment_date: string;

  created_at: string;

  status:
    | "unpaid"
    | "paid";
};

export type Payment = {
  id: string;

  recap_id: string | null;

  manual_shipment_id?: string | null;

  payment_type: PaymentType;

  /**
   * Nominal pembayaran saat ini.
   *
   * Bisa sudah termasuk denda.
   */
  amount: number;

  /**
   * Nominal pembayaran terbaru yang harus dibayar.
   */
  current_amount?: number;

  status: Exclude<
    PaymentStatus,
    "unpaid"
  >;

  provider: string;

  /**
   * Order ID dari payment provider.
   */
  provider_order_id?:
    | string
    | null;

  /**
   * Transaction ID dari payment provider.
   */
  provider_transaction_id:
    | string
    | null;

  /**
   * URL Payment Link Midtrans.
   */
  payment_url?:
    | string
    | null;

  /**
   * Waktu Payment Link expired.
   */
  expires_at?:
    | string
    | null;

  /**
   * Metode pembayaran.
   *
   * Contoh:
   * qris
   * bank_transfer
   * gopay
   */
  payment_method?:
    | string
    | null;

  paid_at:
    | string
    | null;

  created_at: string;

  updated_at: string;

  /**
   * Nominal dasar sebelum denda.
   */
  base_amount?: number;

  /**
   * Jumlah hari yang dikenakan denda.
   */
  penalty_days?: number;

  /**
   * Total denda yang sudah ditambahkan.
   */
  penalty_amount?: number;

  /**
   * Tanggal maksimal pembayaran.
   */
  due_date?:
    | string
    | null;

  /**
   * Ijin telat bayar yang sedang
   * mem-pause denda.
   */
  late_payment_permission?:
    | LatePaymentPermissionSummary
    | null;
};

/* =========================================
   PAYMENT LINK RESULT
========================================= */

export type GeneratePaymentLinkResult = {
  payment: Payment;

  paymentUrl: string;

  expiresAt: string;
};

/* =========================================
   PAYMENT SUMMARY
========================================= */

export type PaymentSummary = {
  recap_id: string;

  buyer: {
    id: string | null;

    name: string | null;

    phone: string | null;
  };

  total_harga: number;

  dp: {
    /**
     * Nominal yang harus dibayar saat ini.
     */
    amount: number;

    /**
     * Nominal dasar sebelum denda.
     */
    base_amount: number;

    /**
     * Jumlah hari keterlambatan.
     */
    penalty_days: number;

    /**
     * Total denda.
     */
    penalty_amount: number;

    /**
     * Tanggal maksimal pembayaran DP.
     */
    due_date:
      | string
      | null;

    status: PaymentStatus;

    paid_at:
      | string
      | null;

    /**
     * Ijin telat bayar aktif.
     *
     * null = tidak sedang dalam ijin.
     */
    late_payment_permission:
      | LatePaymentPermissionSummary
      | null;

    payment:
      | Payment
      | null;
  };

  pelunasan: {
    /**
     * Nominal yang harus dibayar saat ini.
     */
    amount: number;

    /**
     * Nominal dasar sebelum denda.
     */
    base_amount: number;

    /**
     * Jumlah hari keterlambatan.
     */
    penalty_days: number;

    /**
     * Total denda.
     */
    penalty_amount: number;

    /**
     * Tanggal maksimal pembayaran pelunasan.
     */
    due_date:
      | string
      | null;

    status: PaymentStatus;

    /**
     * Pelunasan baru bisa dibayar
     * setelah DP paid.
     */
    can_pay: boolean;

    paid_at:
      | string
      | null;

    /**
     * Ijin telat bayar aktif.
     */
    late_payment_permission:
      | LatePaymentPermissionSummary
      | null;

    payment:
      | Payment
      | null;
  };
};

/* =========================================
   CREATE PAYMENT INPUT
========================================= */

export type CreatePaymentInput = {
  recap_id?: string;

  manual_shipment_id?: string;

  payment_type: PaymentType;
};

/* =========================================
   MANUAL SHIPMENT PAYMENT SUMMARY
========================================= */

export type ManualShipmentPaymentSummary = {
  shipment_id: string;

  amount: number;

  base_amount: number;

  penalty_days: number;

  penalty_amount: number;

  due_date: string | null;

  status: PaymentStatus;

  paid_at: string | null;

  payment: Payment | null;
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
   AUTH
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
   VALIDATION
========================================= */

function validateStringId(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !==
      "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} wajib diisi.`,
    );
  }

  return value.trim();
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
      await response.json();
  } catch {
    throw new Error(
      `Server mengembalikan response tidak valid (${response.status})`,
    );
  }

  if (!response.ok) {
    throw new Error(
      !result.success
        ? result.message ||
            `Request gagal (${response.status})`
        : `Request gagal (${response.status})`,
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
   GET PAYMENT SUMMARY
========================================= */

/**
 * GET:
 * /api/payments/recap/:recapId
 *
 * Mengambil summary pembayaran
 * beserta informasi denda dan ijin
 * telat bayar.
 */
export async function getPaymentSummary(
  recapId: string,
): Promise<PaymentSummary> {
  const token =
    getAuthToken();

  const validRecapId =
    validateStringId(
      recapId,
      "ID rekapan",
    );

  const response =
    await fetch(
      `${API_BASE_URL}/api/payments/recap/${encodeURIComponent(
        validRecapId,
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

  return parseResponse<PaymentSummary>(
    response,
  );
}

/* =========================================
   GET PAYMENTS BY RECAP
========================================= */

/**
 * GET:
 * /api/payments/recap/:recapId/history
 *
 * Mengambil seluruh riwayat pembayaran.
 */
export async function getPaymentsByRecap(
  recapId: string,
): Promise<Payment[]> {
  const token =
    getAuthToken();

  const validRecapId =
    validateStringId(
      recapId,
      "ID rekapan",
    );

  const response =
    await fetch(
      `${API_BASE_URL}/api/payments/recap/${encodeURIComponent(
        validRecapId,
      )}/history`,
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

  return parseResponse<Payment[]>(
    response,
  );
}

/* =========================================
   GET MANUAL SHIPMENT PAYMENT
========================================= */

/**
 * GET:
 * /api/payments/manual-shipment/:shipmentId
 *
 * Mengambil payment terbaru dari
 * manual shipment.
 */
export async function getManualShipmentPayment(
  manualShipmentId: string,
): Promise<Payment | null> {
  const token =
    getAuthToken();

  const validShipmentId =
    validateStringId(
      manualShipmentId,
      "ID manual shipment",
    );

  const response =
    await fetch(
      `${API_BASE_URL}/api/payments/manual-shipment/${encodeURIComponent(
        validShipmentId,
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

  return parseResponse<Payment | null>(
    response,
  );
}

/* =========================================
   GET MANUAL SHIPMENT PAYMENT SUMMARY
========================================= */

/**
 * GET:
 * /api/payments/manual-shipment/:shipmentId/summary
 *
 * Mengambil summary pembayaran Manual Shipping
 * beserta informasi denda.
 */
export async function getManualShipmentPaymentSummary(
  manualShipmentId: string,
): Promise<ManualShipmentPaymentSummary> {
  const token =
    getAuthToken();

  const validShipmentId =
    validateStringId(
      manualShipmentId,
      "ID manual shipment",
    );

  const response =
    await fetch(
      `${API_BASE_URL}/api/payments/manual-shipment/${encodeURIComponent(
        validShipmentId,
      )}/summary`,
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

  return parseResponse<ManualShipmentPaymentSummary>(
    response,
  );
}

/* =========================================
   GET PAYMENT HISTORY
========================================= */

/**
 * Alias untuk getPaymentsByRecap().
 */
export async function getPaymentHistory(
  recapId: string,
): Promise<Payment[]> {
  return getPaymentsByRecap(
    recapId,
  );
}

/* =========================================
   CREATE PAYMENT
========================================= */

/**
 * POST:
 * /api/payments
 *
 * Nominal tidak dikirim frontend.
 *
 * Backend menentukan nominal berdasarkan:
 *
 * - nominal dasar
 * - tanggal jatuh tempo
 * - jumlah hari telat
 * - denda
 * - ijin telat bayar
 *
 * Sumber pembayaran bisa:
 *
 * - recap_id
 * - manual_shipment_id
 */
export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  /* -------------------------------------
     Validate input
  ------------------------------------- */

  if (
    !input ||
    typeof input !==
      "object"
  ) {
    throw new Error(
      "Data pembayaran wajib diisi.",
    );
  }

  const hasRecapId =
    typeof input.recap_id ===
      "string" &&
    input.recap_id.trim();

  const hasManualShipmentId =
    typeof input.manual_shipment_id ===
      "string" &&
    input.manual_shipment_id.trim();

  if (
    (!hasRecapId &&
      !hasManualShipmentId) ||
    (hasRecapId &&
      hasManualShipmentId)
  ) {
    throw new Error(
      "Harus mengisi salah satu ID: rekapan atau manual shipping.",
    );
  }

  if (
    input.payment_type !==
      "DP" &&
    input.payment_type !==
      "PELUNASAN"
  ) {
    throw new Error(
      "Tipe pembayaran tidak valid.",
    );
  }

  if (
    hasManualShipmentId &&
    input.payment_type !==
      "PELUNASAN"
  ) {
    throw new Error(
      "Manual Shipping hanya dapat menggunakan pembayaran PELUNASAN.",
    );
  }

  /* -------------------------------------
     AUTH TOKEN
  ------------------------------------- */

  const token =
    getAuthToken();

  /* -------------------------------------
     Request
  ------------------------------------- */

  const response =
    await fetch(
      `${API_BASE_URL}/api/payments`,
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
          ...(hasRecapId
            ? {
                recap_id:
                  input.recap_id!.trim(),
              }
            : {
                manual_shipment_id:
                  input.manual_shipment_id!.trim(),
              }),

          payment_type:
            input.payment_type,
        }),
      },
    );

  return parseResponse<Payment>(
    response,
  );
}

/* =========================================
   GENERATE MIDTRANS PAYMENT LINK
========================================= */

/**
 * POST:
 * /api/payments/:id/generate-link
 *
 * Backend:
 *
 * - menghitung nominal terbaru
 * - mengecek denda
 * - mengecek Payment Link lama
 * - memakai link lama jika masih valid
 * - membuat link baru jika diperlukan
 */
export async function generatePaymentLink(
  paymentId: string,
): Promise<GeneratePaymentLinkResult> {
  const validPaymentId =
    validateStringId(
      paymentId,
      "ID pembayaran",
    );

  /* -------------------------------------
     AUTH TOKEN
  ------------------------------------- */

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/payments/${encodeURIComponent(
        validPaymentId,
      )}/generate-link`,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  return parseResponse<GeneratePaymentLinkResult>(
    response,
  );
}

/* =========================================
   SIMULATE PAYMENT SUCCESS
========================================= */

/**
 * POST:
 * /api/payments/:id/simulate-success
 *
 * Hanya untuk development/testing.
 *
 * Setelah payment menjadi paid,
 * backend juga otomatis melakukan
 * sinkronisasi status ijin telat bayar.
 *
 * Nanti tidak digunakan lagi setelah
 * flow Midtrans sudah aktif sepenuhnya.
 */
export async function simulatePaymentSuccess(
  paymentId: string,
): Promise<Payment> {
  const validPaymentId =
    validateStringId(
      paymentId,
      "ID pembayaran",
    );

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/payments/${encodeURIComponent(
        validPaymentId,
      )}/simulate-success`,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  return parseResponse<Payment>(
    response,
  );
}