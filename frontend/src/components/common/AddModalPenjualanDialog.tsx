import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Batch } from "../../services/batchService";
import {
  getActiveBankAccounts,
  type BankAccount,
} from "../../services/bankAccountService";
import {
  getProductCosts,
} from "../../services/productCostService";

/* =========================================
   TYPES
========================================= */

export type CreateModalPenjualanInput = {
  batch_id: string;
  qty: number;
  modal_beli: number;
  transaction_date: string;
  bank_account_id: string;
};

type DatePickerType = "transaction" | null;

type AddModalPenjualanDialogProps = {
  open: boolean;

  batches: Batch[];

  onClose: () => void;

  onSubmit: (
    input: CreateModalPenjualanInput,
  ) => Promise<void>;
};

/* =========================================
   COUNTRY CONFIG
========================================= */

const countryConfig: Record<
  Batch["country"],
  {
    name: string;
  }
> = {
  china: {
    name: "China",
  },

  indonesia: {
    name: "Indonesia",
  },

  jepang: {
    name: "Jepang",
  },

  korea: {
    name: "Korea",
  },

  thailand: {
    name: "Thailand",
  },
};

/* =========================================
   FORMAT
========================================= */

function formatRupiah(
  value: number,
): string {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

/* =========================================
   DATE
========================================= */

function getTodayDate(): string {
  const date = new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/* =========================================
   CALENDAR HELPERS
========================================= */

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const DAY_NAMES = ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"];

function parseDate(value: string): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(value: string): string {
  const date = parseDate(value);
  if (!date) return "Pilih tanggal";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "long", year: "numeric",
  }).format(date);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

/* =========================================
   PAGE
========================================= */

export default function AddModalPenjualanDialog({
  open,
  batches,
  onClose,
  onSubmit,
}: AddModalPenjualanDialogProps) {
  /* =======================================
     FORM STATE
  ======================================== */

  const [
    selectedBatchId,
    setSelectedBatchId,
  ] = useState("");

  const [qty, setQty] =
    useState("");

  const [
    modalBeli,
    setModalBeli,
  ] = useState("");

  const [
    transactionDate,
    setTransactionDate,
  ] = useState(getTodayDate());

  const [
    selectedBankAccountId,
    setSelectedBankAccountId,
  ] = useState("");

  /* =======================================
     BANK ACCOUNT STATE
  ======================================== */

  const [
    bankAccounts,
    setBankAccounts,
  ] = useState<BankAccount[]>(
    [],
  );

  const [
    existingBatchIds,
    setExistingBatchIds,
  ] = useState<string[]>([]);

  const [
    isLoadingBankAccounts,
    setIsLoadingBankAccounts,
  ] = useState(false);

  /* =======================================
     DROPDOWN STATE
  ======================================== */

  const [
    isBatchDropdownOpen,
    setIsBatchDropdownOpen,
  ] = useState(false);

  const [
    batchSearch,
    setBatchSearch,
  ] = useState("");

  const [
    isBankDropdownOpen,
    setIsBankDropdownOpen,
  ] = useState(false);

  const dropdownRef =
    useRef<HTMLDivElement>(null);

  const bankDropdownRef =
    useRef<HTMLDivElement>(null);

  /* =======================================
     DATE PICKER STATE
  ======================================== */

  const [datePickerType, setDatePickerType] =
    useState<DatePickerType>(null);

  const [temporaryDate, setTemporaryDate] =
    useState("");

  const [calendarMonth, setCalendarMonth] =
    useState(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    });

  /* =======================================
     UI STATE
  ======================================== */

  const [
    error,
    setError,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  /* =======================================
     SELECTED BATCH
  ======================================== */

  const selectedBatch =
    useMemo(() => {
      return batches.find(
        (batch) =>
          batch.id ===
          selectedBatchId,
      );
    }, [
      batches,
      selectedBatchId,
    ]);

  /* =======================================
     SELECTED BANK ACCOUNT
  ======================================== */

  const selectedBankAccount =
    useMemo(() => {
      return bankAccounts.find(
        (account) =>
          account.id ===
          selectedBankAccountId,
      );
    }, [
      bankAccounts,
      selectedBankAccountId,
    ]);

  /* =======================================
     FILTER BATCH
  ======================================== */

  const filteredBatches =
    useMemo(() => {
      const keyword =
        batchSearch
          .trim()
          .toLowerCase();

      const availableBatches =
        batches.filter(
          (batch) =>
            !existingBatchIds.includes(
              batch.id,
            ),
        );

      if (!keyword) {
        return availableBatches;
      }

      return availableBatches.filter(
        (batch) => {
          const country =
            countryConfig[
              batch.country
            ];

          return (
            batch.name
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            country.name
              .toLowerCase()
              .includes(
                keyword,
              )
          );
        },
      );
    }, [
      batches,
      batchSearch,
      existingBatchIds,
    ]);

  /* =======================================
     CALCULATION
  ======================================== */

  const qtyNumber =
    Number(qty);

  const modalBeliNumber =
    Number(modalBeli);

  const hargaModalPerBarang =
    qtyNumber > 0 &&
    modalBeliNumber >= 0
      ? modalBeliNumber /
        qtyNumber
      : 0;

  /*
   * Pembulatan ke atas ke
   * kelipatan Rp1.000.
   *
   * Contoh:
   * 13.600 -> 14.000
   * 15.000 -> 15.000
   */

  const hargaModalPembulatan =
    hargaModalPerBarang > 0
      ? Math.ceil(
          hargaModalPerBarang /
            1000,
        ) * 1000
      : 0;

  /* =======================================
     LOAD BANK ACCOUNTS
  ======================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    const loadBankAccounts =
      async () => {
        try {
          setIsLoadingBankAccounts(
            true,
          );

          const data =
            await getActiveBankAccounts();

          if (!isMounted) {
            return;
          }

          setBankAccounts(data);
        } catch (error) {
          console.error(
            "Get active bank accounts error:",
            error,
          );

          if (!isMounted) {
            return;
          }

          setBankAccounts([]);

          setError(
            error instanceof Error
              ? error.message
              : "Gagal mengambil data rekening.",
          );
        } finally {
          if (isMounted) {
            setIsLoadingBankAccounts(
              false,
            );
          }
        }
      };

    const loadExistingBatchIds =
      async () => {
        try {
          const productCosts =
            await getProductCosts();

          if (!isMounted) {
            return;
          }

          setExistingBatchIds(
            productCosts.map(
              (productCost) =>
                productCost.batch_id,
            ),
          );
        } catch (error) {
          console.error(
            "Get product costs error:",
            error,
          );

          if (!isMounted) {
            return;
          }

          setExistingBatchIds([]);
        }
      };

    loadBankAccounts();
    loadExistingBatchIds();

    return () => {
      isMounted = false;
    };
  }, [open]);

  /* =======================================
     DATE PICKER KEYBOARD
  ======================================== */

  useEffect(() => {
    if (!datePickerType) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeDatePicker();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [datePickerType]);

  /* =======================================
     RESET
  ======================================== */

  const resetForm = () => {
    setSelectedBatchId("");

    setQty("");

    setModalBeli("");

    setTransactionDate(
      getTodayDate(),
    );

    setSelectedBankAccountId("");

    setIsBatchDropdownOpen(
      false,
    );

    setIsBankDropdownOpen(
      false,
    );

    setDatePickerType(null);
    setTemporaryDate("");

    setBatchSearch("");

    setError("");

    setIsSubmitting(false);
  };

  /* =======================================
     OPEN
  ======================================== */

  useEffect(() => {
    if (!open) {
      return;
    }

    resetForm();
  }, [open]);

  /* =======================================
     CLOSE DROPDOWN OUTSIDE
  ======================================== */

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsBatchDropdownOpen(
          false,
        );
      }

      if (
        bankDropdownRef.current &&
        !bankDropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsBankDropdownOpen(
          false,
        );
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

  /* =======================================
     CLOSE
  ======================================== */

  const handleClose = () => {
    if (isSubmitting) {
      return;
    }

    resetForm();

    onClose();
  };

  /* =======================================
     SELECT BATCH
  ======================================== */

  const handleSelectBatch = (
    batch: Batch,
  ) => {
    setSelectedBatchId(
      batch.id,
    );

    setIsBatchDropdownOpen(
      false,
    );

    setBatchSearch("");

    setError("");
  };

  function openDatePicker(
    type: Exclude<DatePickerType, null>,
  ) {
    if (isSubmitting) return;

    const currentDate =
      type === "transaction" ? transactionDate : "";
    const baseDate = currentDate || getTodayDate();
    const date = parseDate(baseDate) ?? new Date();

    setCalendarMonth(
      new Date(date.getFullYear(), date.getMonth(), 1),
    );
    setTemporaryDate(currentDate);
    setDatePickerType(type);
    setError("");
  }

  function closeDatePicker() {
    setTemporaryDate("");
    setDatePickerType(null);
    setError("");
  }

  function handleSelectCalendarDate(dateString: string) {
    setTemporaryDate(dateString);
    setError("");
  }

  function handleConfirmDate() {
    if (!temporaryDate || !datePickerType) {
      setError("Silakan pilih tanggal.");
      return;
    }

    if (datePickerType === "transaction") {
      setTransactionDate(temporaryDate);
    }

    setTemporaryDate("");
    setDatePickerType(null);
    setError("");
  }

  function handleCancelDate() {
    setTemporaryDate("");
    setDatePickerType(null);
    setError("");
  }

  function changeCalendarMonth(offset: number) {
    setCalendarMonth((current) =>
      new Date(
        current.getFullYear(),
        current.getMonth() + offset,
        1,
      ),
    );
  }

  /* =======================================
     SUBMIT
  ======================================== */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    /* -------------------------------------
       VALIDATION
    ------------------------------------- */

    if (!selectedBatchId) {
      setError(
        "Nama batch wajib dipilih.",
      );

      return;
    }

    if (
      !qty.trim() ||
      !Number.isInteger(
        qtyNumber,
      ) ||
      qtyNumber <= 0
    ) {
      setError(
        "Qty harus berupa angka lebih besar dari 0.",
      );

      return;
    }

    if (
      !modalBeli.trim() ||
      !Number.isFinite(
        modalBeliNumber,
      ) ||
      modalBeliNumber <= 0
    ) {
      setError(
        "Modal beli harus lebih besar dari 0.",
      );

      return;
    }

    if (!transactionDate) {
      setError(
        "Tanggal transaksi wajib diisi.",
      );

      return;
    }

    if (!selectedBankAccountId) {
      setError(
        "Rekening pembayaran wajib dipilih.",
      );

      return;
    }

    try {
      setIsSubmitting(
        true,
      );

      await onSubmit({
        batch_id:
          selectedBatchId,

        qty: qtyNumber,

        modal_beli:
          modalBeliNumber,

        transaction_date:
          transactionDate,

        bank_account_id:
          selectedBankAccountId,
      });

      resetForm();

      onClose();
    } catch (error) {
      console.error(
        "Create modal penjualan error:",
        error,
      );

      setError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan modal penjualan.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  };

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonthIndex);
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonthIndex);

  /* =======================================
     RENDER
  ======================================== */

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">

      <div className="w-full max-w-[600px] overflow-visible rounded-2xl bg-white shadow-2xl">

        {/* =================================
            HEADER
        ================================== */}

        <div className="flex items-start justify-between border-b border-[#e7ebf3] px-6 py-5">

          <div>

            <h2 className="text-xl font-bold text-[#10245c]">
              Tambah Modal Penjualan
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Tambahkan modal untuk
              batch penjualan.
            </p>

          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={
              isSubmitting
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
          className="px-6 py-6"
        >

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* =================================
              NAMA BATCH
          ================================== */}

          <div
            ref={dropdownRef}
            className="relative"
          >

            <label className="text-sm font-medium text-[#20366f]">
              Nama Batch

              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            {/* SELECT BUTTON */}

            <button
              type="button"
              onClick={() => {
                setIsBatchDropdownOpen(
                  (current) =>
                    !current,
                );
              }}
              disabled={
                isSubmitting
              }
              className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
            >
              {selectedBatch ? (
                <div className="flex min-w-0 items-center gap-2">

                  <span className="truncate font-medium text-[#20366f]">
                    {
                      selectedBatch.name
                    }
                  </span>

                  <span className="shrink-0 text-[#a0abc0]">
                    ·
                  </span>

                  <span className="shrink-0 text-xs text-[#7a89ad]">
                    {
                      countryConfig[
                        selectedBatch.country
                      ].name
                    }
                  </span>

                </div>
              ) : (
                <span className="text-[#a0abc0]">
                  Pilih batch
                </span>
              )}

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                  isBatchDropdownOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />

            </button>

            {/* =================================
                DROPDOWN
            ================================== */}

            {isBatchDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">

                {/* SEARCH */}

                <div className="border-b border-[#edf0f6] p-2">

                  <input
                    type="text"
                    value={
                      batchSearch
                    }
                    onChange={(
                      event,
                    ) =>
                      setBatchSearch(
                        event.target
                          .value,
                      )
                    }
                    autoFocus
                    placeholder="Cari batch..."
                    className="h-9 w-full rounded-md border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none placeholder:text-[#a0abc0] focus:border-[#1457ff]"
                  />

                </div>

                {/* =================================
                    BATCH LIST
                ================================== */}

                <div
                  style={{
                    height: "280px",
                    overflowY: "auto",
                    overscrollBehavior:
                      "contain",
                  }}
                >

                  {filteredBatches.length ===
                  0 ? (
                    <div
                      style={{
                        height: "280px",
                      }}
                      className="flex items-center justify-center px-4 text-center text-sm text-[#7a89ad]"
                    >
                      Batch tidak
                      ditemukan.
                    </div>
                  ) : (
                    filteredBatches.map(
                      (batch) => {

                        const country =
                          countryConfig[
                            batch.country
                          ];

                        const isSelected =
                          batch.id ===
                          selectedBatchId;

                        return (
                          <button
                            key={
                              batch.id
                            }
                            type="button"
                            onClick={() =>
                              handleSelectBatch(
                                batch,
                              )
                            }
                            style={{
                              height: "56px",
                              minHeight:
                                "56px",
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
                                {
                                  batch.name
                                }
                              </p>

                              <p className="truncate text-xs leading-4 text-[#7a89ad]">
                                {
                                  country.name
                                }
                              </p>

                            </div>

                            {isSelected && (
                              <span className="shrink-0 text-xs font-medium text-[#1457ff]">
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

          {/* =================================
              QTY
          ================================== */}

          <div className="mt-5">

            <label className="text-sm font-medium text-[#20366f]">
              Qty

              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <input
              type="number"
              min="1"
              step="1"
              value={qty}
              onChange={(event) =>
                setQty(
                  event.target.value,
                )
              }
              disabled={
                isSubmitting
              }
              placeholder="Masukkan qty"
              className="mt-2 h-11 w-full rounded-lg border border-[#d8dfec] bg-white px-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#a0abc0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f8fb]"
            />

          </div>

          {/* =================================
              MODAL BELI
          ================================== */}

          <div className="mt-5">

            <label className="text-sm font-medium text-[#20366f]">
              Modal Beli

              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <div className="relative mt-2">

              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-[#7a89ad]">
                Rp
              </span>

              <input
                type="number"
                min="1"
                step="1"
                value={
                  modalBeli
                }
                onChange={(
                  event,
                ) =>
                  setModalBeli(
                    event.target
                      .value,
                  )
                }
                disabled={
                  isSubmitting
                }
                placeholder="Masukkan modal beli"
                className="h-11 w-full rounded-lg border border-[#d8dfec] bg-white pl-10 pr-3 text-sm text-[#20366f] outline-none transition placeholder:text-[#a0abc0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f8fb]"
              />

            </div>

          </div>

          {/* =================================
              TANGGAL TRANSAKSI
          ================================== */}

          <div className="mt-5">

            <label className="text-sm font-medium text-[#20366f]">
              Tanggal Transaksi

              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            <button
              type="button"
              onClick={() =>
                openDatePicker("transaction")
              }
              disabled={isSubmitting}
              className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f7f8fb]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <CalendarDays
                  size={18}
                  className="shrink-0 text-slate-400"
                />

                <span className="truncate text-sm text-slate-700">
                  {formatDisplayDate(transactionDate)}
                </span>
              </div>
            </button>

          </div>

          {/* =================================
              REKENING PEMBAYARAN
          ================================== */}

          <div
            ref={bankDropdownRef}
            className="relative mt-5"
          >

            <label className="text-sm font-medium text-[#20366f]">
              Rekening Pembayaran

              <span className="ml-1 text-red-500">
                *
              </span>
            </label>

            {/* SELECT BUTTON */}

            <button
              type="button"
              onClick={() => {
                setIsBankDropdownOpen(
                  (current) =>
                    !current,
                );
              }}
              disabled={
                isSubmitting ||
                isLoadingBankAccounts
              }
              className="mt-2 flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
            >
              {selectedBankAccount ? (
                <div className="flex min-w-0 items-center gap-2">

                  <span className="truncate font-medium text-[#20366f]">
                    {
                      selectedBankAccount.name
                    }
                  </span>


                </div>
              ) : (
                <span className="text-[#a0abc0]">
                  {isLoadingBankAccounts
                    ? "Memuat rekening..."
                    : bankAccounts.length ===
                        0
                      ? "Belum ada rekening aktif"
                      : "Pilih rekening"}
                </span>
              )}

              <ChevronDown
                className={[
                  "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                  isBankDropdownOpen
                    ? "rotate-180"
                    : "",
                ].join(" ")}
              />

            </button>

            {/* =================================
                DROPDOWN
            ================================== */}

            {isBankDropdownOpen && (
              <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">

                <div
                  style={{
                    height: "280px",
                    overflowY: "auto",
                    overscrollBehavior:
                      "contain",
                  }}
                >

                  {bankAccounts.length ===
                  0 ? (
                    <div
                      style={{
                        height: "280px",
                      }}
                      className="flex items-center justify-center px-4 text-center text-sm text-[#7a89ad]"
                    >
                      {isLoadingBankAccounts
                        ? "Memuat rekening..."
                        : "Belum ada rekening aktif."}
                    </div>
                  ) : (
                    bankAccounts.map(
                      (account) => {

                        const isSelected =
                          account.id ===
                          selectedBankAccountId;

                        return (
                          <button
                            key={
                              account.id
                            }
                            type="button"
                            onClick={() => {
                              setSelectedBankAccountId(
                                account.id,
                              );

                              setIsBankDropdownOpen(
                                false,
                              );

                              setError("");
                            }}
                            style={{
                              height: "56px",
                              minHeight:
                                "56px",
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
                                {
                                  account.name
                                }
                              </p>


                            </div>

                            {isSelected && (
                              <span className="shrink-0 text-xs font-medium text-[#1457ff]">
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

          {/* =================================
              HASIL OTOMATIS
          ================================== */}

          <section className="mt-5 rounded-xl border border-[#dfe6f2] bg-[#f5f8ff] p-5">

            <p className="text-sm font-semibold text-[#20366f]">
              Perhitungan Modal
            </p>

            {/* MODAL / BARANG */}

            <div className="mt-4 flex items-center justify-between gap-4">

              <div>

                <p className="text-sm text-[#65749b]">
                  Harga Modal per Barang
                </p>

                <p className="mt-1 text-xs text-[#8a96ae]">
                  Modal Beli ÷ Qty
                </p>

              </div>

              <p className="text-base font-bold text-[#20366f]">
                {formatRupiah(
                  hargaModalPerBarang,
                )}
              </p>

            </div>

            {/* PEMBULATAN */}

            <div className="mt-4 flex items-center justify-between gap-4">

              <div>

                <p className="text-sm text-[#65749b]">
                  Harga Modal per Barang
                  (Pembulatan)
                </p>

                <p className="mt-1 text-xs text-[#8a96ae]">
                  Dibulatkan ke atas
                  kelipatan Rp1.000
                </p>

              </div>

              <p className="text-base font-bold text-[#1457ff]">
                {formatRupiah(
                  hargaModalPembulatan,
                )}
              </p>

            </div>

          </section>

          {/* =================================
              ACTIONS
          ================================== */}

          <div className="mt-6 flex items-center justify-end gap-3 border-t border-[#e9edf4] pt-5">

            <button
              type="button"
              onClick={
                handleClose
              }
              disabled={
                isSubmitting
              }
              className="h-11 min-w-[82px] rounded-lg border border-[#d7dfed] bg-white px-5 text-sm font-medium text-[#20366f] transition hover:bg-[#f5f7fc] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoadingBankAccounts
              }
              className="flex h-11 min-w-[130px] items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
            >

              {isSubmitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {isSubmitting
                ? "Menyimpan..."
                : "Simpan Modal"}

            </button>

          </div>

        </form>

      </div>

      {datePickerType && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
          onMouseDown={() => closeDatePicker()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-penjualan-date-picker-title"
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3
                  id="modal-penjualan-date-picker-title"
                  className="text-base font-semibold text-slate-800"
                >
                  Pilih Tanggal Transaksi
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Pilih tanggal transaksi.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDatePicker}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup kalender"
              >
                <X size={19} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={19} />
                </button>

                <p className="text-base font-semibold capitalize text-slate-800">
                  {MONTH_NAMES[calendarMonthIndex]} {calendarYear}
                </p>

                <button
                  type="button"
                  onClick={() => changeCalendarMonth(1)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={19} />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAY_NAMES.map((day) => (
                  <div
                    key={day}
                    className="flex h-9 items-center justify-center text-xs font-medium text-slate-400"
                  >
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, index) => (
                  <div
                    key={`empty-${index}`}
                    className="h-11"
                  />
                ))}

                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const date = new Date(
                    calendarYear,
                    calendarMonthIndex,
                    day,
                  );
                  const dateString = toDateString(date);
                  const isSelected = temporaryDate === dateString;

                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() =>
                        handleSelectCalendarDate(dateString)
                      }
                      className={[
                        "flex h-11 w-full items-center justify-center rounded-xl text-sm transition",
                        "text-slate-700 hover:bg-blue-50",
                        isSelected
                          ? "bg-[#1457ff] font-semibold text-white hover:bg-[#1457ff]"
                          : "",
                      ].join(" ")}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={handleCancelDate}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDate}
                disabled={!temporaryDate}
                className="flex-1 rounded-xl bg-[#1457ff] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pilih
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}