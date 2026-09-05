import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
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
import ManualShipmentPaymentDialog from "@/components/common/ManualShipmentPaymentDialog";
import EditPengirimanDialog from "@/components/common/EditPengirimanDialog";

import {
  deleteManualShippingBatch,
  getManualShippingBatches,
  type ManualShippingBatch,
} from "@/services/manualShippingBatchService";

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
//     case "Dalam proses pick up":
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
    value === "Dalam proses pick up" ||
    value === "dalam_proses_pick_up"
  ) {
    return "Dalam proses pick up";
  }

  return "Sedang dikemas";
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

function getPaymentDate(
  shipment: ManualShipment,
): string {
  if (!shipment.paid_at) {
    return "-";
  }

  const date =
    new Date(shipment.paid_at);

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

export default function PengirimanManualPage() {
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
     SHIPPING STATUS OVERRIDE
  ======================================== */

  const [
    shippingStatusOverrides,
    setShippingStatusOverrides,
  ] = useState<
    Record<string, string>
  >({});

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
    staleTime: 30_000,
  });

  /* =======================================
     DELETE MUTATION
  ======================================== */

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

  function openShipmentPayment(
    shipment: ManualShipment,
  ) {
    setSelectedPaymentShipment(
      shipment,
    );
    setIsShipmentPaymentDialogOpen(
      true,
    );
  }

  function closeShipmentPayment() {
    setIsShipmentPaymentDialogOpen(
      false,
    );
    setSelectedPaymentShipment(null);
  }

  function handleShipmentPaymentSuccess(
    updatedShipment: ManualShipment,
  ) {
    setSelectedPaymentShipment(
      updatedShipment,
    );

    queryClient.setQueryData<ManualShipment[]>(
      [
        "manual-shipments",
        updatedShipment.batch_id,
      ],
      (current = []) =>
        current.map((shipment) =>
          shipment.id === updatedShipment.id
            ? updatedShipment
            : shipment,
        ),
    );

    queryClient.invalidateQueries({
      queryKey: [
        "manual-shipments",
        updatedShipment.batch_id,
      ],
    });
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
      <div className="w-full px-6 py-8 lg:px-8">
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
            SEMUA BATCH
        ================================== */}

        {activeTab ===
          "all" && (
          <section className="mt-4 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse">
                <thead>
                  <tr className="border-b border-[#e8ecf4]">
                    <th className="min-w-[320px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
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
                          <td className="px-6 py-6 align-middle">
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
                            <span className="inline-flex rounded-md bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600">
                              {
                                batch.status
                              }
                            </span>
                          </td>

                          <td className="px-6 py-6 text-center align-middle">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();

                                  openEditBatch(
                                    batch,
                                  );
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
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
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                                aria-label="Hapus batch"
                                title="Hapus batch"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
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
                  BATCH INFORMATION
              ============================== */}

              <section className="mt-4 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">
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
                        className="inline-flex h-11 items-center justify-center rounded-lg border border-[#d9e0ef] bg-white px-5 text-lg font-medium text-[#20366f] transition hover:bg-[#f8faff]"
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Batch
                      </button>

                      <button
                        type="button"
                        onClick={
                          openAddShipment
                        }
                        className="inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white transition hover:bg-[#0d4be0]"
                      >
                        <Plus className="h-4 w-4" />
                        Tambah Rekapan
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* =============================
                  SHIPMENT TABLE
              ============================== */}

              <section className="mt-4 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1650px] border-collapse">
                    <thead>
                      <tr className="border-b border-[#e8ecf4]">
                        <th className="min-w-[210px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                          Nama Pembeli
                        </th>

                        <th className="min-w-[260px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                          Detail Barang
                        </th>

                        <th className="min-w-[180px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                          Ekspedisi
                        </th>

                        <th className="min-w-[300px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                          Alamat Lengkap
                        </th>

                        <th className="min-w-[170px] px-6 py-5 text-right text-sm font-semibold text-[#17285d]">
                          Ongkos Kirim
                        </th>

                        <th className="min-w-[150px] px-6 py-5 text-right text-sm font-semibold text-[#17285d]">
                          Packing
                        </th>

                        <th className="min-w-[190px] px-6 py-5 text-right text-sm font-semibold text-[#17285d]">
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
                            colSpan={9}
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
                              colSpan={9}
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
                              colSpan={9}
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
                          (shipment) => (
                            <tr
                              key={shipment.id}
                              className="border-b border-[#eef1f6] last:border-b-0"
                            >
                              <td className="px-6 py-6 align-top">
                                <p className="text-sm font-semibold text-[#20366f]">
                                  {shipment.member?.name ?? "-"}
                                </p>

                                <p className="mt-1 text-xs text-[#7a89ad]">
                                  {shipment.member?.phone ?? "-"}
                                </p>
                              </td>

                              <td className="px-6 py-6 align-top">
                                <div className="space-y-1.5">
                                  {shipment.items?.length ? (
                                    shipment.items.map(
                                      (item) => (
                                        <div
                                          key={item.id}
                                          className="text-sm text-[#20366f]"
                                        >
                                          <span>
                                            {item.recap?.detail_barang ?? "-"}
                                          </span>

                                          <span className="ml-2 text-xs text-[#7a89ad]">
                                            x{item.recap?.qty ?? 0}
                                            {" "}
                                          </span>

                                          <span className="ml-4 text-xs text-[#7a89ad]">
                                            {item.recap?.batch?.name ??
                                              "Batch tidak diketahui"}
                                            {" - "}
                                            {item.recap?.batch?.country ??
                                              "Country tidak diketahui"}
                                          </span>
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

                              <td className="px-6 py-6 align-top">
                                <p className="text-sm font-medium text-[#20366f]">
                                  {shipment.expedition}
                                </p>
                              </td>

                              <td className="px-6 py-6 align-top">
                                <p className="max-w-[300px] whitespace-pre-wrap text-sm leading-6 text-[#20366f]">
                                  {shipment.address || "-"}
                                </p>
                              </td>

                              <td className="px-6 py-6 text-right align-top">
                                <p className="text-sm text-[#20366f]">
                                  {formatCurrency(
                                    shipment.shipping_price,
                                  )}
                                </p>
                              </td>

                              <td className="px-6 py-6 text-right align-top">
                                <p className="text-sm text-[#20366f]">
                                  {formatCurrency(
                                    shipment.packing_price,
                                  )}
                                </p>
                              </td>

                              <td className="px-6 py-6 text-right align-top">
                                <div className="flex flex-col items-end">
                                  <p className="text-sm font-semibold text-[#20366f]">
                                    {formatCurrency(
                                      shipment.total_price,
                                    )}
                                  </p>

                                  <div className="mt-2">
                                    {shipment.payment_status ===
                                    "paid" ? (
                                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600">
                                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                        Paid
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openShipmentPayment(
                                            shipment,
                                          )
                                        }
                                        className="inline-flex rounded-lg bg-[#1457ff] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#0d4be0]"
                                      >
                                        Pembayaran
                                      </button>
                                    )}
                                  </div>

                                  {shipment.payment_status ===
                                    "paid" && (
                                    <p className="mt-2 text-xs text-[#7a89ad]">
                                      {getPaymentDate(
                                        shipment,
                                      )}
                                    </p>
                                  )}
                                </div>
                              </td>

                              <td className="px-6 py-6 text-center align-top">
                                <div className="relative inline-block w-[170px]">
                                  <select
                                    value={
                                      shippingStatusOverrides[
                                        shipment.id
                                      ] ??
                                      getShippingStatusValue(
                                        shipment.shipping_status,
                                      )
                                    }
                                    onChange={(event) =>
                                      handleShippingStatusChange(
                                        shipment,
                                        event.target.value as ManualShipment["shipping_status"],
                                      )
                                    }
                                    disabled={
                                      getShippingStatusValue(
                                        shippingStatusOverrides[
                                          shipment.id
                                        ] ??
                                          shipment.shipping_status,
                                      ) ===
                                        "Dalam proses pick up"
                                    }
                                    style={{
                                      appearance: "none",
                                      WebkitAppearance: "none",
                                      MozAppearance: "none",
                                      paddingRight: "44px",
                                    }}
                                    className={[
                                      "h-10 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10",
                                      getShippingStatusValue(
                                        shippingStatusOverrides[
                                          shipment.id
                                        ] ??
                                          shipment.shipping_status,
                                      ) ===
                                        "Dalam proses pick up"
                                        ? "cursor-not-allowed bg-[#f5f6fa] text-[#9aa4bb]"
                                        : "",
                                    ].join(" ")}
                                  >
                                    <option value="Sedang dikemas">
                                      Sudah di packing
                                    </option>
                                    <option value="Dalam proses pick up">
                                      Sudah di pick up
                                    </option>
                                  </select>

                                  <ChevronDown
                                    className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-[#536795]"
                                    style={{
                                      right: "20px",
                                    }}
                                  />
                                </div>
                              </td>

                              <td className="px-6 py-6 text-center align-top">
                                {getShippingStatusValue(
                                  shippingStatusOverrides[
                                    shipment.id
                                  ] ??
                                    shipment.shipping_status,
                                ) ===
                                  "Dalam proses pick up" ? (
                                  <span className="text-sm text-[#7a89ad]">
                                    -
                                  </span>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <button
                                      type="button"
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

                                    <button
                                      type="button"
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
                                  </div>
                                )}
                              </td>
                            </tr>
                          ),
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

      <ManualShipmentPaymentDialog
        open={
          isShipmentPaymentDialogOpen
        }
        shipment={
          selectedPaymentShipment
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
      />
    </div>
  );
}