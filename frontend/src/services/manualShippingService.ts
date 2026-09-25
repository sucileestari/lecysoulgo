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

export type ManualShipmentShippingStatus =
  | "sedang_dikemas"
  | "dalam_proses_pick_up";

export type ManualShipmentPaymentStatus =
  | "unpaid"
  | "paid";

export type ManualShipmentExpedition =
  | "JNE"
  | "J&T"
  | "Sicepat"
  | "Grab/Gojek Instant";

/* =========================================
   SHIPMENT ITEM
========================================= */

export type ManualShipmentItem = {
  id: string;

  shipment_id: string;

  recap_id: string;

  created_at: string;

  recap?: {
    id: string;

    batch_id: string;

    member_id: string;

    detail_barang: string;

    qty: number;

    harga_barang: number;

    total_harga: number;

    sudah_co: boolean;

    batch?: {
      id: string;
      name: string;
      country: string;
    } | null;

    member?: {
      id: string;
      name: string;
      phone: string;
      type?: string | null;
    } | null;
  } | null;
};

/* =========================================
   SHIPMENT
========================================= */

export type ManualShipment = {
  id: string;

  batch_id: string;

  member_id: string;

  address: string;

  expedition: ManualShipmentExpedition;

  packing_price: number;

  shipping_price: number;

  total_price: number;

  shipping_status: ManualShipmentShippingStatus;

  payment_status: ManualShipmentPaymentStatus;

  due_date: string | null;

  paid_at: string | null;

  created_at: string;

  updated_at: string;

  member?: {
    id: string;
    name: string;
    phone: string;
    type?: string | null;
  } | null;

  items: ManualShipmentItem[];
};

/* =========================================
   OPTIONS
========================================= */

export type ManualShipmentOptionMember = {
  id: string;

  name: string;

  phone: string;
};

export type ManualShipmentOptionItem = {
  recap_id: string;

  member_id: string;

  member_name: string;

  detail_barang: string;

  qty: number;

  reference_date: string;

  batch_id: string;

  batch_name: string;

  batch_country: string;
};

export type ManualShipmentOptions = {
  members: ManualShipmentOptionMember[];

  items: ManualShipmentOptionItem[];
};

/* =========================================
   CREATE INPUT
========================================= */

export type CreateManualShipmentInput = {
  batch_id: string;

  member_id: string;

  recap_ids: string[];

  address: string;

  expedition: ManualShipmentExpedition;

  due_date?: string | null;

  packing_price?: number;

  shipping_price?: number;

  no_resi?: string | null;

  shipping_status?: ManualShipmentShippingStatus;

  payment_status?: ManualShipmentPaymentStatus;
};

/* =========================================
   UPDATE INPUT
========================================= */

export type UpdateManualShipmentInput = {
  member_id?: string;

  no_resi?: string | null;

  recap_ids?: string[];

  address?: string;

  expedition?: ManualShipmentExpedition;

  due_date?: string | null;

  packing_price?: number;

  shipping_price?: number;

  shipping_status?: ManualShipmentShippingStatus;

  payment_status?: ManualShipmentPaymentStatus;
};

/* =========================================
   API RESPONSE
========================================= */

type ApiSuccess<T> = {
  success: true;

  data: T;

  message?: string;
};

type ApiSuccessWithoutData = {
  success: true;

  message?: string;
};

type ApiError = {
  success: false;

  message?: string;
};

type ApiResponse<T> =
  | ApiSuccess<T>
  | ApiError;

// type ApiDeleteResponse =
//   | ApiSuccessWithoutData
//   | ApiError;

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
   RESPONSE PARSER
========================================= */

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  let result:
    | ApiResponse<T>
    | ApiSuccessWithoutData;

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

  if (
    !("data" in result)
  ) {
    return undefined as T;
  }

  return result.data as T;
}

/* =========================================
   GET SHIPMENTS BY BATCH
========================================= */

/**
 * GET
 * /api/manual-shipments?batch_id=UUID
 */
