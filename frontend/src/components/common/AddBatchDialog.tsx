import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  CalendarDays,
  ImagePlus,
  Loader2,
  Upload,
  X,
} from "lucide-react";

import imageCompression from "browser-image-compression";

import {
  createBatch,
  type Country,
  type BatchStatus,
} from "../../services/batchService";

type AddBatchDialogProps = {
  open: boolean;
  country: Country;
  onClose: () => void;
  onSuccess: () => void;
};

const BATCH_TYPES = [
  "Photocard",
  "Album",
  "Lightstick",
  "Merchandise",
  "Lainnya",
];

const BATCH_STATUSES: BatchStatus[] = [
  "Akan di Order",
  "Sudah di Order",
  "Sudah sampai di WH",
  "Sudah sampai di INA",
  "Sudah sampai di Admin",
];

const DEFAULT_DP_DAYS = 7;

const MAX_ORIGINAL_FILE_SIZE =
  5 * 1024 * 1024;

const MAX_COMPRESSED_FILE_SIZE = 0.8;

const MAX_IMAGE_DIMENSION = 1600;

const IMAGE_QUALITY = 0.82;

function formatDate(date: Date): string {
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

function addDays(
  dateString: string,
  days: number,
): Date | null {
  if (!dateString || !days) {
    return null;
  }

  const [year, month, day] =
    dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
  );

  date.setDate(
    date.getDate() + days,
  );

  return date;
}

