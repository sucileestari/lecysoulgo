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
  updateBatch,
  type Batch,
  type BatchStatus,
} from "@/services/batchService";

type EditBatchDialogProps = {
  open: boolean;
  batch: Batch | null;
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

const MAX_ORIGINAL_FILE_SIZE =
  5 * 1024 * 1024;

const MAX_COMPRESSED_FILE_SIZE = 0.8;

const MAX_IMAGE_DIMENSION = 1600;

const IMAGE_QUALITY = 0.82;

function parseDate(
  dateString: string | null,
): Date | null {
  if (!dateString) {
    return null;
  }

  const [year, month, day] =
    dateString.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(
    year,
    month - 1,
    day,
  );
}

function formatDateForApi(
  date: Date,
): string {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  dateString: string | null,
): string {
  if (!dateString) {
    return "";
  }

  const date = parseDate(
    dateString,
  );

  if (!date) {
    return "";
  }

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );
}

function addDaysToDate(
  dateString: string,
  days: number,
): Date | null {
  const date = parseDate(
    dateString,
  );

  if (
    !date ||
    !days ||
    days < 1
  ) {
    return null;
  }

  date.setDate(
    date.getDate() + days,
  );

  return date;
}

function calculateDaysBetween(
  startDate: string,
  targetDate: string | null,
): string {
  if (!startDate || !targetDate) {
    return "";
  }

  const start = parseDate(
    startDate,
  );

  const target = parseDate(
    targetDate,
  );

  if (!start || !target) {
    return "";
  }

  const difference =
    target.getTime() -
    start.getTime();

  const days = Math.round(
    difference /
      (1000 * 60 * 60 * 24),
  );

  return days > 0
    ? String(days)
    : "";
}

