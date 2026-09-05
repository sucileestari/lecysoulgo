import {
  createPortal,
} from "react-dom";

import {
  Trash2,
} from "lucide-react";

import type {
  ManualShippingBatch,
} from "@/services/manualShippingBatchService";

export type DeleteBatchPengirimanDialogProps = {
  batch: ManualShippingBatch | null;
  isDeleting?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DeleteBatchPengirimanDialog({
  batch,
  isDeleting = false,
  onCancel,
  onConfirm,
}: DeleteBatchPengirimanDialogProps) {
  if (!batch) {
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
      aria-labelledby="delete-batch-pengiriman-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="px-6 py-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>

            <div className="min-w-0">
              <h3
                id="delete-batch-pengiriman-title"
                className="text-lg font-semibold text-slate-800"
              >
                Hapus Batch Pengiriman
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Konfirmasi penghapusan data.
              </p>
            </div>
          </div>

          <p className="mt-5 text-sm leading-6 text-slate-500">
            Batch{" "}
            <span className="font-medium text-slate-700">
              "{batch.event_name}"
            </span>{" "}
            akan dihapus beserta seluruh pengiriman yang berada di dalam batch tersebut.
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
            aria-label="Konfirmasi hapus batch"
            className="inline-flex items-center justify-center rounded-lg bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            style={{
              color: "#ffffff",
              backgroundColor: "#ef4444",
            }}
          >
            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}