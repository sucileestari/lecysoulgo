import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createManualShippingBatch,
  updateManualShippingBatch,
  type ManualShippingBatch,
  type ManualShippingBatchStatus,
} from "@/services/manualShippingBatchService";

/* =========================================
   TYPES
========================================= */

type BatchForm = {
  event_name: string;
  start_date: string;
  end_date: string;
  status: ManualShippingBatchStatus;
};

type DatePickerType =
  | "start"
  | "end"
  | null;

export type ManualShippingBatchModalProps = {
  open: boolean;

  editingBatch?: ManualShippingBatch | null;

  onClose: () => void;

  onSaved?: (
    batch: ManualShippingBatch,
  ) => void;
};

/* =========================================
   HELPERS
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

function createDefaultForm(): BatchForm {
  const today =
    getTodayDate();

  return {
    event_name: "",
    start_date: today,
    end_date: today,
    status: "Aktif",
  };
}

/* =========================================
   CALENDAR HELPERS
========================================= */

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

const DAY_NAMES = [
  "Mg",
  "Sn",
  "Sl",
  "Rb",
  "Km",
  "Jm",
  "Sb",
];

function parseDate(
  value: string,
): Date | null {
  if (!value) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = value
    .split("-")
    .map(Number);

  if (
    !year ||
    !month ||
    !day
  ) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
  );

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateString(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      date.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  value: string,
): string {
  const date =
    parseDate(value);

  if (!date) {
    return "Pilih tanggal";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function getDaysInMonth(
  year: number,
  month: number,
): number {
  return new Date(
    year,
    month + 1,
    0,
  ).getDate();
}

function getFirstDayOfMonth(
  year: number,
  month: number,
): number {
  return new Date(
    year,
    month,
    1,
  ).getDay();
}

function isSameDate(
  first: Date,
  second: Date,
): boolean {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function isBeforeDate(
  first: Date,
  second: Date,
): boolean {
  return (
    new Date(
      first.getFullYear(),
      first.getMonth(),
      first.getDate(),
    ).getTime() <
    new Date(
      second.getFullYear(),
      second.getMonth(),
      second.getDate(),
    ).getTime()
  );
}

/* =========================================
   COMPONENT
========================================= */

export default function ManualShippingBatchModal({
  open,
  editingBatch = null,
  onClose,
  onSaved,
}: ManualShippingBatchModalProps) {
  const queryClient =
    useQueryClient();

  const [
    form,
    setForm,
  ] = useState<BatchForm>(
    createDefaultForm(),
  );

  const [
    formError,
    setFormError,
  ] = useState("");

  /* =======================================
     DATE PICKER
  ======================================== */

  const [
    datePickerType,
    setDatePickerType,
  ] = useState<DatePickerType>(
    null,
  );

  const [
    temporaryDate,
    setTemporaryDate,
  ] = useState("");

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(() => {
    const now = new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );
  });

  const isEdit =
    Boolean(editingBatch);

  /* =======================================
     SYNC FORM
  ======================================== */

  useEffect(() => {
    if (!datePickerType) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key === "Escape"
      ) {
        closeDatePicker();
      }
    }

    window.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [datePickerType]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormError("");
    setDatePickerType(null);
    setTemporaryDate("");

    if (editingBatch) {
      setForm({
        event_name:
          editingBatch.event_name,

        start_date:
          editingBatch.start_date,

        end_date:
          editingBatch.end_date,

        status:
          editingBatch.status,
      });

      return;
    }

    setForm(
      createDefaultForm(),
    );
  }, [
    open,
    editingBatch,
  ]);

  /* =======================================
     SAVE
  ======================================== */

  const saveMutation =
    useMutation<
      ManualShippingBatch,
      Error,
      BatchForm
    >({
      mutationFn:
        async (values) => {
          if (
            editingBatch
          ) {
            return updateManualShippingBatch(
              editingBatch.id,
              values,
            );
          }

          return createManualShippingBatch(
            values,
          );
        },

      onSuccess:
        async (
          savedBatch,
        ) => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "manual-shipping-batches",
              ],
            },
          );

          onSaved?.(
            savedBatch,
          );
        },

      onError:
        (
          error,
        ) => {
          setFormError(
            error.message,
          );
        },
    });

  /* =======================================
     CLOSE
  ======================================== */

  function handleClose() {
    if (
      saveMutation.isPending
    ) {
      return;
    }

    setFormError("");
    setDatePickerType(null);
    setTemporaryDate("");

    onClose();
  }

  /* =======================================
     SUBMIT
  ======================================== */

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setFormError("");

    const eventName =
      form.event_name.trim();

    if (!eventName) {
      setFormError(
        "Nama Event wajib diisi.",
      );

      return;
    }

    if (
      !form.start_date
    ) {
      setFormError(
        "Tanggal mulai event wajib diisi.",
      );

      return;
    }

    if (
      !form.end_date
    ) {
      setFormError(
        "Tanggal berakhir event wajib diisi.",
      );

      return;
    }

    if (
      form.end_date <
      form.start_date
    ) {
      setFormError(
        "Tanggal berakhir event tidak boleh sebelum tanggal mulai event.",
      );

      return;
    }

    saveMutation.mutate({
      ...form,
      event_name:
        eventName,
    });
  }

  /* =======================================
     DATE PICKER
  ======================================== */

  function openDatePicker(
    type: Exclude<
      DatePickerType,
      null
    >,
  ) {
    if (
      saveMutation.isPending
    ) {
      return;
    }

    const currentDate =
      type === "start"
        ? form.start_date
        : form.end_date;

    const baseDate =
      type === "start" &&
      currentDate <
        minimumStartDate
        ? minimumStartDate
        : currentDate ||
          getTodayDate();

    const date =
      parseDate(
        baseDate,
      ) ?? new Date();

    setCalendarMonth(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
    );

    setTemporaryDate(
      currentDate,
    );

    setDatePickerType(
      type,
    );

    setFormError("");
  }

  function closeDatePicker() {
    setTemporaryDate("");
    setDatePickerType(null);
    setFormError("");
  }

  function handleSelectCalendarDate(
    dateString: string,
  ) {
    /*
     * Tanggal berakhir tidak boleh
     * sebelum tanggal mulai.
     */
    if (
      datePickerType === "start" &&
      dateString <
        minimumStartDate
    ) {
      return;
    }

    if (
      datePickerType === "end" &&
      form.start_date &&
      dateString <
        form.start_date
    ) {
      return;
    }

    setTemporaryDate(
      dateString,
    );

    setFormError("");
  }

  function handleConfirmDate() {
    if (
      !temporaryDate ||
      !datePickerType
    ) {
      setFormError(
        "Silakan pilih tanggal.",
      );
      return;
    }

    if (
      datePickerType === "end" &&
      form.start_date &&
      temporaryDate <
        form.start_date
    ) {
      setFormError(
        `Tanggal berakhir tidak boleh sebelum ${formatDisplayDate(
          form.start_date,
        )}.`,
      );
      return;
    }

    if (
      datePickerType === "start"
    ) {
      setForm(
        (
          current,
        ) => ({
          ...current,

          start_date:
            temporaryDate,

          /*
           * Bila tanggal akhir lama lebih
           * kecil dari tanggal mulai baru,
           * sesuaikan otomatis.
           */
          end_date:
            current.end_date <
            temporaryDate
              ? temporaryDate
              : current.end_date,
        }),
      );
    } else {
      setForm(
        (
          current,
        ) => ({
          ...current,
          end_date:
            temporaryDate,
        }),
      );
    }

    setTemporaryDate("");
    setDatePickerType(null);
    setFormError("");
  }

  function handleCancelDate() {
    setTemporaryDate("");
    setDatePickerType(null);
    setFormError("");
  }

  function changeCalendarMonth(
    offset: number,
  ) {
    setCalendarMonth(
      (
        current,
      ) =>
        new Date(
          current.getFullYear(),
          current.getMonth() +
            offset,
          1,
        ),
    );
  }

  /* =======================================
     CALENDAR DATA
  ======================================== */

  const calendarYear =
    calendarMonth.getFullYear();

  const calendarMonthIndex =
    calendarMonth.getMonth();

  const firstDay =
    getFirstDayOfMonth(
      calendarYear,
      calendarMonthIndex,
    );

  const daysInMonth =
    getDaysInMonth(
      calendarYear,
      calendarMonthIndex,
    );

  const minimumStartDate =
    getTodayDate();

  const minimumEndDate =
    datePickerType === "end"
      ? form.start_date
      : "";

  const minimumDate =
    datePickerType === "start"
      ? minimumStartDate
      : minimumEndDate;

  /* =======================================
     NOT OPEN
  ======================================== */

  if (!open) {
    return null;
  }

  /* =======================================
     RENDER
  ======================================== */

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-shipping-batch-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* =================================
            HEADER
        ================================== */}

        <div className="shrink-0 border-b border-[#e5eaf4] px-6 py-5">
          <h2
            id="manual-shipping-batch-modal-title"
            className="text-xl font-semibold text-[#20366f]"
          >
            {isEdit
              ? "Edit Batch"
              : "Tambah Batch"}
          </h2>

          <p className="mt-1 text-sm text-[#7a89ad]">
            Menambahkan Batch
            Pengiriman
          </p>
        </div>

        {/* =================================
            FORM
        ================================== */}

        <form
          onSubmit={
            handleSubmit
          }
          className="flex min-h-0 flex-1 flex-col"
        >
          {/* BODY */}

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {formError && (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <p className="text-sm font-medium leading-5 text-red-600">
                  {formError}
                </p>
              </div>
            )}

            {/* NAMA EVENT */}

            <div>
              <label
                htmlFor="manual-shipping-event-name"
                className="mb-2 block text-sm font-medium text-[#405274]"
              >
                Nama Event
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <input
                id="manual-shipping-event-name"
                type="text"
                value={
                  form.event_name
                }
                onChange={(
                  event,
                ) => {
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      event_name:
                        event.target
                          .value,
                    }),
                  );

                  if (
                    formError
                  ) {
                    setFormError(
                      "",
                    );
                  }
                }}
                placeholder="Masukkan nama event"
                autoComplete="off"
                disabled={
                  saveMutation.isPending
                }
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white px-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#98a4bf] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f9fc]"
              />
            </div>

            {/* TANGGAL MULAI */}

            <div className="mt-5">
              <label
                htmlFor="manual-shipping-start-date"
                className="mb-2 block text-sm font-medium text-[#405274]"
              >
                Tanggal Mulai Event
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  openDatePicker(
                    "start",
                  )
                }
                disabled={
                  saveMutation.isPending
                }
                className="flex h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f7f9fc]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CalendarDays
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="truncate text-sm text-slate-700">
                    {formatDisplayDate(
                      form.start_date,
                    )}
                  </span>
                </div>
              </button>
            </div>

            {/* TANGGAL BERAKHIR */}

            <div className="mt-5">
              <label
                htmlFor="manual-shipping-end-date"
                className="mb-2 block text-sm font-medium text-[#405274]"
              >
                Tanggal Berakhir Event
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <button
                type="button"
                onClick={() =>
                  openDatePicker(
                    "end",
                  )
                }
                disabled={
                  saveMutation.isPending
                }
                className="flex h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f7f9fc]"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <CalendarDays
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <span className="truncate text-sm text-slate-700">
                    {formatDisplayDate(
                      form.end_date,
                    )}
                  </span>
                </div>
              </button>
            </div>

            {/* STATUS */}

            <div className="mt-5">
              <label
                htmlFor="manual-shipping-status"
                className="mb-2 block text-sm font-medium text-[#405274]"
              >
                Status Batch
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <select
                id="manual-shipping-status"
                value={
                  form.status
                }
                onChange={(
                  event,
                ) => {
                  setForm(
                    (
                      current,
                    ) => ({
                      ...current,
                      status:
                        event.target
                          .value as ManualShippingBatchStatus,
                    }),
                  );

                  if (
                    formError
                  ) {
                    setFormError(
                      "",
                    );
                  }
                }}
                disabled={
                  saveMutation.isPending
                }
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white px-4 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f9fc]"
              >
                <option value="Aktif">
                  Aktif
                </option>

                <option value="Selesai">
                  Selesai
                </option>

                <option value="Dibatalkan">
                  Dibatalkan
                </option>
              </select>
            </div>
          </div>

          {/* =================================
              FOOTER
          ================================== */}

          <div className="shrink-0 border-t border-[#e5eaf4] px-6 py-4">
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={
                  handleClose
                }
                disabled={
                  saveMutation.isPending
                }
                className="rounded-lg border border-[#d9e0ef] bg-white px-5 py-2.5 text-sm font-medium text-[#20366f] transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saveMutation.isPending
                }
                className="rounded-lg bg-[#1457ff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveMutation.isPending
                  ? "Menyimpan..."
                  : "Save"}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* =================================
          CUSTOM DATE PICKER
          Mengikuti pola date picker
          pada modal Ijin Telat Bayar.
      ================================== */}

      {datePickerType && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
          onMouseDown={() =>
            closeDatePicker()
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-shipping-date-picker-title"
        >
          <div
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3
                  id="manual-shipping-date-picker-title"
                  className="text-base font-semibold text-slate-800"
                >
                  {datePickerType ===
                  "start"
                    ? "Pilih Tanggal Mulai Event"
                    : "Pilih Tanggal Berakhir Event"}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  {datePickerType ===
                  "start"
                    ? "Pilih tanggal mulai event."
                    : "Pilih tanggal berakhir event."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeDatePicker
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup kalender"
              >
                <X size={19} />
              </button>
            </div>

            {/* CALENDAR */}

            <div className="px-5 py-5">
              {/* MONTH NAVIGATION */}

              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    changeCalendarMonth(
                      -1,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft
                    size={19}
                  />
                </button>

                <p className="text-base font-semibold capitalize text-slate-800">
                  {
                    MONTH_NAMES[
                      calendarMonthIndex
                    ]
                  }{" "}
                  {
                    calendarYear
                  }
                </p>

                <button
                  type="button"
                  onClick={() =>
                    changeCalendarMonth(
                      1,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight
                    size={19}
                  />
                </button>
              </div>

              {/* WEEK DAYS */}

              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAY_NAMES.map(
                  (
                    day,
                  ) => (
                    <div
                      key={day}
                      className="flex h-9 items-center justify-center text-xs font-medium text-slate-400"
                    >
                      {day}
                    </div>
                  ),
                )}
              </div>

              {/* DAYS */}

              <div className="grid grid-cols-7 gap-1">
                {Array.from(
                  {
                    length:
                      firstDay,
                  },
                ).map(
                  (
                    _,
                    index,
                  ) => (
                    <div
                      key={`empty-${index}`}
                      className="h-11"
                    />
                  ),
                )}

                {Array.from(
                  {
                    length:
                      daysInMonth,
                  },
                ).map(
                  (
                    _,
                    index,
                  ) => {
                    const day =
                      index +
                      1;

                    const date =
                      new Date(
                        calendarYear,
                        calendarMonthIndex,
                        day,
                      );

                    const dateString =
                      toDateString(
                        date,
                      );

                    const isBeforeMinimum =
                      Boolean(
                        minimumDate &&
                          dateString <
                            minimumDate,
                      );

                    const isSelected =
                      temporaryDate ===
                      dateString;

                    return (
                      <button
                        key={
                          dateString
                        }
                        type="button"
                        disabled={
                          isBeforeMinimum
                        }
                        onClick={() =>
                          handleSelectCalendarDate(
                            dateString,
                          )
                        }
                        className={[
                          "flex h-11 w-full items-center justify-center rounded-xl text-sm transition",

                          isBeforeMinimum
                            ? "cursor-not-allowed text-slate-300"
                            : "text-slate-700 hover:bg-blue-50",

                          isSelected
                            ? "bg-[#1457ff] font-semibold text-white hover:bg-[#1457ff]"
                            : "",
                        ].join(
                          " ",
                        )}
                      >
                        {day}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            {/* FOOTER */}

            <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={
                  handleCancelDate
                }
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmDate
                }
                disabled={
                  !temporaryDate
                }
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