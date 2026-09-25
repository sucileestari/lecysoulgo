import {
  useEffect,
  useState,
} from "react";

import {
  X,
  CheckCircle2,
  Copy,
  ExternalLink,
  MessageCircle,
} from "lucide-react";

import {
  type Payment,
} from "../../services/paymentService";

/* =========================================
   TYPES
========================================= */

type PaymentSuccessHandler = {
  bivarianceHack(
    payment: Payment,
  ): void | Promise<void>;
}["bivarianceHack"];

type PaymentDialogProps = {
  payment: Payment | null;

  buyer: {
    name: string | null;
    phone: string | null;
  } | null;

  open: boolean;

  onClose: () => void;

  onPaymentSuccess: PaymentSuccessHandler;

  isManualShipment?: boolean;

  manualShipmentId?: string;

  batchStatus?: string;
};

type WhatsAppStatus =
  | "sent"
  | "failed"
  | "scheduled"
  | null;

/* =========================================
   API
========================================= */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim();

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL belum diatur di environment variables.",
  );
}

function buildApiUrl(
  path: string,
): string {
  return `${API_BASE_URL.replace(/\/$/, "")}/api${path}`;
}

/* =========================================
   AUTH
========================================= */

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

/* =========================================
   FORMAT RUPIAH
========================================= */

function formatRupiah(
  value: number,
): string {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    },
  ).format(value);
}

/* =========================================
   FORMAT DATE TIME
========================================= */

function formatDateTime(
  value: string | null | undefined,
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jakarta",
    },
  ).format(date);
}

/* =========================================
   WHATSAPP
========================================= */

function normalizeWhatsAppNumber(
  phone: string,
): string {
  const digits =
    phone.replace(
      /\D/g,
      "",
    );

  if (!digits) {
    return "";
  }

  if (digits.startsWith("62")) {
    return digits;
  }

  if (digits.startsWith("0")) {
    return `62${digits.slice(1)}`;
  }

  return digits;
}

/* =========================================
   PAYMENT TYPE
========================================= */

function normalizePaymentType(
  value: Payment["payment_type"],
): "DP" | "PELUNASAN" {
  return String(value)
    .toUpperCase()
    .trim() === "DP"
    ? "DP"
    : "PELUNASAN";
}

/* =========================================
   COMPONENT
========================================= */

