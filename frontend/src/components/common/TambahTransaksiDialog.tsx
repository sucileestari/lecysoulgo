import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  createFinanceTransaction,
  type FinanceBankAccount,
  type FinanceTransactionType,
} from "../../services/financeService";
import {
  getMembers,
  type Member,
} from "../../services/memberService";

interface TambahTransaksiDialogProps {
  isOpen: boolean;
  bankAccounts: FinanceBankAccount[];
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

function formatNominalInput(value: string): string {
  const numericValue = value.replace(/[^0-9]/g, "");

  if (!numericValue) {
    return "";
  }

  return Number(numericValue).toLocaleString("id-ID");
}

function getTodayDate(): string {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const DAY_NAMES = ["Mg", "Sn", "Sl", "Rb", "Km", "Jm", "Sb"];

function parseDate(value: string): Date | null {
  if (!value) return null;

  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) return null;

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

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

  if (!date) {
    return "Pilih tanggal";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export default function TambahTransaksiDialog({
  isOpen,
  bankAccounts,
  onClose,
  onSuccess,
}: TambahTransaksiDialogProps) {
  const [transactionType, setTransactionType] =
    useState<FinanceTransactionType>("income");

  const [transactionDate, setTransactionDate] =
    useState(getTodayDate);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [fromBankAccountId, setFromBankAccountId] = useState("");
  const [toBankAccountId, setToBankAccountId] = useState("");
  const [fromMemberId, setFromMemberId] = useState("");
  const [toMemberId, setToMemberId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);

  const [isFromBankDropdownOpen, setIsFromBankDropdownOpen] =
    useState(false);

  const [isToBankDropdownOpen, setIsToBankDropdownOpen] =
    useState(false);

  const fromBankDropdownRef =
    useRef<HTMLDivElement>(null);

  const toBankDropdownRef =
    useRef<HTMLDivElement>(null);

  const [isFromMemberDropdownOpen, setIsFromMemberDropdownOpen] =
    useState(false);

  const [isToMemberDropdownOpen, setIsToMemberDropdownOpen] =
    useState(false);

  const fromMemberDropdownRef =
    useRef<HTMLDivElement>(null);

  const toMemberDropdownRef =
    useRef<HTMLDivElement>(null);

  const [datePickerOpen, setDatePickerOpen] =
    useState(false);

  const [temporaryDate, setTemporaryDate] =
    useState("");

  const [calendarMonth, setCalendarMonth] =
    useState(() => {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth(), 1);
    });

  const [submitError, setSubmitError] =
    useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function resetTransactionForm() {
    setTransactionType("income");
    setTransactionDate(getTodayDate());
    setDescription("");
    setAmount("");
    setFromBankAccountId("");
    setToBankAccountId("");
    setFromMemberId("");
    setToMemberId("");
    setIsFromBankDropdownOpen(false);
    setIsToBankDropdownOpen(false);
    setIsFromMemberDropdownOpen(false);
    setIsToMemberDropdownOpen(false);
    setDatePickerOpen(false);
    setTemporaryDate("");
    setSubmitError(null);
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        fromBankDropdownRef.current &&
        !fromBankDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFromBankDropdownOpen(false);
      }

      if (
        toBankDropdownRef.current &&
        !toBankDropdownRef.current.contains(event.target as Node)
      ) {
        setIsToBankDropdownOpen(false);
      }

      if (
        fromMemberDropdownRef.current &&
        !fromMemberDropdownRef.current.contains(event.target as Node)
      ) {
        setIsFromMemberDropdownOpen(false);
      }

      if (
        toMemberDropdownRef.current &&
        !toMemberDropdownRef.current.contains(event.target as Node)
      ) {
        setIsToMemberDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let isMounted = true;

    const loadMembers = async () => {
      try {
        setIsLoadingMembers(true);
        const data = await getMembers();

        if (!isMounted) {
          return;
        }

        setMembers(data);
      } catch (error) {
        console.error("Get members error:", error);

        if (!isMounted) {
          return;
        }

        setMembers([]);
        setSubmitError(
          error instanceof Error
            ? error.message
            : "Gagal mengambil data anggota.",
        );
      } finally {
        if (isMounted) {
          setIsLoadingMembers(false);
        }
      }
    };

    loadMembers();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!datePickerOpen) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleCancelDate();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [datePickerOpen]);

  function openDatePicker() {
    if (isSubmitting) {
      return;
    }

    const baseDate = transactionDate || getTodayDate();
    const date = parseDate(baseDate) ?? new Date();

    setCalendarMonth(
      new Date(date.getFullYear(), date.getMonth(), 1),
    );
    setTemporaryDate(transactionDate);
    setDatePickerOpen(true);
    setSubmitError(null);
  }

  function closeDatePicker() {
    setTemporaryDate("");
    setDatePickerOpen(false);
    setSubmitError(null);
  }

  function handleSelectCalendarDate(dateString: string) {
    setTemporaryDate(dateString);
    setSubmitError(null);
  }

  function handleConfirmDate() {
    if (!temporaryDate) {
      setSubmitError("Silakan pilih tanggal.");
      return;
    }

    setTransactionDate(temporaryDate);
    setTemporaryDate("");
    setDatePickerOpen(false);
    setSubmitError(null);
  }

  function handleCancelDate() {
    setTemporaryDate("");
    setDatePickerOpen(false);
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

  const calendarYear = calendarMonth.getFullYear();
  const calendarMonthIndex = calendarMonth.getMonth();
  const firstDay = getFirstDayOfMonth(
    calendarYear,
    calendarMonthIndex,
  );
  const daysInMonth = getDaysInMonth(
    calendarYear,
    calendarMonthIndex,
  );

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    onClose();
    resetTransactionForm();
  }

  async function handleSubmitTransaction(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setSubmitError(null);

    const numericAmount = Number(
      amount.replace(/[^0-9]/g, ""),
    );

    if (!transactionDate) {
      setSubmitError("Tanggal transaksi wajib diisi.");
      return;
    }

    if (!description.trim()) {
      setSubmitError("Keterangan wajib diisi.");
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setSubmitError("Nominal harus lebih besar dari 0.");
      return;
    }

    if (
      transactionType === "income" &&
      !toBankAccountId
    ) {
      setSubmitError("Rekening tujuan wajib dipilih.");
      return;
    }

    if (
      transactionType === "expense" &&
      !fromBankAccountId
    ) {
      setSubmitError("Rekening sumber wajib dipilih.");
      return;
    }

    if (
      transactionType === "income" &&
      !fromMemberId
    ) {
      setSubmitError("Sumber pembayaran wajib dipilih.");
      return;
    }

    if (
      transactionType === "expense" &&
      !toMemberId
    ) {
      setSubmitError("Penerima wajib dipilih.");
      return;
    }

    if (
      transactionType === "transfer" &&
      !fromBankAccountId
    ) {
      setSubmitError("Rekening asal wajib dipilih.");
      return;
    }

    if (
      transactionType === "transfer" &&
      !toBankAccountId
    ) {
      setSubmitError("Rekening tujuan wajib dipilih.");
      return;
    }

    if (
      transactionType === "transfer" &&
      fromBankAccountId === toBankAccountId
    ) {
      setSubmitError(
        "Rekening asal dan tujuan harus berbeda.",
      );
      return;
    }

    try {
      setIsSubmitting(true);

      await createFinanceTransaction(
        {
          transaction_date: transactionDate,
          type: transactionType,
          description: description.trim(),
          amount: numericAmount,
          from_bank_account_id:
            transactionType === "income"
              ? null
              : fromBankAccountId || null,
          to_bank_account_id:
            transactionType === "expense"
              ? null
              : toBankAccountId || null,
          from_member_id:
            transactionType === "income"
              ? fromMemberId || null
              : null,
          to_member_id:
            transactionType === "expense"
              ? toMemberId && toMemberId !== "seller"
                ? toMemberId
                : null
              : null,
        } as Parameters<typeof createFinanceTransaction>[0],
      );

      await onSuccess();
      resetTransactionForm();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Gagal menyimpan transaksi.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleTransactionTypeChange(
    type: FinanceTransactionType,
  ) {
    setTransactionType(type);
    setSubmitError(null);

    if (type === "income") {
      setFromBankAccountId("");
      setToMemberId("");
    }

    if (type === "expense") {
      setToBankAccountId("");
      setFromMemberId("");
    }

    if (type === "transfer") {
      setFromBankAccountId("");
      setToBankAccountId("");
      setFromMemberId("");
      setToMemberId("");
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
        <div className="w-full max-w-[600px] overflow-visible rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#edf0f6] px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-[#17285d]">
              Tambah Transaksi
            </h2>

            <p className="mt-1 text-sm text-[#7a89ad]">
              Catat pemasukan, pengeluaran, atau transfer rekening.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7a89ad] transition hover:bg-[#f8faff] hover:text-[#20366f] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={19} />
          </button>
        </div>

        <form onSubmit={handleSubmitTransaction}>
          <div className="space-y-5 px-6 py-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Jenis Transaksi
              </label>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleTransactionTypeChange("income")
                  }
                  className={[
                    "h-11 rounded-lg border text-sm font-medium transition",
                    transactionType === "income"
                      ? "border-[#16a34a] bg-[#effcf4] text-[#16a34a]"
                      : "border-[#d9e0ef] bg-white text-[#50628e] hover:bg-[#f8faff]",
                  ].join(" ")}
                >
                  Pemasukan
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleTransactionTypeChange("expense")
                  }
                  className={[
                    "h-11 rounded-lg border text-sm font-medium transition",
                    transactionType === "expense"
                      ? "border-[#ef4444] bg-[#fff1f2] text-[#ef4444]"
                      : "border-[#d9e0ef] bg-white text-[#50628e] hover:bg-[#f8faff]",
                  ].join(" ")}
                >
                  Pengeluaran
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleTransactionTypeChange("transfer")
                  }
                  className={[
                    "h-11 rounded-lg border text-sm font-medium transition",
                    transactionType === "transfer"
                      ? "border-[#1457ff] bg-[#eef4ff] text-[#1457ff]"
                      : "border-[#d9e0ef] bg-white text-[#50628e] hover:bg-[#f8faff]",
                  ].join(" ")}
                >
                  Transfer
                </button>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#20366f]">
                Tanggal Transaksi
              </label>

              <button
                type="button"
                onClick={openDatePicker}
                disabled={isSubmitting}
                className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f7f8fb]"
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

            {transactionType === "income" && (
              <div
                ref={fromMemberDropdownRef}
                className="relative"
              >
                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Sumber Pembayaran
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsFromMemberDropdownOpen((current) => !current);
                    setIsFromBankDropdownOpen(false);
                    setIsToBankDropdownOpen(false);
                    setIsToMemberDropdownOpen(false);
                  }}
                  disabled={isSubmitting || isLoadingMembers}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
                >
                  {fromMemberId ? (
                    <span className="truncate font-medium text-[#20366f]">
                      {members.find(
                        (member) => member.id === fromMemberId,
                      )?.name ?? "Pilih anggota"}
                    </span>
                  ) : (
                    <span className="text-[#a0abc0]">
                      {isLoadingMembers
                        ? "Memuat anggota..."
                        : members.length === 0
                          ? "Belum ada anggota"
                          : "Pilih anggota"}
                    </span>
                  )}

                  <ChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                      isFromMemberDropdownOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                {isFromMemberDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                    <div
                      style={{
                        height: "280px",
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                      }}
                    >
                      {members.length === 0 ? (
                        <div
                          style={{ height: "280px" }}
                          className="flex items-center justify-center px-4 text-center text-sm text-[#7a89ad]"
                        >
                          {isLoadingMembers
                            ? "Memuat anggota..."
                            : "Belum ada anggota."}
                        </div>
                      ) : (
                        members.map((member) => {
                          const isSelected = member.id === fromMemberId;

                          return (
                            <button
                              key={member.id}
                              type="button"
                              onClick={() => {
                                setFromMemberId(member.id);
                                setIsFromMemberDropdownOpen(false);
                                setSubmitError(null);
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
                                  {member.name}
                                </p>
                                {member.phone ? (
                                  <p className="truncate text-xs leading-4 text-[#7a89ad]">
                                    {member.phone}
                                  </p>
                                ) : null}
                              </div>

                              {isSelected && (
                                <span className="shrink-0 text-xs font-medium text-[#1457ff]">
                                  Dipilih
                                </span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {transactionType === "expense" && (
              <div
                ref={toMemberDropdownRef}
                className="relative"
              >
                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Penerima
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsToMemberDropdownOpen((current) => !current);
                    setIsFromBankDropdownOpen(false);
                    setIsToBankDropdownOpen(false);
                    setIsFromMemberDropdownOpen(false);
                  }}
                  disabled={isSubmitting || isLoadingMembers}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
                >
                  {toMemberId === "seller" ? (
                    <span className="truncate font-medium text-[#20366f]">
                      Seller
                    </span>
                  ) : toMemberId ? (
                    <span className="truncate font-medium text-[#20366f]">
                      {members.find(
                        (member) => member.id === toMemberId,
                      )?.name ?? "Pilih penerima"}
                    </span>
                  ) : (
                    <span className="text-[#a0abc0]">
                      {isLoadingMembers
                        ? "Memuat anggota..."
                        : members.length === 0
                          ? "Belum ada penerima"
                          : "Pilih penerima"}
                    </span>
                  )}

                  <ChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                      isToMemberDropdownOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                {isToMemberDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                    <div
                      style={{
                        height: "280px",
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setToMemberId("seller");
                          setIsToMemberDropdownOpen(false);
                          setSubmitError(null);
                        }}
                        style={{
                          height: "56px",
                          minHeight: "56px",
                        }}
                        className={[
                          "flex w-full shrink-0 items-center gap-3 px-4 text-left transition",
                          toMemberId === "seller"
                            ? "bg-[#edf3ff]"
                            : "hover:bg-[#f8faff]",
                        ].join(" ")}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium leading-5 text-[#20366f]">
                            Seller
                          </p>
                        </div>

                        {toMemberId === "seller" && (
                          <span className="shrink-0 text-xs font-medium text-[#1457ff]">
                            Dipilih
                          </span>
                        )}
                      </button>

                      {members.map((member) => {
                        const isSelected = member.id === toMemberId;

                        return (
                          <button
                            key={member.id}
                            type="button"
                            onClick={() => {
                              setToMemberId(member.id);
                              setIsToMemberDropdownOpen(false);
                              setSubmitError(null);
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
                                {member.name}
                              </p>
                              {member.phone ? (
                                <p className="truncate text-xs leading-4 text-[#7a89ad]">
                                  {member.phone}
                                </p>
                              ) : null}
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
              </div>
            )}

            <div>
              <label
                htmlFor="finance-description"
                className="mb-2 block text-sm font-medium text-[#20366f]"
              >
                Keterangan
              </label>

              <input
                id="finance-description"
                type="text"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Contoh: Biaya admin bank"
                disabled={isSubmitting}
                className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
              />
            </div>

            <div>
              <label
                htmlFor="finance-amount"
                className="mb-2 block text-sm font-medium text-[#20366f]"
              >
                Nominal
              </label>

              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-[#7a89ad]">
                  Rp
                </span>

                <input
                  id="finance-amount"
                  type="text"
                  inputMode="numeric"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      formatNominalInput(event.target.value),
                    )
                  }
                  placeholder="0"
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-lg border border-[#d9e0ef] bg-white py-2.5 pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10"
                />
              </div>
            </div>

            {(transactionType === "expense" ||
              transactionType === "transfer") && (
              <div
                ref={fromBankDropdownRef}
                className="relative"
              >
                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Rekening Asal
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsFromBankDropdownOpen((current) => !current);
                    setIsToBankDropdownOpen(false);
                  }}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
                >
                  {fromBankAccountId ? (
                    <span className="truncate font-medium text-[#20366f]">
                      {bankAccounts.find(
                        (account) => account.id === fromBankAccountId,
                      )?.name ?? "Pilih rekening"}
                    </span>
                  ) : (
                    <span className="text-[#a0abc0]">
                      Pilih rekening
                    </span>
                  )}

                  <ChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                      isFromBankDropdownOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                {isFromBankDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                    <div
                      style={{
                        height: "280px",
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                      }}
                    >
                      {bankAccounts.filter((account) => account.is_active)
                        .length === 0 ? (
                        <div
                          style={{ height: "280px" }}
                          className="flex items-center justify-center px-4 text-center text-sm text-[#7a89ad]"
                        >
                          Belum ada rekening aktif.
                        </div>
                      ) : (
                        bankAccounts
                          .filter((account) => account.is_active)
                          .map((account) => {
                            const isSelected =
                              account.id === fromBankAccountId;

                            return (
                              <button
                                key={account.id}
                                type="button"
                                onClick={() => {
                                  setFromBankAccountId(account.id);
                                  setIsFromBankDropdownOpen(false);
                                  setSubmitError(null);
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
                                    {account.name}
                                  </p>
                                </div>

                                {isSelected && (
                                  <span className="shrink-0 text-xs font-medium text-[#1457ff]">
                                    Dipilih
                                  </span>
                                )}
                              </button>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(transactionType === "income" ||
              transactionType === "transfer") && (
              <div
                ref={toBankDropdownRef}
                className="relative"
              >
                <label className="mb-2 block text-sm font-medium text-[#20366f]">
                  Rekening Tujuan
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setIsToBankDropdownOpen((current) => !current);
                    setIsFromBankDropdownOpen(false);
                  }}
                  disabled={isSubmitting}
                  className="flex h-11 w-full items-center justify-between rounded-lg border border-[#d8dfec] bg-white px-3 text-left text-sm text-[#20366f] outline-none transition hover:border-[#bfcbe0] focus:border-[#1457ff] disabled:bg-[#f7f8fb]"
                >
                  {toBankAccountId ? (
                    <span className="truncate font-medium text-[#20366f]">
                      {bankAccounts.find(
                        (account) => account.id === toBankAccountId,
                      )?.name ?? "Pilih rekening"}
                    </span>
                  ) : (
                    <span className="text-[#a0abc0]">
                      Pilih rekening
                    </span>
                  )}

                  <ChevronDown
                    className={[
                      "h-4 w-4 shrink-0 text-[#7a89ad] transition-transform",
                      isToBankDropdownOpen ? "rotate-180" : "",
                    ].join(" ")}
                  />
                </button>

                {isToBankDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-[100] mt-2 overflow-hidden rounded-lg border border-[#d8dfec] bg-white shadow-lg">
                    <div
                      style={{
                        height: "280px",
                        overflowY: "auto",
                        overscrollBehavior: "contain",
                      }}
                    >
                      {bankAccounts.filter((account) => account.is_active)
                        .length === 0 ? (
                        <div
                          style={{ height: "280px" }}
                          className="flex items-center justify-center px-4 text-center text-sm text-[#7a89ad]"
                        >
                          Belum ada rekening aktif.
                        </div>
                      ) : (
                        bankAccounts
                          .filter((account) => account.is_active)
                          .map((account) => {
                            const isSelected =
                              account.id === toBankAccountId;

                            return (
                              <button
                                key={account.id}
                                type="button"
                                onClick={() => {
                                  setToBankAccountId(account.id);
                                  setIsToBankDropdownOpen(false);
                                  setSubmitError(null);
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
                                    {account.name}
                                  </p>
                                </div>

                                {isSelected && (
                                  <span className="shrink-0 text-xs font-medium text-[#1457ff]">
                                    Dipilih
                                  </span>
                                )}
                              </button>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {submitError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm text-red-600">
                  {submitError}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[#edf0f6] px-6 py-5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-11 rounded-lg border border-[#d9e0ef] bg-white px-5 text-sm font-medium text-[#50628e] transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                  Menyimpan...
                </>
              ) : (
                "Simpan Transaksi"
              )}
            </button>
          </div>
        </form>
        </div>
      </div>

      {datePickerOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
          onMouseDown={() => closeDatePicker()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="finance-date-picker-title"
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3
                  id="finance-date-picker-title"
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
                  const isSelected =
                    temporaryDate === dateString;

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
    </>
  );
}