function getTodayInputValue(): string {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    today.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AddBatchDialog({
  open,
  country,
  onClose,
  onSuccess,
}: AddBatchDialogProps) {
  // ==============================
  // Form State
  // ==============================

  const [name, setName] = useState("");

  const [type, setType] =
    useState("Photocard");

  const [startDate, setStartDate] =
    useState("");

  const [dpDays, setDpDays] = useState(
    String(DEFAULT_DP_DAYS),
  );

  const [
    pelunasanDays,
    setPelunasanDays,
  ] = useState("");

  const [status, setStatus] =
    useState<BatchStatus>(
      "Akan di Order",
    );

  // ==============================
  // Image State
  // ==============================

  const [
    imagePreview,
    setImagePreview,
  ] = useState("");

  const [
    imageFile,
    setImageFile,
  ] = useState<File | null>(null);

  const [
    originalFileSize,
    setOriginalFileSize,
  ] = useState(0);

  const [
    compressedFileSize,
    setCompressedFileSize,
  ] = useState(0);

  // ==============================
  // UI State
  // ==============================

  const [error, setError] =
    useState("");

  const [
    isCompressing,
    setIsCompressing,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  // ==============================
  // Default Date
  // ==============================

  useEffect(() => {
    if (!open) {
      return;
    }

    setStartDate(
      getTodayInputValue(),
    );
  }, [open]);

  // ==============================
  // Last Payment DP
  // ==============================

  const lastPaymentDp = useMemo(() => {
    const days = Number(dpDays);

    if (
      !startDate ||
      !days ||
      days < 1
    ) {
      return "";
    }

    const result = addDays(
      startDate,
      days,
    );

    return result
      ? formatDate(result)
      : "";
  }, [startDate, dpDays]);

  // ==============================
  // Last Payment Pelunasan
  // ==============================

  const lastPaymentPelunasan =
    useMemo(() => {
      const days =
        Number(pelunasanDays);

      if (
        !startDate ||
        !pelunasanDays ||
        !days ||
        days < 1
      ) {
        return "";
      }

      const result = addDays(
        startDate,
        days,
      );

      return result
        ? formatDate(result)
        : "";
    }, [
      startDate,
      pelunasanDays,
    ]);

  // ==============================
  // Reset
  // ==============================

  const resetForm = () => {
    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview,
      );
    }

    setName("");
    setType("Photocard");
    setStartDate("");
    setDpDays(
      String(DEFAULT_DP_DAYS),
    );
    setPelunasanDays("");
    setStatus("Sudah di Order");

    setImagePreview("");
    setImageFile(null);

    setOriginalFileSize(0);
    setCompressedFileSize(0);

    setError("");
    setIsCompressing(false);
    setIsSubmitting(false);
  };

  // ==============================
  // Close
  // ==============================

  const handleClose = () => {
    if (
      isSubmitting ||
      isCompressing
    ) {
      return;
    }

    resetForm();
    onClose();
  };

  // ==============================
  // Image Compression
  // ==============================

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");

    const allowedTypes = [
      "image/jpeg",
      "image/png",
    ];

    if (
      !allowedTypes.includes(
        file.type,
      )
    ) {
      setError(
        "File yang diupload hanya boleh berupa JPG, JPEG, atau PNG.",
      );

      event.target.value = "";

      return;
    }

    if (
      file.size >
      MAX_ORIGINAL_FILE_SIZE
    ) {
      setError(
        "Ukuran gambar asli maksimal 5 MB.",
      );

      event.target.value = "";

      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(
        imagePreview,
      );
    }

    try {
      setIsCompressing(true);

      setOriginalFileSize(
        file.size,
      );

      const compressedFile =
        await imageCompression(
          file,
          {
            maxSizeMB:
              MAX_COMPRESSED_FILE_SIZE,

            maxWidthOrHeight:
              MAX_IMAGE_DIMENSION,

            useWebWorker: true,

            fileType:
              "image/webp",

            initialQuality:
              IMAGE_QUALITY,
          },
        );

      const previewUrl =
        URL.createObjectURL(
          compressedFile,
        );

      setImageFile(
        compressedFile,
      );

      setImagePreview(
        previewUrl,
      );

      setCompressedFileSize(
        compressedFile.size,
      );

      event.target.value = "";
    } catch (error) {
      console.error(
        "Image compression error:",
        error,
      );

      setError(
        "Gagal melakukan kompresi gambar. Silakan coba gambar lain.",
      );

      setImageFile(null);
      setImagePreview("");
      setOriginalFileSize(0);
      setCompressedFileSize(0);

      event.target.value = "";
    } finally {
      setIsCompressing(false);
    }
  };

  // ==============================
  // Submit
  // ==============================

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    if (!name.trim()) {
      setError(
        "Nama batch wajib diisi.",
      );
      return;
    }

    if (!type.trim()) {
      setError(
        "Jenis barang wajib dipilih.",
      );
      return;
    }

    if (!startDate) {
      setError(
        "Tanggal mulai wajib diisi.",
      );
      return;
    }

    const dpDaysNumber =
      Number(dpDays);

    if (
      !dpDays ||
      Number.isNaN(dpDaysNumber) ||
      dpDaysNumber < 1
    ) {
      setError(
        "Jatuh tempo DP minimal 1 hari.",
      );
      return;
    }

    /*
     * Pelunasan optional.
     */
    if (pelunasanDays) {
      const pelunasanDaysNumber =
        Number(
          pelunasanDays,
        );

      if (
        Number.isNaN(
          pelunasanDaysNumber,
        ) ||
        pelunasanDaysNumber < 1
      ) {
        setError(
          "Jatuh tempo pelunasan minimal 1 hari.",
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);

      const dpDate = addDays(
        startDate,
        dpDaysNumber,
      );

      if (!dpDate) {
        throw new Error(
          "Tanggal DP tidak valid.",
        );
      }

      const pelunasanDate =
        pelunasanDays
          ? addDays(
              startDate,
              Number(
                pelunasanDays,
              ),
            )
          : null;

      const formatDateForApi = (
        date: Date,
      ) => {
        const year =
          date.getFullYear();

        const month = String(
          date.getMonth() + 1,
        ).padStart(2, "0");

        const day = String(
          date.getDate(),
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
      };

      await createBatch({
        country,

        name: name.trim(),

        type: type.trim(),

        last_payment_dp:
          formatDateForApi(dpDate),

        last_payment_pelunasan:
          pelunasanDate
            ? formatDateForApi(
                pelunasanDate,
              )
            : null,

        /*
         * Status berasal dari dropdown.
         */
        status,

        /*
         * File yang dikirim adalah
         * hasil compression.
         */
        image: imageFile,
      });

      onSuccess();

      resetForm();
      onClose();
    } catch (error) {
      console.error(
        "Create batch error:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menambahkan batch.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==============================
  // Render
  // ==============================

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
      <div className="max-h-[90vh] w-full max-w-[600px] overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* =================================
            HEADER
        ================================== */}

        <div className="flex items-start justify-between border-b border-[#e7ebf3] px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-[#10245c]">
              Tambah Batch {country}
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Menambahkan batch untuk{" "}
              {country}.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={
              isSubmitting ||
              isCompressing
            }
            className="rounded-lg p-2 text-[#8a96b4] transition hover:bg-[#f5f7fc] hover:text-[#20366f] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =================================
            FORM
        ================================== */}

        <form
          onSubmit={handleSubmit}
          className="max-h-[calc(90vh-80px)] overflow-y-auto px-6 py-6"
        >

          {/* Error */}
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* =================================
              NAMA BATCH
          ================================== */}

          <div>
            <label className="text-sm font-medium text-[#20366f]">
              Nama Batch
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              placeholder={`Contoh: Batch ${country} #008`}
              disabled={
                isSubmitting ||
                isCompressing
              }
              className="mt-2 h-11 w-full rounded-lg border border-[#d8dfec] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#a0abc0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f8fb]"
            />
          </div>

          {/* =================================
              JENIS BARANG
          ================================== */}

          <div className="mt-5">
            <label className="text-sm font-medium text-[#20366f]">
              Jenis Barang
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <select
              value={type}
              onChange={(event) =>
                setType(
                  event.target.value,
                )
              }
              disabled={
                isSubmitting ||
                isCompressing
              }
              className="mt-2 h-11 w-full rounded-lg border border-[#d8dfec] bg-white px-3 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f8fb]"
            >
              {BATCH_TYPES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* =================================
              STATUS BARANG
          ================================== */}

          <div className="mt-5">
            <label className="text-sm font-medium text-[#20366f]">
              Status Barang
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <select
              value={status}
              onChange={(event) =>
                setStatus(
                  event.target
                    .value as BatchStatus,
                )
              }
              disabled={
                isSubmitting ||
                isCompressing
              }
              className="mt-2 h-11 w-full rounded-lg border border-[#d8dfec] bg-white px-3 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f8fb]"
            >
              {BATCH_STATUSES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                ),
              )}
            </select>

            <p className="mt-2 text-xs text-[#7a89ad]">
              Status awal default adalah
              Sudah di Order, dan dapat
              diubah sesuai kondisi barang.
            </p>
          </div>

          {/* =================================
              DOWN PAYMENT
          ================================== */}

          <section className="mt-5 rounded-xl border border-[#dfe6f2] bg-[#f5f8ff] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#e7efff]">
                <CalendarDays className="h-5 w-5 text-[#1457ff]" />
              </div>

              <h3 className="text-base font-semibold text-[#20366f]">
                Down Payment
              </h3>
            </div>

            <p className="mt-2 text-xs leading-5 text-[#7886a4]">
              Pembayaran awal setelah
              pembelian barang.
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium text-[#20366f]">
                Jatuh Tempo
              </label>

              <div className="mt-2 grid grid-cols-2 gap-4">

                {/* DP Days */}
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={dpDays}
                    onChange={(event) =>
                      setDpDays(
                        event.target.value,
                      )
                    }
                    disabled={
                      isSubmitting ||
                      isCompressing
                    }
                    className="h-10 w-full rounded-lg border border-[#d8dfec] bg-white px-3 pr-12 text-sm text-[#20366f] outline-none focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7a89ad]">
                    hari
                  </span>
                </div>

                {/* DP Date */}
                <div className="relative">
                  <input
                    type="text"
                    value={
                      lastPaymentDp
                    }
                    readOnly
                    placeholder="Tanggal Last Payment"
                    className="h-10 w-full rounded-lg border border-[#d8dfec] bg-[#edf1f7] px-3 pl-10 text-xs text-[#5d6f9f] outline-none"
                  />

                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c8bab]" />
                </div>

              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#7d89a3]">
              <span>ⓘ</span>

              <span>
                Tanggal last payment akan
                dihitung otomatis sesuai
                jatuh tempo.
              </span>
            </div>
          </section>

          {/* =================================
              PELUNASAN
          ================================== */}

          <section className="mt-4 rounded-xl border border-[#e1e7f1] bg-[#f8fafc] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#eef2f8]">
                <CalendarDays className="h-5 w-5 text-[#596b91]" />
              </div>

              <h3 className="text-base font-semibold text-[#20366f]">
                Pelunasan

                <span className="ml-2 text-xs font-normal text-[#8a96ae]">
                  Optional
                </span>
              </h3>
            </div>

            <p className="mt-2 text-xs leading-5 text-[#7886a4]">
              Isi ketika barang sudah
              sampai di Indonesia.
            </p>

            <div className="mt-4">
              <label className="text-xs font-medium text-[#20366f]">
                Jatuh Tempo

                <span className="ml-1 font-normal text-[#9aa5b9]">
                  (Optional)
                </span>
              </label>

              <div className="mt-2 grid grid-cols-2 gap-4">

                {/* Pelunasan Days */}
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    value={
                      pelunasanDays
                    }
                    onChange={(event) =>
                      setPelunasanDays(
                        event.target.value,
                      )
                    }
                    disabled={
                      isSubmitting ||
                      isCompressing
                    }
                    placeholder="Masukkan jumlah hari"
                    className="h-10 w-full rounded-lg border border-[#d8dfec] bg-white px-3 pr-12 text-sm text-[#20366f] outline-none placeholder:text-[#a0abc0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#7a89ad]">
                    hari
                  </span>
                </div>

                {/* Pelunasan Date */}
                <div className="relative">
                  <input
                    type="text"
                    value={
                      lastPaymentPelunasan
                    }
                    readOnly
                    placeholder="Tanggal Last Payment"
                    className="h-10 w-full rounded-lg border border-[#d8dfec] bg-[#edf1f7] px-3 pl-10 text-xs text-[#5d6f9f] outline-none"
                  />

                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7c8bab]" />
                </div>

              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#7d89a3]">
              <span>ⓘ</span>

              <span>
                Jika tidak diisi, tanggal
                pelunasan akan tetap kosong.
              </span>
            </div>
          </section>

          {/* =================================
              IMAGE
          ================================== */}

          <div className="mt-5">
            <label className="text-sm font-medium text-[#20366f]">
              Upload Gambar Batch

              <span className="ml-1 font-normal text-[#9aa5b9]">
                (Optional)
              </span>
            </label>

            <label className="mt-2 flex min-h-[110px] cursor-pointer items-center gap-4 rounded-lg border border-dashed border-[#cdd7e8] bg-white px-4 py-3 transition hover:bg-[#f8faff]">

              {/* Preview */}
              <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#eef2f8]">
                {isCompressing ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-[#1457ff]" />

                    <span className="text-[10px] text-[#7a89ad]">
                      Compressing...
                    </span>
                  </div>
                ) : imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview batch"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-7 w-7 text-[#8290ad]" />
                )}
              </div>

              {/* Upload Info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 shrink-0 text-[#1457ff]" />

                  <p className="text-xs font-medium text-[#20366f]">
                    Klik untuk upload
                    gambar batch
                  </p>
                </div>

                <p className="mt-1.5 text-xs leading-5 text-[#8a96ae]">
                  JPG, JPEG, PNG
                  <br />
                  Maksimal 5 MB
                </p>

                {imageFile &&
                  compressedFileSize >
                    0 && (
                    <p className="mt-2 text-[11px] text-[#5d6f9f]">
                      {formatFileSize(
                        originalFileSize,
                      )}

                      {" → "}

                      {formatFileSize(
                        compressedFileSize,
                      )}
                    </p>
                  )}
              </div>

              <input
                type="file"
                accept="image/jpeg,image/png"
                onChange={
                  handleImageChange
                }
                disabled={
                  isSubmitting ||
                  isCompressing
                }
                className="hidden"
              />
            </label>
          </div>

          {/* =================================
              ACTIONS
          ================================== */}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#e9edf4] pt-5">

            <button
              type="button"
              onClick={handleClose}
              disabled={
                isSubmitting ||
                isCompressing
              }
              className="h-11 min-w-[82px] rounded-lg border border-[#d7dfed] bg-white px-5 text-sm font-medium text-[#20366f] transition hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isCompressing
              }
              className="flex h-11 min-w-[100px] items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isSubmitting
                ? "Saving..."
                : "Save"}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}