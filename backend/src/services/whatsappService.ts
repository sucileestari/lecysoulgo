const FONNTE_API_URL =
  "https://api.fonnte.com/send";

const FONNTE_DEVICE_API_URL =
  "https://api.fonnte.com/device";

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

type FonnteSendResponse = {
  reason?: string;
  message?: string;
  status?: boolean;
  detail?: string;
  id?: string[];
  requestid?: number;
  process?: string;
  target?: string[];
};

/* =========================================
   CHECK FONNTE WHATSAPP CONNECTION
========================================= */

async function checkFonnteConnection(
  token: string,
): Promise<void> {
  const response = await fetch(
    FONNTE_DEVICE_API_URL,
    {
      method: "POST",
      headers: {
        Authorization: token,
      },
    },
  );

  const data =
    (await response.json()) as FonnteDeviceResponse;

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
      "WA anda belum tekoneksi sehingga tidak bisa melakukan pengiriman Payment Link",
    );
  }
}

/* =========================================
   SEND WHATSAPP
========================================= */

export async function sendWhatsApp({
  target,
  message,
}: SendWhatsAppParams) {
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    throw new Error(
      "FONNTE_TOKEN belum dikonfigurasi.",
    );
  }

  /* ---------------------------------------
     CEK KONEKSI WA TERLEBIH DAHULU
  --------------------------------------- */

  await checkFonnteConnection(token);

  /* ---------------------------------------
     KIRIM PESAN
  --------------------------------------- */

  const response = await fetch(
    FONNTE_API_URL,
    {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        message,
      }),
    },
  );

  const data =
    (await response.json()) as FonnteSendResponse;

  if (
    !response.ok ||
    data.status !== true
  ) {
    throw new Error(
      data?.reason ||
        data?.message ||
        `Fonnte request gagal (${response.status})`,
    );
  }

  return data;
}