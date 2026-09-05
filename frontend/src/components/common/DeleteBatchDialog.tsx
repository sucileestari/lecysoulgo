import {
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import { useState } from "react";

import {
  deleteBatch,
  type Batch,
} from "@/services/batchService";

type DeleteBatchDialogProps = {
  open: boolean;
  batch: Batch | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DeleteBatchDialog({
  open,
  batch,
  onClose,
  onSuccess,
}: DeleteBatchDialogProps) {
  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =========================================
     HIDDEN
  ========================================= */

  if (!open || !batch) {
    return null;
  }

  /* =========================================
     CLOSE
  ========================================= */

  const handleClose = () => {
    if (isDeleting) {
      return;
    }

    setError("");
    onClose();
  };

  /* =========================================
     DELETE
  ========================================= */

  const handleDelete = async () => {
    try {
      setError("");
      setIsDeleting(true);

      await deleteBatch(
        batch.id,
      );

      onSuccess();
    } catch (error) {
      console.error(
        "Delete batch error:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus batch.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        backgroundColor:
          "rgba(0, 0, 0, 0.40)",
      }}
      onClick={handleClose}
    >
      {/* =====================================
          MODAL
      ====================================== */}

      <div
        className="overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{
          width: "390px",
          maxWidth:
            "calc(100vw - 32px)",
        }}
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* ===================================
            HEADER
        ==================================== */}

        <div className="flex items-start justify-between px-5 pt-5">

          {/* Left */}
          <div className="flex items-start gap-3">

            {/* Delete Icon */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fff0f2]">

              <Trash2
                className="h-5 w-5 text-[#ff2348]"
                strokeWidth={2}
              />

            </div>

            {/* Title */}
            <div>

              <h2 className="text-base font-bold text-[#20366f]">
                Hapus Batch
              </h2>

              <p className="mt-1 text-xs text-[#7a89ad]">
                Konfirmasi penghapusan data.
              </p>

            </div>

          </div>

          {/* Close */}
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8290ae] transition hover:bg-[#f5f7fc] hover:text-[#20366f] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup"
          >

            <X className="h-4 w-4" />

          </button>

        </div>

        {/* ===================================
            CONTENT
        ==================================== */}

        <div className="px-5 pb-5 pt-6">

          <p className="text-xs leading-5 text-[#20366f]">
            Apakah kamu yakin ingin
            menghapus batch berikut?
          </p>

          {/* Batch Info */}
          <div className="mt-3 rounded-lg bg-[#f6f8fc] px-4 py-3">

            <p className="text-sm font-semibold text-[#20366f]">
              {batch.name}
            </p>

            <p className="mt-1 text-xs text-[#7181a4]">
              {batch.type}
            </p>

            <p className="mt-1 text-xs text-[#7181a4]">
              Status:{" "}
              <span className="font-medium text-[#20366f]">
                {batch.status}
              </span>
            </p>

          </div>

          {/* Warning */}
          <p className="mt-4 text-[11px] leading-5 text-[#ff2348]">
            Data batch yang sudah dihapus
            tidak dapat dikembalikan.
          </p>

          {/* Error */}
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-600">
              {error}
            </div>
          )}

        </div>

        {/* ===================================
            FOOTER
        ==================================== */}

        <div className="border-t border-[#e3e7ef] px-5 py-4">

          <div className="flex items-center justify-end gap-3">

            {/* Batal */}
            <button
              type="button"
              onClick={handleClose}
              disabled={isDeleting}
              className="h-10 min-w-[64px] rounded-lg border border-[#d8e0ef] bg-white px-4 text-xs font-semibold text-[#20366f] transition hover:bg-[#f6f8fc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            {/* Hapus */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="flex h-10 min-w-[72px] items-center justify-center gap-2 rounded-lg bg-[#ff2348] px-4 text-xs font-semibold text-white transition hover:bg-[#e51e40] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {isDeleting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isDeleting
                ? "Menghapus..."
                : "Hapus"}

            </button>

          </div>

        </div>

      </div>
    </div>
  );
}