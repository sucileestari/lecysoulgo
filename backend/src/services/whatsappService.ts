const FONNTE_API_URL =
  "https://api.fonnte.com/send";

const FONNTE_DEVICE_API_URL =
  "https://api.fonnte.com/device";

const FONNTE_REQUEST_TIMEOUT_MS = 15_000;

type SendWhatsAppParams = {
  target: string;
  message: string;
};

type FonnteDeviceResponse = {
  device?: string;
  device_status?: string;
  status?: boolean;
  reason?: string;
};

export type FonnteSendResponse = {
  reason?: string;
  message?: string;
  status?: boolean;
  detail?: string;
  id?: string[];
  requestid?: number;
  process?: string;
  target?: string[];
};

function createTimeoutSignal(): AbortSignal {
  return AbortSignal.timeout(
    FONNTE_REQUEST_TIMEOUT_MS,
  );
}

/* =========================================
   CHECK FONNTE WHATSAPP CONNECTION
========================================= */

async function checkFonnteConnection(
  token: string,
): Promise<void> {
  let response: Response;

  try {
    response = await fetch(
      FONNTE_DEVICE_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: token,
        },
        signal: createTimeoutSignal(),
      },
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error(
        "Timeout saat mengecek koneksi WhatsApp Fonnte.",
      );
    }

    throw new Error(
      "Gagal terhubung ke Fonnte.",
    );
  }

  let data: FonnteDeviceResponse;

  try {
    data =
      (await response.json()) as FonnteDeviceResponse;
  } catch {
    throw new Error(
      `Response Fonnte tidak valid (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.reason ||
        "Gagal mengecek koneksi WhatsApp Fonnte.",
    );
  }

  if (data.status !== true) {
    throw new Error(
      data?.reason ||
        "Gagal mengecek koneksi WhatsApp Fonnte.",
    );
  }

  if (
    data.device_status !== "connect"
  ) {
    throw new Error(
      "WA anda belum terkoneksi sehingga tidak bisa melakukan pengiriman Payment Link.",
    );
  }
}

/* =========================================
   SEND WHATSAPP
========================================= */

export async function sendWhatsApp({
  target,
  message,
}: SendWhatsAppParams): Promise<FonnteSendResponse> {
  const token =
    process.env.FONNTE_TOKEN?.trim();

  if (!token) {
    throw new Error(
      "FONNTE_TOKEN belum dikonfigurasi.",
    );
  }

  if (!target.trim()) {
    throw new Error(
      "Nomor WhatsApp tujuan wajib diisi.",
    );
  }

  if (!message.trim()) {
    throw new Error(
      "Pesan WhatsApp wajib diisi.",
    );
  }

  /* ---------------------------------------
     CEK KONEKSI WA TERLEBIH DAHULU
  --------------------------------------- */

  await checkFonnteConnection(token);

  /* ---------------------------------------
     KIRIM PESAN
  --------------------------------------- */

  let response: Response;

  try {
    response = await fetch(
      FONNTE_API_URL,
      {
        method: "POST",
        headers: {
          Authorization: token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target: target.trim(),
          message,
        }),
        signal: createTimeoutSignal(),
      },
    );
  } catch (error) {
    if (
      error instanceof DOMException &&
      error.name === "TimeoutError"
    ) {
      throw new Error(
        "Timeout saat mengirim WhatsApp melalui Fonnte.",
      );
    }

    throw new Error(
      "Gagal terhubung ke Fonnte.",
    );
  }

  let data: FonnteSendResponse;

  try {
    data =
      (await response.json()) as FonnteSendResponse;
  } catch {
    throw new Error(
      `Response Fonnte tidak valid (${response.status}).`,
    );
  }

  if (
    !response.ok ||
    data.status !== true
  ) {
    throw new Error(
      data?.reason ||
        data?.message ||
        data?.detail ||
        `Fonnte request gagal (${response.status})`,
    );
  }

  return data;
}