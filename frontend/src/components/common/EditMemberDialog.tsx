import {
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  Loader2,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  updateMember,
  type Member,
} from "../../services/memberService";

import {
  memberSchema,
  type MemberFormData,
} from "../../lib/validations/member";

type EditMemberDialogProps = {
  open: boolean;
  member: Member | null;
  onClose: () => void;
  onSuccess: () => void;
};

export default function EditMemberDialog({
  open,
  member,
  onClose,
  onSuccess,
}: EditMemberDialogProps) {
  const [serverError, setServerError] =
    useState("");

  const [
    isTypeDropdownOpen,
    setIsTypeDropdownOpen,
  ] = useState(false);

  const typeDropdownRef =
    useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      name: "",
      phone: "",
      type: "customer",
    },
  });

  const selectedType = watch("type");

  useEffect(() => {
    if (open && member) {
      reset({
        name: member.name,
        phone: member.phone,
        type: member.type,
      });

      setServerError("");
      setIsTypeDropdownOpen(false);
    }
  }, [open, member, reset]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsTypeDropdownOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
    };
  }, []);

  if (!open || !member) {
    return null;
  }

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    setServerError("");
    setIsTypeDropdownOpen(false);
    reset();
    onClose();
  };

  const onSubmit = async (
    data: MemberFormData,
  ) => {
    try {
      setServerError("");

      await updateMember(member.id, {
        name: data.name,
        phone: data.phone,
        type: data.type,
      });

      reset();
      setIsTypeDropdownOpen(false);
      onSuccess();
      onClose();
    } catch (error) {
      setServerError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui anggota",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="max-h-[90vh] w-full max-w-[600px] overflow-visible rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#10245c]">
              Edit Anggota
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Perbarui data anggota.
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
          {/* Server Error */}
          {serverError && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          {/* Nama */}
          <div className="space-y-2">
            <label
              htmlFor="edit-member-name"
              className="text-sm font-medium text-[#20366f]"
            >
              Nama Lengkap
            </label>

            <input
              id="edit-member-name"
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
          <div className="mt-5 space-y-2">
            <label
              htmlFor="edit-member-phone"
              className="text-sm font-medium text-[#20366f]"
            >
              No. Telepon
            </label>

            <input
              id="edit-member-phone"
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

          {/* Tipe Anggota */}
          <div
            ref={typeDropdownRef}
            className="relative mt-5 space-y-2"
          >
            <label className="text-sm font-medium text-[#20366f]">
              Tipe Anggota
            </label>

            {/* SELECT BUTTON */}
            <button
              type="button"
              onClick={() => {
                setIsTypeDropdownOpen(
                  (current) => !current,
                );
              }}
              disabled={isSubmitting}
              className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
            >
              <span className="font-medium text-[#20366f]">
                {selectedType === "employee"
                  ? "Karyawan"
                  : "Customer"}
              </span>

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                  isTypeDropdownOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />
            </button>

            {/* DROPDOWN */}
            {isTypeDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                <div
                  style={{
                    height: "112px",
                    overflowY: "auto",
                    overscrollBehavior:
                      "contain",
                  }}
                >
                  {[
                    {
                      value: "customer" as const,
                      label: "Customer",
                    },
                    {
                      value: "employee" as const,
                      label: "Karyawan",
                    },
                  ].map((option) => {
                    const isSelected =
                      option.value ===
                      selectedType;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          setValue(
                            "type",
                            option.value,
                            {
                              shouldValidate: true,
                              shouldDirty: true,
                            },
                          );

                          setIsTypeDropdownOpen(
                            false,
                          );
                        }}
                        style={{
                          height: "56px",
                          minHeight: "56px",
                        }}
                        className={[
                          "flex w-full shrink-0 items-center gap-3 px-4 text-left transition",
                          isSelected
                            ? "bg-[#edf3ff]"
                            : "hover:bg-[#f8faff]",
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-5 text-[#20366f]">
                            {option.label}
                          </p>
                        </div>

                        {isSelected && (
                          <span className="shrink-0 text-xs font-medium text-[#1457ff]">
                            Dipilih
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Hidden registration for react-hook-form */}
            <input
              type="hidden"
              {...register("type")}
            />

            {errors.type && (
              <p className="text-xs text-red-500">
                {errors.type.message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-5">
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
                : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}