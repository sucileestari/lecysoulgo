import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import AddBatchDialog from "../components/common/AddBatchDialog";
import EditBatchDialog from "../components/common/EditBatchDialog";
import DeleteBatchDialog from "../components/common/DeleteBatchDialog";

import AddRecapDialog from "../components/common/AddRecapDialog";
import DeleteRecapDialog from "../components/common/DeleteRecapDialog";

import PaymentDialog from "../components/common/PaymentDialog";

import {
  getBatches,
  type Batch,
  type Country,
} from "@/services/batchService";

import {
  getRecaps,
  markRecapAsCheckedOut,
  type Recap,
} from "@/services/recapService";

import {
  createPayment,
  getPaymentSummary,
  type Payment,
  type PaymentSummary,
  type PaymentType,
} from "@/services/paymentService";

/* =========================================
   TYPES
========================================= */

type CountryConfig = {
  name: string;
  flag: string;
};

type RekapPageProps = {
  country: Country;
};

type ActiveTab =
  | "all"
  | string;

type RecapPaymentStatus = {
  summary: PaymentSummary | null;
};

/* =========================================
   COUNTRY CONFIG
========================================= */

const countryConfig: Record<
  Country,
  CountryConfig
> = {
  china: {
    name: "China",
    flag: "🇨🇳",
  },

  indonesia: {
    name: "Indonesia",
    flag: "🇮🇩",
  },

  jepang: {
    name: "Jepang",
    flag: "🇯🇵",
  },

  korea: {
    name: "Korea",
    flag: "🇰🇷",
  },

  thailand: {
    name: "Thailand",
    flag: "🇹🇭",
  },
};

/* =========================================
   HELPERS
========================================= */

function formatDate(
  dateString: string | null,
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

  return date.toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  );
}

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
   FORMAT PAYMENT DATE
========================================= */

