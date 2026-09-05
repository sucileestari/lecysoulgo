import {
  useEffect,
  useState,
} from "react";

import {
  X,
  QrCode,
  CheckCircle2,
  Loader2,
} from "lucide-react";

import {
  updateManualShipment,
  type ManualShipment,
} from "@/services/manualShippingService";

type ManualShipmentPaymentDialogProps = {
  shipment: ManualShipment | null;

  open: boolean;

  onClose: () => void;

  onPaymentSuccess: (
    shipment: ManualShipment,
  ) => void;
};

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
  ).format(
    Number(value ?? 0),
  );
}

export default function ManualShipmentPaymentDialog({
  shipment,
  open,
  onClose,
  onPaymentSuccess,
}: ManualShipmentPaymentDialogProps) {
  const [
    isProcessing,
    setIsProcessing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    currentShipment,
    setCurrentShipment,
  ] = useState<ManualShipment | null>(
    shipment,
  );

  useEffect(() => {
    setCurrentShipment(shipment);
    setError("");
    setIsProcessing(false);
  }, [shipment, open]);

  function handleClose() {
    if (isProcessing) {
      return;
    }

    setError("");
    onClose();
  }

  async function handleSimulatePayment() {
    if (!currentShipment) {
      return;
    }

    try {
      setIsProcessing(true);
      setError("");

      /*
       * Simulasi pembayaran shipment.
       *
       * Payment pengiriman adalah payment-level
       * pada manual_shipments, bukan payment recap.
       * Karena itu status paid disimpan melalui
       * endpoint update shipment yang sudah ada.
       */
      const updatedShipment =
        await updateManualShipment(
          currentShipment.id,
          {
            payment_status:
              "paid",
          },
        );

      setCurrentShipment(
        updatedShipment,
      );

      onPaymentSuccess(
        updatedShipment,
      );
    } catch (error) {
      console.error(
        "simulate shipment payment error:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal memproses pembayaran.",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  const isPaid =
    currentShipment?.payment_status ===
    "paid";

  /*
   * Setelah pembayaran berhasil:
   * tampilkan "Pembayaran Berhasil" selama 3 detik,
   * lalu tutup dialog otomatis.
   *
   * Effect wajib berada sebelum conditional return
   * agar jumlah hook tetap sama di setiap render.
   */
  useEffect(() => {
    if (!open || !isPaid) {
      return;
    }

    const timerId =
      window.setTimeout(() => {
        onClose();
      }, 3000);

    return () => {
      window.clearTimeout(
        timerId,
      );
    };
  }, [
    open,
    isPaid,
    onClose,
  ]);

  if (
    !open ||
    !currentShipment
  ) {
    return null;
  }

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
        {/* HEADER */}
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
              Pembayaran Pengiriman
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-slate-500
              "
            >
              Mode simulasi pembayaran
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
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

        {/* CONTENT */}
        <div className="px-6 py-6">
          <div className="mb-4 text-center">
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
              Pengiriman
            </span>

            <p
              className="
                mt-2
                text-sm
                font-semibold
                text-slate-700
              "
            >
              {currentShipment.member?.name ?? "-"}
            </p>
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
                currentShipment.total_price,
              )}
            </p>
          </div>

          {currentShipment.member && (
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
                    {currentShipment.member.name || "-"}
                  </p>
                </div>

                <div className="px-4 py-3">
                  <p className="text-xs text-slate-500">
                    Nomor WhatsApp
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {currentShipment.member.phone || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!isPaid && (
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
                  h-52
                  w-52
                  items-center
                  justify-center
                  rounded-xl
                  border-2
                  border-dashed
                  border-slate-300
                  bg-slate-50
                "
              >
                <QrCode
                  size={120}
                  className="text-slate-700"
                />
              </div>

              <p
                className="
                  mt-4
                  text-center
                  text-sm
                  font-medium
                  text-slate-600
                "
              >
                QRIS Simulation
              </p>

              <p
                className="
                  mt-1
                  text-center
                  text-xs
                  text-slate-400
                "
              >
                Klik tombol di bawah untuk
                mensimulasikan pembayaran berhasil.
              </p>
            </div>
          )}

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
                dikonfirmasi.
              </p>
            </div>
          )}

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

          {!isPaid && (
            <div className="mt-6">
              <button
                type="button"
                onClick={handleSimulatePayment}
                disabled={isProcessing}
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-blue-600
                  px-4
                  py-3
                  font-medium
                  text-white
                  transition
                  hover:bg-blue-700
                  disabled:cursor-not-allowed
                  disabled:opacity-60
                "
              >
                {isProcessing && (
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                )}

                {isProcessing
                  ? "Memproses..."
                  : "Simulasikan Pembayaran Berhasil"}
              </button>
            </div>
          )}

          <p
            className="
              mt-4
              text-center
              text-xs
              text-slate-400
            "
          >
            Pembayaran berhasil dan dialog akan
            tertutup otomatis dalam 3 detik.
          </p>
        </div>
      </div>
    </div>
  );
}