function formatFileSize(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(2)} MB`;
}

export default function EditBatchDialog({
  open,
  batch,
  onClose,
  onSuccess,
}: EditBatchDialogProps) {
  const [name, setName] =
    useState("");

  const [type, setType] =
    useState("Photocard");

  const [
    startDate,
    setStartDate,
  ] = useState("");

  const [dpDays, setDpDays] =
    useState("");

  const [
    pelunasanDays,
    setPelunasanDays,
  ] = useState("");

  const [status, setStatus] =
    useState<BatchStatus>(
      "Sudah di Order",
    );

  const [
    imagePreview,
    setImagePreview,
  ] = useState("");

  const [
    imageFile,
    setImageFile,
  ] = useState<File | null>(
    null,
  );

  const [
    originalFileSize,
    setOriginalFileSize,
  ] = useState(0);

  const [
    compressedFileSize,
    setCompressedFileSize,
  ] = useState(0);

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

  /*
   * Isi form menggunakan data
   * batch yang sedang dipilih.
   */
  useEffect(() => {
    if (!open || !batch) {
      return;
    }

    setName(batch.name);

    setType(batch.type);

    setStatus(batch.status);

    /*
     * Sementara menggunakan
     * created_at sebagai tanggal awal.
     */
    const createdDate =
      new Date(batch.created_at);

    const year =
      createdDate.getFullYear();

    const month = String(
      createdDate.getMonth() + 1,
    ).padStart(2, "0");

    const day = String(
      createdDate.getDate(),
    ).padStart(2, "0");

    const initialDate =
      `${year}-${month}-${day}`;

    setStartDate(initialDate);

    /*
     * Ambil jumlah hari dari
     * tanggal awal ke last payment DP.
     */
    setDpDays(
      calculateDaysBetween(
        initialDate,
        batch.last_payment_dp,
      ),
    );

    /*
     * Pelunasan boleh kosong.
     */
    setPelunasanDays(
      calculateDaysBetween(
        initialDate,
        batch.last_payment_pelunasan,
      ),
    );

    setImagePreview(
      batch.image_url || "",
    );

    setImageFile(null);

    setOriginalFileSize(0);

    setCompressedFileSize(0);

    setError("");

    setIsCompressing(false);

    setIsSubmitting(false);
  }, [open, batch]);

  /*
   * Last payment DP.
   *
   * Ini hanya untuk ditampilkan.
   * User tidak bisa mengubah DP.
   */
  const lastPaymentDp =
    useMemo(() => {
      if (
        !startDate ||
        !dpDays
      ) {
        return "";
      }

      const date =
        addDaysToDate(
          startDate,
          Number(dpDays),
        );

      return date
        ? formatDisplayDate(
            formatDateForApi(date),
          )
        : "";
    }, [
      startDate,
      dpDays,
    ]);

  /*
   * Last payment pelunasan.
   *
   * User masih bisa mengubah
   * jumlah hari.
   */
  const lastPaymentPelunasan =
    useMemo(() => {
      if (
        !startDate ||
        !pelunasanDays
      ) {
        return "";
      }

      const date =
        addDaysToDate(
          startDate,
          Number(
            pelunasanDays,
          ),
        );

      return date
        ? formatDisplayDate(
            formatDateForApi(date),
          )
        : "";
    }, [
      startDate,
      pelunasanDays,
    ]);

  /*
   * Close dialog.
   */
  const handleClose = () => {
    if (
      isSubmitting ||
      isCompressing
    ) {
      return;
    }

    onClose();
  };

  /*
   * Upload + compression gambar.
   */
  const handleImageChange =
    async (
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
          "File hanya boleh berupa JPG, JPEG, atau PNG.",
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

      /*
       * Hapus object URL lama
       * jika memang object URL.
       */
      if (
        imagePreview.startsWith(
          "blob:",
        )
      ) {
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
          "Gagal melakukan kompresi gambar.",
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

  /*
   * Submit.
   */
  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!batch) {
      return;
    }

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

    if (!status) {
      setError(
        "Status barang wajib dipilih.",
      );

      return;
    }

    /*
     * Pelunasan optional.
     */
    if (pelunasanDays) {
      const days =
        Number(
          pelunasanDays,
        );

      if (
        Number.isNaN(days) ||
        days < 1
      ) {
        setError(
          "Jatuh tempo pelunasan minimal 1 hari.",
        );

        return;
      }
    }

    try {
      setIsSubmitting(true);

      const pelunasanDate =
        pelunasanDays
          ? addDaysToDate(
              startDate,
              Number(
                pelunasanDays,
              ),
            )
          : null;

      await updateBatch(
        batch.id,
        {
          name:
            name.trim(),

          type:
            type.trim(),

          /*
           * DP sengaja tidak dikirim.
           * Nilainya tetap dari database.
           */

          last_payment_pelunasan:
            pelunasanDate
              ? formatDateForApi(
                  pelunasanDate,
                )
              : null,

          status,

          /*
           * Hanya kirim kalau
           * user mengganti gambar.
           */
          image:
            imageFile,
        },
      );

      onSuccess();

      onClose();
    } catch (error) {
      console.error(
        "Update batch error:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui batch.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open || !batch) {
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
              Edit Batch
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Perbarui informasi{" "}
              {batch.name}.
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

                {/* DP DAYS - DISABLED */}
                <div className="relative">

                  <input
                    type="number"
                    value={dpDays}
                    disabled
                    readOnly
                    className="h-10 w-full cursor-not-allowed rounded-lg border border-[#d8dfec] bg-[#edf1f7] px-3 pr-12 text-sm text-[#7a89ad] outline-none"
                  />

                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#9aa5b9]">
                    hari
                  </span>

                </div>

                {/* DP DATE - DISABLED */}
                <div className="relative">

                  <input
                    type="text"
                    value={
                      lastPaymentDp
                    }
                    readOnly
                    disabled
                    placeholder="Tanggal Last Payment"
                    className="h-10 w-full cursor-not-allowed rounded-lg border border-[#d8dfec] bg-[#edf1f7] px-3 pl-10 text-xs text-[#7a89ad] outline-none"
                  />

                  <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9aa5b9]" />

                </div>

              </div>

            </div>

            <div className="mt-3 flex items-start gap-2 text-xs leading-5 text-[#7d89a3]">

              <span>ⓘ</span>

              <span>
                Jatuh tempo DP tidak
                dapat diubah setelah
                batch dibuat.
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

                {/* Days */}
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

                {/* Date */}
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
                pelunasan akan tetap
                kosong.
              </span>

            </div>

          </section>

          {/* =================================
              IMAGE
          ================================== */}

          <div className="mt-5">

            <label className="text-sm font-medium text-[#20366f]">

              Gambar Batch

              <span className="ml-1 font-normal text-[#9aa5b9]">
                (Optional)
              </span>

            </label>

            <label className="mt-2 flex min-h-[110px] cursor-pointer items-center gap-4 rounded-lg border border-dashed border-[#cdd7e8] bg-white px-4 py-3 transition hover:bg-[#f8faff]">

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
                    src={
                      imagePreview
                    }
                    alt={
                      batch.name
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImagePlus className="h-7 w-7 text-[#8290ad]" />
                )}

              </div>

              <div className="min-w-0">

                <div className="flex items-center gap-2">

                  <Upload className="h-4 w-4 shrink-0 text-[#1457ff]" />

                  <p className="text-xs font-medium text-[#20366f]">
                    Klik untuk mengganti
                    gambar
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