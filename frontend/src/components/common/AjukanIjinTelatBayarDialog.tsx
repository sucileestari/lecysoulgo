import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  X,
} from "lucide-react";

import {
  createLatePaymentPermission,
  getLatePaymentPermissions,
  getLatePaymentRecapOptions,
  type LatePaymentRecapOption,
} from "@/services/latePaymentPermissionService";

import {
  getMembers,
  type Member,
} from "@/services/memberService";

/* =========================================
   PROPS
========================================= */

type AjukanIjinTelatBayarDialogProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  isCustomer?: boolean;
};

/* =========================================
   TYPES
========================================= */

type MemberOption = {
  id: string;
  name: string;
  phone: string;
  type: Member["type"];
};

type SelectedItem = {
  recap_id: string;
  payment_type:
    | "DP"
    | "PELUNASAN";
};

/* =========================================
   DATE HELPERS
========================================= */

function formatDate(
  dateString:
    | string
    | null,
): string {
  if (!dateString) {
    return "—";
  }

  const date = new Date(
    `${dateString}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "—";
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

function addDays(
  dateString: string,
  days: number,
): string {
  const date = new Date(
    `${dateString}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "";
  }

  date.setDate(
    date.getDate() +
      days,
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(
    2,
    "0",
  );

  const day = String(
    date.getDate(),
  ).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

function getTodayDate(): string {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(
    2,
    "0",
  );

  const day = String(
    date.getDate(),
  ).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
}

/* =========================================
   CALENDAR HELPERS
========================================= */

function toDateString(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(
    2,
    "0",
  );

  const day = String(
    date.getDate(),
  ).padStart(
    2,
    "0",
  );

  return `${year}-${month}-${day}`;
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

function getMonthLabel(
  date: Date,
): string {
  return new Intl.DateTimeFormat(
    "id-ID",
    {
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

/* =========================================
   COMPONENT
========================================= */

export default function AjukanIjinTelatBayarDialog({
  open,
  onClose,
  onSuccess,
  isCustomer,
}: AjukanIjinTelatBayarDialogProps) {
  const resolvedIsCustomer =
    isCustomer ??
    Boolean(
      localStorage.getItem("customer_member"),
    );
  /* =======================================
     DATA
  ======================================= */

  const [
    members,
    setMembers,
  ] = useState<
    MemberOption[]
  >([]);

  const [
    options,
    setOptions,
  ] = useState<
    LatePaymentRecapOption[]
  >([]);

  /*
   * ID member yang masih mempunyai
   * ijin telat bayar dengan status unpaid.
   */
  const [
    blockedMemberIds,
    setBlockedMemberIds,
  ] = useState<
    Set<string>
  >(
    () => new Set(),
  );

  /* =======================================
     LOADING
  ======================================= */

  const [
    isLoadingOptions,
    setIsLoadingOptions,
  ] = useState(false);

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  /* =======================================
     SELECTED MEMBER
  ======================================= */

  const [
    selectedMemberId,
    setSelectedMemberId,
  ] = useState("");

  /* =======================================
     SELECTED ITEMS
  ======================================= */

  const [
    selectedItems,
    setSelectedItems,
  ] = useState<
    SelectedItem[]
  >([]);

  /* =======================================
     FORM
  ======================================= */

  const [
    paymentDate,
    setPaymentDate,
  ] = useState("");

  const [
    reason,
    setReason,
  ] = useState("");

  /* =======================================
     ERROR
  ======================================= */

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================
     MEMBER DROPDOWN
  ======================================= */

  const [
    isMemberDropdownOpen,
    setIsMemberDropdownOpen,
  ] = useState(false);

  /* =======================================
     ITEM DROPDOWN
  ======================================= */

  const [
    isItemDropdownOpen,
    setIsItemDropdownOpen,
  ] = useState(false);

  /* =======================================
     DATE PICKER
  ======================================= */

  const [
    isPaymentDatePickerOpen,
    setIsPaymentDatePickerOpen,
  ] = useState(false);

  const [
    temporaryPaymentDate,
    setTemporaryPaymentDate,
  ] = useState("");

  const [
    calendarMonth,
    setCalendarMonth,
  ] = useState(() => {
    const now =
      new Date();

    return new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    );
  });

  /* =======================================
     REFS
  ======================================= */

  const detailBarangRef =
    useRef<HTMLDivElement>(
      null,
    );

  const paymentDatePickerRef =
    useRef<HTMLDivElement>(
      null,
    );

  /* =======================================
     LOAD DATA
  ======================================= */

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled =
      false;

    async function loadOptions() {
      try {
        setIsLoadingOptions(
          true,
        );

        setError("");

        /*
         * Ambil dua sumber:
         *
         * 1. Semua member + eligible items
         * 2. Semua permission
         *
         * Permission dipakai untuk menentukan
         * member mana yang sedang blocked.
         */
        const customerMember = resolvedIsCustomer
          ? JSON.parse(
              localStorage.getItem("customer_member") ??
                "null",
            )
          : null;

        const [
          recapOptions,
          permissions,
          allMembers,
        ] =
          await Promise.all([
            getLatePaymentRecapOptions(),
            getLatePaymentPermissions(),
            getMembers(),
          ]);

        if (
          cancelled
        ) {
          return;
        }

        /* -----------------------------------
           MEMBERS
        ----------------------------------- */

        const recapMembers =
          Array.isArray(
            recapOptions.members,
          )
            ? recapOptions.members.map(
                (member) => {
                  const memberData =
                    allMembers.find(
                      (item) =>
                        item.id ===
                        member.id,
                    );

                  return {
                    ...member,
                    type:
                      memberData?.type ??
                      "customer",
                  };
                },
              )
            : [];

        const customerMemberData =
          resolvedIsCustomer &&
          customerMember?.id
            ? allMembers.find(
                (member) =>
                  member.id ===
                  customerMember.id,
              )
            : null;

        const normalizedMembers =
          customerMemberData &&
          !recapMembers.some(
            (member) =>
              member.id ===
              customerMemberData.id,
          )
            ? [
                ...recapMembers,
                {
                  id:
                    customerMemberData.id,
                  name:
                    customerMemberData.name,
                  phone:
                    customerMemberData.phone,
                  type:
                    customerMemberData.type,
                },
              ]
            : recapMembers;

        setMembers(
          normalizedMembers,
        );

        if (
          resolvedIsCustomer &&
          customerMember?.id
        ) {
          setSelectedMemberId(
            customerMember.id,
          );
        }

        /* -----------------------------------
           ITEMS
        ----------------------------------- */

        setOptions(
          Array.isArray(
            recapOptions.items,
          )
            ? recapOptions.items
            : [],
        );

        /* -----------------------------------
           BLOCKED MEMBERS
        ----------------------------------- */

        const unpaidMemberIds =
          new Set<string>();

        if (
          Array.isArray(
            permissions,
          )
        ) {
          for (
            const permission of permissions
          ) {
            if (
              permission.payment_status ===
                "unpaid" &&
              permission.member_id
            ) {
              unpaidMemberIds.add(
                permission.member_id,
              );
            }
          }
        }

        setBlockedMemberIds(
          unpaidMemberIds,
        );

        /*
         * Kalau member yang sedang dipilih
         * ternyata sudah mempunyai permission
         * unpaid, reset selection.
         *
         * Ini berguna jika status berubah
         * ketika dialog masih terbuka.
         */
        if (
          selectedMemberId &&
          unpaidMemberIds.has(
            selectedMemberId,
          ) &&
          !resolvedIsCustomer
        ) {
          setSelectedMemberId(
            "",
          );

          setSelectedItems(
            [],
          );

          setPaymentDate(
            "",
          );

          setTemporaryPaymentDate(
            "",
          );
        }
      } catch (
        loadError
      ) {
        if (
          cancelled
        ) {
          return;
        }

        console.error(
          "load late payment dialog options error:",
          loadError,
        );

        setMembers(
          [],
        );

        setOptions(
          [],
        );

        setBlockedMemberIds(
          new Set(),
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Gagal mengambil data pengajuan dan rekapan.",
        );
      } finally {
        if (
          !cancelled
        ) {
          setIsLoadingOptions(
            false,
          );
        }
      }
    }

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    selectedMemberId,
    resolvedIsCustomer,
  ]);

  /* =======================================
     RESET WHEN CLOSED
  ======================================= */

  useEffect(() => {
    if (!open) {
      setSelectedMemberId(
        "",
      );

      setSelectedItems(
        [],
      );

      setPaymentDate(
        "",
      );

      setReason(
        "",
      );

      setError(
        "",
      );

      setIsMemberDropdownOpen(
        false,
      );

      setIsItemDropdownOpen(
        false,
      );

      setIsPaymentDatePickerOpen(
        false,
      );

      setTemporaryPaymentDate(
        "",
      );

      setBlockedMemberIds(
        new Set(),
      );
    }
  }, [open]);

  /* =======================================
     CLOSE ITEM DROPDOWN
     WHEN CLICKING OUTSIDE
  ======================================= */

  useEffect(() => {
    function handleClickOutside(
      event: MouseEvent,
    ) {
      if (
        !isItemDropdownOpen
      ) {
        return;
      }

      const target =
        event.target;

      if (
        !(target instanceof Node)
      ) {
        return;
      }

      if (
        detailBarangRef.current &&
        !detailBarangRef.current.contains(
          target,
        )
      ) {
        setIsItemDropdownOpen(
          false,
        );
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
  }, [
    isItemDropdownOpen,
  ]);

  /* =======================================
     CLOSE DATE PICKER
     WHEN CLICKING OUTSIDE
  ======================================= */

  useEffect(() => {
    if (
      !isPaymentDatePickerOpen
    ) {
      return;
    }

    function handleClickOutside(
      event: MouseEvent,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof Node)
      ) {
        return;
      }

      if (
        paymentDatePickerRef.current &&
        !paymentDatePickerRef.current.contains(
          target,
        )
      ) {
        setIsPaymentDatePickerOpen(
          false,
        );
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
  }, [
    isPaymentDatePickerOpen,
  ]);

  /* =======================================
     SELECTED MEMBER
  ======================================= */

  const selectedMember =
    members.find(
      (
        member,
      ) =>
        member.id ===
        selectedMemberId,
    ) ?? null;

  const isHnrMember =
    selectedMember?.type === "hnr";

  /* =======================================
     MEMBER ITEMS
  ======================================= */

  const memberItems =
    useMemo(() => {
      if (
        !selectedMemberId
      ) {
        return [];
      }

      return options.filter(
        (
          item,
        ) =>
          item.member_id ===
          selectedMemberId,
      );
    }, [
      options,
      selectedMemberId,
    ]);

  /* =======================================
     SELECTED OPTION ITEMS
  ======================================= */

  const selectedOptionItems =
    useMemo(() => {
      return selectedItems
        .map(
          (
            selected,
          ) =>
            options.find(
              (
                option,
              ) =>
                option.recap_id ===
                  selected.recap_id &&
                option.payment_type ===
                  selected.payment_type,
            ),
        )
        .filter(
          (
            option,
          ): option is LatePaymentRecapOption =>
            Boolean(
              option,
            ),
        );
    }, [
      selectedItems,
      options,
    ]);

  /* =======================================
     EARLIEST REFERENCE DATE
  ======================================= */

  const earliestReferenceDate =
    useMemo(() => {
      if (
        selectedOptionItems.length ===
        0
      ) {
        return null;
      }

      /*
       * Gunakan tanggal pembayaran terakhir
       * yang PALING CEPAT.
       *
       * A = 3 September
       * B = 5 September
       *
       * Hasil = 3 September.
       */
      return selectedOptionItems.reduce(
        (
          earliest,
          current,
        ) =>
          current.reference_date <
          earliest
            ? current.reference_date
            : earliest,
        selectedOptionItems[0]
          .reference_date,
      );
    }, [
      selectedOptionItems,
    ]);

  /* =======================================
     PAYMENT DATE RANGE
  ======================================= */

  /*
   * Minimum = H+1.
   *
   * Contoh:
   * 3 September -> 4 September.
   */
  const minPaymentDate =
    earliestReferenceDate
      ? addDays(
          earliestReferenceDate,
          1,
        )
      : "";

  /*
   * Maximum = H+14.
   *
   * Contoh:
   * 3 September -> 17 September.
   */
  const maxPaymentDate =
    earliestReferenceDate
      ? addDays(
          earliestReferenceDate,
          14,
        )
      : "";

  /* =======================================
     TODAY
  ======================================= */

  const today =
    getTodayDate();

  /* =======================================
     IS ITEM SELECTED
  ======================================= */

  function isItemSelected(
    item: LatePaymentRecapOption,
  ): boolean {
    return selectedItems.some(
      (
        selected,
      ) =>
        selected.recap_id ===
          item.recap_id &&
        selected.payment_type ===
          item.payment_type,
    );
  }

  /* =======================================
     TOGGLE ITEM
  ======================================= */

  function toggleItem(
    item: LatePaymentRecapOption,
  ) {
    if (isHnrMember) {
      return;
    }

    const alreadySelected =
      isItemSelected(
        item,
      );

    if (
      alreadySelected
    ) {
      setSelectedItems(
        (
          current,
        ) =>
          current.filter(
            (
              selected,
            ) =>
              !(
                selected.recap_id ===
                  item.recap_id &&
                selected.payment_type ===
                  item.payment_type
              ),
          ),
      );

      /*
       * Range bisa berubah setelah item
       * dihapus, jadi tanggal harus
       * dipilih kembali.
       */
      setPaymentDate(
        "",
      );

      setTemporaryPaymentDate(
        "",
      );

      setError("");

      return;
    }

    setSelectedItems(
      (
        current,
      ) => [
        ...current,
        {
          recap_id:
            item.recap_id,

          payment_type:
            item.payment_type,
        },
      ],
    );

    /*
     * Range bisa berubah setelah item
     * ditambahkan.
     */
    setPaymentDate(
      "",
    );

    setTemporaryPaymentDate(
      "",
    );

    setError("");
  }

  /* =======================================
     SELECT MEMBER
  ======================================= */

  function handleSelectMember(
    memberId: string,
  ) {
    if (resolvedIsCustomer) {
      return;
    }

    /*
     * Jangan pernah izinkan member
     * yang sedang blocked dipilih.
     */
    if (
      blockedMemberIds.has(
        memberId,
      )
    ) {
      setError(
        "Member ini masih memiliki ijin telat pembayaran dengan status belum dibayar. Mohon untuk membayarnya terlebih dahulu.",
      );

      return;
    }

    setSelectedMemberId(
      memberId,
    );

    /*
     * Reset barang.
     */
    setSelectedItems(
      [],
    );

    /*
     * Reset tanggal.
     */
    setPaymentDate(
      "",
    );

    setTemporaryPaymentDate(
      "",
    );

    setError("");

    setIsMemberDropdownOpen(
      false,
    );

    setIsItemDropdownOpen(
      false,
    );

    setIsPaymentDatePickerOpen(
      false,
    );
  }

  /* =======================================
     OPEN DATE PICKER
  ======================================= */

  function openPaymentDatePicker() {
    if (
      isHnrMember ||
      !selectedMemberId ||
      selectedItems.length ===
        0 ||
      !earliestReferenceDate ||
      !minPaymentDate ||
      !maxPaymentDate ||
      isSubmitting
    ) {
      return;
    }

    /*
     * Kalau sudah ada tanggal,
     * buka di bulan tanggal tersebut.
     *
     * Kalau belum ada,
     * buka di bulan tanggal minimum.
     */
    const baseDate =
      paymentDate ||
      minPaymentDate;

    const date =
      new Date(
        `${baseDate}T00:00:00`,
      );

    setCalendarMonth(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
    );

    setTemporaryPaymentDate(
      paymentDate,
    );

    setIsMemberDropdownOpen(
      false,
    );

    setIsItemDropdownOpen(
      false,
    );

    setError("");

    setIsPaymentDatePickerOpen(
      true,
    );
  }

  /* =======================================
     SELECT CALENDAR DATE
  ======================================= */

  function handleSelectCalendarDate(
    dateString: string,
  ) {
    if (isHnrMember) {
      return;
    }

    /*
     * Minimal H+1.
     */
    if (
      minPaymentDate &&
      dateString <
        minPaymentDate
    ) {
      return;
    }

    /*
     * Maksimal H+14.
     */
    if (
      maxPaymentDate &&
      dateString >
        maxPaymentDate
    ) {
      return;
    }

    setTemporaryPaymentDate(
      dateString,
    );

    setError("");
  }

  /* =======================================
     CONFIRM DATE
  ======================================= */

  function handleConfirmPaymentDate() {
    if (isHnrMember) {
      return;
    }

    if (
      !temporaryPaymentDate
    ) {
      setError(
        "Silakan pilih tanggal pembayaran.",
      );

      return;
    }

    if (
      minPaymentDate &&
      temporaryPaymentDate <
        minPaymentDate
    ) {
      setError(
        `Tanggal pembayaran paling cepat ${formatDate(
          minPaymentDate,
        )}.`,
      );

      return;
    }

    if (
      maxPaymentDate &&
      temporaryPaymentDate >
        maxPaymentDate
    ) {
      setError(
        `Tanggal pembayaran maksimal ${formatDate(
          maxPaymentDate,
        )}.`,
      );

      return;
    }

    setPaymentDate(
      temporaryPaymentDate,
    );

    setIsPaymentDatePickerOpen(
      false,
    );

    setError("");
  }

  /* =======================================
     CANCEL DATE PICKER
  ======================================= */

  function handleCancelPaymentDate() {
    setTemporaryPaymentDate(
      paymentDate,
    );

    setIsPaymentDatePickerOpen(
      false,
    );

    setError("");
  }

  /* =======================================
     CHANGE MONTH
  ======================================= */

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
     SUBMIT
  ======================================= */

  async function handleSubmit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    setError("");

    if (isHnrMember) {
      return;
    }

    /* -------------------------------------
       MEMBER
    ------------------------------------- */

    if (
      !selectedMemberId
    ) {
      setError(
        "Nama pembeli wajib dipilih.",
      );

      return;
    }

    /*
     * Safety check:
     * member tidak boleh blocked.
     */
    if (
      blockedMemberIds.has(
        selectedMemberId,
      )
    ) {
      setError(
        "Member ini masih memiliki ijin telat pembayaran dengan status belum dibayar. Mohon untuk membayarnya terlebih dahulu.",
      );

      return;
    }

    /* -------------------------------------
       ITEMS
    ------------------------------------- */

    if (
      selectedItems.length ===
      0
    ) {
      setError(
        "Minimal satu barang harus dipilih.",
      );

      return;
    }

    /* -------------------------------------
       REASON
    ------------------------------------- */

    if (
      !reason.trim()
    ) {
      setError(
        "Alasan telat wajib diisi.",
      );

      return;
    }

    /* -------------------------------------
       PAYMENT DATE
    ------------------------------------- */

    if (
      !paymentDate
    ) {
      setError(
        "Perkiraan tanggal pembayaran wajib dipilih.",
      );

      return;
    }

    /* -------------------------------------
       REFERENCE DATE
    ------------------------------------- */

    if (
      !earliestReferenceDate
    ) {
      setError(
        "Tanggal pembayaran terakhir belum dapat ditentukan.",
      );

      return;
    }

    /* -------------------------------------
       MIN H+1
    ------------------------------------- */

    if (
      minPaymentDate &&
      paymentDate <
        minPaymentDate
    ) {
      setError(
        `Perkiraan tanggal pembayaran paling cepat ${formatDate(
          minPaymentDate,
        )}.`,
      );

      return;
    }

    /* -------------------------------------
       MAX H+14
    ------------------------------------- */

    if (
      maxPaymentDate &&
      paymentDate >
        maxPaymentDate
    ) {
      setError(
        `Perkiraan tanggal pembayaran maksimal ${formatDate(
          maxPaymentDate,
        )}.`,
      );

      return;
    }

    /* -------------------------------------
       SAFETY: NOT IN THE PAST
    ------------------------------------- */

    if (
      paymentDate <
      today
    ) {
      setError(
        "Perkiraan tanggal pembayaran tidak boleh sebelum hari ini.",
      );

      return;
    }

    try {
      setIsSubmitting(
        true,
      );

      await createLatePaymentPermission(
        {
          member_id:
            selectedMemberId,

          items:
            selectedItems,

          reason:
            reason.trim(),

          payment_date:
            paymentDate,
        },
      );

      onSuccess();
    } catch (
      submitError
    ) {
      console.error(
        "submit late payment permission error:",
        submitError,
      );

      /*
       * Kalau backend menolak karena
       * ternyata member sudah memiliki
       * permission unpaid, refresh data
       * supaya dropdown langsung mengikuti
       * status terbaru.
       */
      try {
        const permissions =
          await getLatePaymentPermissions();

        const unpaidMemberIds =
          new Set<string>();

        for (
          const permission of permissions
        ) {
          if (
            permission.payment_status ===
              "unpaid" &&
            permission.member_id
          ) {
            unpaidMemberIds.add(
              permission.member_id,
            );
          }
        }

        setBlockedMemberIds(
          unpaidMemberIds,
        );
      } catch (
        refreshError
      ) {
        console.error(
          "refresh blocked member error:",
          refreshError,
        );
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Gagal mengajukan ijin telat bayar.",
      );
    } finally {
      setIsSubmitting(
        false,
      );
    }
  }

  /* =======================================
     CLOSED
  ======================================= */

  if (!open) {
    return null;
  }

  /* =======================================
     CALENDAR DATA
  ======================================= */

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

  const weekDays = [
    "Mg",
    "Sn",
    "Sl",
    "Rb",
    "Km",
    "Jm",
    "Sb",
  ];

  /* =======================================
     RENDER
  ======================================= */

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">

      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* =================================
            HEADER
        ================================== */}

        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-6 py-5">

          <div>
            <h2 className="text-lg font-semibold text-slate-800">
              Ajukan Ijin Telat Bayar
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Ajukan permintaan keterlambatan pembayaran pelanggan.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              isSubmitting
            }
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Tutup"
          >
            <X
              size={20}
            />
          </button>

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

          <div className="overflow-y-auto px-6 py-6">

            {/* =============================
                CATATAN
            ============================== */}

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">

              <p className="text-sm leading-6 text-blue-700">
                Pengajuan izin akan ditinjau oleh admin.
                Mohon ajukan izin maksimal 2 hari sebelum
                tanggal pembayaran terakhir.
              </p>

            </div>

            {/* =============================
                ERROR
            ============================== */}

            {error && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">

                <p className="text-sm font-medium leading-5 text-red-600">
                  {error}
                </p>

              </div>
            )}

            {/* =============================
                NAMA PEMBELI
            ============================== */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Nama Pembeli
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div className="relative">

                <button
                  type="button"
                  onClick={() => {
                    setIsMemberDropdownOpen(
                      (
                        current,
                      ) =>
                        !current,
                    );

                    setIsItemDropdownOpen(
                      false,
                    );

                    setIsPaymentDatePickerOpen(
                      false,
                    );
                  }}
                  disabled={
                    resolvedIsCustomer ||
                    isLoadingOptions ||
                    isSubmitting
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-left outline-none transition hover:border-slate-300 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >

                  {isLoadingOptions ? (
                    <span className="text-sm text-slate-400">
                      Memuat data member...
                    </span>
                  ) : selectedMember ? (
                    <div className="min-w-0">

                      <p className="truncate text-sm font-medium text-slate-800">
                        {
                          selectedMember.name
                        }
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        {
                          selectedMember.phone
                        }
                      </p>

                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Pilih nama pembeli
                    </span>
                  )}

                  <ChevronDown
                    size={18}
                    className="ml-3 shrink-0 text-slate-400"
                  />

                </button>

                {/* MEMBER DROPDOWN */}

                {isMemberDropdownOpen &&
                  !resolvedIsCustomer &&
                  !isLoadingOptions && (
                    <div className="absolute left-0 right-0 z-40 mt-2 max-h-80 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">

                      {members.length ===
                      0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">
                          Belum ada member yang pernah masuk rekapan.
                        </div>
                      ) : (
                        members.map(
                          (
                            member,
                          ) => {
                            const isBlocked =
                              blockedMemberIds.has(
                                member.id,
                              );

                            const isSelected =
                              selectedMemberId ===
                              member.id;

                            return (
                              <button
                                key={
                                  member.id
                                }
                                type="button"
                                onClick={() =>
                                  handleSelectMember(
                                    member.id,
                                  )
                                }
                                disabled={
                                  isBlocked ||
                                  isSubmitting
                                }
                                className={[
                                  "flex w-full items-start justify-between px-4 py-3 text-left transition",
                                  isBlocked
                                    ? "cursor-not-allowed bg-slate-50 opacity-70"
                                    : "hover:bg-slate-50",
                                ].join(
                                  " ",
                                )}
                              >

                                <div className="min-w-0 flex-1">

                                  {/* NAMA */}

                                  <p
                                    className={[
                                      "truncate text-sm font-medium",
                                      isBlocked
                                        ? "text-slate-400"
                                        : "text-slate-800",
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {
                                      member.name
                                    }
                                  </p>

                                  {/* NO WA */}

                                  <p
                                    className={[
                                      "mt-0.5 text-xs",
                                      isBlocked
                                        ? "text-slate-400"
                                        : "text-slate-500",
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {
                                      member.phone
                                    }
                                  </p>

                                  {/* BLOCKED MESSAGE */}

                                  {isBlocked && (
                                    <p className="mt-1 max-w-[360px] text-xs font-medium leading-4 text-red-500">
                                      Masih punya ijin telat pembayaran
                                      dengan status belum dibayar. Mohon untuk membayarnya terlebih dahulu.
                                    </p>
                                  )}

                                </div>

                                {isSelected &&
                                  !isBlocked && (
                                  <Check
                                    size={
                                      17
                                    }
                                    className="ml-3 mt-0.5 shrink-0 text-blue-600"
                                  />
                                )}

                              </button>
                            );
                          },
                        )
                      )}

                    </div>
                  )}

              </div>
            </div>

            {/* =============================
                DETAIL BARANG
            ============================== */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Detail Barang
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <div
                ref={
                  detailBarangRef
                }
                className="relative"
              >

                {/* FIELD */}

                <button
                  type="button"
                  onClick={() => {
                    if (
                      isHnrMember ||
                      !selectedMemberId ||
                      blockedMemberIds.has(
                        selectedMemberId,
                      ) ||
                      memberItems.length ===
                        0 ||
                      isSubmitting
                    ) {
                      return;
                    }

                    setIsItemDropdownOpen(
                      (
                        current,
                      ) =>
                        !current,
                    );

                    setIsMemberDropdownOpen(
                      false,
                    );

                    setIsPaymentDatePickerOpen(
                      false,
                    );
                  }}
                  disabled={
                    isHnrMember ||
                    !selectedMemberId ||
                    blockedMemberIds.has(
                      selectedMemberId,
                    ) ||
                    memberItems.length ===
                      0 ||
                    isSubmitting
                  }
                  className="flex min-h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-left outline-none transition hover:border-slate-300 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                >

                  <span
                    className={
                      selectedItems.length >
                      0
                        ? "text-sm text-slate-800"
                        : "text-sm text-slate-400"
                    }
                  >
                    {!selectedMemberId
                      ? "Pilih nama pembeli terlebih dahulu."
                      : memberItems.length ===
                          0
                        ? "Tidak ada barang yang memenuhi syarat."
                        : selectedItems.length >
                            0
                          ? `${selectedItems.length} barang dipilih`
                          : "Pilih detail barang"}
                  </span>

                  <ChevronDown
                    size={18}
                    className="ml-3 shrink-0 text-slate-400"
                  />

                </button>

                {/* DROPDOWN */}

                {isItemDropdownOpen &&
                  !isHnrMember &&
                  selectedMemberId &&
                  !blockedMemberIds.has(
                    selectedMemberId,
                  ) &&
                  memberItems.length >
                    0 && (
                    <div className="absolute left-0 right-0 z-40 mt-2 max-h-72 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">

                      {memberItems.map(
                        (
                          item,
                        ) => {
                          const checked =
                            isItemSelected(
                              item,
                            );

                          return (
                            <label
                              key={`${item.recap_id}-${item.payment_type}`}
                              className="flex cursor-pointer items-start gap-3 border-b border-slate-100 px-4 py-4 transition last:border-b-0 hover:bg-slate-50"
                            >

                              <input
                                type="checkbox"
                                checked={
                                  checked
                                }
                                onChange={() =>
                                  toggleItem(
                                    item,
                                  )
                                }
                                disabled={
                                  isHnrMember ||
                                  isSubmitting
                                }
                                className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              />

                              <div className="min-w-0 flex-1">

                                <div className="flex items-center gap-2">

                                  <span className="text-sm text-slate-400">
                                    •
                                  </span>

                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {
                                      item.detail_barang
                                    }
                                  </p>

                                  <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                                    {
                                      item.payment_type
                                    }
                                  </span>

                                </div>

                                <p className="mt-1 pl-4 text-xs text-slate-500">
                                  Tanggal terakhir:{" "}
                                  <span className="font-medium text-slate-700">
                                    {formatDate(
                                      item.reference_date,
                                    )}
                                  </span>
                                </p>

                              </div>

                              {checked && (
                                <Check
                                  size={
                                    17
                                  }
                                  className="mt-0.5 shrink-0 text-blue-600"
                                />
                              )}

                            </label>
                          );
                        },
                      )}

                    </div>
                  )}

              </div>

              {selectedItems.length >
                0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {
                    selectedItems.length
                  }{" "}
                  barang dipilih.
                </p>
              )}

            </div>

            {/* =============================
                PERKIRAAN TANGGAL PEMBAYARAN
            ============================== */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Perkiraan Tanggal Pembayaran
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              {/* DATE FIELD */}

              <button
                type="button"
                onClick={
                  openPaymentDatePicker
                }
                disabled={
                  isHnrMember ||
                  !selectedMemberId ||
                  blockedMemberIds.has(
                    selectedMemberId,
                  ) ||
                  selectedItems.length ===
                    0 ||
                  !earliestReferenceDate ||
                  !minPaymentDate ||
                  !maxPaymentDate ||
                  isSubmitting
                }
                className="flex h-12 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 text-left outline-none transition hover:border-slate-300 focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
              >

                <div className="flex min-w-0 items-center gap-3">

                  <CalendarDays
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <span
                    className={
                      paymentDate
                        ? "truncate text-sm text-slate-700"
                        : "truncate text-sm text-slate-400"
                    }
                  >
                    {paymentDate
                      ? formatDate(
                          paymentDate,
                        )
                      : "Pilih tanggal pembayaran"}
                  </span>

                </div>

                <ChevronDown
                  size={18}
                  className="ml-3 shrink-0 text-slate-400"
                />

              </button>

              {/* DATE INFO */}

              {earliestReferenceDate &&
                minPaymentDate &&
                maxPaymentDate && (
                  <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">

                    <p className="text-xs leading-5 text-slate-500">
                      Tanggal pembayaran dapat dipilih mulai
                      1 hari setelah tanggal terakhir pembayaran
                      paling awal sampai maksimal 14 hari dari
                      tanggal tersebut.
                    </p>

                    <div className="mt-2 grid grid-cols-2 gap-4">

                      <div>
                        <p className="text-xs text-slate-500">
                          Paling cepat
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatDate(
                            minPaymentDate,
                          )}
                        </p>
                      </div>

                      <div className="border-l border-slate-200 pl-4">

                        <p className="text-xs text-slate-500">
                          Batas maksimal
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-700">
                          {formatDate(
                            maxPaymentDate,
                          )}
                        </p>

                      </div>

                    </div>

                  </div>
                )}

              {!selectedItems.length && (
                <p className="mt-2 text-xs text-slate-400">
                  Pilih minimal satu barang terlebih dahulu.
                </p>
              )}

            </div>

            {/* =============================
                ALASAN TELAT
            ============================== */}

            <div className="mt-5">

              <label className="mb-2 block text-sm font-medium text-slate-700">
                Alasan Telat
                <span className="ml-1 text-red-500">
                  *
                </span>
              </label>

              <textarea
                value={
                  reason
                }
                onChange={(
                  event,
                ) =>
                  setReason(
                    event.target.value,
                  )
                }
                rows={4}
                disabled={
                  isHnrMember ||
                  isSubmitting
                }
                placeholder="Masukkan alasan keterlambatan pembayaran..."
                className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50"
              />

            </div>

          </div>

          {/* =================================
              FOOTER
          ================================== */}

          <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">

            <button
              type="button"
              onClick={
                onClose
              }
              disabled={
                isSubmitting
              }
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Batal
            </button>

            <button
              type="submit"
              disabled={
                isHnrMember ||
                isSubmitting ||
                !selectedMemberId ||
                blockedMemberIds.has(
                  selectedMemberId,
                ) ||
                selectedItems.length ===
                  0 ||
                !paymentDate ||
                !reason.trim()
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-50"
            >

              {isSubmitting && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {isSubmitting
                ? "Mengajukan..."
                : "Ajukan Ijin"}

            </button>

          </div>

        </form>

      </div>

      {/* ===================================
          CUSTOM DATE PICKER POPUP
      ==================================== */}

      {isPaymentDatePickerOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4"
          onMouseDown={() =>
            setIsPaymentDatePickerOpen(
              false,
            )
          }
        >

          <div
            ref={
              paymentDatePickerRef
            }
            className="w-full max-w-md rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl"
            onMouseDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >

            {/* =============================
                POPUP HEADER
            ============================== */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

              <div>

                <h3 className="text-base font-semibold text-slate-800">
                  Pilih Tanggal Pembayaran
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Pilih tanggal sesuai batas yang tersedia.
                </p>

              </div>

              <button
                type="button"
                onClick={() =>
                  setIsPaymentDatePickerOpen(
                    false,
                  )
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup kalender"
              >
                <X
                  size={19}
                />
              </button>

            </div>

            {/* =============================
                CALENDAR
            ============================== */}

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
                  {getMonthLabel(
                    calendarMonth,
                  )}
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

                {weekDays.map(
                  (
                    day,
                  ) => (
                    <div
                      key={
                        day
                      }
                      className="flex h-9 items-center justify-center text-xs font-medium text-slate-400"
                    >
                      {
                        day
                      }
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

                    /*
                     * Disabled sebelum H+1.
                     */
                    const isBeforeMinimum =
                      Boolean(
                        minPaymentDate &&
                          dateString <
                            minPaymentDate,
                      );

                    /*
                     * Disabled setelah H+14.
                     */
                    const isAfterMaximum =
                      Boolean(
                        maxPaymentDate &&
                          dateString >
                            maxPaymentDate,
                      );

                    const isDisabled =
                      isHnrMember ||
                      isBeforeMinimum ||
                      isAfterMaximum;

                    const isSelected =
                      temporaryPaymentDate ===
                      dateString;

                    return (
                      <button
                        key={
                          dateString
                        }
                        type="button"
                        disabled={
                          isDisabled
                        }
                        onClick={() =>
                          handleSelectCalendarDate(
                            dateString,
                          )
                        }
                        className={[
                          "flex h-11 w-full items-center justify-center rounded-xl text-sm transition",
                          isDisabled
                            ? "cursor-not-allowed text-slate-300"
                            : "text-slate-700 hover:bg-blue-50",
                          isSelected
                            ? "bg-[#1457ff] font-semibold text-white hover:bg-[#1457ff]"
                            : "",
                        ].join(
                          " ",
                        )}
                      >
                        {
                          day
                        }
                      </button>
                    );
                  },
                )}

              </div>

              {/* =============================
                  RANGE INFO
              ============================== */}

              <div className="mt-5 rounded-xl bg-slate-50 p-4">

                <div className="grid grid-cols-2 gap-4">

                  {/* LEFT */}

                  <div>

                    <p className="text-xs text-slate-500">
                      Tanggal paling cepat
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {minPaymentDate
                        ? formatDate(
                            minPaymentDate,
                          )
                        : "—"}
                    </p>

                  </div>

                  {/* RIGHT */}

                  <div className="border-l border-slate-200 pl-4">

                    <p className="text-xs text-slate-500">
                      Batas maksimal
                    </p>

                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {maxPaymentDate
                        ? formatDate(
                            maxPaymentDate,
                          )
                        : "—"}
                    </p>

                  </div>

                </div>

              </div>

              {/* =============================
                  SELECTED DATE
              ============================== */}

              {temporaryPaymentDate && (
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">

                  <p className="text-xs text-blue-600">
                    Tanggal dipilih
                  </p>

                  <p className="mt-1 text-sm font-semibold text-blue-700">
                    {formatDate(
                      temporaryPaymentDate,
                    )}
                  </p>

                </div>
              )}

            </div>

            {/* =============================
                POPUP FOOTER
            ============================== */}

            <div className="flex gap-3 border-t border-slate-200 px-5 py-4">

              <button
                type="button"
                onClick={
                  handleCancelPaymentDate
                }
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={
                  handleConfirmPaymentDate
                }
                disabled={
                  !temporaryPaymentDate
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