function formatPaymentDate(
  date: string | null,
): string {
  if (!date) {
    return "-";
  }

  const paymentDate =
    new Date(date);

  if (
    Number.isNaN(
      paymentDate.getTime(),
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
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(paymentDate);
}

/* =========================================
   PAGE
========================================= */

export default function RekapPage({
  country,
}: RekapPageProps) {
  const config =
    countryConfig[country];

  const queryClient =
    useQueryClient();

  /* =======================================
     TAB STATE
  ======================================= */

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<ActiveTab>(
      "all",
    );

  const [
    search,
    setSearch,
  ] =
    useState("");

  const [
    currentPage,
    setCurrentPage,
  ] =
    useState(1);

  /* =======================================
     ADD BATCH
  ======================================= */

  const [
    isAddBatchDialogOpen,
    setIsAddBatchDialogOpen,
  ] =
    useState(false);

  /* =======================================
     EDIT BATCH
  ======================================= */

  const [
    isEditBatchDialogOpen,
    setIsEditBatchDialogOpen,
  ] =
    useState(false);

  const [
    selectedEditBatch,
    setSelectedEditBatch,
  ] =
  useState<Batch | null>(
    null,
  );

  /* =======================================
     DELETE BATCH
  ======================================= */

  const [
    isDeleteBatchDialogOpen,
    setIsDeleteBatchDialogOpen,
  ] =
    useState(false);

  const [
    selectedDeleteBatch,
    setSelectedDeleteBatch,
  ] =
    useState<Batch | null>(
      null,
    );

  /* =======================================
     ADD RECAP
  ======================================= */

  const [
    isAddRecapDialogOpen,
    setIsAddRecapDialogOpen,
  ] =
    useState(false);

  /* =======================================
     DELETE RECAP
  ======================================= */

  const [
    isDeleteRecapDialogOpen,
    setIsDeleteRecapDialogOpen,
  ] =
    useState(false);

  const [
    selectedDeleteRecap,
    setSelectedDeleteRecap,
  ] =
    useState<Recap | null>(
      null,
    );

  /* =======================================
     PAYMENT DIALOG
  ======================================= */

  /* =======================================
   PAYMENT DIALOG
======================================= */

const [
  isPaymentDialogOpen,
  setIsPaymentDialogOpen,
] =
  useState(false);

const [
  selectedPayment,
  setSelectedPayment,
] =
  useState<Payment | null>(
    null,
  );

const [
  selectedPaymentBuyer,
  setSelectedPaymentBuyer,
] =
  useState<{
    name: string | null;
    phone: string | null;
  } | null>(
    null,
  );

const [
  isCreatingPayment,
  setIsCreatingPayment,
] =
  useState<string | null>(
    null,
  );

const [
  paymentError,
  setPaymentError,
] =
  useState("");

/* =======================================
   CHECKOUT (CO)
======================================= */

const [
  isMarkingCo,
  setIsMarkingCo,
] =
  useState<string | null>(
    null,
  );

const [
  coError,
  setCoError,
] =
  useState("");

  /* =======================================
     IMAGE PREVIEW
  ======================================= */

  const [
    previewImage,
    setPreviewImage,
  ] =
    useState<{
      url: string;
      name: string;
    } | null>(null);

  /* =======================================
     GET BATCHES
  ======================================= */

  const {
    data: batches = [],
    isLoading,
    isError,
    error,
    refetch,
  } =
    useQuery<
      Batch[],
      Error
    >({
      queryKey: [
        "batches",
        country,
      ],

      queryFn: () =>
        getBatches(country),

      staleTime: 0,
    });

  /* =======================================
     RESET SAAT PINDAH NEGARA
  ======================================= */

  useEffect(() => {
    setActiveTab("all");

    setSearch("");

    setCurrentPage(1);

    setPreviewImage(null);

    setIsEditBatchDialogOpen(
      false,
    );

    setIsDeleteBatchDialogOpen(
      false,
    );

    setSelectedDeleteBatch(
      null,
    );

    setIsAddRecapDialogOpen(
      false,
    );

    setIsDeleteRecapDialogOpen(
      false,
    );

    setSelectedDeleteRecap(
      null,
    );

    setIsPaymentDialogOpen(
      false,
    );

    setSelectedPayment(
      null,
    );

    setPaymentError("");

    setCoError("");

    setIsMarkingCo(null);
  }, [country]);

  /* =======================================
     ACTIVE BATCH
  ======================================= */

  const activeBatch =
    activeTab !== "all"
      ? batches.find(
          (batch) =>
            batch.id ===
            activeTab,
        )
      : undefined;

  /* =======================================
     FILTER BATCH
  ======================================= */

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
          batch.name
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          batch.type
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
     GET RECAP
  ======================================= */

  const {
    data: recaps = [],
    isLoading:
      isLoadingRecaps,
    isError:
      isRecapError,
    error:
      recapError,
  } =
    useQuery<
      Recap[],
      Error
    >({
      queryKey: [
        "recaps",
        activeBatch?.id,
      ],

      queryFn: () =>
        getRecaps(
          activeBatch!.id,
        ),

      enabled:
        Boolean(
          activeBatch?.id,
        ),

      staleTime: 0,
    });

  /* =======================================
     RECAP IDS
  ======================================= */

  const recapIds = useMemo(() => {
    return recaps.map((recap) => recap.id);
  }, [recaps]);

  /* =======================================
     GET PAYMENT SUMMARY
  ======================================= */

  const {
    data: paymentSummaries = [],
    isLoading: isLoadingPayments,
    isError: isPaymentSummaryError,
    error: paymentSummaryError,
  } =
    useQuery<PaymentSummary[], Error>({
      queryKey: [
        "recap-payment-summaries",
        activeBatch?.id,
        recapIds,
      ],

      queryFn: async () => {
        if (recapIds.length === 0) {
          return [];
        }

        return Promise.all(
          recapIds.map((recapId) =>
            getPaymentSummary(recapId),
          ),
        );
      },

      enabled:
        Boolean(
          activeBatch?.id,
        ) &&
        recapIds.length > 0,

      staleTime: 0,

      refetchInterval:
        60 * 60 * 1000,

      refetchOnWindowFocus: true,
    });

  /* =======================================
     PAYMENT SUMMARY MAP
  ======================================= */

  const paymentStatusMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          RecapPaymentStatus
        >();

      for (
        const recap of recaps
      ) {
        map.set(
          recap.id,
          {
            summary:
              paymentSummaries.find(
                (summary) =>
                  summary.recap_id ===
                  recap.id,
              ) ?? null,
          },
        );
      }

      return map;
    }, [
      recaps,
      paymentSummaries,
    ]);

  /* =======================================
     FILTER REKAP
  ======================================= */

  const filteredRecaps =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return recaps;
      }

      return recaps.filter(
        (item) =>
          (
            item.member
              ?.name ?? ""
          )
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          (
            item.member
              ?.phone ?? ""
          )
            .toLowerCase()
            .includes(
              keyword,
            ) ||
          item.detail_barang
            .toLowerCase()
            .includes(
              keyword,
            ),
      );
    }, [
      recaps,
      search,
    ]);

  /* =======================================
     TOTAL REKAP
  ======================================= */

  const totalRekap =
    useMemo(() => {
      return filteredRecaps.reduce(
        (
          total,
          item,
        ) =>
          total +
          Number(
            item.total_harga ??
              0,
          ),
        0,
      );
    }, [
      filteredRecaps,
    ]);

  /* =======================================
     CHANGE TAB
  ======================================= */

  const handleTabChange = (
    tab: ActiveTab,
  ) => {
    setActiveTab(tab);

    setSearch("");

    setCurrentPage(1);

    setPreviewImage(null);

    setPaymentError("");

    setCoError("");

    setIsPaymentDialogOpen(
      false,
    );

    setSelectedPayment(
      null,
    );
  };

  /* =======================================
     ADD BATCH SUCCESS
  ======================================= */

  const handleBatchCreated =
    async () => {
      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batches",
            country,
          ],
        },
      );

      await refetch();

      setActiveTab("all");

      setSearch("");

      setCurrentPage(1);
    };

  /* =======================================
     EDIT BATCH
  ======================================= */

  const handleEditBatch = () => {
  if (!activeBatch) {
    return;
  }

  setSelectedEditBatch(
    activeBatch,
  );

  setIsEditBatchDialogOpen(
    true,
  );
};