export async function getManualShipmentsByBatch(
  batchId: string,
): Promise<ManualShipment[]> {
  if (
    !batchId?.trim()
  ) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipments?batch_id=${encodeURIComponent(
        batchId.trim(),
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
    ManualShipment[]
  >(response);
}

/* =========================================
   GET SHIPMENT BY ID
========================================= */

/**
 * GET
 * /api/manual-shipments/:id
 */
export async function getManualShipmentById(
  id: string,
): Promise<ManualShipment> {
  if (!id?.trim()) {
    throw new Error(
      "ID pengiriman wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipments/${encodeURIComponent(
        id.trim(),
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
    ManualShipment
  >(response);
}

/* =========================================
   GET OPTIONS
========================================= */

/**
 * GET
 * /api/manual-shipments/options
 *
 * GET
 * /api/manual-shipments/options?batch_id=UUID
 */
export async function getManualShipmentOptions(
  batchId?: string,
): Promise<ManualShipmentOptions> {
  const params =
    batchId?.trim()
      ? `?batch_id=${encodeURIComponent(
          batchId.trim(),
        )}`
      : "";

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipments/options${params}`,
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
    ManualShipmentOptions
  >(response);
}

/* =========================================
   CREATE SHIPMENT
========================================= */

/**
 * POST
 * /api/manual-shipments
 */
export async function createManualShipment(
  input: CreateManualShipmentInput,
): Promise<ManualShipment> {
  if (
    !input.batch_id?.trim()
  ) {
    throw new Error(
      "ID batch wajib diisi.",
    );
  }

  if (
    !input.member_id?.trim()
  ) {
    throw new Error(
      "Nama pembeli wajib dipilih.",
    );
  }

  if (
    !Array.isArray(
      input.recap_ids,
    ) ||
    input.recap_ids.length ===
      0
  ) {
    throw new Error(
      "Minimal satu barang harus dipilih.",
    );
  }

  if (
    !input.address?.trim()
  ) {
    throw new Error(
      "Alamat lengkap wajib diisi.",
    );
  }

  if (
    !input.expedition
  ) {
    throw new Error(
      "Ekspedisi wajib dipilih.",
    );
  }

  const packingPrice =
    input.packing_price ?? 0;

  const shippingPrice =
    input.shipping_price ?? 0;

  if (
    !Number.isFinite(
      packingPrice,
    ) ||
    packingPrice < 0
  ) {
    throw new Error(
      "Harga packing tidak valid.",
    );
  }

  if (
    !Number.isFinite(
      shippingPrice,
    ) ||
    shippingPrice < 0
  ) {
    throw new Error(
      "Harga ongkos kirim tidak valid.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipments`,
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
          batch_id:
            input.batch_id.trim(),

          member_id:
            input.member_id.trim(),

          no_resi:
            input.no_resi?.trim() || null,

          recap_ids:
            input.recap_ids.map(
              (recapId) =>
                recapId.trim(),
            ),

          address:
            input.address.trim(),

          expedition:
            input.expedition,

          due_date:
            input.due_date?.trim() || null,

          packing_price:
            packingPrice,

          shipping_price:
            shippingPrice,

          ...(input.shipping_status
            ? {
                shipping_status:
                  input.shipping_status,
              }
            : {}),

          ...(input.payment_status
            ? {
                payment_status:
                  input.payment_status,
              }
            : {}),
        }),
      },
    );

  return parseResponse<
    ManualShipment
  >(response);
}

/* =========================================
   UPDATE SHIPMENT
========================================= */

/**
 * PUT
 * /api/manual-shipments/:id
 */
export async function updateManualShipment(
  id: string,
  input: UpdateManualShipmentInput,
): Promise<ManualShipment> {
  if (!id?.trim()) {
    throw new Error(
      "ID pengiriman wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipments/${encodeURIComponent(
        id.trim(),
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
          input,
        ),
      },
    );

  return parseResponse<
    ManualShipment
  >(response);
}

/* =========================================
   DELETE SHIPMENT
========================================= */

/**
 * DELETE
 * /api/manual-shipments/:id
 */
export async function deleteManualShipment(
  id: string,
): Promise<void> {
  if (!id?.trim()) {
    throw new Error(
      "ID pengiriman wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipments/${encodeURIComponent(
        id.trim(),
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
    undefined
  >(response);
}