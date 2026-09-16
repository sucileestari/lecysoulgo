import { useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleX,
  Filter,
  MinusCircle,
  RefreshCw,
  Search,
  MessageCircle,
  Send,
} from "lucide-react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  getNotificationLogs,
  retryNotificationLog,
  type NotificationLogFilters,
  type NotificationLogStatus,
  type NotificationType,
} from "@/services/notificationLogService";

/* =========================================
   CONSTANTS
========================================= */

const ITEMS_PER_PAGE = 10;

/* =========================================
   HELPERS
========================================= */

function todayJakarta(): string {
  const parts = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const get = (type: string) =>
    parts.find(
      (part) => part.type === type,
    )?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function monthStartJakarta(): string {
  const today = todayJakarta();

  return `${today.slice(0, 7)}-01`;
}

function monthEndJakarta(): string {
  const today = todayJakarta();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));
  const lastDay = new Date(year, month, 0).getDate();

  return `${today.slice(0, 7)}-${String(lastDay).padStart(2, "0")}`;
}

function formatDateTime(
  value: string | null | undefined,
) {
  if (!value) {
    return {
      date: "-",
      time: "-",
    };
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      date: "-",
      time: "-",
    };
  }

  const parts = new Intl.DateTimeFormat(
    "id-ID",
    {
      timeZone: "Asia/Jakarta",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    },
  ).formatToParts(date);

  const get = (type: string) =>
    parts.find(
      (part) => part.type === type,
    )?.value ?? "";

  return {
    date: `${get("day")} ${get("month")} ${get("year")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function notificationTypeLabel(
  value: NotificationType,
): string {
  if (value === "RECAP_PAYMENT") {
    return "Rekapan Pembayaran";
  }

  if (value === "DUE_DATE_REMINDER") {
    return "Reminder Jatuh Tempo";
  }

  return "Reminder Pembayaran";
}

function paymentTypeLabel(
  value:
    | "DP"
    | "PELUNASAN"
    | undefined,
): string {
  if (value === "DP") {
    return "DP";
  }

  if (value === "PELUNASAN") {
    return "Pelunasan";
  }

  return "-";
}

function getPageNumbers(
  currentPage: number,
  totalPages: number,
) {
  if (totalPages <= 7) {
    return Array.from(
      {
        length: totalPages,
      },
      (_, index) => index + 1,
    );
  }

  const pages: Array<
    number | "ellipsis"
  > = [1];

  if (currentPage > 4) {
    pages.push("ellipsis");
  }

  const start = Math.max(
    2,
    currentPage - 1,
  );

  const end = Math.min(
    totalPages - 1,
    currentPage + 1,
  );

  for (
    let page = start;
    page <= end;
    page += 1
  ) {
    pages.push(page);
  }

  if (
    currentPage <
    totalPages - 3
  ) {
    pages.push("ellipsis");
  }

  pages.push(totalPages);

  return pages;
}

/* =========================================
   STATUS BADGE
========================================= */

function StatusBadge({
  status,
}: {
  status: NotificationLogStatus;
}) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#dff8ec] px-3 py-1.5 text-xs font-semibold text-[#11945f]">
        <CheckCircle2 className="h-4 w-4" />
        Sent
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#ffe7e9] px-3 py-1.5 text-xs font-semibold text-[#e94758]">
        <CircleX className="h-4 w-4" />
        Failed
      </span>
    );
  }

  if (status === "skipped") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff0d6] px-3 py-1.5 text-xs font-semibold text-[#ec8a13]">
        <MinusCircle className="h-4 w-4" />
        Skipped
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#e9eef8] px-3 py-1.5 text-xs font-semibold text-[#5e6c88]">
      Scheduled
    </span>
  );
}

/* =========================================
   PAGE
========================================= */

export default function NotificationLogPage() {
  const queryClient =
    useQueryClient();

  const monthInputRef =
    useRef<HTMLInputElement | null>(null);

  const today = useMemo(
    () => todayJakarta(),
    [],
  );

  const initialFilters: NotificationLogFilters =
    {
      dateFrom:
        monthStartJakarta(),
      dateTo: monthEndJakarta(),
      notificationType: "",
      status: "",
      buyer: "",
    };

  const [
    draftFilters,
    setDraftFilters,
  ] = useState<NotificationLogFilters>(
    initialFilters,
  );

  const [
    appliedFilters,
    setAppliedFilters,
  ] = useState<NotificationLogFilters>(
    initialFilters,
  );

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  /* =========================================
     QUERY
  ========================================= */

  const query = useQuery({
    queryKey: [
      "notification-log",
      appliedFilters,
      currentPage,
    ],
    queryFn: () =>
      getNotificationLogs({
        ...appliedFilters,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      }),
    staleTime: 30_000,
  });

  /* =========================================
     RETRY MUTATION
  ========================================= */

  const retryMutation =
    useMutation({
      mutationFn:
        retryNotificationLog,

      onSuccess: () => {
        void queryClient.invalidateQueries(
          {
            queryKey: [
              "notification-log",
            ],
          },
        );
      },
    });

  /* =========================================
     DATA
  ========================================= */

  const rows =
    query.data?.items ?? [];

  const summary =
    query.data?.summary ?? {
      total: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
    };

  const total =
    query.data?.pagination.total ?? 0;

  const totalPages = Math.max(
    query.data?.pagination.totalPages ??
      1,
    1,
  );

  const pageNumbers = useMemo(
    () =>
      getPageNumbers(
        currentPage,
        totalPages,
      ),
    [
      currentPage,
      totalPages,
    ],
  );

  /* =========================================
     FILTER ACTIONS
  ========================================= */

  function applyFilters() {
    setCurrentPage(1);

    setAppliedFilters({
      ...draftFilters,
    });
  }

  function resetFilters() {
    const resetFiltersValue: NotificationLogFilters =
      {
        dateFrom:
          monthStartJakarta(),
        dateTo: monthEndJakarta(),
        notificationType: "",
        status: "",
        buyer: "",
      };

    setCurrentPage(1);

    setDraftFilters(
      resetFiltersValue,
    );

    setAppliedFilters(
      resetFiltersValue,
    );
  }

  function goToPage(
    page: number,
  ) {
    if (
      page < 1 ||
      page > totalPages ||
      page === currentPage
    ) {
      return;
    }

    setCurrentPage(page);
  }

  /* =========================================
     PERCENTAGE
  ========================================= */

  const sentPercentage =
    summary.total > 0
      ? (
          (summary.sent /
            summary.total) *
          100
        ).toFixed(1)
      : "0.0";

  const failedPercentage =
    summary.total > 0
      ? (
          (summary.failed /
            summary.total) *
          100
        ).toFixed(1)
      : "0.0";

  const skippedPercentage =
    summary.total > 0
      ? (
          (summary.skipped /
            summary.total) *
          100
        ).toFixed(1)
      : "0.0";

  const startData =
    total === 0
      ? 0
      : (currentPage - 1) *
          ITEMS_PER_PAGE +
        1;

  const endData = Math.min(
    currentPage *
      ITEMS_PER_PAGE,
    total,
  );

  /* =========================================
     RENDER
  ========================================= */

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">
      <div className="w-full px-6 py-8 lg:px-8">

        {/* =================================
            HEADER
        ================================== */}

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
            Notification Log
          </h1>

          <p className="mt-2 text-sm text-[#536486] sm:text-[15px]">
            Riwayat pengiriman
            notifikasi otomatis
            melalui WhatsApp.
          </p>
        </div>

        {/* =================================
            SUMMARY
        ================================== */}

        <div className="mb-5 grid gap-4 xl:grid-cols-4">

          {/* TOTAL */}

          <div className="rounded-2xl border border-[#e7edf7] bg-[#f4f8ff] p-5 shadow-[0_2px_8px_rgba(24,54,110,0.03)]">
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dce8ff]">
                <Send className="h-6 w-6 text-[#3b73ec]" />
              </div>

              <div>
                <p className="text-3xl font-bold leading-none text-[#12275f]">
                  {summary.total}
                </p>

                <p className="mt-1 text-sm font-semibold text-[#18326e]">
                  Total Notifikasi
                </p>

                <p className="mt-1 text-xs text-[#7180a1]">
                  Semua riwayat
                  pengiriman
                </p>
              </div>

            </div>
          </div>

          {/* SENT */}

          <div className="rounded-2xl border border-[#e2f0ea] bg-[#f3fcf8] p-5">
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#c9f4e3]">
                <CheckCircle2 className="h-6 w-6 text-[#16a66a]" />
              </div>

              <div>
                <p className="text-3xl font-bold leading-none text-[#12275f]">
                  {summary.sent}
                </p>

                <p className="mt-1 text-sm font-semibold text-[#18326e]">
                  Berhasil Terkirim
                </p>

                <p className="mt-1 text-xs text-[#7180a1]">
                  {sentPercentage}%
                  dari total
                </p>
              </div>

            </div>
          </div>

          {/* FAILED */}

          <div className="rounded-2xl border border-[#f4e2e5] bg-[#fff6f7] p-5">
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffdadd]">
                <CircleX className="h-6 w-6 text-[#e84d5e]" />
              </div>

              <div>
                <p className="text-3xl font-bold leading-none text-[#12275f]">
                  {summary.failed}
                </p>

                <p className="mt-1 text-sm font-semibold text-[#18326e]">
                  Gagal Terkirim
                </p>

                <p className="mt-1 text-xs text-[#7180a1]">
                  {failedPercentage}%
                  dari total
                </p>
              </div>

            </div>
          </div>

          {/* SKIPPED */}

          <div className="rounded-2xl border border-[#f5e8c9] bg-[#fffbef] p-5">
            <div className="flex items-center gap-4">

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#ffeab7]">
                <MinusCircle className="h-6 w-6 text-[#ed941a]" />
              </div>

              <div>
                <p className="text-3xl font-bold leading-none text-[#12275f]">
                  {summary.skipped}
                </p>

                <p className="mt-1 text-sm font-semibold text-[#18326e]">
                  Dilewati
                  (Skipped)
                </p>

                <p className="mt-1 text-xs text-[#7180a1]">
                  {skippedPercentage}%
                  dari total
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* =================================
            FILTER
        ================================== */}

        <div className="mb-5 rounded-2xl border border-[#e4e9f3] bg-white p-4 shadow-[0_2px_8px_rgba(24,54,110,0.03)] lg:p-5">

          <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr_1fr_1.2fr_auto] xl:items-end">

            {/* MONTH */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#223769]">
                Bulan
              </label>

              <div
                className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-[#dfe5f0] px-3"
                onClick={() => {
                  monthInputRef.current?.showPicker?.();
                }}
              >
                <CalendarDays className="h-4 w-4 shrink-0 text-[#20366f]" />

                <input
                  ref={monthInputRef}
                  type="month"
                  value={
                    draftFilters.dateFrom?.slice(0, 7) ??
                    ""
                  }
                  onChange={(event) => {
                    const value = event.target.value;

                    if (!value) {
                      setDraftFilters((current) => ({
                        ...current,
                        dateFrom: "",
                        dateTo: "",
                      }));
                      return;
                    }

                    const [year, month] = value
                      .split("-")
                      .map(Number);
                    const lastDay = new Date(
                      year,
                      month,
                      0,
                    ).getDate();

                    setDraftFilters((current) => ({
                      ...current,
                      dateFrom: `${value}-01`,
                      dateTo: `${value}-${String(lastDay).padStart(2, "0")}`,
                    }));
                  }}
                  className="pointer-events-none w-full bg-transparent text-sm text-[#1e315f] outline-none"
                  aria-label="Bulan"
                />

              </div>
            </div>

            {/* NOTIFICATION TYPE */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#223769]">
                Jenis Notifikasi
              </label>

              <select
                value={
                  draftFilters.notificationType ??
                  ""
                }
                onChange={(event) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      notificationType:
                        event.target
                          .value as
                          | NotificationType
                          | "",
                    }),
                  )
                }
                className="h-11 w-full rounded-xl border border-[#dfe5f0] bg-white px-3 text-sm text-[#1e315f] outline-none"
              >
                <option value="">
                  Semua
                </option>

                <option value="RECAP_PAYMENT">
                  Rekapan
                  Pembayaran
                </option>

                <option value="DUE_DATE_REMINDER">
                  Reminder Jatuh
                  Tempo
                </option>
              </select>
            </div>

            {/* STATUS */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#223769]">
                Status
              </label>

              <select
                value={
                  draftFilters.status ??
                  ""
                }
                onChange={(event) =>
                  setDraftFilters(
                    (current) => ({
                      ...current,
                      status:
                        event.target
                          .value as
                          | NotificationLogStatus
                          | "",
                    }),
                  )
                }
                className="h-11 w-full rounded-xl border border-[#dfe5f0] bg-white px-3 text-sm text-[#1e315f] outline-none"
              >
                <option value="">
                  Semua
                </option>

                <option value="sent">
                  Sent
                </option>

                <option value="failed">
                  Failed
                </option>

                <option value="skipped">
                  Skipped
                </option>
              </select>
            </div>

            {/* BUYER */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-[#223769]">
                Pembeli
              </label>

              <div className="flex h-11 items-center gap-2 rounded-xl border border-[#dfe5f0] px-3">

                <Search className="h-4 w-4 shrink-0 text-[#687897]" />

                <input
                  type="text"
                  value={
                    draftFilters.buyer ??
                    ""
                  }
                  onChange={(event) =>
                    setDraftFilters(
                      (current) => ({
                        ...current,
                        buyer:
                          event.target.value,
                      }),
                    )
                  }
                  placeholder="Cari nama pembeli..."
                  className="w-full bg-transparent text-sm text-[#1e315f] outline-none placeholder:text-[#93a0b8]"
                />

              </div>
            </div>

            {/* BUTTONS */}

            <div className="flex gap-2 xl:justify-end">

              <button
                type="button"
                onClick={
                  resetFilters
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#fff0f2] px-4 text-sm font-semibold text-[#e94d61] hover:bg-[#ffe5e8]"
              >
                <RefreshCw className="h-4 w-4" />
                Reset
              </button>

              <button
                type="button"
                onClick={
                  applyFilters
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#3f73eb] px-4 text-sm font-semibold text-white hover:bg-[#3265dd]"
              >
                <Filter className="h-4 w-4" />
                Terapkan Filter
              </button>

            </div>

          </div>

        </div>

        {/* =================================
            TABLE
        ================================== */}

        <div className="overflow-hidden rounded-2xl border border-[#e4e9f3] bg-white shadow-[0_2px_8px_rgba(24,54,110,0.03)]">

          <div className="px-5 py-5">
            <h2 className="text-xl font-bold text-[#152a63]">
              Daftar Notification
              Log ({total})
            </h2>
          </div>

          {query.isError ? (
            <div className="border-t border-[#edf0f6] px-5 py-12 text-center text-sm text-[#d94a5b]">
              {query.error instanceof
              Error
                ? query.error.message
                : "Gagal mengambil notification log."}
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="min-w-[1080px] w-full border-collapse">

                <thead>
                  <tr className="bg-[#f4f7fd] text-center text-xs font-semibold text-[#193064]">

                    <th className="px-4 py-3.5">
                      Waktu
                    </th>

                    <th className="px-4 py-3.5">
                      Pembeli
                    </th>

                    <th className="px-4 py-3.5">
                      Jenis Notifikasi
                    </th>

                    <th className="px-4 py-3.5">
                      Tipe Pembayaran
                    </th>

                    <th className="px-4 py-3.5">
                      Status
                    </th>

                    <th className="px-4 py-3.5">
                      Pesan
                    </th>

                    <th className="px-5 py-3.5 text-center">
                      Aksi
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {query.isLoading ? (
                    Array.from({
                      length:
                        ITEMS_PER_PAGE,
                    }).map(
                      (
                        _,
                        index,
                      ) => (
                        <tr
                          key={`loading-${index}`}
                          className="border-t border-[#edf0f6]"
                        >
                          {Array.from(
                            {
                              length: 7,
                            },
                          ).map(
                            (
                              __,
                              cellIndex,
                            ) => (
                              <td
                                key={
                                  cellIndex
                                }
                                className="px-4 py-4"
                              >
                                <div className="h-4 animate-pulse rounded-md bg-[#eef2f8]" />
                              </td>
                            ),
                          )}
                        </tr>
                      ),
                    )
                  ) : rows.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-14 text-center text-sm text-[#7d8aa6]"
                      >
                        Belum ada
                        notification
                        log.
                      </td>
                    </tr>
                  ) : (
                    rows.map(
                      (
                        item,
                        index,
                      ) => {
                        const dateTime =
                          formatDateTime(
                            item.scheduled_at,
                          );

                        let message =
                          "Berhasil terkirim";

                        if (
                          item.status ===
                          "failed"
                        ) {
                          message =
                            item.error_message ||
                            "Pengiriman WhatsApp gagal.";
                        } else if (
                          item.status ===
                          "skipped"
                        ) {
                          message =
                            item.skip_reason ||
                            "Pembeli memiliki izin telat bayar.";
                        }

                        const retrying =
                          retryMutation.isPending &&
                          retryMutation.variables ===
                            item.id;

                        return (
                          <tr
                            key={
                              item.id
                            }
                            className="border-t border-[#edf0f6] text-sm text-[#263862]"
                          >

                            <td className="whitespace-nowrap px-4 py-3.5 text-center">
                              <div className="font-medium text-[#203468]">
                                {
                                  dateTime.date
                                }
                              </div>

                              <div className="text-xs text-[#8290aa]">
                                {
                                  dateTime.time
                                }
                              </div>
                            </td>

                            <td className="px-4 py-3.5 text-center font-medium text-[#203468]">
                              {
                                item.member
                                  ?.name
                              }
                            </td>

                            <td className="whitespace-nowrap px-4 py-3.5 text-center">
                              {notificationTypeLabel(
                                item.notification_type,
                              )}
                            </td>

                            <td className="whitespace-nowrap px-4 py-3.5 text-center">
                              {paymentTypeLabel(
                                item.payment
                                  ?.payment_type,
                              )}
                            </td>

                            <td className="px-4 py-3.5 text-center">
                              <StatusBadge
                                status={
                                  item.status
                                }
                              />
                            </td>

                            <td className="max-w-[320px] px-4 py-3.5 text-center text-[#566889]">
                              <span className="line-clamp-2">
                                {
                                  message
                                }
                              </span>
                            </td>

                            <td className="px-5 py-3.5 text-center">

                              {item.status ===
                              "failed" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    retryMutation.mutate(
                                      item.id,
                                    )
                                  }
                                  disabled={
                                    retrying
                                  }
                                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#3f73eb] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#3265dd] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <MessageCircle className="h-3.5 w-3.5" />

                                  {retrying
                                    ? "Mengirim..."
                                    : "Kirim Ulang"}
                                </button>
                              ) : (
                                <span className="text-[#93a0b8]">
                                  -
                                </span>
                              )}

                            </td>

                          </tr>
                        );
                      },
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

          {/* =================================
              PAGINATION
          ================================== */}

          <div className="flex flex-col gap-4 border-t border-[#edf0f6] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">

            <div className="text-sm text-[#6d7b99]">
              Menampilkan{" "}
              {startData} -{" "}
              {endData} dari{" "}
              {total} data
            </div>

            <div className="flex items-center gap-1">

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    currentPage -
                      1,
                  )
                }
                disabled={
                  currentPage <=
                  1
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7180a0] hover:bg-[#f3f6fb] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {pageNumbers.map(
                (
                  page,
                  index,
                ) =>
                  page ===
                  "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="flex h-9 w-7 items-center justify-center text-sm text-[#8793ac]"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() =>
                        goToPage(
                          page,
                        )
                      }
                      className={
                        currentPage ===
                        page
                          ? "h-9 min-w-9 rounded-lg bg-[#3f73eb] px-2 text-sm font-semibold text-white"
                          : "h-9 min-w-9 rounded-lg px-2 text-sm font-semibold text-[#324675] hover:bg-[#f3f6fb]"
                      }
                    >
                      {page}
                    </button>
                  ),
              )}

              <button
                type="button"
                onClick={() =>
                  goToPage(
                    currentPage +
                      1,
                  )
                }
                disabled={
                  currentPage >=
                  totalPages
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-[#7180a0] hover:bg-[#f3f6fb] disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </button>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}