const handleEditBatchFromList = (
  batch: Batch,
) => {
  setSelectedEditBatch(
    batch,
  );

  setIsEditBatchDialogOpen(
    true,
  );
};

  /* =======================================
     EDIT SUCCESS
  ======================================= */

  const handleEditBatchSuccess =
    async () => {
      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batches",
            country,
          ],
        },
      );

      await refetch();

      setIsEditBatchDialogOpen(
        false,
      );
    };

  /* =======================================
     DELETE BATCH
  ======================================= */

  const handleDeleteBatchFromList = (
    batch: Batch,
  ) => {
    setSelectedDeleteBatch(
      batch,
    );

    setIsDeleteBatchDialogOpen(
      true,
    );
  };

  /* =======================================
     DELETE BATCH SUCCESS
  ======================================= */

  const handleDeleteBatchSuccess =
    async () => {
      setIsDeleteBatchDialogOpen(
        false,
      );

      setSelectedDeleteBatch(
        null,
      );

      setActiveTab("all");

      setSearch("");

      setCurrentPage(1);

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batches",
            country,
          ],
        },
      );

      await refetch();
    };

  /* =======================================
     IMAGE PREVIEW
  ======================================= */

  const handlePreviewImage = (
    url: string,
    name: string,
  ) => {
    setPreviewImage({
      url,
      name,
    });
  };

  const handleClosePreview =
    () => {
      setPreviewImage(null);
    };

  /* =======================================
     ADD REKAP
  ======================================= */

  const handleAddRecap =
    () => {
      if (!activeBatch) {
        return;
      }

      setIsAddRecapDialogOpen(
        true,
      );
    };

  /* =======================================
     ADD REKAP SUCCESS
  ======================================= */

  const handleRecapCreated =
    async () => {
      if (!activeBatch) {
        return;
      }

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "recaps",
            activeBatch.id,
          ],
        },
      );

      /*
       * Update total order batch.
       */
      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batches",
            country,
          ],
        },
      );

      await refetch();
    };

  /* =======================================
     DELETE REKAP
  ======================================= */

  const handleDeleteRecap = (
    recap: Recap,
  ) => {
    setSelectedDeleteRecap(
      recap,
    );

    setIsDeleteRecapDialogOpen(
      true,
    );
  };

  /* =======================================
     DELETE REKAP SUCCESS
  ======================================= */

  const handleDeleteRecapSuccess =
    async () => {
      if (!activeBatch) {
        return;
      }

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "recaps",
            activeBatch.id,
          ],
        },
      );

      /*
       * Update total order.
       */
      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batches",
            country,
          ],
        },
      );

      await refetch();

      setIsDeleteRecapDialogOpen(
        false,
      );

      setSelectedDeleteRecap(
        null,
      );
    };

  /* =======================================
     CREATE PAYMENT

     Security:
     Frontend TIDAK mengirim amount.

     Backend wajib mengambil nominal
     dari recap di database.
  ======================================= */

  const handleCreatePayment =
  async (
    recap: Recap,
    paymentType: PaymentType,
  ) => {
    try {
      setPaymentError("");

      setIsCreatingPayment(
        `${recap.id}-${paymentType}`,
      );

      const payment =
        await createPayment({
          recap_id:
            recap.id,

          payment_type:
            paymentType,
        });

      setSelectedPayment(
        payment,
      );

      /* ===============================
         SIMPAN DATA PEMBELI
      =============================== */

      setSelectedPaymentBuyer({
        name:
          recap.member?.name ??
          null,

        phone:
          recap.member?.phone ??
          null,
      });

      setIsPaymentDialogOpen(
        true,
      );
    } catch (error) {
      console.error(
        "create payment error:",
        error,
      );

      setPaymentError(
        error instanceof Error
          ? error.message
          : "Gagal membuat pembayaran.",
      );
    } finally {
      setIsCreatingPayment(
        null,
      );
    }
  };

  /* =======================================
     PAYMENT SUCCESS

     Dipanggil setelah simulasi
     pembayaran berhasil.
  ======================================= */

  /* =======================================
   PAYMENT SUCCESS

   Dipanggil setelah simulasi
   pembayaran berhasil.

   Tidak melakukan refetch semua payment
   agar tidak menyebabkan terlalu banyak
   request API.
======================================= */

