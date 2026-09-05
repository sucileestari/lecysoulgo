import { useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";

import {
  deleteMember,
  type Member,
} from "../../services/memberService";

type DeleteMemberDialogProps = {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function DeleteMemberDialog({
  open,
  member,
  onClose,
  onSuccess,
}: DeleteMemberDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  if (!open || !member) {
    return null;
  }

  const handleClose = () => {
    if (isDeleting) {
      return;
    }

    setError("");
    onClose();
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError("");

      await deleteMember(member.id);

      onSuccess();
      onClose();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Gagal menghapus anggota",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>

            <div>
              <h2 className="text-lg font-semibold text-[#10245c]">
                Hapus Anggota
              </h2>

              <p className="mt-1 text-sm text-[#7a89ad]">
                Konfirmasi penghapusan data.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="rounded-lg p-2 text-[#7a89ad] transition hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          <p className="text-sm leading-6 text-[#20366f]">
            Apakah kamu yakin ingin menghapus anggota berikut?
          </p>

          <div className="mt-4 rounded-xl bg-[#f8faff] px-4 py-4">
            <p className="text-sm font-semibold text-[#10245c]">
              {member.name}
            </p>

            <p className="mt-1 text-sm text-[#5d6f9f]">
              {member.phone}
            </p>
          </div>

          <p className="mt-4 text-xs leading-5 text-red-500">
            Data anggota yang sudah dihapus tidak dapat dikembalikan.
          </p>

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t px-6 py-5">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="h-11 rounded-lg border border-[#d9e0ef] px-5 text-sm font-medium text-[#20366f] transition hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex h-11 items-center gap-2 rounded-lg bg-[#ff2348] px-5 text-sm font-medium text-white transition hover:bg-[#dc1237] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}

            {isDeleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}