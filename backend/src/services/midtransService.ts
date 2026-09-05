import crypto from "node:crypto";

import { midtransConfig } from "../config/midtrans.js";

export type CreateMidtransPaymentLinkInput = {
  orderId: string;
  amount: number;
  paymentType: "DP" | "PELUNASAN";
  expiresAt: Date;
  customer?: {
    name: string | null;
    phone: string | null;
  };
};

export type CreateMidtransPaymentLinkResult = {
  orderId: string;
  paymentUrl: string;
  expiresAt: string;
};

type MidtransPaymentLinkResponse = {
  order_id?: string;
  payment_url?: string;
  error_messages?: string[];
  message?: string;
  qr_url?: string | null;
};

export type MidtransNotification = {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_id?: string;
  transaction_status?: string;
  payment_type?: string;
  transaction_time?: string;
  settlement_time?: string;
  fraud_status?: string;
  status_message?: string;
  merchant_id?: string;
  currency?: string;
  custom_field1?: string;
  [key: string]: unknown;
};

/* =========================================================
   FORMAT DATETIME JAKARTA
========================================================= */

function formatJakartaDateTime(
  date: Date,
): string {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    },
  ).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter(
        (part) =>
          part.type !== "literal",
      )
      .map((part) => [
        part.type,
        part.value,
      ]),
  ) as Record<string, string>;

  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second} +0700`;
}

/* =========================================================
   HITUNG DURASI EXPIRY
========================================================= */

function normalizeMidtransPhone(
  phone: string | null | undefined,
): string | undefined {
  if (!phone) {
    return undefined;
  }

  let normalized = phone
    .trim()
    .replace(/[\s()-]/g, "");

  if (!normalized) {
    return undefined;
  }

  if (normalized.startsWith("+62")) {
    normalized = normalized.slice(1);
  } else if (normalized.startsWith("0")) {
    normalized = `62${normalized.slice(1)}`;
  }

  return normalized;
}

function calculateExpiryDuration(
  expiresAt: Date,
): number {
  const now = Date.now();
  const expiry = expiresAt.getTime();

  if (Number.isNaN(expiry)) {
    throw new Error(
      "Tanggal expiry Payment Link tidak valid.",
    );
  }

  const differenceMs = expiry - now;

  if (differenceMs <= 0) {
    throw new Error(
      "Payment Link sudah melewati waktu expiry.",
    );
  }

  // Midtrans menerima duration dalam menit.
  // Nilai ini hanya menerjemahkan expiresAt yang sudah
  // ditentukan oleh paymentService ke format Midtrans.
  const minutes = Math.ceil(
    differenceMs / 60_000,
  );

  if (minutes < 1) {
    throw new Error(
      "Sisa waktu Payment Link kurang dari 1 menit.",
    );
  }

  return minutes;
}

/* =========================================================
   GENERATE MIDTRANS ORDER ID

   Maksimal order_id Midtrans = 36 karakter.

   crypto.randomUUID()
   = 36 karakter dengan tanda -

   Contoh:
   xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

   Setelah tanda - dihapus:
   = 32 karakter

   Ditambah "PAY-" = 36 karakter
========================================================= */

export function generateMidtransOrderId(): string {
  return `PAY-${crypto
    .randomUUID()
    .replace(/-/g, "")}`;
}

/* =========================================================
   CREATE MIDTRANS PAYMENT LINK
========================================================= */

export async function createMidtransPaymentLink(
  input: CreateMidtransPaymentLinkInput,
): Promise<CreateMidtransPaymentLinkResult> {
  /* -------------------------------------------------------
     VALIDASI SERVER KEY
  ------------------------------------------------------- */

  if (!midtransConfig.serverKey) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum diatur.",
    );
  }

  /* -------------------------------------------------------
     VALIDASI NOMINAL
  ------------------------------------------------------- */

  if (
    !Number.isInteger(input.amount) ||
    input.amount <= 0
  ) {
    throw new Error(
      "Nominal pembayaran Midtrans harus berupa integer lebih dari 0.",
    );
  }

  /* -------------------------------------------------------
     VALIDASI EXPIRY
  ------------------------------------------------------- */

  if (!(input.expiresAt instanceof Date)) {
    throw new Error(
      "expiresAt harus berupa Date.",
    );
  }

  /* -------------------------------------------------------
     HITUNG DURASI EXPIRY
  ------------------------------------------------------- */

  const durationMinutes =
    calculateExpiryDuration(
      input.expiresAt,
    );

  /* -------------------------------------------------------
     ORDER ID

     Jika orderId dari service kosong,
     generate order ID baru.
  ------------------------------------------------------- */

  const orderId =
    input.orderId.trim() ||
    generateMidtransOrderId();

  /* -------------------------------------------------------
     VALIDASI ORDER ID

     Midtrans maksimal 36 karakter.
  ------------------------------------------------------- */

  if (orderId.length > 36) {
    throw new Error(
      `Order ID Midtrans maksimal 36 karakter. Saat ini: ${orderId.length} karakter.`,
    );
  }

  /* -------------------------------------------------------
     REQUEST BODY
  ------------------------------------------------------- */

  const body = {
    transaction_details: {
      order_id: orderId,
      gross_amount: input.amount,
    },

    custom_field1: orderId,

    customer_required: false,

    customer_details: {
      ...(input.customer?.name
        ? { first_name: input.customer.name.trim() }
        : {}),
      ...(normalizeMidtransPhone(input.customer?.phone)
        ? {
            phone: normalizeMidtransPhone(
              input.customer?.phone,
            ),
          }
        : {}),
    },

    // Hanya tampilkan metode pembayaran QRIS.
    enabled_payments: ["other_qris","bca_va"],

    usage_limit: 1,

    expiry: {
      start_time:
        formatJakartaDateTime(
          new Date(),
        ),

      duration:
        durationMinutes,

      unit: "minutes",
    },

    item_details: [
      {
        id: input.paymentType,

        name:
          input.paymentType === "DP"
            ? "Pembayaran DP"
            : "Pembayaran Pelunasan",

        price: input.amount,

        quantity: 1,
      },
    ],
  };

  /* -------------------------------------------------------
     BASIC AUTH

     Midtrans menggunakan:

     Username = Server Key
     Password = kosong

     Maka string yang di-Base64:

     SERVER_KEY:

     Contoh:

     abc123:
  ------------------------------------------------------- */

  const auth = Buffer.from(
    `${midtransConfig.serverKey}:`,
  ).toString("base64");

  /* -------------------------------------------------------
     MIDTRANS URL
  ------------------------------------------------------- */

  const url =
    `${midtransConfig.baseUrl}/v1/payment-links`;

  /* -------------------------------------------------------
     DEBUG AMAN

     Server Key tidak pernah ditampilkan penuh.
  ------------------------------------------------------- */

  console.log(
    "========== MIDTRANS CREATE PAYMENT LINK ==========",
  );

  console.log(
    "URL:",
    url,
  );

  console.log(
    "Production:",
    midtransConfig.isProduction,
  );

  console.log(
    "Server Key Exists:",
    Boolean(
      midtransConfig.serverKey,
    ),
  );

  console.log(
    "Server Key Length:",
    midtransConfig.serverKey.length,
  );

  console.log(
    "Server Key Preview:",
    `${midtransConfig.serverKey.slice(0, 8)}...`,
  );

  console.log(
    "Server Key Has Colon:",
    midtransConfig.serverKey.endsWith(":"),
  );

  console.log(
    "Order ID:",
    orderId,
  );

  console.log(
    "Order ID Length:",
    orderId.length,
  );

  console.log(
    "Amount:",
    input.amount,
  );

  console.log(
    "Payment Type:",
    input.paymentType,
  );

  console.log(
    "Customer Name:",
    input.customer?.name ?? null,
  );

  console.log(
    "Customer Phone Exists:",
    Boolean(normalizeMidtransPhone(input.customer?.phone)),
  );

  console.log(
    "Enabled Payments:",
    body.enabled_payments,
  );

  console.log(
    "Expiry:",
    input.expiresAt.toISOString(),
  );

  console.log(
    "Duration:",
    durationMinutes,
    "minutes",
  );

  console.log(
    "==================================================",
  );

  /* -------------------------------------------------------
     REQUEST KE MIDTRANS
  ------------------------------------------------------- */

  const response =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            `Basic ${auth}`,
        },

        body: JSON.stringify(
          body,
        ),
      },
    );

  /* -------------------------------------------------------
     BACA RESPONSE SEBAGAI TEXT

     Supaya response kosong tidak menyebabkan:

     Unexpected end of JSON input
  ------------------------------------------------------- */

  const responseText =
    await response.text();

  /* -------------------------------------------------------
     DEBUG RESPONSE
  ------------------------------------------------------- */

  console.log(
    "========== MIDTRANS RESPONSE ==========",
  );

  console.log(
    "HTTP Status:",
    response.status,
  );

  console.log(
    "Response:",
    responseText,
  );

  console.log(
    "=======================================",
  );

  /* -------------------------------------------------------
     PARSE RESPONSE
  ------------------------------------------------------- */

  let result:
    MidtransPaymentLinkResponse = {};

  if (
    responseText.trim()
  ) {
    try {
      result =
        JSON.parse(
          responseText,
        ) as MidtransPaymentLinkResponse;
    } catch {
      throw new Error(
        `Response Midtrans bukan JSON. HTTP ${response.status}.`,
      );
    }
  }

  /* -------------------------------------------------------
     HANDLE ERROR MIDTRANS
  ------------------------------------------------------- */

  if (!response.ok) {
    const providerMessage =
      result.error_messages?.join(
        ", ",
      ) ||
      result.message ||
      `HTTP ${response.status}`;

    throw new Error(
      `Gagal membuat Payment Link Midtrans: ${providerMessage}`,
    );
  }

  /* -------------------------------------------------------
     VALIDASI RESPONSE
  ------------------------------------------------------- */

  if (
    !result.order_id ||
    !result.payment_url
  ) {
    throw new Error(
      "Response Payment Link Midtrans tidak lengkap.",
    );
  }

  /* -------------------------------------------------------
     RETURN
  ------------------------------------------------------- */

  return {
    orderId:
      result.order_id,

    paymentUrl:
      result.payment_url,

    expiresAt:
      input.expiresAt.toISOString(),
  };
}

/* =========================================================
   DELETE MIDTRANS PAYMENT LINK
========================================================= */

export async function deleteMidtransPaymentLink(
  orderId: string,
): Promise<void> {
  /* -------------------------------------------------------
     VALIDASI SERVER KEY
  ------------------------------------------------------- */

  if (!midtransConfig.serverKey) {
    throw new Error(
      "MIDTRANS_SERVER_KEY belum diatur.",
    );
  }

  /* -------------------------------------------------------
     VALIDASI ORDER ID
  ------------------------------------------------------- */

  const trimmedOrderId =
    orderId.trim();

  if (!trimmedOrderId) {
    throw new Error(
      "Order ID Midtrans wajib diisi.",
    );
  }

  /* -------------------------------------------------------
     BASIC AUTH
  ------------------------------------------------------- */

  const auth = Buffer.from(
    `${midtransConfig.serverKey}:`,
  ).toString("base64");

  /* -------------------------------------------------------
     URL
  ------------------------------------------------------- */

  const url =
    `${midtransConfig.baseUrl}/v1/payment-links/${encodeURIComponent(
      trimmedOrderId,
    )}`;

  /* -------------------------------------------------------
     REQUEST DELETE
  ------------------------------------------------------- */

  const response =
    await fetch(
      url,
      {
        method: "DELETE",

        headers: {
          Accept:
            "application/json",

          "Content-Type":
            "application/json",

          Authorization:
            `Basic ${auth}`,
        },
      },
    );

  /* -------------------------------------------------------
     404 DIANGGAP SUDAH TIDAK ADA
  ------------------------------------------------------- */

  if (
    response.ok ||
    response.status === 404
  ) {
    return;
  }

  /* -------------------------------------------------------
     BACA ERROR
  ------------------------------------------------------- */

  let message =
    `HTTP ${response.status}`;

  try {
    const result =
      (await response.json()) as {
        message?: string;
        error_messages?: string[];
      };

    message =
      result.error_messages?.join(
        ", ",
      ) ||
      result.message ||
      message;
  } catch {
    // Ignore non-JSON error response.
  }

  throw new Error(
    `Gagal menghapus Payment Link Midtrans: ${message}`,
  );
}

/* =========================================================
   VERIFY MIDTRANS NOTIFICATION SIGNATURE
========================================================= */

export function verifyMidtransNotificationSignature(
  notification: MidtransNotification,
): boolean {
  /* -------------------------------------------------------
     VALIDASI SERVER KEY
  ------------------------------------------------------- */

  if (!midtransConfig.serverKey) {
    console.warn(
      "MIDTRANS_SERVER_KEY belum diatur.",
    );

    return false;
  }

  /* -------------------------------------------------------
     AMBIL FIELD NOTIFICATION
  ------------------------------------------------------- */

  const orderId =
    typeof notification.order_id ===
    "string"
      ? notification.order_id
      : "";

  const statusCode =
    typeof notification.status_code ===
    "string"
      ? notification.status_code
      : "";

  const grossAmount =
    typeof notification.gross_amount ===
    "string"
      ? notification.gross_amount
      : "";

  const receivedSignature =
    typeof notification.signature_key ===
    "string"
      ? notification.signature_key
          .trim()
          .toLowerCase()
      : "";

  /* -------------------------------------------------------
     VALIDASI FIELD
  ------------------------------------------------------- */

  if (
    !orderId ||
    !statusCode ||
    !grossAmount ||
    !receivedSignature
  ) {
    return false;
  }

  /* -------------------------------------------------------
     MIDTRANS SIGNATURE FORMULA

     SHA512(
       order_id +
       status_code +
       gross_amount +
       ServerKey
     )
  ------------------------------------------------------- */

  const rawSignature =
    `${orderId}${statusCode}${grossAmount}${midtransConfig.serverKey}`;

  const expectedSignature =
    crypto
      .createHash("sha512")
      .update(
        rawSignature,
      )
      .digest("hex")
      .toLowerCase();

  /* -------------------------------------------------------
     TIMING SAFE COMPARISON
  ------------------------------------------------------- */

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "utf8",
    );

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      "utf8",
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer,
  );
}