const handlePaymentSuccess =
    async (
      payment: Payment,
    ) => {
      try {
        setSelectedPayment(
          payment,
        );

        await queryClient.invalidateQueries(
          {
            queryKey: [
              "recap-payment-summaries",
              activeBatch?.id,
              recapIds,
            ],
          },
        );

        await queryClient.refetchQueries(
          {
            queryKey: [
              "recap-payment-summaries",
              activeBatch?.id,
              recapIds,
            ],
            type: "active",
          },
        );

        await queryClient.invalidateQueries(
          {
            queryKey: [
              "recaps",
              activeBatch?.id,
            ],
          },
        );
      } catch (error) {
        console.error(
          "Gagal memperbarui summary pembayaran:",
          error,
        );
      }
    };

  /* =======================================
     MARK RECAP AS CO
  ======================================= */

  const handleMarkRecapAsCo = async (
    recapId: string,
  ) => {
    if (isMarkingCo) {
      return;
    }

    try {
      setCoError("");
      setIsMarkingCo(recapId);

      const updatedRecap =
        await markRecapAsCheckedOut(
          recapId,
        );

      queryClient.setQueryData<
        Recap[]
      >(
        [
          "recaps",
          activeBatch?.id,
        ],
        (current = []) =>
          current.map((recap) =>
            recap.id === updatedRecap.id
              ? {
                  ...recap,
                  ...updatedRecap,
                }
              : recap,
          ),
      );
    } catch (error) {
      console.error(
        "mark recap as CO error:",
        error,
      );

      setCoError(
        error instanceof Error
          ? error.message
          : "Gagal menandai barang sebagai Sudah CO.",
      );
    } finally {
      setIsMarkingCo(null);
    }
  };

  /* =======================================
     CLOSE PAYMENT DIALOG
  ======================================= */

  const handleClosePaymentDialog =
    () => {
      setIsPaymentDialogOpen(
        false,
      );

      setSelectedPayment(
        null,
      );

      setPaymentError("");
    };

  /* =======================================
     RENDER
  ======================================= */

  return (
    <div className="min-h-screen bg-[#f8faff] text-left">

      <div className="w-full px-6 py-8 lg:px-8">

        {/* =================================
            HEADER
        ================================== */}

        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

          <div>

            <div className="flex items-center gap-3">

              <span className="text-2xl leading-none">
                {config.flag}
              </span>

              <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
                Rekapan -{" "}
                {config.name}
              </h1>

            </div>

            <p className="mt-2 text-sm text-[#5d6f9f]">
              Kelola dan lihat
              detail batch
              masing-masing{" "}
              {config.name}.
            </p>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* Search */}

            <div className="relative">

              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a89ad]" />

              <input
                type="text"
                value={search}
                onChange={(
                  event,
                ) => {
                  setSearch(
                    event.target
                      .value,
                  );

                  setCurrentPage(
                    1,
                  );
                }}
                placeholder={
                  activeTab ===
                  "all"
                    ? "Cari batch..."
                    : "Cari pembeli..."
                }
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 sm:w-[250px]"
              />

            </div>

            {/* Tambah Batch */}

            <button
              type="button"
              onClick={() =>
                setIsAddBatchDialogOpen(
                  true,
                )
              }
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0] active:scale-[0.99]"
            >

              <Plus className="h-5 w-5" />

              Tambah Batch

            </button>

          </div>

        </div>

        {/* =================================
            BATCH TABS
        ================================== */}

        <section className="mt-7 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">

          <div className="overflow-x-auto">

            <div className="flex min-w-max">

              {/* Semua Batch */}

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
                ].join(" ")}
              >

                Semua Batch

                {activeTab ===
                  "all" && (
                  <span className="absolute inset-x-0 bottom-0 h-1 bg-[#1457ff]" />
                )}

              </button>

              {/* Batch Tabs */}

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
                      ].join(" ")}
                    >

                      {
                        batch.name
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
            SEMUA BATCH
        ================================== */}

        {activeTab ===
          "all" && (

          <section className="mt-4 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1280px] border-collapse">

                <thead>

                  <tr className="border-b border-[#e8ecf4]">

                    <th className="min-w-[320px] px-6 py-5 text-center align-middle text-sm font-semibold text-[#17285d]">
                      Nama Batch
                    </th>

                    <th className="min-w-[170px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                      Jenis Barang
                    </th>

                    <th className="min-w-[150px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Total Order
                    </th>

                    <th className="min-w-[230px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Tanggal Last Payment DP
                    </th>

                    <th className="min-w-[270px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Tanggal Last Payment Pelunasan
                    </th>

                    <th className="w-[130px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Aksi
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {/* Loading */}

                  {isLoading && (

                    <tr>

                      <td
                        colSpan={6}
                        className="px-6 py-20 text-center"
                      >

                        <p className="text-base text-[#7a89ad]">
                          Memuat data
                          batch...
                        </p>

                      </td>

                    </tr>

                  )}

                  {/* Error */}

                  {isError && (

                    <tr>

                      <td
                        colSpan={6}
                        className="px-6 py-20 text-center"
                      >

                        <p className="text-base font-medium text-red-500">
                          Gagal mengambil
                          data batch.
                        </p>

                        <p className="mt-2 text-sm text-[#7a89ad]">
                          {
                            error.message
                          }
                        </p>

                      </td>

                    </tr>

                  )}

                  {/* Empty */}

                  {!isLoading &&
                    !isError &&
                    filteredBatches.length ===
                      0 && (

                      <tr>

                        <td
                          colSpan={6}
                          className="px-6 py-20 text-center"
                        >

                          <p className="text-base font-medium text-[#20366f]">

                            {search
                              ? "Batch tidak ditemukan"
                              : "Belum ada batch"}

                          </p>

                          <p className="mt-2 text-sm text-[#7a89ad]">

                            {search
                              ? "Coba gunakan kata kunci pencarian lain."
                              : "Tambahkan batch menggunakan tombol Tambah Batch."}

                          </p>

                        </td>

                      </tr>

                    )}

                  {/* Data */}

                  {!isLoading &&
                    !isError &&
                    filteredBatches.map(
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
                          className="cursor-pointer border-b border-[#eef1f6] transition-colors last:border-b-0 hover:bg-[#f8faff]"
                        >

                          {/* Nama */}

                          <td className="px-6 py-5">

                            <div className="flex items-center gap-4">

                              <div className="flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#edf2f9]">

                                {batch.image_url ? (

                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {

                                      event.stopPropagation();

                                      handlePreviewImage(
                                        batch.image_url!,
                                        batch.name,
                                      );
                                    }}
                                    className="group relative h-full w-full cursor-zoom-in"
                                  >

                                    <img
                                      src={
                                        batch.image_url
                                      }
                                      alt={
                                        batch.name
                                      }
                                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                    />

                                  </button>

                                ) : (

                                  <span className="text-xs text-[#7a89ad]">
                                    Batch
                                  </span>

                                )}

                              </div>

                              <p className="text-base font-semibold text-[#20366f]">
                                {
                                  batch.name
                                }
                              </p>

                            </div>

                          </td>

                          {/* Type */}

                          <td className="px-6 py-5">

                            <span className="inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-sm font-medium text-[#1457ff]">
                              {
                                batch.type
                              }
                            </span>

                          </td>

                          {/* Total Order */}

                          <td className="px-6 py-5 text-center text-base text-[#20366f]">
                            {
                              batch.total_order ??
                              0
                            }
                          </td>

                          {/* DP */}

                          <td className="px-6 py-5 text-center">

                            <div className="flex items-center justify-center gap-2 text-base text-[#20366f]">

                              <CalendarDays className="h-5 w-5 text-[#536795]" />

                              <span>

                                {formatDate(
                                  batch.last_payment_dp,
                                )}

                              </span>

                            </div>

                          </td>

                          {/* Pelunasan */}

                          <td className="px-6 py-5 text-center">

                            <div className="flex items-center justify-center gap-2 text-base text-[#20366f]">

                              <CalendarDays className="h-5 w-5 text-[#536795]" />

                              <span>

                                {formatDate(
                                  batch.last_payment_pelunasan,
                                )}

                              </span>

                            </div>

                          </td>

                          {/* Aksi */}

                          <td className="px-6 py-5">

                            <div className="flex items-center justify-center gap-4">

                              {batch.status !== "Sudah sampai di Admin" && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {

                                      event.stopPropagation();

                                      handleEditBatchFromList(
                                        batch,
                                      );
                                    }}
                                    aria-label={`Edit ${batch.name}`}
                                    className="text-[#1457ff] transition hover:text-[#0d4be0]"
                                  >

                                    <Edit3 className="h-5 w-5" />

                                  </button>

                                  <button
                                    type="button"
                                    onClick={(
                                      event,
                                    ) => {

                                      event.stopPropagation();

                                      handleDeleteBatchFromList(
                                        batch,
                                      );
                                    }}
                                    aria-label={`Hapus ${batch.name}`}
                                    className="text-[#ff2348] transition hover:text-[#dc1237]"
                                  >

                                    <Trash2 className="h-5 w-5" />

                                  </button>
                                </>
                              )}

                            </div>

                          </td>

                        </tr>

                      ),
                    )}

                </tbody>

              </table>

            </div>

            {/* Pagination */}

            <div className="flex items-center justify-between border-t border-[#edf0f6] px-6 py-5">

              <p className="text-sm text-[#7a89ad]">

                Menampilkan 1 -{" "}

                {
                  filteredBatches.length
                }{" "}

                dari{" "}

                {
                  filteredBatches.length
                }{" "}

                batch

              </p>

              <div className="flex items-center gap-2">

                <button
                  type="button"
                  disabled
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
                >

                  <ChevronLeft className="h-5 w-5" />

                </button>

                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1457ff] bg-[#edf3ff] text-sm font-medium text-[#1457ff]"
                >
                  {currentPage}
                </button>

                <button
                  type="button"
                  disabled
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
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
          activeBatch && (

            <>

              {/* Batch Information */}

              <section className="mt-4 rounded-xl border border-[#edf0f6] bg-white p-8 shadow-sm">

                <div className="flex flex-col gap-8 xl:flex-row xl:items-center">

                  {/* Image */}

                  <div className="h-32 w-full shrink-0 sm:w-44">

                    {activeBatch.image_url ? (

                      <button
                        type="button"
                        onClick={() =>
                          handlePreviewImage(
                            activeBatch.image_url!,
                            activeBatch.name,
                          )
                        }
                        className="group relative flex h-full w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-xl bg-[#edf2f9]"
                      >

                        <img
                          src={
                            activeBatch.image_url
                          }
                          alt={
                            activeBatch.name
                          }
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />

                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">

                          <span className="rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-[#20366f] opacity-0 shadow-sm transition group-hover:opacity-100">

                            Klik untuk
                            memperbesar

                          </span>

                        </div>

                      </button>

                    ) : (

                      <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#edf2f9] text-base text-[#7a89ad]">
                        Batch
                      </div>

                    )}

                  </div>

                  {/* Name */}

                  <div className="min-w-[220px]">

                    <h2 className="text-xl font-bold text-[#10245c]">
                      {
                        activeBatch.name
                      }
                    </h2>

                    <span className="mt-3 inline-flex rounded-full bg-[#eef4ff] px-4 py-2 text-base font-medium text-[#1457ff]">

                      {
                        activeBatch.type
                      }

                    </span>

                  </div>

                  {/* DP */}

                  <div className="min-w-[240px] text-center">

                    <div className="flex items-center justify-center gap-2.5 text-base font-medium text-[#65749b]">

                      <CalendarDays className="h-6 w-6 text-[#536795]" />

                      Tanggal DP
                      Terakhir

                    </div>

                    <p className="mt-3 text-lg font-bold text-[#1f3a7a]">

                      {formatDate(
                        activeBatch.last_payment_dp,
                      )}

                    </p>

                  </div>

                  {/* Pelunasan */}

                  <div className="min-w-[280px] text-center">

                    <div className="flex items-center justify-center gap-2.5 text-base font-medium text-[#65749b]">

                      <CalendarDays className="h-6 w-6 text-[#536795]" />

                      Tanggal Pelunasan
                      Terakhir

                    </div>

                    <p className="mt-3 text-lg font-bold text-[#1f3a7a]">

                      {formatDate(
                        activeBatch.last_payment_pelunasan,
                      )}

                    </p>

                  </div>

                  {/* Status */}

                  <div className="min-w-[220px] text-center">

                    <p className="text-base font-medium text-[#65749b]">

                      Status Barang
                      Saat Ini

                    </p>

                    <p className="mt-3 text-lg font-bold text-green-600">

                      {
                        activeBatch.status
                      }

                    </p>

                  </div>

                  {/* Actions */}

                  {activeBatch.status !== "Sudah sampai di Admin" && (
                    <div className="flex items-center gap-4 xl:ml-auto">

                      <button
                        type="button"
                        onClick={
                          handleEditBatch
                        }
                        className="flex h-12 items-center gap-2 rounded-lg border border-[#d9e0ef] bg-white px-6 text-base font-medium text-[#1457ff] transition hover:bg-[#f5f8ff]"
                      >

                        <Edit3 className="h-5 w-5" />

                        Edit Batch

                      </button>

                      <button
                        type="button"
                        onClick={
                          handleAddRecap
                        }
                        className="flex h-12 items-center gap-2 rounded-lg bg-[#1457ff] px-6 text-base font-medium text-white transition hover:bg-[#0d4be0]"
                      >

                        <Plus className="h-5 w-5" />

                        Tambah Rekapan

                      </button>

                    </div>
                  )}

                </div>

              </section>

              {/* =================================
                  CO ERROR
              ================================== */}

              {coError && (

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">

                  <p className="text-sm font-medium text-red-600">
                    {coError}
                  </p>

                </div>

              )}

              {/* =================================
                  PAYMENT ERROR
              ================================== */}

              {paymentError && (

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">

                  <p className="text-sm font-medium text-red-600">
                    {paymentError}
                  </p>

                </div>

              )}

              {isPaymentSummaryError && (

                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">

                  <p className="text-sm font-medium text-red-600">
                    Gagal mengambil data pembayaran dan denda.
                  </p>

                  <p className="mt-1 text-sm text-red-500">
                    {paymentSummaryError?.message ??
                      "Terjadi kesalahan saat mengambil summary pembayaran."}
                  </p>

                </div>

              )}

              {/* =================================
                  REKAP TABLE
              ================================== */}

              <section className="mt-4 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1400px] border-collapse">

                    <thead>

                      <tr className="border-b border-[#e8ecf4]">

                        <th className="px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                          Nama Pembeli
                        </th>

                        <th className="px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                          Detail Barang
                        </th>

                        <th className="w-[90px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Qty
                        </th>

                        <th className="px-6 py-5 text-right text-sm font-semibold text-[#17285d]">
                          Harga Barang
                        </th>

                        <th className="px-6 py-5 text-right text-sm font-semibold text-[#17285d]">
                          Total Harga
                        </th>

                        <th className="px-6 py-5 text-right text-sm font-semibold text-[#17285d]">
                          Down Payment
                        </th>

                        <th className="px-6 py-5 text-right text-sm font-semibold text-[#17285d]">
                          Pelunasan
                        </th>

                        <th className="w-[140px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Sudah CO?
                        </th>

                        <th className="w-[90px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Aksi
                        </th>

                      </tr>

                    </thead>

                    <tbody>

                      {/* Loading */}

                      {isLoadingRecaps && (

                        <tr>

                          <td
                            colSpan={9}
                            className="px-6 py-20 text-center"
                          >

                            <p className="text-base text-[#7a89ad]">
                              Memuat data
                              rekapan...
                            </p>

                          </td>

                        </tr>

                      )}

                      {/* Error */}

                      {isRecapError &&
                        !isLoadingRecaps && (

                          <tr>

                            <td
                              colSpan={9}
                              className="px-6 py-20 text-center"
                            >

                              <p className="text-base font-medium text-red-500">
                                Gagal mengambil
                                data rekapan.
                              </p>

                              <p className="mt-2 text-sm text-[#7a89ad]">

                                {
                                  recapError?.message
                                }

                              </p>

                            </td>

                          </tr>

                        )}

                      {/* Empty */}

                      {!isLoadingRecaps &&
                        !isRecapError &&
                        filteredRecaps.length ===
                          0 && (

                          <tr>

                            <td
                              colSpan={9}
                              className="px-6 py-20 text-center"
                            >

                              <p className="text-base font-medium text-[#20366f]">

                                {search
                                  ? "Rekapan tidak ditemukan"
                                  : "Belum ada rekapan"}

                              </p>

                              <p className="mt-2 text-sm text-[#7a89ad]">

                                {search
                                  ? "Coba gunakan kata kunci pencarian lain."
                                  : "Tambahkan rekapan menggunakan tombol Tambah Rekapan."}

                              </p>

                            </td>

                          </tr>

                        )}

                      {/* Data */}

                      {!isLoadingRecaps &&
                        !isRecapError &&
                        filteredRecaps.map(
                          (
                            item,
                          ) => {

                            const totalHarga =
                              Number(
                                item.total_harga ??
                                  0,
                              );

                            const paymentStatus =
                              paymentStatusMap.get(
                                item.id,
                              );

                            const paymentSummary =
                              paymentStatus?.summary ??
                              null;

                            const dpSummary =
                              paymentSummary?.dp ??
                              null;

                            const pelunasanSummary =
                              paymentSummary?.pelunasan ??
                              null;

                            const dpPaid =
                              dpSummary?.status ===
                              "paid";

                            const pelunasanPaid =
                              pelunasanSummary?.status ===
                              "paid";

                            const isFullyPaid =
                              dpPaid &&
                              pelunasanPaid;

                            /* =================================
                               PAYMENT LINK PROTECTION
                            ================================== */

                            const isPaymentLinkActive = (
                              payment: Payment | null | undefined,
                            ) => {
                              if (!payment) {
                                return false;
                              }

                              // Jika sudah paid, rekapan tetap tidak boleh dihapus.
                              if (payment.status === "paid") {
                                return true;
                              }

                              // Belum ada Payment Link. Rekapan masih boleh dihapus.
                              if (!payment.payment_url) {
                                return false;
                              }

                              // Jika ada Payment Link tetapi expiry tidak tersedia,
                              // anggap masih terlindungi agar tidak berisiko menghapus rekapan.
                              if (!payment.expires_at) {
                                return true;
                              }

                              // Payment Link aktif sampai expires_at.
                              return (
                                new Date(
                                  payment.expires_at,
                                ).getTime() > Date.now()
                              );
                            };

                            const hasActivePaymentLink =
                              isPaymentLinkActive(
                                dpSummary?.payment ?? null,
                              ) ||
                              isPaymentLinkActive(
                                pelunasanSummary?.payment ?? null,
                              );

                            const isRecapDeleteDisabled =
                              isFullyPaid ||
                              hasActivePaymentLink;

                            const isCreatingDp =
                              isCreatingPayment ===
                              `${item.id}-DP`;

                            const isCreatingPelunasan =
                              isCreatingPayment ===
                              `${item.id}-PELUNASAN`;

                            return (

                              <tr
                                key={
                                  item.id
                                }
                                className="border-b border-[#eef1f6] last:border-b-0 hover:bg-[#fbfcff]"
                              >

                                {/* Pembeli */}

                                <td className="px-6 py-6">

                                  <p className="text-base font-medium text-[#20366f]">

                                    {
                                      item
                                        .member
                                        ?.name ??
                                      "-"
                                    }

                                  </p>

                                  <p className="mt-1 text-sm text-[#7a89ad]">

                                    {
                                      item
                                        .member
                                        ?.phone ??
                                      "-"
                                    }

                                  </p>

                                </td>

                                {/* Detail */}

                                <td className="px-6 py-6 text-base text-[#20366f]">

                                  {
                                    item.detail_barang
                                  }

                                </td>

                                {/* Qty */}

                                <td className="px-6 py-6 text-center text-base text-[#20366f]">

                                  {
                                    item.qty
                                  }

                                </td>

                                {/* Harga */}

                                <td className="px-6 py-6 text-right text-base text-[#20366f]">

                                  {formatRupiah(
                                    Number(
                                      item.harga_barang ??
                                        0,
                                    ),
                                  )}

                                </td>

                                {/* Total */}

                                <td className="px-6 py-6 text-right text-base font-semibold text-[#20366f]">

                                  {formatRupiah(
                                    totalHarga,
                                  )}

                                </td>

                                {/* =================================
                                    DOWN PAYMENT
                                ================================== */}

                                <td className="px-6 py-6">

                                  <div className="flex flex-col items-end">

                                    {isLoadingPayments ? (

                                      <span className="text-right text-sm text-[#7a89ad]">
                                        Memuat...
                                      </span>

                                    ) : paymentSummary ? (

                                      <p className="text-right text-base font-medium text-[#20366f]">
                                        {formatRupiah(
                                          Number(
                                            dpSummary?.amount ??
                                              0,
                                          ),
                                        )}
                                      </p>

                                    ) : (

                                      <span className="text-right text-sm text-red-500">
                                        -
                                      </span>

                                    )}

                                    {!isLoadingPayments &&
                                      paymentSummary &&
                                      !dpPaid && (

                                      <button
                                        type="button"
                                        disabled={
                                          isCreatingDp
                                        }
                                        onClick={() =>
                                          handleCreatePayment(
                                            item,
                                            "DP",
                                          )
                                        }
                                        className="mt-2 rounded-md bg-[#1457ff] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
                                      >
                                        {isCreatingDp
                                          ? "Memproses..."
                                          : "Pembayaran"}
                                      </button>

                                    )}

                                    {!isLoadingPayments &&
                                      paymentSummary &&
                                      dpPaid && (

                                      <>
                                        <span className="mt-2 inline-flex items-center rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
                                          Paid
                                        </span>

                                        {dpSummary?.paid_at && (
                                          <p className="mt-1 text-right text-xs text-[#7a89ad]">
                                            {formatPaymentDate(
                                              dpSummary.paid_at,
                                            )}
                                          </p>
                                        )}
                                      </>

                                    )}

                                    {!isLoadingPayments &&
                                      paymentSummary &&
                                      !dpPaid &&
                                      Number(
                                        dpSummary?.penalty_days ??
                                          0,
                                      ) > 0 && (

                                      <div className="mt-2 text-right text-xs leading-5 text-[#7a89ad]">

                                        <p>
                                          Terlambat{" "}
                                          {
                                            dpSummary!
                                              .penalty_days
                                          }{" "}
                                          hari
                                        </p>

                                        <p>
                                          Denda +{" "}
                                          {formatRupiah(
                                            Number(
                                              dpSummary!
                                                .penalty_amount ??
                                                0,
                                            ),
                                          )}
                                          {dpSummary
                                            ?.late_payment_permission && (
                                            <>{" "}dan</>
                                          )}
                                        </p>

                                        {dpSummary
                                          ?.late_payment_permission && (
                                          <>
                                            <p className="mt-1">
                                              Sedang mengajukan ijin telat
                                            </p>

                                            <p>
                                              sampai{" "}
                                              {formatDate(
                                                dpSummary
                                                  .late_payment_permission
                                                  .payment_date,
                                              )}
                                            </p>
                                          </>
                                        )}

                                      </div>

                                    )}

                                    {!isLoadingPayments &&
                                      paymentSummary &&
                                      !dpPaid &&
                                      Number(
                                        dpSummary?.penalty_days ??
                                          0,
                                      ) === 0 &&
                                      dpSummary
                                        ?.late_payment_permission && (

                                      <div className="mt-2 text-right text-xs leading-5 text-[#7a89ad]">

                                        <p>
                                          Sedang mengajukan ijin telat
                                        </p>

                                        <p>
                                          sampai{" "}
                                          {formatDate(
                                            dpSummary
                                              .late_payment_permission
                                              .payment_date,
                                          )}
                                        </p>

                                      </div>

                                    )}

                                  </div>

                                </td>

                                {/* =================================
                                    PELUNASAN
                                ================================== */}

                                <td className="px-6 py-6">

                                  <div className="flex flex-col items-end">

                                    {isLoadingPayments ? (

                                      <span className="text-right text-sm text-[#7a89ad]">
                                        Memuat...
                                      </span>

                                    ) : dpPaid &&
                                      paymentSummary ? (

                                      <p className="text-right text-base font-medium text-[#20366f]">
                                        {formatRupiah(
                                          Number(
                                            pelunasanSummary?.amount ??
                                              0,
                                          ),
                                        )}
                                      </p>

                                    ) : (

                                      <span className="text-right text-sm text-[#7a89ad]">
                                        -
                                      </span>

                                    )}

                                    {!isLoadingPayments &&
                                      dpPaid &&
                                      paymentSummary &&
                                      pelunasanPaid && (

                                      <>
                                        <span className="mt-2 inline-flex items-center rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">
                                          Paid
                                        </span>

                                        {pelunasanSummary?.paid_at && (
                                          <p className="mt-1 text-right text-xs text-[#7a89ad]">
                                            {formatPaymentDate(
                                              pelunasanSummary.paid_at,
                                            )}
                                          </p>
                                        )}
                                      </>

                                    )}

                                    {!isLoadingPayments &&
                                      dpPaid &&
                                      paymentSummary &&
                                      !pelunasanPaid && (

                                      <>
                                        <button
                                          type="button"
                                          disabled={
                                            isCreatingPelunasan
                                          }
                                          onClick={() =>
                                            handleCreatePayment(
                                              item,
                                              "PELUNASAN",
                                            )
                                          }
                                          className="mt-2 rounded-md bg-[#1457ff] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                          {isCreatingPelunasan
                                            ? "Memproses..."
                                            : "Pembayaran"}
                                        </button>

                                        {Number(
                                          pelunasanSummary?.penalty_days ??
                                            0,
                                        ) > 0 && (

                                          <div className="mt-2 text-right text-xs leading-5 text-[#7a89ad]">

                                            <p>
                                              Terlambat{" "}
                                              {
                                                pelunasanSummary!
                                                  .penalty_days
                                              }{" "}
                                              hari
                                            </p>

                                            <p>
                                              Denda +{" "}
                                              {formatRupiah(
                                                Number(
                                                  pelunasanSummary!
                                                    .penalty_amount ??
                                                    0,
                                                ),
                                              )}
                                              {pelunasanSummary
                                                ?.late_payment_permission && (
                                                <>{" "}dan</>
                                              )}
                                            </p>

                                            {pelunasanSummary
                                              ?.late_payment_permission && (
                                              <>
                                                <p className="mt-1">
                                                  Sedang mengajukan ijin telat
                                                </p>

                                                <p>
                                                  sampai{" "}
                                                  {formatDate(
                                                    pelunasanSummary
                                                      .late_payment_permission
                                                      .payment_date,
                                                  )}
                                                </p>
                                              </>
                                            )}

                                          </div>

                                        )}

                                        {Number(
                                          pelunasanSummary?.penalty_days ??
                                            0,
                                        ) === 0 &&
                                          pelunasanSummary
                                            ?.late_payment_permission && (

                                          <div className="mt-2 text-right text-xs leading-5 text-[#7a89ad]">

                                            <p>
                                              Sedang mengajukan ijin telat
                                            </p>

                                            <p>
                                              sampai{" "}
                                              {formatDate(
                                                pelunasanSummary
                                                  .late_payment_permission
                                                  .payment_date,
                                              )}
                                            </p>

                                          </div>

                                        )}

                                      </>

                                    )}

                                  </div>

                                </td>

                                {/* Sudah CO? */}

                                <td className="px-6 py-6 text-center">

                                  {!isFullyPaid ? (
                                    <span className="text-base text-[#7a89ad]">
                                      -
                                    </span>
                                  ) : item.sudah_co ? (
                                    <span className="text-base font-medium text-[#20366f]">
                                      Sudah
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={Boolean(isMarkingCo)}
                                      onClick={() =>
                                        handleMarkRecapAsCo(
                                          item.id,
                                        )
                                      }
                                      className="rounded-md bg-[#1457ff] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                      {isMarkingCo === item.id
                                        ? "Memproses..."
                                        : "Belum"}
                                    </button>
                                  )}

                                </td>

                                {/* Aksi */}

                                <td className="px-6 py-6">

                                  <div className="flex items-center justify-center">

                                    {!isRecapDeleteDisabled ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteRecap(
                                            item,
                                          )
                                        }
                                        aria-label={`Hapus rekapan ${item.member?.name ?? ""}`}
                                        className="text-[#ff2348] transition hover:text-[#dc1237]"
                                      >
                                        <Trash2 className="h-5 w-5" />
                                      </button>
                                    ) : (
                                      <span className="text-base text-[#7a89ad]">
                                        -
                                      </span>
                                    )}

                                  </div>

                                </td>

                              </tr>

                            );
                          },
                        )}

                    </tbody>

                  </table>

                </div>

                {/* Footer */}

                <div className="flex items-center justify-between border-t border-[#edf0f6] px-6 py-5">

                  <div>

                    <p className="text-sm text-[#7a89ad]">

                      Menampilkan{" "}

                      {
                        filteredRecaps.length
                      }{" "}

                      data

                    </p>

                    <p className="mt-1 text-sm font-semibold text-[#20366f]">

                      Total Rekapan:{" "}

                      {formatRupiah(
                        totalRekap,
                      )}

                    </p>

                  </div>

                  <div className="flex items-center gap-2">

                    <button
                      type="button"
                      disabled
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
                    >

                      <ChevronLeft className="h-5 w-5" />

                    </button>

                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#1457ff] bg-[#edf3ff] text-sm font-medium text-[#1457ff]"
                    >
                      {currentPage}
                    </button>

                    <button
                      type="button"
                      disabled
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
                    >

                      <ChevronRight className="h-5 w-5" />

                    </button>

                  </div>

                </div>

              </section>

            </>

          )}

        {/* =================================
            ADD BATCH
        ================================== */}

        <AddBatchDialog
          open={
            isAddBatchDialogOpen
          }
          country={country}
          onClose={() =>
            setIsAddBatchDialogOpen(
              false,
            )
          }
          onSuccess={
            handleBatchCreated
          }
        />

        {/* =================================
            EDIT BATCH
        ================================== */}

        <EditBatchDialog
  open={
    isEditBatchDialogOpen
  }
  batch={
    selectedEditBatch
  }
  onClose={() => {
    setIsEditBatchDialogOpen(
      false,
    );

    setSelectedEditBatch(
      null,
    );
  }}
  onSuccess={
    handleEditBatchSuccess
  }
