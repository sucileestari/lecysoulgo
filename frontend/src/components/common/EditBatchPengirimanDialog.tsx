import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

import {
  updateManualShippingBatch,
  type ManualShippingBatch,
  type ManualShippingBatchStatus,
} from "@/services/manualShippingBatchService";

type EditBatchForm = {
  event_name: string;
  start_date: string;
  end_date: string;
  status: ManualShippingBatchStatus;
};

type DatePickerType =
  | "start"
  | "end"
  | null;

export type EditBatchPengirimanDialogProps = {
  open: boolean;
  batch: ManualShippingBatch | null;
  onClose: () => void;
  onSaved?: (
    batch: ManualShippingBatch,
  ) => void;
};

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

function getTodayDate(): string {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function parseDate(
  value: string,
): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] =
    value.split("-").map(Number);

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
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatDate(
  value: string,
): string {
  const date = parseDate(value);

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

function isBefore(
  first: string,
  second: string,
): boolean {
  return first < second;
}

function createCalendarDays(
  year: number,
  month: number,
): Array<Date | null> {
  const firstDay =
    new Date(
      year,
      month,
      1,
    ).getDay();

  const totalDays =
    new Date(
      year,
      month + 1,
      0,
    ).getDate();

  const days: Array<Date | null> = [];

  for (
    let i = 0;
    i < firstDay;
    i += 1
  ) {
    days.push(null);
  }

  for (
    let day = 1;
    day <= totalDays;
    day += 1
  ) {
    days.push(
      new Date(
        year,
        month,
        day,
      ),
    );
  }

  while (
    days.length % 7 !== 0
  ) {
    days.push(null);
  }

  return days;
}

export default function EditBatchPengirimanDialog({
  open,
  batch,
  onClose,
  onSaved,
}: EditBatchPengirimanDialogProps) {
  const queryClient =
    useQueryClient();

  const [
    form,
    setForm,
  ] = useState<EditBatchForm>({
    event_name: "",
    start_date: getTodayDate(),
    end_date: getTodayDate(),
    status: "Aktif",
  });

  const [
    error,
    setError,
  ] = useState("");

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
    const today = new Date();

    return new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
    );
  });

  useEffect(() => {
    if (!open || !batch) {
      return;
    }

    setError("");

    setDatePickerType(null);

    setTemporaryDate("");

    setForm({
      event_name:
        batch.event_name,

      start_date:
        batch.start_date,

      end_date:
        batch.end_date,

      status:
        batch.status,
    });
  }, [
    open,
    batch,
  ]);

  useEffect(() => {
    if (!datePickerType) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
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
  }, [
    datePickerType,
  ]);

  const updateMutation =
    useMutation<
      ManualShippingBatch,
      Error,
      EditBatchForm
    >({
      mutationFn:
        async (values) => {
          if (!batch) {
            throw new Error(
              "Batch tidak ditemukan.",
            );
          }

          return updateManualShippingBatch(
            batch.id,
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
          mutationError,
        ) => {
          setError(
            mutationError.message,
          );
        },
    });

  if (!open || !batch) {
    return null;
  }

  function closeDatePicker() {
    setDatePickerType(null);
    setTemporaryDate("");
  }

  function handleCancelDate() {
    closeDatePicker();
  }

  function openDatePicker(
    type: Exclude<
      DatePickerType,
      null
    >,
  ) {
    const currentValue =
      type === "start"
        ? form.start_date
        : form.end_date;

    const parsed =
      parseDate(
        currentValue,
      );

    const fallback =
      new Date();

    const base =
      parsed ?? fallback;

    setCalendarMonth(
      new Date(
        base.getFullYear(),
        base.getMonth(),
        1,
      ),
    );

    setTemporaryDate(
      currentValue,
    );

    setDatePickerType(
      type,
    );

    setError("");
  }

  function selectCalendarDate(
    value: string,
  ) {
    if (
      datePickerType ===
        "start" &&
      value <
        getTodayDate()
    ) {
      return;
    }

    if (
      datePickerType ===
        "end" &&
      value <
        form.start_date
    ) {
      return;
    }

    setTemporaryDate(
      value,
    );

    setError("");
  }

  function confirmCalendarDate() {
    if (
      !temporaryDate ||
      !datePickerType
    ) {
      return;
    }

    if (
      datePickerType ===
        "start" &&
      temporaryDate <
        getTodayDate()
    ) {
      return;
    }

    if (
      datePickerType ===
        "end" &&
      temporaryDate <
        form.start_date
    ) {
      return;
    }

    if (
      datePickerType ===
      "start"
    ) {
      setForm(
        (
          current,
        ) => ({
          ...current,
          start_date:
            temporaryDate,
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

    closeDatePicker();
  }

  function submit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");

    const eventName =
      form.event_name.trim();

    if (!eventName) {
      setError(
        "Nama Event wajib diisi.",
      );
      return;
    }

    if (!form.start_date) {
      setError(
        "Tanggal mulai event wajib diisi.",
      );
      return;
    }

    if (!form.end_date) {
      setError(
        "Tanggal berakhir event wajib diisi.",
      );
      return;
    }

    if (
      form.start_date <
      getTodayDate()
    ) {
      setError(
        "Tanggal mulai event tidak boleh sebelum hari ini.",
      );
      return;
    }

    if (
      form.end_date <
      form.start_date
    ) {
      setError(
        "Tanggal berakhir event tidak boleh sebelum tanggal mulai event.",
      );
      return;
    }

    updateMutation.mutate({
      ...form,
      event_name:
        eventName,
    });
  }

  const year =
    calendarMonth.getFullYear();

  const month =
    calendarMonth.getMonth();

  const days =
    createCalendarDays(
      year,
      month,
    );

  const minimumDate =
    datePickerType ===
    "start"
      ? getTodayDate()
      : form.start_date;

  return createPortal(
    <>
      <div
        className="fixed flex items-center justify-center bg-slate-900/50 p-4"
        style={{
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 2147483646,
        }}
      >
        <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
          {/* HEADER */}

          <div className="flex shrink-0 items-center justify-between border-b border-[#e5eaf4] px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-[#20366f]">
                Edit Batch
              </h2>

              <p className="mt-1 text-sm text-[#7a89ad]">
                Mengubah Batch
                Pengiriman
              </p>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                updateMutation.isPending
              }
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              aria-label="Tutup"
            >
              <X size={20} />
            </button>
          </div>

          <form
            onSubmit={
              submit
            }
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="overflow-y-auto px-6 py-6">
              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm font-medium text-red-600">
                    {error}
                  </p>
                </div>
              )}

              {/* NAMA EVENT */}

              <div>
                <label
                  htmlFor="edit-manual-shipping-event-name"
                  className="mb-2 block text-sm font-medium text-[#405274]"
                >
                  Nama Event
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <input
                  id="edit-manual-shipping-event-name"
                  type="text"
                  value={
                    form.event_name
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        event_name:
                          event.target
                            .value,
                      }),
                    )
                  }
                  disabled={
                    updateMutation.isPending
                  }
                  className="h-12 w-full rounded-lg border border-[#d9e0ef] px-4 text-sm text-[#20366f] outline-none focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f9fc]"
                />
              </div>

              {/* TANGGAL MULAI */}

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#405274]">
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
                    updateMutation.isPending
                  }
                  className="flex h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] disabled:bg-[#f7f9fc]"
                >
                  <span>
                    {formatDate(
                      form.start_date,
                    )}
                  </span>

                  <CalendarDays
                    size={18}
                    className="text-[#536795]"
                  />
                </button>
              </div>

              {/* TANGGAL BERAKHIR */}

              <div className="mt-5">
                <label className="mb-2 block text-sm font-medium text-[#405274]">
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
                    updateMutation.isPending
                  }
                  className="flex h-12 w-full items-center justify-between rounded-lg border border-[#d9e0ef] bg-white px-4 text-left text-sm text-[#20366f] outline-none transition hover:border-slate-300 focus:border-[#1457ff] disabled:bg-[#f7f9fc]"
                >
                  <span>
                    {formatDate(
                      form.end_date,
                    )}
                  </span>

                  <CalendarDays
                    size={18}
                    className="text-[#536795]"
                  />
                </button>
              </div>

              {/* STATUS */}

              <div className="mt-5">
                <label
                  htmlFor="edit-manual-shipping-status"
                  className="mb-2 block text-sm font-medium text-[#405274]"
                >
                  Status Batch
                  <span className="ml-1 text-red-500">
                    *
                  </span>
                </label>

                <select
                  id="edit-manual-shipping-status"
                  value={
                    form.status
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm(
                      (
                        current,
                      ) => ({
                        ...current,
                        status:
                          event.target
                            .value as ManualShippingBatchStatus,
                      }),
                    )
                  }
                  disabled={
                    updateMutation.isPending
                  }
                  className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white px-4 text-sm text-[#20366f] outline-none focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:bg-[#f7f9fc]"
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

            {/* FOOTER */}

            <div className="flex shrink-0 justify-end gap-3 border-t border-[#e5eaf4] px-6 py-4">
              <button
                type="button"
                onClick={
                  onClose
                }
                disabled={
                  updateMutation.isPending
                }
                className="rounded-lg border border-[#d9e0ef] bg-white px-5 py-2.5 text-sm font-medium text-[#20366f] transition hover:bg-[#f8faff] disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  updateMutation.isPending
                }
                className="rounded-lg bg-[#1457ff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:opacity-50"
              >
                {updateMutation.isPending
                  ? "Menyimpan..."
                  : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* =================================
          DATE PICKER POPUP
      ================================== */}

      {datePickerType && (
        <div
          className="fixed flex items-center justify-center bg-slate-900/50 p-4"
          style={{
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 2147483647,
          }}
          onMouseDown={
            closeDatePicker
          }
          role="dialog"
          aria-modal="true"
          aria-label="Pilih tanggal"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-start justify-between border-b border-[#e5eaf4] px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-[#20366f]">
                  {datePickerType ===
                  "start"
                    ? "Pilih Tanggal Mulai Event"
                    : "Pilih Tanggal Berakhir Event"}
                </h3>

                <p className="mt-1 text-xs text-[#7a89ad]">
                  Pilih tanggal sesuai
                  batas yang tersedia.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeDatePicker
                }
                className="rounded-lg p-2 text-[#8390aa] transition hover:bg-slate-100"
                aria-label="Tutup date picker"
              >
                <X size={19} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (
                        current,
                      ) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() -
                            1,
                          1,
                        ),
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft
                    size={19}
                  />
                </button>

                <p className="text-base font-semibold text-slate-800">
                  {
                    MONTH_NAMES[
                      month
                    ]
                  }{" "}
                  {year}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setCalendarMonth(
                      (
                        current,
                      ) =>
                        new Date(
                          current.getFullYear(),
                          current.getMonth() +
                            1,
                          1,
                        ),
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight
                    size={19}
                  />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7">
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

              <div className="grid grid-cols-7 gap-1">
                {days.map(
                  (
                    date,
                    index,
                  ) => {
                    if (!date) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="h-11"
                        />
                      );
                    }

                    const dateString =
                      toDateString(
                        date,
                      );

                    const disabled =
                      isBefore(
                        dateString,
                        minimumDate,
                      );

                    const selected =
                      temporaryDate ===
                      dateString;

                    return (
                      <button
                        key={
                          dateString
                        }
                        type="button"
                        disabled={
                          disabled
                        }
                        onClick={() =>
                          selectCalendarDate(
                            dateString,
                          )
                        }
                        className={[
                          "flex h-11 w-full items-center justify-center rounded-xl text-sm transition",
                          disabled
                            ? "cursor-not-allowed text-slate-300"
                            : "text-slate-700 hover:bg-blue-50",
                          selected
                            ? "bg-[#1457ff] font-semibold text-white hover:bg-[#1457ff]"
                            : "",
                        ].join(
                          " ",
                        )}
                      >
                        {date.getDate()}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-[#e5eaf4] px-5 py-4">
              <button
                type="button"
                onClick={
                  handleCancelDate
                }
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={
                  confirmCalendarDate
                }
                disabled={
                  !temporaryDate
                }
                className="flex-1 rounded-xl bg-[#1457ff] px-4 py-3 text-sm font-medium text-white hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Pilih
              </button>
            </div>
          </div>
        </div>
      )}
    </>,
    document.body,
  );
}