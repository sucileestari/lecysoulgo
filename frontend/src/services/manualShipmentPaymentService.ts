export type ManualShipmentPaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled";

export type ManualShipmentPaymentProvider =
  | "simulation"
  | "midtrans";

export type ManualShipmentPayment = {
  id: string;
  shipment_id: string;
  amount: number;
  status: ManualShipmentPaymentStatus;
  provider: ManualShipmentPaymentProvider;
  provider_order_id: string | null;
  provider_transaction_id: string | null;
  payment_method: string | null;
  paid_at: string | null;
  payment_url: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "";

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

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const data =
    await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.error ||
        "Terjadi kesalahan pada pembayaran",
    );
  }

  return data;
}

/**
 * Ambil payment berdasarkan manual shipment.
 */
export async function getManualShipmentPayment(
  shipmentId: string,
): Promise<ManualShipmentPayment | null> {
  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipment-payments/shipment/${shipmentId}`,
      {
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  const result =
    await parseResponse<{
      success: boolean;
      data:
        | ManualShipmentPayment
        | null;
    }>(response);

  return result.data;
}

/**
 * Buat payment untuk manual shipment.
 *
 * Amount otomatis = manual_shipments.total_amount
 * Pembayaran = PELUNASAN 100%.
 */
export async function createManualShipmentPayment(
  shipmentId: string,
): Promise<ManualShipmentPayment> {
  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipment-payments`,
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
          shipment_id: shipmentId,
        }),
      },
    );

  const result =
    await parseResponse<{
      success: boolean;
      data: ManualShipmentPayment;
    }>(response);

  return result.data;
}

/**
 * Generate payment link Midtrans.
 */
export async function generateManualShipmentPaymentLink(
  paymentId: string,
): Promise<ManualShipmentPayment> {
  const validPaymentId =
    paymentId?.trim();

  if (!validPaymentId) {
    throw new Error(
      "ID pembayaran wajib diisi.",
    );
  }

  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipment-payments/${encodeURIComponent(
        validPaymentId,
      )}/generate-link`,
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
      },
    );

  const result =
    await parseResponse<{
      success: boolean;
      data?: {
        payment?:
          | ManualShipmentPayment
          | null;
        paymentUrl?: string;
        expiresAt?: string;
      };
    }>(response);

  const payment =
    result.data?.payment;

  if (!payment) {
    throw new Error(
      "Data pembayaran pengiriman tidak ditemukan.",
    );
  }

  return {
    ...payment,
    payment_url:
      payment.payment_url ??
      result.data?.paymentUrl ??
      null,
    expires_at:
      payment.expires_at ??
      result.data?.expiresAt ??
      null,
  };
}

/**
 * Ambil detail payment berdasarkan ID.
 */
export async function getManualShipmentPaymentById(
  paymentId: string,
): Promise<ManualShipmentPayment | null> {
  const token =
    getAuthToken();

  const response =
    await fetch(
      `${API_BASE_URL}/api/manual-shipment-payments/${paymentId}`,
      {
        headers: {
          Accept:
            "application/json",
          Authorization:
            `Bearer ${token}`,
        },
      },
    );

  const result =
    await parseResponse<{
      success: boolean;
      data:
        | ManualShipmentPayment
        | null;
    }>(response);

  return result.data;
}
