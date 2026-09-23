import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  Loader2,
  X,
} from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import ManualShippingBatchModal from "@/components/common/ManualShippingBatchDialog";
import DeleteBatchPengirimanDialog from "@/components/common/DeleteBatchPengirimanDialog";
import HapusPengirimanDialog from "@/components/common/HapusPengirimanDialog";
import EditBatchPengirimanDialog from "@/components/common/EditBatchPengirimanDialog";
import TambahPengirimanDialog from "@/components/common/TambahPengirimanDialog";
import PaymentDialog from "@/components/common/PaymentDialog";
import EditPengirimanDialog from "@/components/common/EditPengirimanDialog";

import {
  deleteManualShippingBatch,
  getManualShippingBatches,
  updateManualShippingBatch,
  type ManualShippingBatch,
  type ManualShippingBatchStatus,
} from "@/services/manualShippingBatchService";

import {
  createPayment,
  getManualShipmentPaymentSummary,
  type ManualShipmentPaymentSummary,
  type Payment,
} from "@/services/paymentService";

import {
  deleteManualShipment,
  getManualShipmentsByBatch,
  updateManualShipment,
  type ManualShipment,
} from "@/services/manualShippingService";

/* =========================================
   CONSTANTS
========================================= */

const ITEMS_PER_PAGE = 10;

/* =========================================
   TYPES
========================================= */

type ActiveTab =
  | "all"
  | string;

// type ManualShipmentWithPaymentDate =
//   ManualShipment;

/* =========================================
   HELPERS
========================================= */

function formatCurrency(
  value: number | null | undefined,
): string {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    },
  ).format(
    Number(value ?? 0),
  );
}

function formatEditingPrice(value: string): string {
  const digits = value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");

  if (!digits) {
    return "";
  }

  return formatCurrency(Number(digits));
}

function getEditingPriceDigits(value: string): string {
  return value
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "");
}

// function getShippingStatusLabel(
//   value: ManualShipment["shipping_status"],
// ): string {
//   switch (value) {
//     case "Sudah di packing":
//     case "sedang_dikemas":
//     case "Sedang dikemas":
//       return "Sudah di packing";
//     case "Sudah di pick up":
//     case "dalam_proses_pick_up":
//     case "dalam_proses_pick_up":
//       return "Sudah di pick up";
//     default:
//       return value;
//   }
// }

function getShippingStatusValue(
  value: string,
): string {
  if (
    value === "Sudah di pick up" ||
    value === "dalam_proses_pick_up" ||
    value === "dalam_proses_pick_up"
  ) {
    return "dalam_proses_pick_up";
  }

  return "sedang_dikemas";
}

// function formatPaymentStatus(
//   value: ManualShipment["payment_status"],
// ): string {
//   return value === "paid"
//     ? "Sudah dibayar"
//     : "Belum dibayar";
// }

function formatDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "-";
  }

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
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

/* =========================================
   DATE PICKER HELPERS
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

function getTodayDate(): string {
  const date = new Date();

  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function parseDate(
  value: string | null | undefined,
): Date | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
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

function toDateString(date: Date): string {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
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

function formatPickupDate(
  value: string | null | undefined,
): string {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
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

function hasBatchEnded(
  endDate: string | null | undefined,
): boolean {
  if (!endDate) {
    return false;
  }

  const today = new Date();

  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const batchEndDate = new Date(
    `${endDate}T00:00:00`,
  );

  if (
    Number.isNaN(
      batchEndDate.getTime(),
    )
  ) {
    return false;
  }

  return todayStart > batchEndDate;
}

function getPaymentDate(
  paidAt: string | null | undefined,
): string {
  if (!paidAt) {
    return "-";
  }

  const date =
    new Date(paidAt);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

/* =========================================
   PAGE
========================================= */

type Props = {
  isCustomer?: boolean;
};

