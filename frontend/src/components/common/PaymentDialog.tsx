import {
  useEffect,
  useState,
} from "react";

import {
  X,
  CheckCircle2,
  ExternalLink,
  MessageCircle,
  Loader2,
} from "lucide-react";

import {
  generatePaymentLink,
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
};

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
    currentPayment,
    setCurrentPayment,
  ] = useState<
    Payment | null
  >(payment);

  /* =======================================
     SYNC PAYMENT
  ======================================== */

  useEffect(() => {
    setCurrentPayment(
      payment,
    );

    setError("");

    setIsProcessing(false);
  }, [
    payment,
    open,
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
      const response =
        await fetch(
          buildApiUrl(
            `/payments/recap/${currentPayment.recap_id}`,
          ),
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
     SEND WHATSAPP
  ======================================== */

  async function handleSendWhatsApp() {
    if (!currentPayment) {
      return;
    }

    if (!buyer?.phone) {
      setError(
        "Nomor WhatsApp pembeli belum tersedia.",
      );

      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      /*
       * Jika Payment Link sebelumnya masih aktif,
       * jangan generate link baru dan jangan kirim
       * WhatsApp lagi.
       *
       * User diminta menggunakan link yang sudah ada.
       */
      const existingPaymentLinkIsActive =
        Boolean(
          currentPayment.payment_url &&
            currentPayment.expires_at &&
            new Date(
              currentPayment.expires_at,
            ).getTime() >
              Date.now(),
        );

      if (existingPaymentLinkIsActive) {
        setError(
          "Payment Link sebelumnya masih belum expired, silakan gunakan link tersebut.",
        );

        return;
      }

      let paymentToSend =
        currentPayment;

      /*
       * Generate Payment Link langsung di sini supaya
       * proses generate + kirim WhatsApp selesai dalam
       * satu klik. Tidak memanggil handleGeneratePaymentLink()
       * agar isProcessing tidak selesai di tengah proses.
       */
      if (!paymentToSend.payment_url) {
        const generatedResult =
          await generatePaymentLink(
            paymentToSend.id,
          );

        const generatedPayment =
          generatedResult.payment;

        if (!generatedPayment) {
          throw new Error(
            "Gagal membuat Payment Link.",
          );
        }

        paymentToSend =
          generatedPayment;

        setCurrentPayment(
          generatedPayment,
        );

        await onPaymentSuccess(
          generatedPayment,
        );
      }

      if (!paymentToSend.payment_url) {
        setError(
          "Payment Link belum tersedia.",
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

      const response = await fetch(
        buildApiUrl("/whatsapp/send"),
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            target:
              whatsappNumber,

            payment_id:
              paymentToSend.id,
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
    } catch (sendError) {
      console.error(
        "send WhatsApp error:",
        sendError,
      );

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

  const canGenerateLink =
    !isPaid &&
    (
      !hasPaymentLink ||
      isPaymentLinkExpired
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

              {canGenerateLink && (
                <p className="text-center text-xs text-slate-400">
                  Payment Link akan dibuat otomatis
                  saat tombol pembayaran atau
                  WhatsApp digunakan.
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