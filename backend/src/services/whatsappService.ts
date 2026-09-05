const FONNTE_API_URL = "https://api.fonnte.com/send";

type SendWhatsAppParams = {
  target: string;
  message: string;
};

export async function sendWhatsApp({
  target,
  message,
}: SendWhatsAppParams) {
  const token = process.env.FONNTE_TOKEN;

  if (!token) {
    throw new Error("FONNTE_TOKEN belum dikonfigurasi.");
  }

  const response = await fetch(FONNTE_API_URL, {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      target,
      message,
    }),
  });

  const data = (await response.json()) as {
    reason?: string;
    message?: string;
  };

  if (!response.ok) {
    throw new Error(
      data?.reason ||
      data?.message ||
      `Fonnte request gagal (${response.status})`
    );
  }

  return data;
}