export default function PaymentDialog({
  payment,
  buyer,
  open,
  onClose,
  onPaymentSuccess,
  isManualShipment = false,
  batchStatus,
}: PaymentDialogProps) {
  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    copySuccess,
    setCopySuccess,
  ] = useState(false);

  const [
    currentPayment,
    setCurrentPayment,
  ] = useState<
    Payment | null
  >(payment);

  const [
    ,
    setWhatsappStatus,
  ] = useState<WhatsAppStatus>(null);

  /* =======================================
     SYNC PAYMENT
  ======================================== */

  useEffect(() => {
    setCurrentPayment(
      payment,
    );

    setError("");
    setCopySuccess(false);

    setIsProcessing(false);
    setWhatsappStatus(null);
  }, [
    payment,
    open,
  ]);

  /* =======================================
     REFRESH WHATSAPP STATUS
  ======================================== */

  useEffect(() => {
    if (
      !open ||
      !currentPayment?.id
    ) {
      setWhatsappStatus(null);
      return;
    }

    let isActive = true;
    const paymentId = currentPayment.id;

    async function loadWhatsAppStatus() {
      try {
        const token =
          getAuthToken();

        const response =
          await fetch(
            buildApiUrl(
              `/whatsapp/status/${paymentId}`,
            ),
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

        const result =
          (await response.json()) as {
            success?: boolean;
            data?: {
              status?: WhatsAppStatus;
            };
          };

        if (
          !response.ok ||
          !result.success
        ) {
          return;
        }

        if (isActive) {
          setWhatsappStatus(
            result.data?.status ??
              null,
          );
        }
      } catch (statusError) {
        console.error(
          "load WhatsApp status error:",
          statusError,
        );
      }
    }

    void loadWhatsAppStatus();

    return () => {
      isActive = false;
    };
  }, [
    open,
    currentPayment?.id,
  ]);

  /* =======================================
     REFRESH PAYMENT FROM BACKEND
  ======================================== */

  async function refreshPayment(): Promise<
    Payment | null
  > {
    if (!currentPayment) {
      return null;
    }

    /*
     * Manual Shipping belum memiliki
     * endpoint GET /api/payments/:id.
     *
     * Jadi jangan memanggil endpoint
     * yang tidak tersedia.
     */
    if (isManualShipment) {
      return currentPayment;
    }

    if (!currentPayment.recap_id) {
      return null;
    }

    try {
      const token =
        getAuthToken();

      const response =
        await fetch(
          buildApiUrl(
            `/payments/recap/${currentPayment.recap_id}`,
          ),
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

      const result =
        (await response.json()) as {
          success?: boolean;

          data?: {
            dp?: {
              payment?: Payment | null;
            };

            pelunasan?: {
              payment?: Payment | null;
            };
          };

          message?: string;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Gagal mengambil status pembayaran.",
        );
      }

      const paymentType =
        normalizePaymentType(
          currentPayment.payment_type,
        );

      const updatedPayment =
        paymentType === "DP"
          ? result.data?.dp?.payment ??
            null
          : result.data?.pelunasan
              ?.payment ??
            null;

      if (
        updatedPayment &&
        updatedPayment.id ===
          currentPayment.id
      ) {
        setCurrentPayment(
          updatedPayment,
        );

        if (
          updatedPayment.status ===
          "paid"
        ) {
          await onPaymentSuccess(
            updatedPayment,
          );
        }

        return updatedPayment;
      }

      return null;
    } catch (refreshError) {
      console.error(
        "refresh payment error:",
        refreshError,
      );

      return null;
    }
  }

  /* =======================================
     POLLING WEBHOOK STATUS
  ======================================== */

  useEffect(() => {
    if (
      !open ||
      !currentPayment ||
      currentPayment.status ===
        "paid" ||
      isManualShipment
    ) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          void refreshPayment();
        },
        5000,
      );

    return () => {
      window.clearInterval(
        intervalId,
      );
    };
  }, [
    open,
    currentPayment?.id,
    currentPayment?.recap_id,
    isManualShipment,
    currentPayment?.status,
  ]);

  /* =======================================
     CLOSE
  ======================================== */

  function handleClose() {
    setError("");
    onClose();
  }

  /* =======================================
     COPY PAYMENT LINK
  ======================================== */

  async function handleCopyPaymentLink() {
    if (!currentPayment?.payment_url) {
      setError(
        "Payment Link belum tersedia.",
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        currentPayment.payment_url,
      );

      setError("");
      setCopySuccess(true);

      window.setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
    } catch (copyError) {
      console.error(
        "copy Payment Link error:",
        copyError,
      );

      setCopySuccess(false);
      setError(
        "Gagal menyalin Payment Link.",
      );
    }
  }

  /* =======================================
     SEND WHATSAPP
  ======================================== */

  async function handleSendWhatsApp() {
    if (!currentPayment) {
      return;
    }

    const isBatchNotOrdered =
      !isManualShipment &&
      typeof batchStatus === "string" &&
      batchStatus.trim().toLowerCase() ===
        "akan di order";

    if (isBatchNotOrdered) {
      setError(
        "Barang ini belum di order, mohon untuk mengirim Link Payment ketika barang sudah di Order",
      );

      return;
    }

    if (!buyer?.phone) {
      setError(
        "Nomor WhatsApp pembeli belum tersedia.",
      );

      return;
    }

    if (!currentPayment.payment_url) {
      setError(
        "Payment Link belum tersedia. Silakan Generate Payment Link terlebih dahulu.",
      );

      return;
    }

    if (
      currentPayment.expires_at &&
      new Date(
        currentPayment.expires_at,
      ).getTime() <= Date.now()
    ) {
      setError(
        "Payment Link sudah expired. Silakan Generate Payment Link baru.",
      );

      return;
    }

    const whatsappNumber =
      normalizeWhatsAppNumber(
        buyer.phone,
      );

    if (!whatsappNumber) {
      setError(
        "Nomor WhatsApp pembeli tidak valid.",
      );

      return;
    }

    setIsProcessing(true);
    setError("");

    let whatsappSendAttempted = false;

    try {
      const token =
        getAuthToken();

      /*
       * Payment Link dibuat dari flow
       * "Generate Payment Link" di halaman Rekapan.
       * Di sini TIDAK membuat Payment Link baru.
       * Backend menerima payment_id yang sama dan
       * menggunakan Payment Link yang sudah tersimpan
       * pada payment tersebut.
       */

      const statusResponse =
        await fetch(
          buildApiUrl(
            `/whatsapp/status/${currentPayment.id}`,
          ),
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

      const statusResult =
        (await statusResponse.json()) as {
          success?: boolean;

          data?: {
            status?: WhatsAppStatus;
          };

          message?: string;
        };

      if (
        !statusResponse.ok ||
        !statusResult.success
      ) {
        throw new Error(
          statusResult.message ??
            "Gagal mengambil status WhatsApp.",
        );
      }

      setWhatsappStatus(
        statusResult.data?.status ??
          null,
      );

      whatsappSendAttempted = true;

      const response = await fetch(
        buildApiUrl("/whatsapp/send"),
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${token}`,
          },

          body: JSON.stringify({
            payment_id:
              currentPayment.id,
          }),
        },
      );

      const result =
        (await response.json()) as {
          success?: boolean;

          message?: string;

          data?: unknown;
        };

      if (
        !response.ok ||
        !result.success
      ) {
        throw new Error(
          result.message ??
            "Gagal mengirim WhatsApp.",
        );
      }

      setWhatsappStatus("sent");
    } catch (sendError) {
      console.error(
        "send WhatsApp error:",
        sendError,
      );

      if (whatsappSendAttempted) {
        if (
          sendError instanceof Error &&
          sendError.message ===
            "WhatsApp untuk Payment Link ini sudah dikirim."
        ) {
          setWhatsappStatus("sent");
        } else {
          setWhatsappStatus("failed");
        }
      }

      setError(
        sendError instanceof Error
          ? sendError.message
          : "Gagal mengirim WhatsApp.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  /* =======================================
     GUARD
  ======================================== */

  if (!open) {
    return null;
  }

  if (!currentPayment) {
    return null;
  }

  /* =======================================
     PAYMENT DATA
  ======================================== */

  const isPaid =
    currentPayment.status ===
    "paid";

  const paymentType =
    isManualShipment
      ? "PELUNASAN"
      : normalizePaymentType(
          currentPayment.payment_type,
        );

  const paymentTitle =
    paymentType === "DP"
      ? "Pembayaran Down Payment"
      : "Pembayaran Pelunasan";

  const paymentLabel =
    paymentType === "DP"
      ? "Down Payment"
      : "Pelunasan";

  const hasPaymentLink =
    Boolean(
      currentPayment.payment_url,
    );

  const isPaymentLinkExpired =
    Boolean(
      currentPayment.expires_at &&
        new Date(
          currentPayment.expires_at,
        ).getTime() <=
          Date.now(),
    );

  /* =======================================
     RENDER
  ======================================== */

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-slate-900/50
        p-4
      "
      role="dialog"
      aria-modal="true"
    >
      <div
        className="
          relative
          w-full
          max-w-md
          overflow-hidden
          rounded-2xl
          bg-white
          shadow-2xl
        "
      >
        {/* =================================
            HEADER
        ================================= */}

        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-200
            px-6
            py-5
          "
        >
          <div>
            <h2
              className="
                text-lg
                font-semibold
                text-slate-800
              "
            >
              {paymentTitle}
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Pembayaran melalui Midtrans
            </p>
          </div>

          <button
            type="button"
            onClick={
              handleClose
            }
            aria-label="Tutup dialog"
            className="
              rounded-lg
              p-2
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* =================================
            CONTENT
        ================================= */}

        <div
          className="
            px-6
            py-6
          "
        >
          {/* PAYMENT TYPE */}

          <div
            className="
              mb-4
              text-center
            "
          >
            <span
              className="
                inline-flex
                rounded-full
                bg-blue-50
                px-3
                py-1
                text-xs
                font-medium
                text-blue-600
              "
            >
              {paymentLabel}
            </span>
          </div>

          {/* AMOUNT */}

          <div
            className="
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              p-5
              text-center
            "
          >
            <p
              className="
                text-sm
                text-slate-500
              "
            >
              Total Pembayaran
            </p>

            <p
              className="
                mt-2
                text-2xl
                font-bold
                text-slate-800
              "
            >
              {formatRupiah(
                Number(
                  currentPayment.current_amount ??
                    currentPayment.amount,
                ),
              )}
            </p>

            {currentPayment.expires_at &&
              !isPaid && (
                <p className="mt-2 text-xs text-slate-400">
                  Berlaku sampai{" "}
                  {formatDateTime(
                    currentPayment.expires_at,
                  )}
                </p>
              )}
          </div>

          {/* BUYER INFORMATION */}

          {buyer && (
            <div className="mt-5">
              <p className="mb-3 text-sm font-semibold text-slate-700">
                Informasi Pembeli
              </p>

              <div
                className="
                  divide-y
                  divide-slate-100
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                "
              >
                <div className="px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Nama Pembeli
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {buyer.name ||
                      "-"}
                  </p>
                </div>

                <div className="px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Nomor WhatsApp
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {buyer.phone ||
                      "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PAYMENT LINK STATUS */}

          {!isPaid && (
            <div
              className="
                mt-6
                rounded-xl
                border
                border-blue-100
                bg-blue-50
                px-4
                py-4
              "
            >
              <div className="flex items-start gap-3">
                <ExternalLink
                  size={19}
                  className="mt-0.5 shrink-0 text-blue-600"
                />

                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    Payment Link Midtrans
                  </p>

                  {isPaymentLinkExpired ? (
                    <p className="mt-1 text-xs leading-5 text-blue-600">
                      Link sebelumnya sudah
                      expired. Generate link baru
                      untuk mendapatkan nominal dan
                      masa berlaku terbaru.
                    </p>
                  ) : hasPaymentLink ? (
                    <p className="mt-1 text-xs leading-5 text-blue-600">
                      Link pembayaran sudah tersedia
                      dan dapat dibuka kembali.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs leading-5 text-blue-600">
                      Belum ada Payment Link.
                      Sistem akan membuat link ketika
                      kamu memilih pembayaran atau
                      kirim WhatsApp.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* PAID STATUS */}

          {isPaid && (
            <div
              className="
                mt-6
                flex
                flex-col
                items-center
              "
            >
              <div
                className="
                  flex
                  h-24
                  w-24
                  items-center
                  justify-center
                  rounded-full
                  bg-emerald-50
                "
              >
                <CheckCircle2
                  size={64}
                  className="text-emerald-500"
                />
              </div>

              <p
                className="
                  mt-4
                  text-lg
                  font-semibold
                  text-emerald-600
                "
              >
                Pembayaran Berhasil
              </p>

              <p
                className="
                  mt-1
                  text-center
                  text-sm
                  text-slate-500
                "
              >
                Pembayaran telah berhasil
                dikonfirmasi oleh Midtrans.
              </p>

              {currentPayment.paid_at && (
                <p className="mt-2 text-xs text-slate-400">
                  {formatDateTime(
                    currentPayment.paid_at,
                  )}
                </p>
              )}
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div
              className="
                mt-5
                rounded-lg
                border
                border-red-100
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-600
              "
            >
              {error}
            </div>
          )}

          {/* ACTION BUTTONS */}

          {!isPaid && (
            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={
                  handleCopyPaymentLink
                }
                disabled={
                  isProcessing ||
                  !currentPayment.payment_url
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-300
                  bg-white
                  px-4
                  py-3
                  font-medium
                  text-slate-700
                  transition
                  hover:bg-slate-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                {copySuccess ? (
                  <CheckCircle2
                    size={18}
                    className="text-emerald-500"
                  />
                ) : (
                  <Copy
                    size={18}
                  />
                )}

                Copy Payment Link
              </button>

              <button
                type="button"
                onClick={
                  handleSendWhatsApp
                }
                disabled={
                  isProcessing ||
                  !buyer?.phone
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-emerald-500
                  bg-white
                  px-4
                  py-3
                  font-medium
                  text-emerald-600
                  transition
                  hover:bg-emerald-50
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <MessageCircle
                  size={18}
                />

                Kirim via WhatsApp
              </button>

              {!currentPayment.payment_url && (
                <p className="text-center text-xs text-slate-400">
                  Generate Payment Link terlebih dahulu sebelum copy atau kirim ke WhatsApp.
                </p>
              )}
            </div>
          )}

          {isPaid && (
            <div className="mt-6">
              <button
                type="button"
                onClick={
                  handleClose
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  rounded-xl
                  bg-slate-100
                  px-4
                  py-3
                  font-medium
                  text-slate-700
                  transition
                  hover:bg-slate-200
                "
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}