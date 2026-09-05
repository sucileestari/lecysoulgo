import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createMember,
  type Member,
} from "@/services/memberService";
import {
  memberSchema,
  type MemberFormData,
} from "@/lib/validations/member";

type AddMemberDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: (member: Member) => void;
};

export default function AddMemberDialog({
  open,
  onClose,
  onSuccess,
}: AddMemberDialogProps) {
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      phone: "",
    },
  });

  if (!open) {
    return null;
  }

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    reset();
    setServerError("");
    onClose();
  };

  const onSubmit = async (data: MemberFormData) => {
    try {
      setServerError("");

      const member = await createMember(data);

      reset();
      onSuccess(member);
      onClose();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan anggota",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#10245c]">
              Tambah Anggota
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Tambahkan data anggota baru.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="rounded-lg p-2 text-[#7a89ad] transition hover:bg-[#f5f7fc] hover:text-[#20366f] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-5 px-6 py-6"
        >
          {serverError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          {/* Nama */}
          <div className="space-y-2">
            <label
              htmlFor="member-name"
              className="text-sm font-medium text-[#20366f]"
            >
              Nama Lengkap
            </label>

            <input
              id="member-name"
              type="text"
              placeholder="Masukkan nama lengkap"
              {...register("name")}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#9aa5bf] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f8fb]"
            />

            {errors.name && (
              <p className="text-xs text-red-500">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* No Telepon */}
          <div className="space-y-2">
            <label
              htmlFor="member-phone"
              className="text-sm font-medium text-[#20366f]"
            >
              No. Telepon
            </label>

            <input
              id="member-phone"
              type="tel"
              placeholder="Contoh: 081280077024"
              {...register("phone")}
              disabled={isSubmitting}
              className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#9aa5bf] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f8fb]"
            />

            {errors.phone && (
              <p className="text-xs text-red-500">
                {errors.phone.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t pt-5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-11 rounded-lg border border-[#d9e0ef] px-5 text-sm font-medium text-[#20366f] transition hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 items-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isSubmitting
                ? "Menyimpan..."
                : "Simpan Anggota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}