/>

        {/* =================================
            DELETE BATCH
        ================================== */}

        <DeleteBatchDialog
          open={
            isDeleteBatchDialogOpen
          }
          batch={
            selectedDeleteBatch
          }
          onClose={() => {

            setIsDeleteBatchDialogOpen(
              false,
            );

            setSelectedDeleteBatch(
              null,
            );

          }}
          onSuccess={
            handleDeleteBatchSuccess
          }
        />

        {/* =================================
            ADD REKAP
        ================================== */}

        <AddRecapDialog
          open={
            isAddRecapDialogOpen
          }
          batch={
            activeBatch ??
            null
          }
          onClose={() =>
            setIsAddRecapDialogOpen(
              false,
            )
          }
          onSuccess={
            handleRecapCreated
          }
        />

        {/* =================================
            DELETE REKAP
        ================================== */}

        <DeleteRecapDialog
          open={
            isDeleteRecapDialogOpen
          }
          recap={
            selectedDeleteRecap
          }
          onClose={() => {

            setIsDeleteRecapDialogOpen(
              false,
            );

            setSelectedDeleteRecap(
              null,
            );

          }}
          onSuccess={
            handleDeleteRecapSuccess
          }
        />

        {/* =================================
            PAYMENT DIALOG
        ================================== */}

        <PaymentDialog
          open={
            isPaymentDialogOpen
          }
          payment={
            selectedPayment
          }

          buyer={
            selectedPaymentBuyer
          }
          onClose={
            handleClosePaymentDialog
          }
          onPaymentSuccess={
            handlePaymentSuccess
          }
        />

      </div>

      {/* ===================================
          IMAGE PREVIEW
      ==================================== */}

      {previewImage && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-6"
          onClick={
            handleClosePreview
          }
        >

          <div
            className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              type="button"
              onClick={
                handleClosePreview
              }
              className="absolute -right-3 -top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#20366f] shadow-lg transition hover:bg-[#f1f4fa]"
              aria-label="Tutup preview gambar"
            >

              <X className="h-5 w-5" />

            </button>

            <img
              src={
                previewImage.url
              }
              alt={
                previewImage.name
              }
              className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain shadow-2xl"
            />

          </div>

        </div>

      )}

    </div>
  );
}