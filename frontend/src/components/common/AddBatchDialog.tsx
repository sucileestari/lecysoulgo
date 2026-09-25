import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CalendarDays,
  ChevronDown,
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

import {
  getMembersForBatch,
  type BatchMemberOption,
} from "../../services/memberService";

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

  const [adminNyelemId, setAdminNyelemId] =
    useState("");

  const [adminRekapId, setAdminRekapId] =
    useState("");

  const [
    employees,
    setEmployees,
  ] = useState<BatchMemberOption[]>([]);

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

  const [
    isLoadingEmployees,
    setIsLoadingEmployees,
  ] = useState(false);

  const [
    adminNyelemDropdownOpen,
    setAdminNyelemDropdownOpen,
  ] = useState(false);

  const [
    adminRekapDropdownOpen,
    setAdminRekapDropdownOpen,
  ] = useState(false);

  const [
    typeDropdownOpen,
    setTypeDropdownOpen,
  ] = useState(false);

  const [
    statusDropdownOpen,
    setStatusDropdownOpen,
  ] = useState(false);

  const adminNyelemDropdownRef =
    useRef<HTMLDivElement>(null);

  const adminRekapDropdownRef =
    useRef<HTMLDivElement>(null);

  const typeDropdownRef =
    useRef<HTMLDivElement>(null);

  const statusDropdownRef =
    useRef<HTMLDivElement>(null);

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
  // Load Employees
  // ==============================

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    const loadEmployees = async () => {
      try {
        setIsLoadingEmployees(true);

        const members =
          await getMembersForBatch();

        if (!cancelled) {
          setEmployees(
            members.filter(
              (member) =>
                member.type ===
                "employee",
            ),
          );
        }
      } catch (error) {
        console.error(
          "Get employees error:",
          error,
        );

        if (!cancelled) {
          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data karyawan.",
          );

          setEmployees([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingEmployees(false);
        }
      }
    };

    loadEmployees();

    return () => {
      cancelled = true;
    };
  }, [open]);

  // ==============================
  // Close Dropdown On Outside Click
  // ==============================

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      const target =
        event.target as Node;

      if (
        adminNyelemDropdownRef.current &&
        !adminNyelemDropdownRef.current.contains(
          target,
        )
      ) {
        setAdminNyelemDropdownOpen(false);
      }

      if (
        adminRekapDropdownRef.current &&
        !adminRekapDropdownRef.current.contains(
          target,
        )
      ) {
        setAdminRekapDropdownOpen(false);
      }

      if (
        typeDropdownRef.current &&
        !typeDropdownRef.current.contains(
          target,
        )
      ) {
        setTypeDropdownOpen(false);
      }

      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(
          target,
        )
      ) {
        setStatusDropdownOpen(false);
      }
    }

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

    setAdminNyelemId("");
    setAdminRekapId("");
    setAdminNyelemDropdownOpen(false);
    setAdminRekapDropdownOpen(false);
    setTypeDropdownOpen(false);
    setStatusDropdownOpen(false);

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

    if (!adminNyelemId) {
      setError(
        "Admin Nyelem wajib dipilih.",
      );

      return;
    }

    if (!adminRekapId) {
      setError(
        "Admin Rekap wajib dipilih.",
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

        admin_nyelem_id:
          adminNyelemId,

        admin_rekap_id:
          adminRekapId,

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

          <div
            ref={typeDropdownRef}
            className="relative mt-5"
          >
            <label className="text-sm font-medium text-[#20366f]">
              Jenis Barang
              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <button
              type="button"
              onClick={() =>
                setTypeDropdownOpen(
                  (current) => !current,
                )
              }
              disabled={
                isSubmitting ||
                isCompressing
              }
              className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
            >
              <span className="truncate font-medium text-[#20366f]">
                {type}
              </span>

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                  typeDropdownOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />
            </button>

            {typeDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                <div className="max-h-56 overflow-y-auto">
                  {BATCH_TYPES.map(
                    (item) => {
                      const isSelected =
                        item === type;

                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => {
                            setType(item);
                            setTypeDropdownOpen(
                              false,
                            );
                          }}
                          className={[
                            "flex min-h-11 w-full items-center px-4 py-2 text-left transition",
                            isSelected
                              ? "bg-[#edf3ff]"
                              : "hover:bg-[#f8faff]",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "truncate text-sm",
                              isSelected
                                ? "font-medium text-[#1457ff]"
                                : "text-[#20366f]",
                            ].join(" ")}
                          >
                            {item}
                          </span>

                          {isSelected && (
                            <span className="ml-auto shrink-0 text-xs font-medium text-[#1457ff]">
                              Dipilih
                            </span>
                          )}
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>

          {/* =================================
              ADMIN NYELEM & ADMIN REKAP
          ================================== */}

          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div
              ref={adminNyelemDropdownRef}
              className="relative"
            >
              <label className="text-sm font-medium text-[#20366f]">
                Admin Nyelem
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  setAdminNyelemDropdownOpen(
                    (current) => !current,
                  )
                }
                disabled={
                  isSubmitting ||
                  isCompressing ||
                  isLoadingEmployees
                }
                className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
              >
                <span
                  className={
                    adminNyelemId
                      ? "truncate font-medium text-[#20366f]"
                      : "truncate text-[#a0abc0]"
                  }
                >
                  {isLoadingEmployees
                    ? "Memuat karyawan..."
                    : adminNyelemId
                      ? employees.find(
                          (employee) =>
                            employee.id ===
                            adminNyelemId,
                        )?.name ??
                        "Pilih Admin Nyelem"
                      : "Pilih Admin Nyelem"}
                </span>

                <ChevronDown
                  className={[
                    "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                    adminNyelemDropdownOpen
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />
              </button>

              {adminNyelemDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                  <div className="max-h-56 overflow-y-auto">
                    {employees.length ===
                    0 ? (
                      <div className="px-4 py-3 text-sm text-[#8a96ae]">
                        Tidak ada karyawan.
                      </div>
                    ) : (
                      employees.map(
                        (employee) => {
                          const isSelected =
                            employee.id ===
                            adminNyelemId;

                          return (
                            <button
                              key={
                                employee.id
                              }
                              type="button"
                              onClick={() => {
                                setAdminNyelemId(
                                  employee.id,
                                );
                                setAdminNyelemDropdownOpen(
                                  false,
                                );
                              }}
                              className={[
                                "flex min-h-11 w-full items-center px-4 py-2 text-left transition",
                                isSelected
                                  ? "bg-[#edf3ff]"
                                  : "hover:bg-[#f8faff]",
                              ].join(" ")}
                            >
                              <div className="min-w-0">
                                <p
                                  className={[
                                    "truncate text-sm",
                                    isSelected
                                      ? "font-medium text-[#1457ff]"
                                      : "text-[#20366f]",
                                  ].join(" ")}
                                >
                                  {
                                    employee.name
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-[#8a96ae]">
                                  {
                                    employee.phone
                                  }
                                </p>
                              </div>

                              {isSelected && (
                                <span className="ml-auto shrink-0 text-xs font-medium text-[#1457ff]">
                                  Dipilih
                                </span>
                              )}
                            </button>
                          );
                        },
                      )
                    )}
                  </div>
                </div>
              )}
            </div>

            <div
              ref={adminRekapDropdownRef}
              className="relative"
            >
              <label className="text-sm font-medium text-[#20366f]">
                Admin Rekap
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  setAdminRekapDropdownOpen(
                    (current) => !current,
                  )
                }
                disabled={
                  isSubmitting ||
                  isCompressing ||
                  isLoadingEmployees
                }
                className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
              >
                <span
                  className={
                    adminRekapId
                      ? "truncate font-medium text-[#20366f]"
                      : "truncate text-[#a0abc0]"
                  }
                >
                  {isLoadingEmployees
                    ? "Memuat karyawan..."
                    : adminRekapId
                      ? employees.find(
                          (employee) =>
                            employee.id ===
                            adminRekapId,
                        )?.name ??
                        "Pilih Admin Rekap"
                      : "Pilih Admin Rekap"}
                </span>

                <ChevronDown
                  className={[
                    "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                    adminRekapDropdownOpen
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />
              </button>

              {adminRekapDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                  <div className="max-h-56 overflow-y-auto">
                    {employees.length ===
                    0 ? (
                      <div className="px-4 py-3 text-sm text-[#8a96ae]">
                        Tidak ada karyawan.
                      </div>
                    ) : (
                      employees.map(
                        (employee) => {
                          const isSelected =
                            employee.id ===
                            adminRekapId;

                          return (
                            <button
                              key={
                                employee.id
                              }
                              type="button"
                              onClick={() => {
                                setAdminRekapId(
                                  employee.id,
                                );
                                setAdminRekapDropdownOpen(
                                  false,
                                );
                              }}
                              className={[
                                "flex min-h-11 w-full items-center px-4 py-2 text-left transition",
                                isSelected
                                  ? "bg-[#edf3ff]"
                                  : "hover:bg-[#f8faff]",
                              ].join(" ")}
                            >
                              <div className="min-w-0">
                                <p
                                  className={[
                                    "truncate text-sm",
                                    isSelected
                                      ? "font-medium text-[#1457ff]"
                                      : "text-[#20366f]",
                                  ].join(" ")}
                                >
                                  {
                                    employee.name
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-[#8a96ae]">
                                  {
                                    employee.phone
                                  }
                                </p>
                              </div>

                              {isSelected && (
                                <span className="ml-auto shrink-0 text-xs font-medium text-[#1457ff]">
                                  Dipilih
                                </span>
                              )}
                            </button>
                          );
                        },
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
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

            <div
              ref={statusDropdownRef}
              className="relative mt-2"
            >
              <button
                type="button"
                onClick={() =>
                  setStatusDropdownOpen(
                    (current) => !current,
                  )
                }
                disabled={
                  isSubmitting ||
                  isCompressing
                }
                className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
              >
                <span className="truncate font-medium text-[#20366f]">
                  {status}
                </span>

                <ChevronDown
                  className={[
                    "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                    statusDropdownOpen
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />
              </button>

              {statusDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-[100] overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                  <div className="max-h-56 overflow-y-auto">
                    {BATCH_STATUSES.map(
                      (item) => {
                        const isSelected =
                          item === status;

                        return (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              setStatus(item);
                              setStatusDropdownOpen(
                                false,
                              );
                            }}
                            className={[
                              "flex min-h-11 w-full items-center px-4 py-2 text-left transition",
                              isSelected
                                ? "bg-[#edf3ff]"
                                : "hover:bg-[#f8faff]",
                            ].join(" ")}
                          >
                            <span
                              className={[
                                "truncate text-sm",
                                isSelected
                                  ? "font-medium text-[#1457ff]"
                                  : "text-[#20366f]",
                              ].join(" ")}
                            >
                              {item}
                            </span>

                            {isSelected && (
                              <span className="ml-auto shrink-0 text-xs font-medium text-[#1457ff]">
                                Dipilih
                              </span>
                            )}
                          </button>
                        );
                      },
                    )}
                  </div>
                </div>
              )}
            </div>

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