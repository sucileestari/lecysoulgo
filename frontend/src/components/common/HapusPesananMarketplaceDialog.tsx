import {
  createPortal,
} from "react-dom";

import {
  Trash2,
} from "lucide-react";

import type {
  MarketplaceOrder,
} from "../services/marketplaceOrderService";

export type HapusPesananMarketplaceDialogProps = {
  order: MarketplaceOrder | null;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function HapusPesananMarketplaceDialog({
  order,
  isDeleting = false,
  onCancel,
  onConfirm,
}: HapusPesananMarketplaceDialogProps) {
  if (!order) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-slate-900/50 p-4"
      style={{
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 2147483646,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hapus-pesanan-marketplace-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
            <Trash2 className="h-5 w-5 text-red-500" />
          </div>

          <h3
            id="hapus-pesanan-marketplace-title"
            className="mt-4 text-lg font-semibold text-slate-800"
          >
            Hapus Pesanan Marketplace?
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Apakah kamu yakin ingin menghapus pesanan Marketplace berikut?
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-400">
                  Nomor Pesanan
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {order.order_number || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Nama Pembeli
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {order.member_name || "-"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium text-slate-400">
                  Nomor WhatsApp
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-700">
                  {order.member_phone || "-"}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-red-500">
            Data pesanan yang dihapus tidak akan tampil lagi di daftar
            Marketplace.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            aria-label="Konfirmasi hapus pesanan Marketplace"
            className="inline-flex items-center justify-center rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}