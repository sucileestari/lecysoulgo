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
   AUTH TOKEN
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

function validateString(
  value: unknown,
  fieldName: string,
): string {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${fieldName} wajib diisi.`,
    );
  }

  return value.trim();
}

function validateDate(
  value: unknown,
  fieldName: string,
): string {
  const dateValue =
    validateString(
      value,
      fieldName,
    );

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(
      dateValue,
    )
  ) {
    throw new Error(
      `${fieldName} tidak valid.`,
    );
  }

  const date =
    new Date(
      `${dateValue}T00:00:00`,
    );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    throw new Error(
      `${fieldName} tidak valid.`,
    );
  }

  return dateValue;
}

function validateStatus(
  value: unknown,
): ManualShippingBatchStatus {
  if (
    value !== "Aktif" &&
    value !== "Selesai" &&
    value !== "Dibatalkan"
  ) {
    throw new Error(
      "Status batch tidak valid.",
    );
  }

  return value;
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
      `Server mengembalikan response tidak valid (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      !result.success
        ? result.message ||
            `Request gagal (${response.status}).`
        : `Request gagal (${response.status}).`,
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
   GET ALL BATCHES
========================================= */

/**
 * GET
 * /api/manual-shipping-batches
 */
export async function getManualShippingBatches(): Promise<
  ManualShippingBatch[]
> {
  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipping-batches`,
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

  return parseResponse<
    ManualShippingBatch[]
  >(response);
}

/* =========================================
   GET BATCH BY ID
========================================= */

/**
 * GET
 * /api/manual-shipping-batches/:id
 */
export async function getManualShippingBatchById(
  id: string,
): Promise<ManualShippingBatch> {
  const validId =
    validateString(
      id,
      "ID batch",
    );

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipping-batches/${encodeURIComponent(
        validId,
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

  return parseResponse<
    ManualShippingBatch
  >(response);
}

/* =========================================
   CREATE BATCH
========================================= */

/**
 * POST
 * /api/manual-shipping-batches
 */
export async function createManualShippingBatch(
  input: CreateManualShippingBatchInput,
): Promise<ManualShippingBatch> {
  if (
    !input ||
    typeof input !==
      "object"
  ) {
    throw new Error(
      "Data batch wajib diisi.",
    );
  }

  const eventName =
    validateString(
      input.event_name,
      "Nama Event",
    );

  const startDate =
    validateDate(
      input.start_date,
      "Tanggal mulai event",
    );

  const endDate =
    validateDate(
      input.end_date,
      "Tanggal berakhir event",
    );

  const status =
    validateStatus(
      input.status,
    );

  if (
    endDate < startDate
  ) {
    throw new Error(
      "Tanggal berakhir event tidak boleh sebelum tanggal mulai event.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipping-batches`,
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
          event_name:
            eventName,

          start_date:
            startDate,

          end_date:
            endDate,

          status,
        }),
      },
    );

  return parseResponse<
    ManualShippingBatch
  >(response);
}

/* =========================================
   UPDATE BATCH
========================================= */

/**
 * PUT
 * /api/manual-shipping-batches/:id
 */
export async function updateManualShippingBatch(
  id: string,
  input: UpdateManualShippingBatchInput,
): Promise<ManualShippingBatch> {
  const validId =
    validateString(
      id,
      "ID batch",
    );

  if (
    !input ||
    typeof input !==
      "object"
  ) {
    throw new Error(
      "Data perubahan batch wajib diisi.",
    );
  }

  const body: UpdateManualShippingBatchInput =
    {};

  if (
    input.event_name !==
    undefined
  ) {
    body.event_name =
      validateString(
        input.event_name,
        "Nama Event",
      );
  }

  if (
    input.start_date !==
    undefined
  ) {
    body.start_date =
      validateDate(
        input.start_date,
        "Tanggal mulai event",
      );
  }

  if (
    input.end_date !==
    undefined
  ) {
    body.end_date =
      validateDate(
        input.end_date,
        "Tanggal berakhir event",
      );
  }

  if (
    input.status !==
    undefined
  ) {
    body.status =
      validateStatus(
        input.status,
      );
  }

  /*
   * Kalau kedua tanggal dikirim,
   * validasi range di frontend.
   *
   * Backend tetap melakukan validasi
   * sebagai pengaman utama.
   */
  if (
    body.start_date &&
    body.end_date &&
    body.end_date <
      body.start_date
  ) {
    throw new Error(
      "Tanggal berakhir event tidak boleh sebelum tanggal mulai event.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipping-batches/${encodeURIComponent(
        validId,
      )}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify(
          body,
        ),
      },
    );

  return parseResponse<
    ManualShippingBatch
  >(response);
}

/* =========================================
   DELETE BATCH
========================================= */

/**
 * DELETE
 * /api/manual-shipping-batches/:id
 */
export async function deleteManualShippingBatch(
  id: string,
): Promise<void> {
  const validId =
    validateString(
      id,
      "ID batch",
    );

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipping-batches/${encodeURIComponent(
        validId,
      )}`,
      {
        method: "DELETE",

        headers: {
          Accept:
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  await parseResponse<
    unknown
  >(response);
}