export default function PengirimanManualPage({
  isCustomer = false,
}: Props) {
  const queryClient =
    useQueryClient();

  /* =======================================
     ACTIVE TAB
  ======================================== */

  const [
    activeTab,
    setActiveTab,
  ] = useState<ActiveTab>("all");

  /* =======================================
     SEARCH
  ======================================== */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    openStatusBatchId,
    setOpenStatusBatchId,
  ] = useState<string | null>(null);

  const [
    statusDropdownPosition,
    setStatusDropdownPosition,
  ] = useState<{
    top: number;
    left: number;
    openUpward: boolean;
  } | null>(null);

  const [
    updatingStatusBatchId,
    setUpdatingStatusBatchId,
  ] = useState<string | null>(null);

  /* =======================================
     PAGINATION
  ======================================== */

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  /* =======================================
     BATCH MODAL
  ======================================== */

  const [
    isBatchModalOpen,
    setIsBatchModalOpen,
  ] = useState(false);

  const [
    isEditBatchModalOpen,
    setIsEditBatchModalOpen,
  ] = useState(false);

  const [
    editingBatch,
    setEditingBatch,
  ] = useState<
    ManualShippingBatch | null
  >(null);

  /* =======================================
     DELETE CONFIRMATION
  ======================================== */

  const [
    deletingBatch,
    setDeletingBatch,
  ] = useState<
    ManualShippingBatch | null
  >(null);

  /* =======================================
     ADD SHIPMENT MODAL
  ======================================== */

  const [
    isAddShipmentModalOpen,
    setIsAddShipmentModalOpen,
  ] = useState(false);

  /* =======================================
     SHIPMENT PAYMENT
  ======================================== */

  const [
    selectedPaymentShipment,
    setSelectedPaymentShipment,
  ] = useState<ManualShipment | null>(null);

  const [
    isShipmentPaymentDialogOpen,
    setIsShipmentPaymentDialogOpen,
  ] = useState(false);

  const [
    processingShipmentPaymentId,
    setProcessingShipmentPaymentId,
  ] = useState<string | null>(null);

  /* =======================================
     EDIT / DELETE SHIPMENT
  ======================================== */

  const [
    editingShipment,
    setEditingShipment,
  ] = useState<
    ManualShipment | null
  >(null);

  const [
    deletingShipment,
    setDeletingShipment,
  ] = useState<
    ManualShipment | null
  >(null);

  /* =======================================
     INLINE PRICE EDITING
  ======================================== */

  const [
    editingPrice,
    setEditingPrice,
  ] = useState<{
    shipmentId: string;
    field: "packing_price" | "shipping_price";
  } | null>(null);

  const [
    editingPriceValue,
    setEditingPriceValue,
  ] = useState("");

  /* =======================================
     INLINE DUE DATE EDITING
  ======================================== */

  const [
    editingDueDateShipment,
    setEditingDueDateShipment,
  ] = useState<ManualShipment | null>(null);

  const [
    temporaryDueDate,
    setTemporaryDueDate,
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

  const [
    updatingDueDateShipmentId,
    setUpdatingDueDateShipmentId,
  ] = useState<string | null>(null);

  /* =======================================
     SHIPPING STATUS OVERRIDE
  ======================================== */

  const [
    shippingStatusOverrides,
    setShippingStatusOverrides,
  ] = useState<
    Record<string, string>
  >({});

  const [
    openShipmentStatusId,
    setOpenShipmentStatusId,
  ] = useState<string | null>(null);

  const [
    shipmentStatusDropdownPosition,
    setShipmentStatusDropdownPosition,
  ] = useState<{
    top: number;
    left: number;
  } | null>(null);

  /* =======================================
     GET BATCHES
  ======================================== */

  const {
    data: batches = [],
    isLoading,
    isError,
    error,
  } =
    useQuery<
      ManualShippingBatch[],
      Error
    >({
      queryKey: [
        "manual-shipping-batches",
      ],

      queryFn:
        getManualShippingBatches,

      staleTime: 30_000,
    });

  /* =======================================
     VALIDATE ACTIVE TAB
  ======================================== */

  useEffect(() => {
    if (
      activeTab === "all"
    ) {
      return;
    }

    const batchStillExists =
      batches.some(
        (batch) =>
          batch.id ===
          activeTab,
      );

    if (
      !batchStillExists
    ) {
      setActiveTab("all");
    }
  }, [
    activeTab,
    batches,
  ]);

  /* =======================================
     SEARCHED BATCHES
  ======================================== */

  const filteredBatches =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return batches;
      }

      return batches.filter(
        (batch) =>
          batch.event_name
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          batch.status
            .toLowerCase()
            .includes(
              keyword,
            ),
      );
    }, [
      batches,
      search,
    ]);

  /* =======================================
     PAGINATION
  ======================================== */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredBatches.length /
          ITEMS_PER_PAGE,
      ),
    );

  const paginatedBatches =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        ITEMS_PER_PAGE;

      return filteredBatches.slice(
        start,
        start +
          ITEMS_PER_PAGE,
      );
    }, [
      filteredBatches,
      currentPage,
    ]);

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages,
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  /* =======================================
     SELECTED BATCH
  ======================================== */

  const selectedBatch =
    useMemo(() => {
      if (
        activeTab ===
        "all"
      ) {
        return null;
      }

      return (
        batches.find(
          (batch) =>
            batch.id ===
            activeTab,
        ) ?? null
      );
    }, [
      activeTab,
      batches,
    ]);

  const isBatchExpired =
    hasBatchEnded(
      selectedBatch?.end_date,
    );

  /* =======================================
     GET SHIPMENTS BY SELECTED BATCH
  ======================================== */

  const {
    data: shipments = [],
    isLoading: isShipmentsLoading,
    isError: isShipmentsError,
    error: shipmentsError,
  } = useQuery<
    ManualShipment[],
    Error
  >({
    queryKey: [
      "manual-shipments",
      selectedBatch?.id,
    ],
    queryFn: () =>
      getManualShipmentsByBatch(
        selectedBatch!.id,
      ),
    enabled:
      Boolean(selectedBatch?.id),
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
  });

  /* =======================================
     PAYMENT STATUS
  ======================================== */

  const shipmentIds = useMemo(
    () =>
      shipments.map(
        (shipment) => shipment.id,
      ),
    [shipments],
  );

  const {
    data: shipmentPaymentSummaries = [],
  } = useQuery<
    ManualShipmentPaymentSummary[],
    Error
  >({
    queryKey: [
      "manual-shipment-payment-summaries",
      selectedBatch?.id,
      shipmentIds,
    ],
    queryFn: async () => {
      if (shipmentIds.length === 0) {
        return [];
      }

      return Promise.all(
        shipmentIds.map(
          (shipmentId) =>
            getManualShipmentPaymentSummary(
              shipmentId,
            ),
        ),
      );
    },
    enabled:
      Boolean(selectedBatch?.id) &&
      shipmentIds.length > 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const shipmentPaymentSummaryMap =
    useMemo(() => {
      const map = new Map<
        string,
        ManualShipmentPaymentSummary
      >();

      shipmentPaymentSummaries.forEach(
        (summary) => {
          map.set(
            summary.shipment_id,
            summary,
          );
        },
      );

      return map;
    }, [shipmentPaymentSummaries]);

  const deleteBatchMutation =
    useMutation<
      void,
      Error,
      string
    >({
      mutationFn:
        deleteManualShippingBatch,

      onSuccess:
        async () => {
          await queryClient.invalidateQueries(
            {
              queryKey: [
                "manual-shipping-batches",
              ],
            },
          );

          setDeletingBatch(
            null,
          );

          setActiveTab(
            "all",
          );
        },
    });

  /* =======================================
     DELETE SHIPMENT MUTATION
  ======================================== */

  const deleteShipmentMutation = useMutation<
    void,
    Error,
    string
  >({
    mutationFn: deleteManualShipment,

    onSuccess: async () => {
      if (selectedBatch?.id) {
        await queryClient.invalidateQueries({
          queryKey: ["manual-shipments", selectedBatch.id],
        });
      }

      setDeletingShipment(null);
    },

    onError: (deleteError) => {
      window.alert(
        deleteError instanceof Error
          ? deleteError.message
          : "Gagal menghapus pengiriman.",
      );
    },
  });

  /* =======================================
     UPDATE BATCH STATUS
  ======================================== */

  async function handleBatchStatusChange(
    batch: ManualShippingBatch,
    nextStatus: ManualShippingBatchStatus,
  ) {
    if (
      isCustomer ||
      updatingStatusBatchId === batch.id
    ) {
      setOpenStatusBatchId(null);
      setStatusDropdownPosition(null);
      return;
    }

    if (batch.status === nextStatus) {
      setOpenStatusBatchId(null);
      setStatusDropdownPosition(null);
      return;
    }

    setUpdatingStatusBatchId(batch.id);
    setOpenStatusBatchId(null);
    setStatusDropdownPosition(null);

    try {
      const updatedBatch =
        await updateManualShippingBatch(
          batch.id,
          {
            event_name:
              batch.event_name,
            start_date:
              batch.start_date,
            end_date:
              batch.end_date,
            status:
              nextStatus,
          },
        );

      queryClient.setQueryData<ManualShippingBatch[]>(
        ["manual-shipping-batches"],
        (current = []) =>
          current.map(
            (item) =>
              item.id === batch.id
                ? updatedBatch
                : item,
          ),
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "manual-shipping-batches",
        ],
      });
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status batch.",
      );
    } finally {
      setUpdatingStatusBatchId(null);
    }
  }

  /* =======================================
     OPEN CREATE MODAL
  ======================================== */

  function openCreateBatch() {
    setEditingBatch(
      null,
    );

    setIsEditBatchModalOpen(
      false,
    );

    setIsBatchModalOpen(
      true,
    );
  }

  /* =======================================
     OPEN EDIT MODAL
  ======================================== */

  function openEditBatch(
    batch: ManualShippingBatch,
  ) {
    setEditingBatch(
      batch,
    );

    setIsBatchModalOpen(
      false,
    );

    setIsEditBatchModalOpen(
      true,
    );
  }

  /* =======================================
     CLOSE BATCH MODAL
  ======================================== */

  function closeBatchModal() {
    setIsBatchModalOpen(
      false,
    );

    setIsEditBatchModalOpen(
      false,
    );

    setEditingBatch(
      null,
    );
  }

  /* =======================================
     AFTER BATCH SAVED
  ======================================== */

  function handleBatchSaved(
    savedBatch: ManualShippingBatch,
  ) {
    setIsBatchModalOpen(
      false,
    );

    setIsEditBatchModalOpen(
      false,
    );

    setEditingBatch(
      null,
    );

    setActiveTab(
      savedBatch.id,
    );
  }

  /* =======================================
     TAB CHANGE
  ======================================== */

  function handleTabChange(
    tab: ActiveTab,
  ) {
    setActiveTab(tab);
    setCurrentPage(1);
    setShippingStatusOverrides({});
    setOpenStatusBatchId(null);
    setStatusDropdownPosition(null);
  }

  /* =======================================
     DELETE
  ======================================== */

  function handleDeleteBatch() {
    if (
      !deletingBatch ||
      deleteBatchMutation.isPending
    ) {
      return;
    }

    deleteBatchMutation.mutate(
      deletingBatch.id,
    );
  }

  /* =======================================
     OPEN / CLOSE ADD SHIPMENT
  ======================================== */

  function openAddShipment() {
    if (!selectedBatch) {
      return;
    }

    setIsAddShipmentModalOpen(
      true,
    );
  }

  function closeAddShipment() {
    setIsAddShipmentModalOpen(
      false,
    );
  }

  function handleShipmentSaved(
    _shipment: unknown,
  ) {
    setIsAddShipmentModalOpen(
      false,
    );

    if (selectedBatch?.id) {
      queryClient.invalidateQueries({
        queryKey: [
          "manual-shipments",
          selectedBatch.id,
        ],
      });
    }
  }

  async function openShipmentPayment(
    shipment: ManualShipment,
  ) {
    if (processingShipmentPaymentId === shipment.id) {
      return;
    }

    setProcessingShipmentPaymentId(
      shipment.id,
    );

    try {
      const payment =
        await createPayment({
          manual_shipment_id:
            shipment.id,
          payment_type:
            "PELUNASAN",
        });

      setSelectedPaymentShipment(
        shipment,
      );

      queryClient.setQueryData(
        [
          "manual-shipment-payment",
          shipment.id,
        ],
        payment,
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "manual-shipment-payment-summaries",
          selectedBatch?.id,
          shipmentIds,
        ],
      });

      setIsShipmentPaymentDialogOpen(
        true,
      );
    } catch (paymentError) {
      window.alert(
        paymentError instanceof Error
          ? paymentError.message
          : "Gagal menyiapkan pembayaran pengiriman.",
      );
    } finally {
      setProcessingShipmentPaymentId(
        null,
      );
    }
  }

  function closeShipmentPayment() {
    setIsShipmentPaymentDialogOpen(
      false,
    );
    setSelectedPaymentShipment(null);
    setProcessingShipmentPaymentId(null);
  }

  function handleShipmentPaymentSuccess(
    payment: Payment,
  ) {
    const shipmentId =
      selectedPaymentShipment?.id ??
      payment.manual_shipment_id ??
      null;

    if (!shipmentId) {
      return;
    }

    queryClient.setQueryData(
      [
        "manual-shipment-payment",
        shipmentId,
      ],
      payment,
    );

    void queryClient.invalidateQueries({
      queryKey: [
        "manual-shipment-payment-summaries",
        selectedBatch?.id,
        shipmentIds,
      ],
    });

    setProcessingShipmentPaymentId(null);
  }

  function openEditShipment(
    shipment: ManualShipment,
  ) {
    setEditingShipment(
      shipment,
    );
  }

  function closeEditShipment() {
    setEditingShipment(null);
  }

  function openDeleteShipment(
    shipment: ManualShipment,
  ) {
    setDeletingShipment(
      shipment,
    );
  }

  function closeDeleteShipment() {
    setDeletingShipment(null);
  }

  /* =======================================
     DELETE SHIPMENT
  ======================================== */

  function handleDeleteShipment() {
    if (
      !deletingShipment ||
      deleteShipmentMutation.isPending
    ) {
      return;
    }

    deleteShipmentMutation.mutate(
      deletingShipment.id,
    );
  }

  /* =======================================
     UPDATE INLINE PRICE
  ======================================== */

  async function handlePriceSave(
    shipment: ManualShipment,
    field: "packing_price" | "shipping_price",
  ) {
    const value = Number(
      getEditingPriceDigits(editingPriceValue) || "0",
    );

    if (!Number.isFinite(value) || value < 0) {
      window.alert("Harga tidak valid.");
      return;
    }

    const previousValue = Number(
      shipment[field] ?? 0,
    );
    const priceDelta = value - previousValue;

    const shipmentQueryKey = [
      "manual-shipments",
      shipment.batch_id,
    ] as const;

    const paymentSummaryQueryKey = [
      "manual-shipment-payment-summaries",
      selectedBatch?.id,
      shipmentIds,
    ] as const;

    const previousShipments =
      queryClient.getQueryData<ManualShipment[]>(
        shipmentQueryKey,
      );

    const previousPaymentSummaries =
      queryClient.getQueryData<
        ManualShipmentPaymentSummary[]
      >(paymentSummaryQueryKey);

    // Optimistic update: Total langsung berubah di UI
    // tanpa menunggu response backend.
    queryClient.setQueryData<ManualShipment[]>(
      shipmentQueryKey,
      (current = []) =>
        current.map((item) =>
          item.id === shipment.id
            ? {
                ...item,
                [field]: value,
                total_price: Math.max(
                  0,
                  Number(item.total_price ?? 0) +
                    priceDelta,
                ),
              }
            : item,
        ),
    );

    // Payment summary juga di-update secara optimistik
    // supaya kolom Total tidak kembali ke angka lama
    // selama request update harga masih berlangsung.
    queryClient.setQueryData<
      ManualShipmentPaymentSummary[]
    >(
      paymentSummaryQueryKey,
      (current = []) =>
        current.map((summary) =>
          summary.shipment_id === shipment.id
            ? {
                ...summary,
                amount: Math.max(
                  0,
                  Number(summary.amount ?? 0) +
                    priceDelta,
                ),
              }
            : summary,
        ),
    );

    try {
      const updatedShipment =
        await updateManualShipment(
          shipment.id,
          {
            [field]: value,
          },
        );

      queryClient.setQueryData<ManualShipment[]>(
        shipmentQueryKey,
        (current = []) =>
          current.map((item) =>
            item.id === shipment.id
              ? updatedShipment
              : item,
          ),
      );

      setEditingPrice(null);
      setEditingPriceValue("");
    } catch (error) {
      // Rollback bila update ke backend gagal.
      if (previousShipments) {
        queryClient.setQueryData(
          shipmentQueryKey,
          previousShipments,
        );
      }

      if (previousPaymentSummaries) {
        queryClient.setQueryData(
          paymentSummaryQueryKey,
          previousPaymentSummaries,
        );
      }

      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui harga.",
      );
    }
  }

  function getDisplayedTotal(
    shipment: ManualShipment,
    summary: ManualShipmentPaymentSummary | null,
  ): number {
    const baseTotal = Number(
      summary?.amount ?? shipment.total_price ?? 0,
    );

    if (
      editingPrice?.shipmentId !== shipment.id
    ) {
      return baseTotal;
    }

    const draftValue = Number(
      getEditingPriceDigits(editingPriceValue) || "0",
    );

    const currentValue = Number(
      shipment[editingPrice.field] ?? 0,
    );

    return Math.max(
      0,
      baseTotal + draftValue - currentValue,
    );
  }

  /* =======================================
     DUE DATE PICKER
  ======================================== */

  function openDueDatePicker(
    shipment: ManualShipment,
  ) {
    if (
      isCustomer ||
      shipment.member?.type === "hnr" ||
      updatingDueDateShipmentId === shipment.id
    ) {
      return;
    }

    const currentDate =
      shipment.due_date ??
      getTodayDate();

    const date =
      parseDate(currentDate) ??
      new Date();

    setCalendarMonth(
      new Date(
        date.getFullYear(),
        date.getMonth(),
        1,
      ),
    );

    setTemporaryDueDate(
      shipment.due_date ?? "",
    );
    setEditingDueDateShipment(
      shipment,
    );
  }

  function closeDueDatePicker() {
    if (updatingDueDateShipmentId) {
      return;
    }

    setTemporaryDueDate("");
    setEditingDueDateShipment(null);
  }

  function handleSelectDueDate(
    dateString: string,
  ) {
    if (
      dateString < getTodayDate() ||
      updatingDueDateShipmentId
    ) {
      return;
    }

    setTemporaryDueDate(dateString);
  }

  function changeCalendarMonth(
    offset: number,
  ) {
    setCalendarMonth((current) =>
      new Date(
        current.getFullYear(),
        current.getMonth() + offset,
        1,
      ),
    );
  }

  async function handleDueDateSave() {
    if (
      !editingDueDateShipment ||
      !temporaryDueDate ||
      updatingDueDateShipmentId
    ) {
      return;
    }

    const shipment =
      editingDueDateShipment;

    setUpdatingDueDateShipmentId(
      shipment.id,
    );

    try {
      const updatedShipment =
        await updateManualShipment(
          shipment.id,
          {
            due_date:
              temporaryDueDate,
          },
        );

      queryClient.setQueryData<ManualShipment[]>(
        [
          "manual-shipments",
          shipment.batch_id,
        ],
        (current = []) =>
          current.map((item) =>
            item.id === shipment.id
              ? updatedShipment
              : item,
          ),
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "manual-shipment-payment-summaries",
          shipment.batch_id,
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: [
          "manual-shipments",
          shipment.batch_id,
        ],
      });

      setTemporaryDueDate("");
      setEditingDueDateShipment(null);
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui tanggal jatuh tempo.",
      );
    } finally {
      setUpdatingDueDateShipmentId(
        null,
      );
    }
  }

  useEffect(() => {
    if (!editingDueDateShipment) {
      return;
    }

    function handleEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        closeDueDatePicker();
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
    editingDueDateShipment,
    updatingDueDateShipmentId,
  ]);

  /* =======================================
     UPDATE SHIPPING STATUS

     Simpan status ke database.
     Sebelumnya status hanya disimpan di
     shippingStatusOverrides sehingga hilang
     setelah refresh.
  ======================================== */

  async function handleShippingStatusChange(
    shipment: ManualShipment,
    nextStatus: ManualShipment["shipping_status"],
  ) {
    if (isCustomer) {
      return;
    }

    const previousStatus =
      getShippingStatusValue(
        shippingStatusOverrides[shipment.id] ??
          shipment.shipping_status,
      );

    // Optimistic update agar UI langsung mengikuti pilihan user.
    setShippingStatusOverrides(
      (current) => ({
        ...current,
        [shipment.id]: nextStatus,
      }),
    );

    try {
      const updatedShipment =
        await updateManualShipment(
          shipment.id,
          {
            shipping_status: nextStatus,
          },
        );

      // Data hasil update menjadi sumber utama UI dan cache.
      queryClient.setQueryData<ManualShipment[]>(
        [
          "manual-shipments",
          shipment.batch_id,
        ],
        (current = []) =>
          current.map((item) =>
            item.id === shipment.id
              ? updatedShipment
              : item,
          ),
      );

      // Override lokal dihapus agar setelah render/refresh
      // nilai selalu mengikuti database.
      setShippingStatusOverrides(
        (current) => {
          const next = {
            ...current,
          };

          delete next[shipment.id];

          return next;
        },
      );

      await queryClient.invalidateQueries({
        queryKey: [
          "manual-shipments",
          shipment.batch_id,
        ],
      });
    } catch (error) {
      // Kembalikan UI ke nilai sebelum perubahan
      // bila penyimpanan ke server gagal.
      setShippingStatusOverrides(
        (current) => ({
          ...current,
          [shipment.id]: previousStatus,
        }),
      );

      window.alert(
        error instanceof Error
          ? error.message
          : "Gagal memperbarui status pengiriman.",
      );
    }
  }

  /* =======================================
     RENDER
  ======================================== */

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">
      <div className="w-full px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
        {/* =================================
            HEADER
        ================================== */}

        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
              Pengiriman Manual
            </h1>

            <p className="mt-2 text-sm text-[#5d6f9f]">
              Kelola batch dan pengiriman
              barang yang sudah checkout.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {/* SEARCH */}

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a89ad]" />

              <input
                type="text"
                value={search}
                onChange={(
                  event,
                ) => {
                  setSearch(
                    event.target.value,
                  );

                  setCurrentPage(
                    1,
                  );
                }}
                placeholder="Cari batch..."
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 sm:w-[250px]"
              />
            </div>

            {/* TAMBAH BATCH */}

            {!isCustomer && (
              <button
                type="button"
                onClick={
                  openCreateBatch
                }
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0]"
              >
                <Plus className="h-5 w-5" />
                Tambah Batch
              </button>
            )}
          </div>
        </div>

        {/* =================================
            TABS
        ================================== */}

        <section className="mt-6 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <div className="flex min-w-max items-center">
              {/* SEMUA BATCH */}

              <button
                type="button"
                onClick={() =>
                  handleTabChange(
                    "all",
                  )
                }
                className={[
                  "relative px-7 py-5 text-base font-medium transition-colors",
                  activeTab ===
                  "all"
                    ? "text-[#1457ff]"
                    : "text-[#65749b] hover:text-[#20366f]",
                ].join(
                  " ",
                )}
              >
                Semua Batch

                {activeTab ===
                  "all" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-[#1457ff]" />
                )}
              </button>

              {/* BATCH TABS */}

              {batches.map(
                (batch) => {
                  const isActive =
                    activeTab ===
                    batch.id;

                  return (
                    <button
                      key={
                        batch.id
                      }
                      type="button"
                      onClick={() =>
                        handleTabChange(
                          batch.id,
                        )
                      }
                      className={[
                        "relative px-7 py-5 text-base font-medium transition-colors",
                        isActive
                          ? "text-[#1457ff]"
                          : "text-[#65749b] hover:text-[#20366f]",
                      ].join(
                        " ",
                      )}
                    >
                      {
                        batch.event_name
                      }

                      {isActive && (
                        <span className="absolute inset-x-0 bottom-0 h-1 bg-[#1457ff]" />
                      )}
                    </button>
                  );
                },
              )}
            </div>
          </div>
        </section>

        {/* =================================
            ERROR
        ================================== */}

        {isError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-medium text-red-600">
              Gagal mengambil data
              batch pengiriman.
            </p>

            <p className="mt-1 text-xs text-red-500">
              {
                error?.message
              }
            </p>
          </div>
        )}

        {/* =================================
            SEMUA BATCH - MOBILE
        ================================== */}

        {activeTab ===
          "all" && (
          <section className="mt-4 space-y-3 md:hidden">
            {isLoading && (
              <div className="rounded-xl border border-[#edf0f6] bg-white px-5 py-12 text-center shadow-sm">
                <p className="text-sm text-[#7a89ad]">
                  Memuat data batch...
                </p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              paginatedBatches.length === 0 && (
                <div className="rounded-xl border border-[#edf0f6] bg-white px-5 py-12 text-center shadow-sm">
                  <p className="text-sm font-medium text-[#20366f]">
                    {search
                      ? "Data batch tidak ditemukan"
                      : "Belum ada batch"}
                  </p>
                  <p className="mt-2 text-xs text-[#7a89ad]">
                    {search
                      ? "Coba gunakan kata kunci pencarian lain."
                      : 'Klik "Tambah Batch" untuk membuat batch baru.'}
                  </p>
                </div>
              )}

            {!isLoading &&
              !isError &&
              paginatedBatches.map((batch) => (
                <article
                  key={batch.id}
                  onClick={() =>
                    handleTabChange(batch.id)
                  }
                  className="cursor-pointer rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="break-words text-base font-bold text-[#20366f]">
                        {batch.event_name}
                      </h2>
                      <p className="mt-1 text-xs text-[#7a89ad]">
                        Batch pengiriman manual
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                      {batch.status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-[#f8faff] px-3 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a96b4]">
                        Tanggal Mulai
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#20366f]">
                        {formatDate(batch.start_date)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#f8faff] px-3 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-[#8a96b4]">
                        Tanggal Berakhir
                      </p>
                      <p className="mt-1 text-sm font-semibold text-[#20366f]">
                        {formatDate(batch.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a89ad]">
                      Status Batch
                    </p>
                    <div className="relative">
                      <select
                        value={batch.status}
                        onChange={(event) => {
                          event.stopPropagation();
                          void handleBatchStatusChange(
                            batch,
                            event.target.value as ManualShippingBatchStatus,
                          );
                        }}
                        onClick={(event) =>
                          event.stopPropagation()
                        }
                        disabled={
                          isCustomer ||
                          batch.status === "Selesai" ||
                          batch.status === "Dibatalkan" ||
                          updatingStatusBatchId === batch.id
                        }
                        className="h-11 w-full appearance-none rounded-lg border border-[#d9e0ef] bg-white px-3 pr-10 text-sm font-semibold text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f5f6fa] disabled:text-[#9aa4bb]"
                      >
                        {([
                          "Aktif",
                          "Selesai",
                          "Dibatalkan",
                        ] as ManualShippingBatchStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#536795]" />
                    </div>
                  </div>

                  {!isCustomer &&
                    batch.status !== "Selesai" &&
                    batch.status !== "Dibatalkan" && (
                      <div className="mt-4 flex gap-2 border-t border-[#edf0f6] pt-4">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            openEditBatch(batch);
                          }}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] text-sm font-medium text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingBatch(batch);
                          }}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-medium text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </button>
                      </div>
                    )}
                </article>
              ))}

            {filteredBatches.length > 0 && (
              <div className="flex items-center justify-between rounded-xl border border-[#edf0f6] bg-white px-4 py-4 shadow-sm">
                <p className="text-xs text-[#7a89ad]">
                  Menampilkan{" "}
                  {filteredBatches.length === 0
                    ? 0
                    : (currentPage - 1) * ITEMS_PER_PAGE + 1}{" "}
                  -{" "}
                  {Math.min(
                    currentPage * ITEMS_PER_PAGE,
                    filteredBatches.length,
                  )}{" "}
                  dari {filteredBatches.length} batch
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.max(1, page - 1),
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Halaman sebelumnya"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#1457ff] bg-[#edf3ff] px-2 text-sm font-medium text-[#1457ff]">
                    {currentPage}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() =>
                      setCurrentPage((page) =>
                        Math.min(totalPages, page + 1),
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Halaman berikutnya"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* =================================
            SEMUA BATCH - DESKTOP
        ================================== */}

        {activeTab ===
          "all" && (
          <section className="mt-4 hidden overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="border-b border-[#e8ecf4]">
                    <th className="min-w-[320px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Nama Event
                    </th>

                    <th className="min-w-[220px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Tanggal Mulai Event
                    </th>

                    <th className="min-w-[240px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Tanggal Berakhir Event
                    </th>

                    <th className="min-w-[180px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Status Batch
                    </th>

                    <th className="w-[150px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Aksi
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {isLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-20 text-center"
                      >
                        <p className="text-base text-[#7a89ad]">
                          Memuat data
                          batch...
                        </p>
                      </td>
                    </tr>
                  )}

                  {!isLoading &&
                    !isError &&
                    paginatedBatches.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-20 text-center"
                        >
                          <p className="text-base font-medium text-[#20366f]">
                            {search
                              ? "Data batch tidak ditemukan"
                              : "Belum ada batch"}
                          </p>

                          <p className="mt-2 text-sm text-[#7a89ad]">
                            {search
                              ? "Coba gunakan kata kunci pencarian lain."
                              : 'Klik "Tambah Batch" untuk membuat batch baru.'}
                          </p>
                        </td>
                      </tr>
                    )}

                  {!isLoading &&
                    !isError &&
                    paginatedBatches.map(
                      (
                        batch,
                      ) => (
                        <tr
                          key={
                            batch.id
                          }
                          onClick={() =>
                            handleTabChange(
                              batch.id,
                            )
                          }
                          className="cursor-pointer border-b border-[#eef1f6] last:border-b-0 hover:bg-[#fbfcff]"
                        >
                          <td className="px-6 py-6 text-center align-middle">
                            <p className="text-base font-medium text-[#20366f]">
                              {
                                batch.event_name
                              }
                            </p>
                          </td>

                          <td className="px-6 py-6 text-center align-middle">
                            <p className="text-sm text-[#20366f]">
                              {
                                formatDate(
                                  batch.start_date,
                                )
                              }
                            </p>
                          </td>

                          <td className="px-6 py-6 text-center align-middle">
                            <p className="text-sm text-[#20366f]">
                              {
                                formatDate(
                                  batch.end_date,
                                )
                              }
                            </p>
                          </td>

                          <td className="px-6 py-6 text-center align-middle">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();

                                if (
                                  isCustomer ||
                                  batch.status === "Selesai" ||
                                  batch.status === "Dibatalkan"
                                ) {
                                  return;
                                }

                                if (openStatusBatchId === batch.id) {
                                  setOpenStatusBatchId(null);
                                  setStatusDropdownPosition(null);
                                  return;
                                }

                                const rect = event.currentTarget.getBoundingClientRect();
                                const menuWidth = 176;
                                const menuHeight = 150;
                                const gap = 8;
                                const horizontalPadding = 8;
                                const centeredLeft =
                                  rect.left + rect.width / 2 - menuWidth / 2;
                                const left = Math.min(
                                  Math.max(
                                    centeredLeft,
                                    horizontalPadding,
                                  ),
                                  window.innerWidth -
                                    menuWidth -
                                    horizontalPadding,
                                );
                                const hasSpaceBelow =
                                  rect.bottom +
                                    gap +
                                    menuHeight <=
                                  window.innerHeight -
                                    horizontalPadding;

                                setOpenStatusBatchId(batch.id);
                                setStatusDropdownPosition({
                                  top: hasSpaceBelow
                                    ? rect.bottom + gap
                                    : rect.top -
                                      gap -
                                      menuHeight,
                                  left,
                                  openUpward: !hasSpaceBelow,
                                });
                              }}
                              disabled={
                                isCustomer ||
                                batch.status === "Selesai" ||
                                batch.status === "Dibatalkan" ||
                                updatingStatusBatchId ===
                                  batch.id
                              }
                              className="inline-flex min-w-[140px] items-center justify-between gap-2 rounded-md bg-blue-50 px-3 py-1.5 text-left text-xs font-semibold text-blue-600 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
                              aria-label={`Ubah status batch ${batch.event_name}`}
                            >
                              <span className="truncate">
                                {updatingStatusBatchId ===
                                batch.id
                                  ? "Menyimpan..."
                                  : batch.status}
                              </span>

                              <ChevronDown
                                size={15}
                                className={[
                                  "shrink-0 transition-transform",
                                  openStatusBatchId === batch.id
                                    ? "rotate-180"
                                    : "",
                                ].join(" ")}
                              />
                            </button>

                            {openStatusBatchId ===
                              batch.id &&
                              statusDropdownPosition &&
                              createPortal(
                                <div
                                  className="fixed z-[9999] w-44 overflow-hidden rounded-xl border border-[#d9e0ef] bg-white p-2 text-left shadow-xl"
                                  style={{
                                    top: statusDropdownPosition.top,
                                    left: statusDropdownPosition.left,
                                  }}
                                  onClick={(event) =>
                                    event.stopPropagation()
                                  }
                                >
                                  {([
                                    "Aktif",
                                    "Selesai",
                                    "Dibatalkan",
                                  ] as ManualShippingBatchStatus[]).map(
                                    (status) => {
                                      const selected =
                                        batch.status === status;

                                      return (
                                        <button
                                          key={status}
                                          type="button"
                                          onClick={() =>
                                            void handleBatchStatusChange(
                                              batch,
                                              status,
                                            )
                                          }
                                          disabled={
                                            updatingStatusBatchId ===
                                            batch.id
                                          }
                                          className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#20366f] transition hover:bg-[#f7f9ff] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          <span>{status}</span>

                                          {selected && (
                                            <Check
                                              size={16}
                                              className="shrink-0 text-[#1457ff]"
                                            />
                                          )}
                                        </button>
                                      );
                                    },
                                  )}
                                </div>,
                                document.body,
                              )}
                          </td>

                          <td className="px-6 py-6 text-center align-middle">
                            {!isCustomer &&
                              batch.status !== "Selesai" &&
                              batch.status !== "Dibatalkan" && (
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    openEditBatch(
                                      batch,
                                    );
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff] disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Edit batch"
                                  title="Edit batch"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.stopPropagation();

                                    setDeletingBatch(
                                      batch,
                                    );
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Hapus batch"
                                  title="Hapus batch"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ),
                    )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="flex items-center justify-between border-t border-[#edf0f6] px-6 py-5">
              <p className="text-sm text-[#7a89ad]">
                Menampilkan{" "}
                {filteredBatches.length ===
                0
                  ? 0
                  : (currentPage -
                      1) *
                      ITEMS_PER_PAGE +
                    1}{" "}
                -{" "}
                {Math.min(
                  currentPage *
                    ITEMS_PER_PAGE,
                  filteredBatches.length,
                )}{" "}
                dari{" "}
                {
                  filteredBatches.length
                }{" "}
                batch
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={
                    currentPage ===
                    1
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        page,
                      ) =>
                        Math.max(
                          1,
                          page -
                            1,
                        ),
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Halaman sebelumnya"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1457ff] bg-[#edf3ff] text-sm font-medium text-[#1457ff]"
                >
                  {
                    currentPage
                  }
                </button>

                <button
                  type="button"
                  disabled={
                    currentPage >=
                    totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (
                        page,
                      ) =>
                        Math.min(
                          totalPages,
                          page +
                            1,
                        ),
                    )
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] transition hover:bg-[#f8faff] disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label="Halaman berikutnya"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </section>
        )}

        {/* =================================
            DETAIL BATCH
        ================================== */}

        {activeTab !==
          "all" &&
          (isLoading ? (
            <div className="mt-4 rounded-xl border border-[#edf0f6] bg-white px-6 py-20 text-center shadow-sm">
              <p className="text-base text-[#7a89ad]">
                Memuat batch...
              </p>
            </div>
          ) : selectedBatch ? (
            <>
              {/* =============================
                  BATCH INFORMATION - DESKTOP
              ============================== */}

              <section className="mt-4 hidden overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <div
                    className="grid min-w-[1120px] items-center gap-6 px-6 py-6"
                    style={{
                      gridTemplateColumns:
                        "minmax(190px,1.35fr) minmax(180px,1fr) minmax(190px,1fr) minmax(120px,0.7fr) auto",
                    }}
                  >
                    {/* BATCH */}

                    <div className="min-w-0">
                      <p className="text-base font-medium text-[#7a89ad]">
                        Batch
                      </p>

                      <h2 className="mt-1 truncate text-2xl font-bold text-[#20366f]">
                        {
                          selectedBatch.event_name
                        }
                      </h2>
                    </div>

                    {/* TANGGAL MULAI */}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0 text-[#536795]" />

                        <p className="text-base font-medium text-[#5d6f9f]">
                          Tanggal Mulai
                        </p>
                      </div>

                      <p className="mt-2 whitespace-nowrap text-lg font-bold text-[#20366f]">
                        {
                          formatDate(
                            selectedBatch.start_date,
                          )
                        }
                      </p>
                    </div>

                    {/* TANGGAL BERAKHIR */}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 shrink-0 text-[#536795]" />

                        <p className="text-base font-medium text-[#5d6f9f]">
                          Tanggal Berakhir
                        </p>
                      </div>

                      <p className="mt-2 whitespace-nowrap text-lg font-bold text-[#20366f]">
                        {
                          formatDate(
                            selectedBatch.end_date,
                          )
                        }
                      </p>
                    </div>

                    {/* STATUS */}

                    <div className="min-w-0">
                      <p className="text-base font-medium text-[#5d6f9f]">
                        Status Batch
                      </p>

                      <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-600">
                        {
                          selectedBatch.status
                        }
                      </span>
                    </div>

                    {/* ACTION */}

                    <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                      <button
                        type="button"
                          onClick={() =>
                            openEditBatch(
                              selectedBatch,
                            )
                          }
                        className={`inline-flex h-11 items-center justify-center rounded-lg border border-[#d9e0ef] bg-white px-5 text-lg font-medium text-[#20366f] transition hover:bg-[#f8faff] ${
                          isCustomer ||
                          isBatchExpired ||
                          selectedBatch.status === "Selesai" ||
                          selectedBatch.status === "Dibatalkan"
                            ? "invisible pointer-events-none"
                            : ""
                        }`}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit Batch
                      </button>

                      <button
                        type="button"
                        onClick={
                          openAddShipment
                        }
                        className={`inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0] ${
                          isBatchExpired ||
                          selectedBatch.status === "Selesai" ||
                          selectedBatch.status === "Dibatalkan"
                            ? "invisible pointer-events-none"
                            : ""
                        }`}
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Rekapan
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* =============================
                  BATCH INFORMATION - MOBILE
              ============================== */}

              <section className="mt-4 md:hidden">
                <div className="rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-[#7a89ad]">
                    Batch
                  </p>
                  <h2 className="mt-1 break-words text-xl font-bold text-[#20366f]">
                    {selectedBatch.event_name}
                  </h2>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-[#f8faff] px-3 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#5d6f9f]">
                        <CalendarDays className="h-4 w-4 text-[#536795]" />
                        Tanggal Mulai
                      </div>
                      <p className="mt-2 text-sm font-bold text-[#20366f]">
                        {formatDate(selectedBatch.start_date)}
                      </p>
                    </div>

                    <div className="rounded-lg bg-[#f8faff] px-3 py-3">
                      <div className="flex items-center gap-2 text-xs font-medium text-[#5d6f9f]">
                        <CalendarDays className="h-4 w-4 text-[#536795]" />
                        Tanggal Berakhir
                      </div>
                      <p className="mt-2 text-sm font-bold text-[#20366f]">
                        {formatDate(selectedBatch.end_date)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg bg-[#f8faff] px-3 py-3">
                    <p className="text-xs font-medium text-[#5d6f9f]">
                      Status Batch
                    </p>
                    <span className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                      {selectedBatch.status}
                    </span>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        openEditBatch(selectedBatch)
                      }
                      className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm font-medium text-[#20366f] transition hover:bg-[#f8faff] ${
                        isCustomer ||
                        isBatchExpired ||
                        selectedBatch.status === "Selesai" ||
                        selectedBatch.status === "Dibatalkan"
                          ? "invisible pointer-events-none"
                          : ""
                      }`}
                    >
                      <Pencil className="h-4 w-4" />
                      Edit Batch
                    </button>

                    <button
                      type="button"
                      onClick={openAddShipment}
                      className={`inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-3 text-sm font-medium text-white transition hover:bg-[#0d4be0] ${
                        isBatchExpired ||
                        selectedBatch.status === "Selesai" ||
                        selectedBatch.status === "Dibatalkan"
                          ? "invisible pointer-events-none"
                          : ""
                      }`}
                    >
                      <Plus className="h-4 w-4" />
                      Tambah Rekapan
                    </button>
                  </div>
                </div>
              </section>

              {/* =============================
                  SHIPMENT CARDS - MOBILE
              ============================== */}

              <section className="mt-4 space-y-3 md:hidden">
                {isShipmentsLoading && (
                  <div className="rounded-xl border border-[#edf0f6] bg-white px-5 py-12 text-center shadow-sm">
                    <p className="text-sm text-[#7a89ad]">
                      Memuat data pengiriman...
                    </p>
                  </div>
                )}

                {!isShipmentsLoading && isShipmentsError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center">
                    <p className="text-sm font-medium text-red-600">
                      Gagal mengambil data pengiriman.
                    </p>
                    <p className="mt-2 text-xs text-red-500">
                      {shipmentsError?.message}
                    </p>
                  </div>
                )}

                {!isShipmentsLoading &&
                  !isShipmentsError &&
                  shipments.length === 0 && (
                    <div className="rounded-xl border border-[#edf0f6] bg-white px-5 py-12 text-center shadow-sm">
                      <p className="text-sm font-medium text-[#20366f]">
                        Belum ada data pengiriman.
                      </p>
                      <p className="mt-2 text-xs text-[#7a89ad]">
                        Data pengiriman akan muncul setelah ditambahkan ke batch ini.
                      </p>
                    </div>
                  )}

                {!isShipmentsLoading &&
                  !isShipmentsError &&
                  shipments.map((shipment) => {
                    const isHnr =
                      shipment.member?.type === "hnr";

                    const shippingStatus =
                      getShippingStatusValue(
                        shippingStatusOverrides[shipment.id] ??
                          shipment.shipping_status,
                      );

                    const summary =
                      shipmentPaymentSummaryMap.get(
                        shipment.id,
                      ) ?? null;

                    const isPaid =
                      summary?.status === "paid";

                    return (
                      <article
                        key={shipment.id}
                        className={[
                          "rounded-xl border p-4 shadow-sm",
                          isHnr
                            ? "border-[#edf0f6] bg-[#f5f6fa]"
                            : "border-[#edf0f6] bg-white",
                        ].join(" ")}
                      >
                        {/* BUYER */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="break-words text-sm font-bold text-[#20366f]">
                                {shipment.member?.name ?? "-"}
                              </p>
                              {isHnr && (
                                <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
                                  HNR
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-[#7a89ad]">
                              {shipment.member?.phone ?? "-"}
                            </p>
                          </div>

                          <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-600">
                            {shippingStatus === "dalam_proses_pick_up"
                              ? "Sudah di pick up"
                              : "Sudah di packing"}
                          </span>
                        </div>

                        {/* ITEMS */}
                        <div className="mt-4 rounded-lg bg-[#f8faff] px-3 py-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                            Detail Barang
                          </p>
                          <div className="space-y-2">
                            {shipment.items?.length ? (
                              shipment.items.map((item) => (
                                <div key={item.id} className="min-w-0">
                                  <p className="text-sm font-semibold text-[#20366f]">
                                    • {item.recap?.detail_barang ?? "-"}{" "}
                                    <span className="font-normal text-[#7a89ad]">
                                      x{item.recap?.qty ?? 0}
                                    </span>
                                  </p>
                                  <p className="mt-1 text-xs text-[#7a89ad]">
                                    {item.recap?.batch?.name ??
                                      "Batch tidak diketahui"}{" "}
                                    -{" "}
                                    {item.recap?.batch?.country ??
                                      "Country tidak diketahui"}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-[#7a89ad]">-</p>
                            )}
                          </div>
                        </div>

                        {/* SHIPPING */}
                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Ekspedisi
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#20366f]">
                              {shipment.expedition || "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Alamat Lengkap
                            </p>
                            <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-[#20366f]">
                              {shipment.address || "-"}
                            </p>
                          </div>
                        </div>

                        {/* DUE DATE */}
                        <div
                          className={[
                            "mt-3 rounded-lg border border-[#edf0f6] px-3 py-3 transition",
                            isCustomer || isHnr
                              ? "cursor-not-allowed"
                              : "cursor-pointer hover:bg-[#f8faff]",
                          ].join(" ")}
                          onClick={() =>
                            openDueDatePicker(shipment)
                          }
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                            Maks. Pembayaran
                          </p>
                          <p className="mt-1 text-left text-sm font-semibold text-[#20366f]">
                            {updatingDueDateShipmentId === shipment.id
                              ? "Menyimpan..."
                              : shipment.due_date
                                ? formatDate(shipment.due_date)
                                : "Pilih tanggal"}
                          </p>
                        </div>


                        {/* PRICES */}
                        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <div
                            className={[
                              "rounded-lg border border-[#edf0f6] px-3 py-3 transition",
                              !isCustomer && !isHnr && !(editingPrice?.shipmentId === shipment.id && editingPrice.field === "shipping_price")
                                ? "cursor-pointer hover:bg-[#f8faff]"
                                : isCustomer || isHnr
                                  ? "cursor-not-allowed"
                                  : "",
                            ].join(" ")}
                            onClick={() => {
                              if (
                                isCustomer ||
                                isHnr ||
                                (editingPrice?.shipmentId === shipment.id &&
                                  editingPrice.field === "shipping_price")
                              ) {
                                return;
                              }

                              setEditingPrice({
                                shipmentId: shipment.id,
                                field: "shipping_price",
                              });
                              setEditingPriceValue(
                                shipment.shipping_price
                                  ? String(shipment.shipping_price)
                                  : "",
                              );
                            }}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Ongkos Kirim
                            </p>
                            {editingPrice?.shipmentId === shipment.id &&
                            editingPrice.field === "shipping_price" ? (
                              <input
                                autoFocus
                                type="text"
                                inputMode="numeric"
                                minLength={0}
                                value={formatEditingPrice(editingPriceValue)}
                                onChange={(event) =>
                                  setEditingPriceValue(
                                    getEditingPriceDigits(event.target.value),
                                  )
                                }
                                onBlur={() =>
                                  void handlePriceSave(
                                    shipment,
                                    "shipping_price",
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    setEditingPrice(null);
                                    setEditingPriceValue("");
                                  }
                                }}
                                className="mt-2 h-10 w-full rounded-lg border border-[#1457ff] px-3 text-center text-sm text-[#20366f] outline-none"
                              />
                            ) : (
                              <p className="mt-2 text-sm font-semibold text-[#20366f]">
                                {formatCurrency(shipment.shipping_price)}
                              </p>
                            )}
                          </div>

                          <div
                            className={[
                              "rounded-lg border border-[#edf0f6] px-3 py-3 transition",
                              !isCustomer && !isHnr && !(editingPrice?.shipmentId === shipment.id && editingPrice.field === "packing_price")
                                ? "cursor-pointer hover:bg-[#f8faff]"
                                : isCustomer || isHnr
                                  ? "cursor-not-allowed"
                                  : "",
                            ].join(" ")}
                            onClick={() => {
                              if (
                                isCustomer ||
                                isHnr ||
                                (editingPrice?.shipmentId === shipment.id &&
                                  editingPrice.field === "packing_price")
                              ) {
                                return;
                              }

                              setEditingPrice({
                                shipmentId: shipment.id,
                                field: "packing_price",
                              });
                              setEditingPriceValue(
                                shipment.packing_price
                                  ? String(shipment.packing_price)
                                  : "",
                              );
                            }}
                          >
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Packing
                            </p>
                            {editingPrice?.shipmentId === shipment.id &&
                            editingPrice.field === "packing_price" ? (
                              <input
                                autoFocus
                                type="text"
                                inputMode="numeric"
                                minLength={0}
                                value={formatEditingPrice(editingPriceValue)}
                                onChange={(event) =>
                                  setEditingPriceValue(
                                    getEditingPriceDigits(event.target.value),
                                  )
                                }
                                onBlur={() =>
                                  void handlePriceSave(
                                    shipment,
                                    "packing_price",
                                  )
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    event.preventDefault();
                                    event.currentTarget.blur();
                                  }
                                  if (event.key === "Escape") {
                                    event.preventDefault();
                                    setEditingPrice(null);
                                    setEditingPriceValue("");
                                  }
                                }}
                                className="mt-2 h-10 w-full rounded-lg border border-[#1457ff] px-3 text-center text-sm text-[#20366f] outline-none"
                              />
                            ) : (
                              <p className="mt-2 text-sm font-semibold text-[#20366f]">
                                {formatCurrency(shipment.packing_price)}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* PAYMENT */}
                        <div className="mt-4 rounded-lg border border-[#edf0f6] px-3 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                                Total Pembayaran
                              </p>
                              <p className="mt-1 text-base font-bold text-[#20366f]">
                                {formatCurrency(
                                  getDisplayedTotal(
                                    shipment,
                                    summary,
                                  ),
                                )}
                              </p>
                            </div>
                            {isPaid && (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                Paid
                              </span>
                            )}
                          </div>

                          {isPaid ? (
                            <p className="mt-2 text-xs text-[#7a89ad]">
                              {getPaymentDate(summary?.paid_at)}
                            </p>
                          ) : (
                            <>
                              {!isCustomer && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openShipmentPayment(shipment)
                                  }
                                  disabled={
                                    isHnr ||
                                    processingShipmentPaymentId === shipment.id
                                  }
                                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-4 text-xs font-semibold text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-100"
                                >
                                  {processingShipmentPaymentId === shipment.id ? (
                                    <>
                                      <Loader2 size={14} className="animate-spin" />
                                      Memproses...
                                    </>
                                  ) : (
                                    "Pembayaran"
                                  )}
                                </button>
                              )}

                              {Number(summary?.penalty_days ?? 0) > 0 && (
                                <div className="mt-3 text-xs">
                                  <p className="font-semibold text-red-600">
                                    Terlambat {summary?.penalty_days} hari
                                  </p>
                                  <p className="mt-1 text-[#7a89ad]">
                                    Denda + {formatCurrency(summary?.penalty_amount)}
                                  </p>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        {/* SHIPPING STATUS */}
                        <div className="mt-3">
                          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                            Status Pengiriman
                          </p>
                          <div className="relative">
                            <select
                              value={shippingStatus}
                              onChange={(event) =>
                                void handleShippingStatusChange(
                                  shipment,
                                  event.target.value as ManualShipment["shipping_status"],
                                )
                              }
                              disabled={
                                isHnr ||
                                isCustomer ||
                                shippingStatus === "dalam_proses_pick_up"
                              }
                              className="h-11 w-full appearance-none rounded-lg border border-[#d9e0ef] bg-white px-3 pr-10 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 disabled:cursor-not-allowed disabled:bg-[#f5f6fa] disabled:text-[#9aa4bb]"
                            >
                              <option value="sedang_dikemas">
                                Sudah di packing
                              </option>
                              <option value="dalam_proses_pick_up">
                                Sudah di pick up
                              </option>
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#536795]" />
                          </div>

                          {shippingStatus === "dalam_proses_pick_up" && (
                            <p className="mt-2 text-xs text-[#7a89ad]">
                              {formatPickupDate(shipment.updated_at)}
                            </p>
                          )}
                        </div>

                        {/* ACTION */}
                        {shippingStatus === "dalam_proses_pick_up" ? (
                          <div className="mt-4 border-t border-[#edf0f6] pt-4 text-center text-xs text-[#7a89ad]">
                            Pengiriman sudah di-pick up
                          </div>
                        ) : (
                          <div className="mt-4 flex gap-2 border-t border-[#edf0f6] pt-4">
                            {!isCustomer &&
                              selectedBatch.status !== "Selesai" && (
                                <button
                                  type="button"
                                  disabled={isHnr}
                                  onClick={() =>
                                    openEditShipment(shipment)
                                  }
                                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] text-sm font-medium text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Edit
                                </button>
                              )}

                            {selectedBatch.status !== "Selesai" && (
                              <button
                                type="button"
                                disabled={isHnr}
                                onClick={() =>
                                  openDeleteShipment(shipment)
                                }
                                className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 text-sm font-medium text-red-500 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Trash2 className="h-4 w-4" />
                                Hapus
                              </button>
                            )}
                          </div>
                        )}
                      </article>
                    );
                  })}
              </section>

              {/* =============================
                  SHIPMENT TABLE - DESKTOP
              ============================== */}

              <section className="mt-4 hidden overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm md:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1750px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#e8ecf4]">
                        <th className="min-w-[210px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Nama Pembeli
                        </th>

                        <th className="min-w-[260px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Detail Barang
                        </th>

                        <th className="min-w-[180px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Ekspedisi
                        </th>

                        <th className="min-w-[300px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Alamat Lengkap
                        </th>

                        <th className="min-w-[190px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Maks. Pembayaran
                        </th>

                        <th className="min-w-[170px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Ongkos Kirim
                        </th>

                        <th className="min-w-[150px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Packing
                        </th>

                        <th className="min-w-[190px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Total
                        </th>

                        <th className="min-w-[210px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Status Pengiriman
                        </th>

                        <th className="min-w-[140px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Aksi
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {isShipmentsLoading && (
                        <tr>
                          <td
                            colSpan={10}
                            className="px-6 py-20 text-center"
                          >
                            <p className="text-base text-[#7a89ad]">
                              Memuat data pengiriman...
                            </p>
                          </td>
                        </tr>
                      )}

                      {!isShipmentsLoading &&
                        isShipmentsError && (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-6 py-20 text-center"
                            >
                              <p className="text-base font-medium text-red-600">
                                Gagal mengambil data pengiriman.
                              </p>

                              <p className="mt-2 text-sm text-red-500">
                                {shipmentsError?.message}
                              </p>
                            </td>
                          </tr>
                        )}

                      {!isShipmentsLoading &&
                        !isShipmentsError &&
                        shipments.length === 0 && (
                          <tr>
                            <td
                              colSpan={10}
                              className="px-6 py-20 text-center"
                            >
                              <p className="text-base font-medium text-[#20366f]">
                                Belum ada data pengiriman.
                              </p>

                              <p className="mt-2 text-sm text-[#7a89ad]">
                                Data pengiriman akan muncul setelah
                                ditambahkan ke batch ini.
                              </p>
                            </td>
                          </tr>
                        )}

                      {!isShipmentsLoading &&
                        !isShipmentsError &&
                        shipments.map(
                          (shipment) => {
                            const isHnr =
                              shipment.member?.type === "hnr";

                            return (
                              <tr
                                key={shipment.id}
                                aria-disabled={isHnr}
                                className={[
                                  "border-b border-[#eef1f6] last:border-b-0",
                                  isHnr
                                    ? "bg-[#f5f6fa]"
                                    : "",
                                ].join(" ")}
                              >
                                <td className="px-6 py-6 text-center align-top">
                                  <div className="flex items-center justify-center gap-2">
                                    <p className="text-sm font-semibold text-[#20366f]">
                                      {shipment.member?.name ?? "-"}
                                    </p>

                                    {isHnr && (
                                      <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                                        HNR
                                      </span>
                                    )}
                                  </div>

                                  <p className="mt-1 text-xs text-[#7a89ad]">
                                    {shipment.member?.phone ?? "-"}
                                  </p>
                                </td>

                              <td className="px-6 py-6 align-top">
                                <div className="space-y-3">
                                  {shipment.items?.length ? (
                                    shipment.items.map(
                                      (item) => (
                                        <div
                                          key={item.id}
                                          className="flex items-start gap-2"
                                        >
                                          <span className="mt-0.5 shrink-0 text-sm text-[#7a89ad]">
                                            •
                                          </span>

                                          <div className="min-w-0">
                                            <div>
                                              <span className="text-sm font-semibold text-[#20366f]">
                                                {item.recap?.detail_barang ?? "-"}
                                              </span>

                                              <span className="ml-2 text-xs text-[#7a89ad]">
                                                x{item.recap?.qty ?? 0}
                                                {" "}
                                              </span>
                                            </div>

                                            <span className="mt-1 block text-xs text-[#7a89ad]">
                                              {item.recap?.batch?.name ??
                                                "Batch tidak diketahui"}
                                              {" - "}
                                              {item.recap?.batch?.country ??
                                                "Country tidak diketahui"}
                                            </span>
                                          </div>
                                        </div>
                                      ),
                                    )
                                  ) : (
                                    <p className="text-sm text-[#7a89ad]">
                                      -
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-6 text-center align-top">
                                <p className="text-sm font-medium text-[#20366f]">
                                  {shipment.expedition}
                                </p>
                              </td>

                              <td className="px-6 py-6 text-center align-top">
                                <p className="max-w-[300px] whitespace-pre-wrap text-center text-sm leading-6 text-[#20366f]">
                                  {shipment.address || "-"}
                                </p>
                              </td>

                              <td
                                className={[
                                  "px-6 py-6 text-center align-top transition",
                                  isCustomer || isHnr
                                    ? "cursor-not-allowed"
                                    : "cursor-pointer hover:bg-[#f8faff]",
                                ].join(" ")}
                                onClick={() =>
                                  openDueDatePicker(shipment)
                                }
                              >
                                <p className="text-sm font-semibold text-[#20366f]">
                                  {updatingDueDateShipmentId ===
                                  shipment.id
                                    ? "Menyimpan..."
                                    : shipment.due_date
                                      ? formatDate(
                                          shipment.due_date,
                                        )
                                      : "Pilih tanggal"}
                                </p>
                              </td>

                              <td
                                className={[
                                  "px-6 py-6 text-center align-top transition",
                                  !isCustomer && !isHnr && !(editingPrice?.shipmentId === shipment.id && editingPrice.field === "shipping_price")
                                    ? "cursor-pointer hover:bg-[#f8faff]"
                                    : isCustomer || isHnr
                                      ? "cursor-not-allowed"
                                      : "",
                                ].join(" ")}
                                onClick={() => {
                                  if (
                                    isCustomer ||
                                    isHnr ||
                                    (editingPrice?.shipmentId === shipment.id &&
                                      editingPrice.field === "shipping_price")
                                  ) {
                                    return;
                                  }

                                  setEditingPrice({
                                    shipmentId: shipment.id,
                                    field: "shipping_price",
                                  });
                                  setEditingPriceValue(
                                    shipment.shipping_price
                                      ? String(shipment.shipping_price)
                                      : "",
                                  );
                                }}
                              >
                                {editingPrice?.shipmentId === shipment.id &&
                                editingPrice.field === "shipping_price" ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    inputMode="numeric"
                                    minLength={0}
                                    value={formatEditingPrice(editingPriceValue)}
                                    onChange={(event) =>
                                      setEditingPriceValue(
                                        getEditingPriceDigits(event.target.value),
                                      )
                                    }
                                    onBlur={() =>
                                      void handlePriceSave(
                                        shipment,
                                        "shipping_price",
                                      )
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        event.currentTarget.blur();
                                      }

                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        setEditingPrice(null);
                                        setEditingPriceValue("");
                                      }
                                    }}
                                    className="h-9 w-28 rounded-lg border border-[#1457ff] px-3 text-center text-sm text-[#20366f] outline-none"
                                  />
                                ) : (
                                  <p className="text-sm text-[#20366f]">
                                    {formatCurrency(
                                      shipment.shipping_price,
                                    )}
                                  </p>
                                )}
                              </td>

                              <td
                                className={[
                                  "px-6 py-6 text-center align-top transition",
                                  !isCustomer && !isHnr && !(editingPrice?.shipmentId === shipment.id && editingPrice.field === "packing_price")
                                    ? "cursor-pointer hover:bg-[#f8faff]"
                                    : isCustomer || isHnr
                                      ? "cursor-not-allowed"
                                      : "",
                                ].join(" ")}
                                onClick={() => {
                                  if (
                                    isCustomer ||
                                    isHnr ||
                                    (editingPrice?.shipmentId === shipment.id &&
                                      editingPrice.field === "packing_price")
                                  ) {
                                    return;
                                  }

                                  setEditingPrice({
                                    shipmentId: shipment.id,
                                    field: "packing_price",
                                  });
                                  setEditingPriceValue(
                                    shipment.packing_price
                                      ? String(shipment.packing_price)
                                      : "",
                                  );
                                }}
                              >
                                {editingPrice?.shipmentId === shipment.id &&
                                editingPrice.field === "packing_price" ? (
                                  <input
                                    autoFocus
                                    type="text"
                                    inputMode="numeric"
                                    minLength={0}
                                    value={formatEditingPrice(editingPriceValue)}
                                    onChange={(event) =>
                                      setEditingPriceValue(
                                        getEditingPriceDigits(event.target.value),
                                      )
                                    }
                                    onBlur={() =>
                                      void handlePriceSave(
                                        shipment,
                                        "packing_price",
                                      )
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        event.preventDefault();
                                        event.currentTarget.blur();
                                      }

                                      if (event.key === "Escape") {
                                        event.preventDefault();
                                        setEditingPrice(null);
                                        setEditingPriceValue("");
                                      }
                                    }}
                                    className="h-9 w-28 rounded-lg border border-[#1457ff] px-3 text-center text-sm text-[#20366f] outline-none"
                                  />
                                ) : (
                                  <p className="text-sm text-[#20366f]">
                                    {formatCurrency(
                                      shipment.packing_price,
                                    )}
                                  </p>
                                )}
                              </td>

                              <td className="px-6 py-6 text-center align-top">
                                <div className="flex flex-col items-center">
                                  <p className="text-sm font-semibold text-[#20366f]">
                                    {formatCurrency(
                                      getDisplayedTotal(
                                        shipment,
                                        shipmentPaymentSummaryMap.get(
                                          shipment.id,
                                        ) ?? null,
                                      ),
                                    )}
                                  </p>

                                  <div className="mt-2">
                                    {(() => {
                                      const summary =
                                        shipmentPaymentSummaryMap.get(
                                          shipment.id,
                                        ) ?? null;

                                      const isPaid =
                                        summary?.status ===
                                        "paid";

                                      if (isPaid) {
                                        return (
                                          <div className="flex flex-col items-center">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                                              <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                              Paid
                                            </div>

                                            <p className="mt-2 text-xs text-[#7a89ad]">
                                              {getPaymentDate(
                                                summary?.paid_at,
                                              )}
                                            </p>
                                          </div>
                                        );
                                      }

                                      return (
                                        <div className="flex flex-col items-center">
                                          {!isCustomer && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                openShipmentPayment(
                                                  shipment,
                                                )
                                              }
                                              disabled={
                                                isHnr ||
                                                processingShipmentPaymentId ===
                                                  shipment.id
                                              }
                                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-100"
                                            >
                                              {processingShipmentPaymentId ===
                                              shipment.id ? (
                                                <>
                                                  <Loader2
                                                    size={14}
                                                    className="animate-spin"
                                                  />
                                                  Memproses...
                                                </>
                                              ) : (
                                                "Pembayaran"
                                              )}
                                            </button>
                                          )}

                                          {Number(
                                            summary?.penalty_days ??
                                              0,
                                          ) > 0 && (
                                            <div className="mt-2 text-center">
                                              <p className="text-xs font-semibold text-red-600">
                                                Terlambat{" "}
                                                {
                                                  summary?.penalty_days
                                                }{" "}
                                                hari
                                              </p>

                                              <p className="mt-1 text-xs text-[#7a89ad]">
                                                Denda +{" "}
                                                {formatCurrency(
                                                  summary?.penalty_amount,
                                                )}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </td>

                              <td className="px-6 py-6 text-center align-top">
                                <div className="relative inline-block w-[170px]">
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      if (
                                        isHnr ||
                                        isCustomer ||
                                        getShippingStatusValue(
                                          shippingStatusOverrides[
                                            shipment.id
                                          ] ??
                                            shipment.shipping_status,
                                        ) ===
                                          "dalam_proses_pick_up"
                                      ) {
                                        return;
                                      }

                                      if (
                                        openShipmentStatusId ===
                                        shipment.id
                                      ) {
                                        setOpenShipmentStatusId(null);
                                        setShipmentStatusDropdownPosition(null);
                                        return;
                                      }

                                      const rect =
                                        event.currentTarget.getBoundingClientRect();
                                      const menuWidth = 170;
                                      const menuHeight = 104;
                                      const gap = 8;
                                      const horizontalPadding = 8;
                                      const centeredLeft =
                                        rect.left +
                                        rect.width / 2 -
                                        menuWidth / 2;
                                      const left = Math.min(
                                        Math.max(
                                          centeredLeft,
                                          horizontalPadding,
                                        ),
                                        window.innerWidth -
                                          menuWidth -
                                          horizontalPadding,
                                      );
                                      const hasSpaceBelow =
                                        rect.bottom +
                                          gap +
                                          menuHeight <=
                                        window.innerHeight -
                                          horizontalPadding;

                                      setOpenShipmentStatusId(
                                        shipment.id,
                                      );
                                      setShipmentStatusDropdownPosition({
                                        top: hasSpaceBelow
                                          ? rect.bottom + gap
                                          : rect.top -
                                            gap -
                                            menuHeight,
                                        left,
                                      });
                                    }}
                                    disabled={
                                      isHnr ||
                                      isCustomer ||
                                      getShippingStatusValue(
                                        shippingStatusOverrides[
                                          shipment.id
                                        ] ??
                                          shipment.shipping_status,
                                      ) ===
                                        "dalam_proses_pick_up"
                                    }
                                    className={[
                                      "inline-flex h-10 w-[170px] items-center justify-between gap-2 rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10",
                                      getShippingStatusValue(
                                        shippingStatusOverrides[
                                          shipment.id
                                        ] ??
                                          shipment.shipping_status,
                                      ) ===
                                        "dalam_proses_pick_up"
                                        ? "cursor-not-allowed bg-[#f5f6fa] text-[#9aa4bb]"
                                        : "cursor-pointer",
                                    ].join(" ")}
                                  >
                                    <span className="truncate">
                                      {getShippingStatusValue(
                                        shippingStatusOverrides[
                                          shipment.id
                                        ] ??
                                          shipment.shipping_status,
                                      ) ===
                                        "dalam_proses_pick_up"
                                        ? "Sudah di pick up"
                                        : "Sudah di packing"}
                                    </span>

                                    <ChevronDown
                                      className={[
                                        "shrink-0 text-[#536795] transition-transform",
                                        openShipmentStatusId === shipment.id
                                          ? "rotate-180"
                                          : "",
                                      ].join(" ")}
                                      size={16}
                                    />
                                  </button>

                                  {openShipmentStatusId ===
                                    shipment.id &&
                                    shipmentStatusDropdownPosition &&
                                    createPortal(
                                      <div
                                        className="fixed z-[9999] w-[170px] overflow-hidden rounded-xl border border-[#d9e0ef] bg-white p-2 text-left shadow-xl"
                                        style={{
                                          top:
                                            shipmentStatusDropdownPosition.top,
                                          left:
                                            shipmentStatusDropdownPosition.left,
                                        }}
                                        onClick={(event) =>
                                          event.stopPropagation()
                                        }
                                      >
                                        {(
                                          [
                                            "sedang_dikemas",
                                            "dalam_proses_pick_up",
                                          ] as ManualShipment["shipping_status"][]
                                        ).map((status) => {
                                          const selected =
                                            getShippingStatusValue(
                                              shippingStatusOverrides[
                                                shipment.id
                                              ] ??
                                                shipment.shipping_status,
                                            ) === status;

                                          return (
                                            <button
                                              key={status}
                                              type="button"
                                              onClick={() => {
                                                setOpenShipmentStatusId(null);
                                                setShipmentStatusDropdownPosition(
                                                  null,
                                                );

                                                void handleShippingStatusChange(
                                                  shipment,
                                                  status,
                                                );
                                              }}
                                              className="flex w-full items-center justify-between rounded-lg px-3 py-3 text-left text-sm text-[#20366f] transition hover:bg-[#f7f9ff]"
                                            >
                                              <span>
                                                {status === "sedang_dikemas"
                                                  ? "Sudah di packing"
                                                  : "Sudah di pick up"}
                                              </span>

                                              {selected && (
                                                <Check
                                                  size={16}
                                                  className="shrink-0 text-[#1457ff]"
                                                />
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>,
                                      document.body,
                                    )}

                                  {getShippingStatusValue(
                                    shippingStatusOverrides[
                                      shipment.id
                                    ] ??
                                      shipment.shipping_status,
                                  ) ===
                                    "dalam_proses_pick_up" && (
                                    <p className="mt-1 text-xs text-[#7a89ad]">
                                      {formatPickupDate(
                                        shipment.updated_at,
                                      )}
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-6 text-center align-top">
                                {getShippingStatusValue(
                                  shippingStatusOverrides[
                                    shipment.id
                                  ] ??
                                    shipment.shipping_status,
                                ) ===
                                  "dalam_proses_pick_up" ? (
                                  <span className="text-sm text-[#7a89ad]">
                                    -
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    {selectedBatch.status !== "Selesai" && (
                                      <button
                                        type="button"
                                        disabled={isHnr}
                                        onClick={() =>
                                          openEditShipment(
                                            shipment,
                                          )
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                                        aria-label="Edit pengiriman"
                                        title="Edit pengiriman"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </button>
                                    )}

                                    {selectedBatch.status !== "Selesai" && (
                                      <button
                                        type="button"
                                        disabled={isHnr}
                                        onClick={() =>
                                          openDeleteShipment(
                                            shipment,
                                          )
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                                        aria-label="Hapus pengiriman"
                                        title="Hapus pengiriman"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    )}
                                  </div>
                                )}
                                </td>
                              </tr>
                            );
                          },
                        )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : (
            <div className="mt-4 rounded-xl border border-[#edf0f6] bg-white px-6 py-20 text-center shadow-sm">
              <p className="text-base font-medium text-[#20366f]">
                Batch tidak ditemukan.
              </p>
            </div>
          ))}

      </div>

      {/* =================================
          BATCH MODAL
          Dipisahkan ke component
          ManualShippingBatchModal
      ================================== */}

      <ManualShippingBatchModal
        open={
          isBatchModalOpen
        }
        onClose={
          closeBatchModal
        }
        onSaved={
          handleBatchSaved
        }
      />

      <EditBatchPengirimanDialog
        open={
          isEditBatchModalOpen
        }
        batch={
          editingBatch
        }
        onClose={
          closeBatchModal
        }
        onSaved={
          handleBatchSaved
        }
      />

      <DeleteBatchPengirimanDialog
        batch={
          deletingBatch
        }
        isDeleting={
          deleteBatchMutation.isPending
        }
        onCancel={() =>
          setDeletingBatch(
            null,
          )
        }
        onConfirm={
          handleDeleteBatch
        }
      />


      <HapusPengirimanDialog
        shipment={deletingShipment}
        isDeleting={deleteShipmentMutation.isPending}
        onCancel={closeDeleteShipment}
        onConfirm={handleDeleteShipment}
      />

      <PaymentDialog
        open={
          isShipmentPaymentDialogOpen
        }
        payment={
          selectedPaymentShipment
            ? queryClient.getQueryData(
                [
                  "manual-shipment-payment",
                  selectedPaymentShipment.id,
                ],
              ) ?? null
            : null
        }
        buyer={
          selectedPaymentShipment
            ? {
                name:
                  selectedPaymentShipment.member?.name ??
                  null,
                phone:
                  selectedPaymentShipment.member?.phone ??
                  null,
              }
            : null
        }
        isManualShipment
        manualShipmentId={
          selectedPaymentShipment?.id
        }
        onClose={
          closeShipmentPayment
        }
        onPaymentSuccess={
          handleShipmentPaymentSuccess
        }
      />

      <EditPengirimanDialog
        open={Boolean(editingShipment)}
        shipment={editingShipment}
        onClose={closeEditShipment}
        isCustomer={isCustomer}
        onSaved={(updatedShipment) => {
          queryClient.setQueryData<ManualShipment[]>(
            ["manual-shipments", updatedShipment.batch_id],
            (current = []) =>
              current.map((item) =>
                item.id === updatedShipment.id
                  ? updatedShipment
                  : item,
              ),
          );

          setEditingShipment(null);
        }}
      />

      <TambahPengirimanDialog
        open={
          isAddShipmentModalOpen
        }
        batchId={
          selectedBatch?.id ??
          null
        }
        onClose={
          closeAddShipment
        }
        onSaved={
          handleShipmentSaved
        }
        isCustomer={
          isCustomer
        }
      />

      {editingDueDateShipment && (
        <div
          className="fixed inset-0 z-[2147483647] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
          onMouseDown={() =>
            closeDueDatePicker()
          }
          role="dialog"
          aria-modal="true"
          aria-labelledby="manual-shipment-due-date-picker-title"
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3
                  id="manual-shipment-due-date-picker-title"
                  className="text-base font-semibold text-slate-800"
                >
                  Pilih Tanggal Jatuh Tempo
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Pilih tanggal jatuh tempo pembayaran.
                </p>
              </div>

              <button
                type="button"
                onClick={closeDueDatePicker}
                disabled={
                  Boolean(
                    updatingDueDateShipmentId,
                  )
                }
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Tutup kalender"
              >
                <X size={19} />
              </button>
            </div>

            <div className="px-5 py-5">
              <div className="mb-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() =>
                    changeCalendarMonth(-1)
                  }
                  disabled={
                    Boolean(
                      updatingDueDateShipmentId,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Bulan sebelumnya"
                >
                  <ChevronLeft size={19} />
                </button>

                <p className="text-base font-semibold capitalize text-slate-800">
                  {MONTH_NAMES[
                    calendarMonth.getMonth()
                  ]}{" "}
                  {calendarMonth.getFullYear()}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    changeCalendarMonth(1)
                  }
                  disabled={
                    Boolean(
                      updatingDueDateShipmentId,
                    )
                  }
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Bulan berikutnya"
                >
                  <ChevronRight size={19} />
                </button>
              </div>

              <div className="mb-2 grid grid-cols-7 gap-1">
                {DAY_NAMES.map(
                  (day) => (
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
                {Array.from({
                  length: getFirstDayOfMonth(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth(),
                  ),
                }).map(
                  (_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="h-11"
                    />
                  ),
                )}

                {Array.from({
                  length: getDaysInMonth(
                    calendarMonth.getFullYear(),
                    calendarMonth.getMonth(),
                  ),
                }).map(
                  (_, index) => {
                    const day =
                      index + 1;

                    const date =
                      new Date(
                        calendarMonth.getFullYear(),
                        calendarMonth.getMonth(),
                        day,
                      );

                    const dateString =
                      toDateString(
                        date,
                      );

                    const isBeforeMinimum =
                      dateString <
                      getTodayDate();

                    const isSelected =
                      temporaryDueDate ===
                      dateString;

                    return (
                      <button
                        key={dateString}
                        type="button"
                        disabled={
                          isBeforeMinimum ||
                          Boolean(
                            updatingDueDateShipmentId,
                          )
                        }
                        onClick={() =>
                          handleSelectDueDate(
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
                        ].join(" ")}
                      >
                        {day}
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t border-slate-200 px-5 py-4">
              <button
                type="button"
                onClick={closeDueDatePicker}
                disabled={
                  Boolean(
                    updatingDueDateShipmentId,
                  )
                }
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={() =>
                  void handleDueDateSave()
                }
                disabled={
                  !temporaryDueDate ||
                  Boolean(
                    updatingDueDateShipmentId,
                  )
                }
                className="flex-1 rounded-xl bg-[#1457ff] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {updatingDueDateShipmentId
                  ? "Menyimpan..."
                  : "Pilih"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}