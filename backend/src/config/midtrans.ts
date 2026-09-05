const isProduction =
  process.env.MIDTRANS_IS_PRODUCTION === "true";

export const midtransConfig = {
  serverKey:
    process.env.MIDTRANS_SERVER_KEY ?? "",

  baseUrl: isProduction
    ? "https://api.midtrans.com"
    : "https://api.sandbox.midtrans.com",

  isProduction,
};

if (!midtransConfig.serverKey) {
  console.warn(
    "MIDTRANS_SERVER_KEY belum diatur.",
  );
}
