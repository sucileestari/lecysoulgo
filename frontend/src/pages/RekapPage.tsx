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
  History,
  Pencil,
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
  getBatchHistories,
  getBatchHistory,
  type Batch,
  type BatchHistory,
  type Country,
} from "@/services/batchService";

import {
  getRecaps,
  getRecapHistories,
  getRecapHistoriesByCountry,
  markRecapAsCheckedOut,
  type Recap,
  type RecapHistory,
} from "@/services/recapService";

import {
  createPayment,
  generatePaymentLink,
  getPaymentSummary,
  type Payment,
  type PaymentSummary,
  type PaymentType,
} from "@/services/paymentService";

import {
  getMembers,
  type Member,
} from "@/services/memberService";

import {
  canAccessPermission,
} from "../utils/permissions";

import {
  CN,
  ID,
  JP,
  KR,
  TH,
} from "country-flag-icons/react/3x2";

import type {
  FlagComponent,
} from "country-flag-icons/react/3x2";

/* =========================================
   TYPES
========================================= */

type CountryConfig = {
  name: string;
  flag: FlagComponent;
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

type RecapWithMaxTimbun = Recap & {
  max_timbun: string | null;
};

function getRecapMaxTimbun(
  recap: Recap,
): string | null {
  return (
    recap as RecapWithMaxTimbun
  ).max_timbun ?? null;
}

/* =========================================
   COUNTRY CONFIG
========================================= */

const countryConfig: Record<
  Country,
  CountryConfig
> = {
  china: {
    name: "China",
    flag: CN,
  },

  indonesia: {
    name: "Indonesia",
    flag: ID,
  },

  jepang: {
    name: "Jepang",
    flag: JP,
  },

  korea: {
    name: "Korea",
    flag: KR,
  },

  thailand: {
    name: "Thailand",
    flag: TH,
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

function formatMaxTimbun(
  maxTimbunDate: string | null,
): string {
  if (!maxTimbunDate) {
    return "-";
  }

  const date = new Date(
    `${maxTimbunDate}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return "-";
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
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(paymentDate);
}

/* =========================================
   BATCH HISTORY HELPERS
========================================= */

const HISTORY_FIELD_LABELS: Record<
  string,
  string
> = {
  name: "Nama Batch",
  type: "Jenis Barang",
  last_payment_dp:
    "Tanggal Last Payment DP",
  last_payment_pelunasan:
    "Tanggal Last Payment Pelunasan",
  status: "Status",
  admin_nyelem_id:
    "Admin Nyelem",
  admin_rekap_id:
    "Admin Rekap",
  image_path:
    "Gambar Batch",
};

const HISTORY_FIELDS = [
  "name",
  "type",
  "last_payment_dp",
  "last_payment_pelunasan",
  "status",
  "admin_nyelem_id",
  "admin_rekap_id",
  "image_path",
];

function getHistoryActionLabel(
  action: BatchHistory["action"],
): string {
  switch (action) {
    case "CREATE":
      return "Dibuat";

    case "EDIT":
      return "Diubah";

    case "DELETE":
      return "Dihapus";

    default:
      return action;
  }
}

function getHistoryActionClassName(
  action:
    | BatchHistory["action"]
    | RecapHistory["action"],
): string {
  switch (action) {
    case "CREATE":
      return "bg-emerald-50 text-emerald-600 border-emerald-200";

    case "EDIT":
      return "bg-blue-50 text-blue-600 border-blue-200";

    case "DELETE":
      return "bg-red-50 text-red-600 border-red-200";

    case "GENERATE_PAYMENT_LINK":
      return "bg-blue-50 text-blue-600 border-blue-200";

    case "COPY_PAYMENT_LINK":
      return "bg-violet-50 text-violet-600 border-violet-200";

    case "SEND_WHATSAPP":
      return "bg-emerald-50 text-emerald-600 border-emerald-200";

    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

function getRecapHistoryActionLabel(
  action: RecapHistory["action"],
): string {
  switch (action) {
    case "CREATE":
      return "Rekapan Ditambahkan";

    case "DELETE":
      return "Rekapan Dihapus";

    case "GENERATE_PAYMENT_LINK":
      return "Generate Payment Link";

    case "COPY_PAYMENT_LINK":
      return "Copy Payment Link";

    case "SEND_WHATSAPP":
      return "Kirim WhatsApp";

    default:
      return action;
  }
}

function getRecapHistoryActionDescription(
  action: RecapHistory["action"],
): string {
  switch (action) {
    case "CREATE":
      return "Menambahkan rekapan baru.";

    case "DELETE":
      return "Menghapus rekapan ini.";

    case "GENERATE_PAYMENT_LINK":
      return "Membuat Payment Link untuk pembayaran.";

    case "COPY_PAYMENT_LINK":
      return "Menyalin Payment Link.";

    case "SEND_WHATSAPP":
      return "Mengirim Payment Link melalui WhatsApp.";

    default:
      return "Aktivitas rekapan.";
  }
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
     BATCH HISTORY
  ======================================= */

  const [
    isHistoryDialogOpen,
    setIsHistoryDialogOpen,
  ] =
    useState(false);

  const [
    selectedHistoryBatch,
    setSelectedHistoryBatch,
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
     GET MEMBERS
  ======================================= */

  /*
   * Endpoint /api/members tetap dilindungi
   * oleh permission members.view.
   *
   * Rekapan tidak boleh memaksa role yang
   * tidak memiliki members.view untuk
   * memanggil endpoint tersebut.
   *
   * Data pembeli pada detail rekapan tetap
   * berasal dari recap.member melalui
   * GET /api/recaps.
   */
  const canViewMembers =
    canAccessPermission(
      "members.view",
    );

  const {
    data: members = [],
  } = useQuery<Member[], Error>({
    queryKey: ["members"],
    queryFn: () =>
      getMembers(),
    enabled: canViewMembers,
    staleTime: 5 * 60 * 1000,
  });

  const getMemberName = (
    memberId:
      | string
      | null
      | undefined,
  ) => {
    if (!memberId) {
      return "-";
    }

    return (
      members.find(
        (member) =>
          member.id === memberId,
      )?.name ?? "-"
    );
  };

  /* =======================================
     GET BATCH HISTORY
  ======================================= */

  const {
    data: batchHistories = [],
    isLoading:
      isLoadingBatchHistories,
    isError:
      isBatchHistoryError,
    error:
      batchHistoryError,
  } =
    useQuery<
      BatchHistory[],
      Error
    >({
      queryKey: [
        "batch-histories",
        country,
        selectedHistoryBatch?.id ??
          "all",
      ],

      queryFn: () =>
        selectedHistoryBatch
          ? getBatchHistory(
              selectedHistoryBatch.id,
            )
          : getBatchHistories(
              country,
            ),

      enabled:
        isHistoryDialogOpen,

      staleTime: 0,

      refetchOnWindowFocus: true,
    });

  /* =======================================
     GET RECAP HISTORY
  ======================================= */

  const {
    data: recapHistories = [],
    isLoading:
      isLoadingRecapHistories,
    isError:
      isRecapHistoryError,
    error:
      recapHistoryError,
  } =
    useQuery<
      RecapHistory[],
      Error
    >({
      queryKey: [
        "recap-histories",
        country,
        selectedHistoryBatch?.id ??
          "all",
      ],

      queryFn: () =>
        selectedHistoryBatch
          ? getRecapHistories(
              selectedHistoryBatch.id,
            )
          : getRecapHistoriesByCountry(
              country,
            ),

      enabled:
        isHistoryDialogOpen,

      staleTime: 0,

      refetchOnWindowFocus: true,
    });

  const isLoadingHistory =
    isLoadingBatchHistories ||
    isLoadingRecapHistories;

  const isHistoryError =
    isBatchHistoryError ||
    isRecapHistoryError;

  const historyError =
    batchHistoryError ??
    recapHistoryError ??
    null;

  type CombinedHistory =
    | {
        type: "batch";
        history: BatchHistory;
      }
    | {
        type: "recap";
        history: RecapHistory;
      };

  const combinedHistories =
    useMemo<CombinedHistory[]>(() => {
      return [
        ...batchHistories.map(
          (history) => ({
            type: "batch" as const,
            history,
          }),
        ),
        ...recapHistories.map(
          (history) => ({
            type: "recap" as const,
            history,
          }),
        ),
      ].sort(
        (a, b) =>
          new Date(
            b.history.created_at,
          ).getTime() -
          new Date(
            a.history.created_at,
          ).getTime(),
      );
    }, [
      batchHistories,
      recapHistories,
    ]);

  /* =======================================
     HISTORY VALUE FORMAT
  ======================================= */

  const getHistoryValue = (
    field: string,
    value: unknown,
  ): string => {
    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return "—";
    }

    if (
      field ===
        "last_payment_dp" ||
      field ===
        "last_payment_pelunasan"
    ) {
      return formatDate(
        String(value),
      );
    }

    if (
      field ===
        "admin_nyelem_id" ||
      field ===
        "admin_rekap_id"
    ) {
      return getMemberName(
        String(value),
      );
    }

    if (field === "image_path") {
      return "Gambar tersedia";
    }

    return String(value);
  };

  const getHistoryChanges = (
    history: BatchHistory,
  ) => {
    if (
      history.action !== "EDIT" ||
      !history.old_data ||
      !history.new_data
    ) {
      return [];
    }

    return HISTORY_FIELDS
      .filter((field) => {
        return (
          JSON.stringify(
            history.old_data?.[field],
          ) !==
          JSON.stringify(
            history.new_data?.[field],
          )
        );
      })
      .map((field) => ({
        field,
        label:
          HISTORY_FIELD_LABELS[
            field
          ] ?? field,
        oldValue:
          getHistoryValue(
            field,
            history.old_data?.[
              field
            ],
          ),
        newValue:
          getHistoryValue(
            field,
            history.new_data?.[
              field
            ],
          ),
      }));
  };

  const getHistoryImageUrl = (
    data:
      | BatchHistory["old_data"]
      | BatchHistory["new_data"],
  ): string | null => {
    if (!data) {
      return null;
    }

    const imageUrl =
      data["image_url"];

    return typeof imageUrl ===
      "string" &&
      imageUrl.trim()
      ? imageUrl
      : null;
  };

  const getRecapHistoryData = (
    history: RecapHistory,
  ) => {
    return (
      history.new_data ??
      history.old_data ??
      null
    );
  };

  const getRecapHistoryMemberName = (
    history: RecapHistory,
  ) => {
    const data =
      getRecapHistoryData(
        history,
      );

    return (
      data?.member?.name ??
      getMemberName(
        data?.member_id,
      )
    );
  };

  const getRecapHistorySummary = (
    history: RecapHistory,
  ) => {
    const data =
      getRecapHistoryData(
        history,
      );

    return {
      memberName:
        getRecapHistoryMemberName(
          history,
        ),
      detailBarang:
        data?.detail_barang ??
        "—",
      qty:
        data?.qty ??
        "—",
      hargaBarang:
        data?.harga_barang !==
        undefined
          ? formatRupiah(
              Number(
                data.harga_barang,
              ),
            )
          : "—",
      totalHarga:
        data?.total_harga !==
        undefined
          ? formatRupiah(
              Number(
                data.total_harga,
              ),
            )
          : "—",
      persentaseDp:
        data?.persentase_dp !==
        undefined
          ? `${data.persentase_dp}%`
          : "—",
      totalDp:
        data?.total_dp !==
        undefined
          ? formatRupiah(
              Number(
                data.total_dp,
              ),
            )
          : "—",
      sisaPelunasan:
        data?.sisa_pelunasan !==
        undefined
          ? formatRupiah(
              Number(
                data.sisa_pelunasan,
              ),
            )
          : "—",
    };
  };

  const getRecapPaymentHistorySummary = (
    history: RecapHistory,
  ) => {
    const data =
      getRecapHistoryData(history);

    const paymentType =
      String(
        data?.payment_type ?? "",
      )
        .toUpperCase()
        .trim();

    const memberName =
      typeof data?.member_name === "string"
        ? data.member_name
        : typeof data?.member?.name === "string"
          ? data.member.name
          : getRecapHistoryMemberName(
              history,
            );

    const memberPhone =
      typeof data?.member_phone === "string"
        ? data.member_phone
        : typeof data?.member?.phone === "string"
          ? data.member.phone
          : "—";

    return {
      memberName,
      memberPhone,
      paymentType:
        paymentType === "DP"
          ? "DP"
          : paymentType ===
              "PELUNASAN"
            ? "Pelunasan"
            : "—",
    };
  };

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

    setIsHistoryDialogOpen(
      false,
    );

    setSelectedHistoryBatch(
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

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batch-histories",
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

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batch-histories",
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

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "batch-histories",
            country,
          ],
        },
      );

      await refetch();
    };

  /* =======================================
     BATCH HISTORY
  ======================================= */

  const handleOpenAllBatchHistory =
    () => {
      setSelectedHistoryBatch(
        null,
      );

      setIsHistoryDialogOpen(
        true,
      );
    };

  const handleOpenBatchHistory = (
    batch: Batch,
  ) => {
    setSelectedHistoryBatch(
      batch,
    );

    setIsHistoryDialogOpen(
      true,
    );
  };

  const handleCloseBatchHistory =
    () => {
      setIsHistoryDialogOpen(
        false,
      );

      setSelectedHistoryBatch(
        null,
      );
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

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "recap-histories",
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

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "recap-histories",
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

      /* ===============================
         CREATE PAYMENT
      =============================== */

      const payment =
        await createPayment({
          recap_id:
            recap.id,

          payment_type:
            paymentType,
        });

      /* ===============================
         GENERATE PAYMENT LINK
      =============================== */

      const paymentLink =
        await generatePaymentLink(
          payment.id,
        );

      /*
       * Gunakan payment hasil dari
       * endpoint generate-link karena
       * backend bisa mengembalikan payment
       * yang sama atau payment baru ketika
       * link lama sudah tidak dapat digunakan.
       *
       * paymentUrl dan expiresAt juga
       * dipastikan masuk ke object payment
       * yang diteruskan ke PaymentDialog.
       */
      const paymentWithLink: Payment = {
        ...paymentLink.payment,
        payment_url:
          paymentLink.paymentUrl,
        expires_at:
          paymentLink.expiresAt,
      };

      setSelectedPayment(
        paymentWithLink,
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

      /*
       * PaymentDialog dibuka setelah
       * Payment Link berhasil dibuat.
       */
      setIsPaymentDialogOpen(
        true,
      );
    } catch (error) {
      console.error(
        "generate payment link error:",
        error,
      );

      setPaymentError(
        error instanceof Error
          ? error.message
          : "Gagal membuat Payment Link.",
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
            ],
          },
        );

        await queryClient.refetchQueries(
          {
            queryKey: [
              "recap-payment-summaries",
              activeBatch?.id,
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

              <config.flag
                title={config.name}
                className="h-7 w-10 shrink-0"
              />

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

            {/* Riwayat */}

            <button
              type="button"
              onClick={
                handleOpenAllBatchHistory
              }
              className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] bg-white px-5 text-sm font-medium text-[#50628e] shadow-sm transition hover:bg-[#f8faff] hover:text-[#1457ff]"
            >
              <History className="h-5 w-5" />

              Riwayat
            </button>

            {/* Tambah Batch */}

            {canAccessPermission("batches.create") && (
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
            )}

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

          <section className="mt-4 hidden overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm md:block">

            <div className="overflow-x-auto">

              <table className="w-full min-w-[1500px] border-collapse">

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

                    <th className="min-w-[180px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Admin Nyelem
                    </th>

                    <th className="min-w-[180px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                      Admin Rekap
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
                        colSpan={8}
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
                        colSpan={8}
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
                          colSpan={8}
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

                          <td className="px-6 py-5 text-center">

                            <div className="flex items-center justify-center gap-4">

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

                          <td className="px-6 py-5 text-center">

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

                          {/* Admin Nyelem */}

                          <td className="px-6 py-5 text-center">
                            <p className="text-sm font-medium text-[#20366f]">
                              {getMemberName(
                                batch.admin_nyelem_id,
                              )}
                            </p>
                          </td>

                          {/* Admin Rekap */}

                          <td className="px-6 py-5 text-center">
                            <p className="text-sm font-medium text-[#20366f]">
                              {getMemberName(
                                batch.admin_rekap_id,
                              )}
                            </p>
                          </td>

                          {/* Aksi */}

                          <td className="px-6 py-5">

                            <div className="flex items-center justify-center gap-2">

                              <button
                                type="button"
                                onClick={(
                                  event,
                                ) => {
                                  event.stopPropagation();

                                  handleOpenBatchHistory(
                                    batch,
                                  );
                                }}
                                aria-label={`Lihat riwayat ${batch.name}`}
                                title="Lihat riwayat batch"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                              >
                                <History className="h-4 w-4" />
                              </button>

                              {batch.status !== "Sudah sampai di Admin" && (
                                <>
                                  {canAccessPermission("batches.edit") && (
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
                                      title="Edit batch"
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                                    >

                                      <Pencil className="h-4 w-4" />

                                    </button>
                                  )}

                                  {canAccessPermission("batches.delete") && (
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
                                      title="Hapus batch"
                                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                                    >

                                      <Trash2 className="h-4 w-4" />

                                    </button>
                                  )}
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
            MOBILE - SEMUA BATCH
        ================================== */}

        {activeTab ===
          "all" && (
          <section className="mt-4 space-y-4 md:hidden">

            {isLoading && (
              <div className="rounded-xl border border-[#edf0f6] bg-white px-6 py-16 text-center shadow-sm">
                <p className="text-sm text-[#7a89ad]">
                  Memuat data batch...
                </p>
              </div>
            )}

            {isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center shadow-sm">
                <p className="text-sm font-medium text-red-500">
                  Gagal mengambil data batch.
                </p>

                <p className="mt-2 text-sm text-[#7a89ad]">
                  {error.message}
                </p>
              </div>
            )}

            {!isLoading &&
              !isError &&
              filteredBatches.length === 0 && (
                <div className="rounded-xl border border-[#edf0f6] bg-white px-6 py-16 text-center shadow-sm">
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
                </div>
              )}

            {!isLoading &&
              !isError &&
              filteredBatches.length > 0 &&
              filteredBatches.map((batch) => (
                <article
                  key={batch.id}
                  onClick={() =>
                    handleTabChange(batch.id)
                  }
                  className="rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm transition-colors active:bg-[#f8faff]"
                >

                  {/* BATCH HEADER */}
                  <div className="flex items-start gap-3">

                    <div className="flex h-20 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#edf2f9]">
                      {batch.image_url ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();

                            handlePreviewImage(
                              batch.image_url!,
                              batch.name,
                            );
                          }}
                          className="group relative h-full w-full cursor-zoom-in"
                        >
                          <img
                            src={batch.image_url}
                            alt={batch.name}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </button>
                      ) : (
                        <span className="text-xs text-[#7a89ad]">
                          Batch
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate text-base font-semibold text-[#20366f]">
                            {batch.name}
                          </h3>

                          <span className="mt-2 inline-flex rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-medium text-[#1457ff]">
                            {batch.type}
                          </span>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                            Total Order
                          </p>

                          <p className="mt-1 text-lg font-bold text-[#20366f]">
                            {batch.total_order ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* DATES */}
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#edf0f6] pt-4 sm:grid-cols-2">

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                        Last Payment DP
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-[#20366f]">
                        <CalendarDays className="h-4 w-4 shrink-0 text-[#536795]" />
                        <span>
                          {formatDate(
                            batch.last_payment_dp,
                          )}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                        Last Payment Pelunasan
                      </p>

                      <div className="mt-1 flex items-center gap-2 text-sm font-medium text-[#20366f]">
                        <CalendarDays className="h-4 w-4 shrink-0 text-[#536795]" />
                        <span>
                          {formatDate(
                            batch.last_payment_pelunasan,
                          )}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* ADMIN */}
                  <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#edf0f6] pt-4 sm:grid-cols-2">

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                        Admin Nyelem
                      </p>

                      <p className="mt-1 truncate text-sm font-medium text-[#20366f]">
                        {getMemberName(
                          batch.admin_nyelem_id,
                        )}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                        Admin Rekap
                      </p>

                      <p className="mt-1 truncate text-sm font-medium text-[#20366f]">
                        {getMemberName(
                          batch.admin_rekap_id,
                        )}
                      </p>
                    </div>

                  </div>

                  {/* ACTIONS */}
                  <div className="mt-4 flex justify-end gap-2 border-t border-[#edf0f6] pt-4">

                    <button
                      type="button"
                      onClick={(
                        event,
                      ) => {
                        event.stopPropagation();

                        handleOpenBatchHistory(
                          batch,
                        );
                      }}
                      aria-label={`Lihat riwayat ${batch.name}`}
                      title="Lihat riwayat batch"
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                    >
                      <History className="h-4 w-4" />
                    </button>

                    {batch.status !== "Sudah sampai di Admin" && (
                      <>
                        {canAccessPermission("batches.edit") && (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleEditBatchFromList(batch);
                          }}
                          aria-label={`Edit ${batch.name}`}
                          title="Edit batch"
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}

                        {canAccessPermission("batches.delete") && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteBatchFromList(batch);
                            }}
                            aria-label={`Hapus ${batch.name}`}
                            title="Hapus batch"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </>
                    )}
                  </div>

                </article>
              ))}

            {/* Mobile pagination/info */}
            {!isLoading &&
              !isError &&
              filteredBatches.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-[#edf0f6] bg-white px-4 py-4 shadow-sm">
                  <p className="text-xs text-[#7a89ad]">
                    Menampilkan 1 - {filteredBatches.length} dari {filteredBatches.length} batch
                  </p>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
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
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

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

                <div className="space-y-8">

                  {/* Header Batch */}

                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

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

                    <div className="min-w-0 flex-1">

                      <h2 className="text-xl font-bold text-[#10245c]">
                        {activeBatch.name}
                      </h2>

                      <span className="mt-3 inline-flex rounded-full bg-[#eef4ff] px-4 py-2 text-base font-medium text-[#1457ff]">
                        {activeBatch.type}
                      </span>

                    </div>

                    {/* Actions */}

                    {activeBatch.status !== "Sudah sampai di Admin" && (
                      <div className="flex w-full items-center justify-stretch gap-2 lg:w-auto lg:shrink-0 lg:justify-end">

                        <button
                          type="button"
                          onClick={() =>
                            handleOpenBatchHistory(
                              activeBatch,
                            )
                          }
                          className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm font-medium text-[#50628e] transition hover:bg-[#f5f8ff] hover:text-[#1457ff] lg:flex-none lg:px-5"
                        >

                          <History className="h-4 w-4" />

                          Riwayat

                        </button>

                        {canAccessPermission("batches.edit") && (
                          <button
                            type="button"
                            onClick={
                              handleEditBatch
                            }
                            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm font-medium text-[#1457ff] transition hover:bg-[#f5f8ff] lg:flex-none lg:px-5"
                          >

                            <Pencil className="h-4 w-4" />

                            Edit Batch

                          </button>
                        )}

                        {canAccessPermission("recaps.create") && (
                          <button
                            type="button"
                            onClick={
                              handleAddRecap
                            }
                            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-3 text-sm font-medium text-white transition hover:bg-[#0d4be0] lg:flex-none lg:px-5"
                          >

                            <Plus className="h-4 w-4" />

                            Tambah Rekapan

                          </button>
                        )}

                      </div>
                    )}

                  </div>

                  {/* Batch Information */}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

                    {/* DP */}

                    <div className="rounded-xl border border-[#edf0f6] bg-[#f8faff] p-5">
                      <div className="flex items-center gap-2.5 text-sm font-medium text-[#65749b]">
                        <CalendarDays className="h-5 w-5 text-[#536795]" />
                        Tanggal DP Terakhir
                      </div>

                      <p className="mt-3 text-base font-bold text-[#1f3a7a]">
                        {formatDate(
                          activeBatch.last_payment_dp,
                        )}
                      </p>
                    </div>

                    {/* Pelunasan */}

                    <div className="rounded-xl border border-[#edf0f6] bg-[#f8faff] p-5">
                      <div className="flex items-center gap-2.5 text-sm font-medium text-[#65749b]">
                        <CalendarDays className="h-5 w-5 text-[#536795]" />
                        Tanggal Pelunasan Terakhir
                      </div>

                      <p className="mt-3 text-base font-bold text-[#1f3a7a]">
                        {formatDate(
                          activeBatch.last_payment_pelunasan,
                        )}
                      </p>
                    </div>

                    {/* Status */}

                    <div className="rounded-xl border border-[#edf0f6] bg-[#f8faff] p-5">
                      <p className="text-sm font-medium text-[#65749b]">
                        Status Barang Saat Ini
                      </p>

                      <p className="mt-3 text-base font-bold text-green-600">
                        {activeBatch.status}
                      </p>
                    </div>

                    {/* Admin Nyelem */}

                    <div className="rounded-xl border border-[#edf0f6] bg-[#f8faff] p-5">
                      <p className="text-sm font-medium text-[#65749b]">
                        Admin Nyelem
                      </p>

                      <p className="mt-3 truncate text-base font-bold text-[#1f3a7a]">
                        {getMemberName(
                          activeBatch.admin_nyelem_id,
                        )}
                      </p>
                    </div>

                    {/* Admin Rekap */}

                    <div className="rounded-xl border border-[#edf0f6] bg-[#f8faff] p-5">
                      <p className="text-sm font-medium text-[#65749b]">
                        Admin Rekap
                      </p>

                      <p className="mt-3 truncate text-base font-bold text-[#1f3a7a]">
                        {getMemberName(
                          activeBatch.admin_rekap_id,
                        )}
                      </p>
                    </div>

                  </div>


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

              <section className="mt-4 hidden overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm md:block">

                <div className="overflow-x-auto">

                  <table className="w-full min-w-[1400px] border-collapse">

                    <thead>

                      <tr className="border-b border-[#e8ecf4]">

                        <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Nama Pembeli
                        </th>

                        <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Detail Barang
                        </th>

                        <th className="w-[90px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Qty
                        </th>

                        <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Harga Barang
                        </th>

                        <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Total Harga
                        </th>

                        <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Down Payment
                        </th>

                        <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Pelunasan
                        </th>

                        <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                          Maksimal Timbun
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
                            colSpan={10}
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
                              colSpan={10}
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
                              colSpan={10}
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

                            const isHnr =
                              item.member?.type === "hnr";

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
                                className={[
                                  "border-b border-[#eef1f6] last:border-b-0",
                                  isHnr
                                    ? "bg-gray-50"
                                    : "hover:bg-[#fbfcff]",
                                ].join(" ")}
                              >

                                {/* Pembeli */}

                                <td className="px-6 py-6 text-center">

                                  <div className="flex items-center justify-center gap-2">

                                    <p className="text-center text-base font-medium text-[#20366f]">

                                      {
                                        item
                                          .member
                                          ?.name ??
                                        "-"
                                      }

                                    </p>

                                    {isHnr && (
                                      <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                                        HNR
                                      </span>
                                    )}

                                  </div>

                                  <p className="mt-1 text-center text-sm text-[#7a89ad]">

                                    {
                                      item
                                        .member
                                        ?.phone ??
                                      "-"
                                    }

                                  </p>

                                </td>

                                {/* Detail */}

                                <td className="px-6 py-6 text-center text-base text-[#20366f]">

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

                                <td className="px-6 py-6 text-center text-base text-[#20366f]">

                                  {formatRupiah(
                                    Number(
                                      item.harga_barang ??
                                        0,
                                    ),
                                  )}

                                </td>

                                {/* Total */}

                                <td className="px-6 py-6 text-center text-base font-semibold text-[#20366f]">

                                  {formatRupiah(
                                    totalHarga,
                                  )}

                                </td>

                                {/* =================================
                                    DOWN PAYMENT
                                ================================== */}

                                <td className="px-6 py-6 text-center">

                                  <div className="flex flex-col items-center">

                                    {isLoadingPayments ? (

                                      <span className="text-center text-sm text-[#7a89ad]">
                                        Memuat...
                                      </span>

                                    ) : paymentSummary ? (

                                      <div className="space-y-0.5 text-center">
                                        <p className="text-sm text-[#65749b]">
                                          Nominal Dasar:{" "}
                                          {formatRupiah(
                                            Number(
                                              dpSummary?.amount ??
                                                0,
                                            ),
                                          )}
                                        </p>

                                        {Number(
                                          dpSummary?.penalty_amount ??
                                            0,
                                        ) > 0 && (
                                          <p className="text-xs text-red-600">
                                            Denda{" "}{dpSummary?.penalty_days ?? 0}{" "}hari:{" "}
                                            {formatRupiah(
                                              Number(
                                                dpSummary?.penalty_amount ??
                                                  0,
                                              ),
                                            )}
                                          </p>
                                        )}

                                        <p className="text-base font-semibold text-[#20366f]">
                                          Total:{" "}
                                          {formatRupiah(
                                            Number(
                                              dpSummary?.total_amount ??
                                                0,
                                            ),
                                          )}
                                        </p>
                                      </div>

                                    ) : (

                                      <span className="text-center text-sm text-red-500">
                                        -
                                      </span>

                                    )}

                                    {!isLoadingPayments &&
                                      paymentSummary &&
                                      !dpPaid &&
                                      canAccessPermission("payments.create") && (
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
                                            : "Generate Payment Link"}
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
                                          <p className="mt-1 text-center text-xs text-[#7a89ad]">
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

                                      <div className="mt-2 text-center text-xs leading-5 text-[#7a89ad]">
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

                                      <div className="mt-2 text-center text-xs leading-5 text-[#7a89ad]">

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

                                <td className="px-6 py-6 text-center">

                                  <div className="flex flex-col items-center">

                                    {isLoadingPayments ? (

                                      <span className="text-center text-sm text-[#7a89ad]">
                                        Memuat...
                                      </span>

                                    ) : dpPaid &&
                                      paymentSummary ? (

                                      <div className="space-y-0.5 text-center">
                                        <p className="text-sm text-[#65749b]">
                                          Nominal Dasar:{" "}
                                          {formatRupiah(
                                            Number(
                                              pelunasanSummary?.amount ??
                                                0,
                                            ),
                                          )}
                                        </p>

                                        {Number(
                                          pelunasanSummary?.penalty_amount ??
                                            0,
                                        ) > 0 && (
                                          <p className="text-xs text-red-600">
                                            Denda{" "}{pelunasanSummary?.penalty_days ?? 0}{" "}hari:{" "}
                                            {formatRupiah(
                                              Number(
                                                pelunasanSummary?.penalty_amount ??
                                                  0,
                                              ),
                                            )}
                                          </p>
                                        )}

                                        <p className="text-base font-semibold text-[#20366f]">
                                          Total:{" "}
                                          {formatRupiah(
                                            Number(
                                              pelunasanSummary?.total_amount ??
                                                0,
                                            ),
                                          )}
                                        </p>
                                      </div>

                                    ) : (

                                      <span className="text-center text-sm text-[#7a89ad]">
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
                                          <p className="mt-1 text-center text-xs text-[#7a89ad]">
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
                                        {canAccessPermission("payments.create") && (
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
                                              : "Generate Payment Link"}
                                          </button>
                                        )}

                                        {Number(
                                          pelunasanSummary?.penalty_days ??
                                            0,
                                        ) > 0 && (

                                          <div className="mt-2 text-center text-xs leading-5 text-[#7a89ad]">
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

                                          <div className="mt-2 text-center text-xs leading-5 text-[#7a89ad]">

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

                                {/* Maksimal Timbun */}

                                <td className="px-6 py-6 text-center text-base text-[#20366f]">

                                  {formatMaxTimbun(
                                    getRecapMaxTimbun(item),
                                  )}

                                </td>

                                {/* Sudah CO? */}

                                <td className="px-6 py-6 text-center">

                                  {!isFullyPaid ? (
                                    <span className="text-base text-[#20366f]">
                                      Belum
                                    </span>
                                  ) : item.sudah_co ? (
                                    <span className="text-base font-medium text-[#20366f]">
                                      Sudah
                                    </span>
                                  ) : isHnr ? (
                                    <button
                                      type="button"
                                      disabled
                                      className="rounded-md bg-[#e9eef8] px-3 py-1.5 text-xs font-medium text-[#7a89ad] disabled:cursor-not-allowed"
                                      title="Member HNR tidak dapat melakukan CO"
                                    >
                                      Belum
                                    </button>
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

                                    {canAccessPermission("recaps.delete") && (
                                      isHnr ? (
                                        <button
                                          type="button"
                                          disabled
                                          aria-label={`Hapus rekapan ${item.member?.name ?? ""}`}
                                          title="Member HNR tidak dapat menghapus rekapan"
                                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#9aa5bf] disabled:cursor-not-allowed"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      ) : !isRecapDeleteDisabled ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteRecap(
                                              item,
                                            )
                                          }
                                          aria-label={`Hapus rekapan ${item.member?.name ?? ""}`}
                                          title="Hapus rekapan"
                                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </button>
                                      ) : (
                                        <span className="text-base text-[#7a89ad]">
                                          -
                                        </span>
                                      )
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

              {/* =================================
                  MOBILE - REKAPAN
              ================================== */}

              <section className="mt-4 space-y-4 md:hidden">

                {isLoadingRecaps && (
                  <div className="rounded-xl border border-[#edf0f6] bg-white px-6 py-16 text-center shadow-sm">
                    <p className="text-sm text-[#7a89ad]">
                      Memuat data rekapan...
                    </p>
                  </div>
                )}

                {isRecapError &&
                  !isLoadingRecaps && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-16 text-center shadow-sm">
                      <p className="text-sm font-medium text-red-500">
                        Gagal mengambil data rekapan.
                      </p>

                      <p className="mt-2 text-sm text-[#7a89ad]">
                        {recapError?.message}
                      </p>
                    </div>
                  )}

                {!isLoadingRecaps &&
                  !isRecapError &&
                  filteredRecaps.length === 0 && (
                    <div className="rounded-xl border border-[#edf0f6] bg-white px-6 py-16 text-center shadow-sm">
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
                    </div>
                  )}

                {!isLoadingRecaps &&
                  !isRecapError &&
                  filteredRecaps.length > 0 &&
                  filteredRecaps.map((item) => {
                    const totalHarga = Number(
                      item.total_harga ?? 0,
                    );

                    const paymentStatus =
                      paymentStatusMap.get(item.id);

                    const paymentSummary =
                      paymentStatus?.summary ?? null;

                    const dpSummary =
                      paymentSummary?.dp ?? null;

                    const pelunasanSummary =
                      paymentSummary?.pelunasan ?? null;

                    const dpPaid =
                      dpSummary?.status === "paid";

                    const pelunasanPaid =
                      pelunasanSummary?.status === "paid";

                    const isFullyPaid =
                      dpPaid && pelunasanPaid;

                    const isHnr =
                      item.member?.type === "hnr";

                    const isPaymentLinkActive = (
                      payment: Payment | null | undefined,
                    ) => {
                      if (!payment) {
                        return false;
                      }

                      if (payment.status === "paid") {
                        return true;
                      }

                      if (!payment.payment_url) {
                        return false;
                      }

                      if (!payment.expires_at) {
                        return true;
                      }

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
                      <article
                        key={item.id}
                        className={[
                          "rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm",
                          isHnr
                            ? "bg-gray-50 opacity-60"
                            : "",
                        ].join(" ")}
                      >

                        {/* BUYER */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-[#20366f]">
                                {item.member?.name ?? "-"}
                              </p>

                              {isHnr && (
                                <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600">
                                  HNR
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-[#7a89ad]">
                              {item.member?.phone ?? "-"}
                            </p>
                          </div>
                        </div>

                        {/* ITEM */}
                        <div className="mt-4 border-t border-[#edf0f6] pt-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                            Detail Barang
                          </p>

                          <p className="mt-1 break-words text-sm font-semibold text-[#20366f]">
                            {item.detail_barang}
                          </p>

                          <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <p className="text-[11px] text-[#7a89ad]">
                                Qty
                              </p>
                              <p className="mt-1 font-medium text-[#20366f]">
                                {item.qty}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] text-[#7a89ad]">
                                Harga Barang
                              </p>
                              <p className="mt-1 font-medium text-[#20366f]">
                                {formatRupiah(
                                  Number(
                                    item.harga_barang ?? 0,
                                  ),
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 rounded-lg bg-[#f8faff] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Total Harga
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#20366f]">
                              {formatRupiah(totalHarga)}
                            </p>
                          </div>
                        </div>

                        {/* DP */}
                        <div className="mt-4 border-t border-[#edf0f6] pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Down Payment
                            </p>

                            {!isLoadingPayments &&
                              paymentSummary &&
                              dpPaid && (
                                <span className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-600">
                                  Paid
                                </span>
                              )}
                          </div>

                          {isLoadingPayments ? (
                            <p className="mt-2 text-sm text-[#7a89ad]">
                              Memuat...
                            </p>
                          ) : paymentSummary ? (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-sm text-[#65749b]">
                                Nominal Dasar:{" "}
                                {formatRupiah(
                                  Number(
                                    dpSummary?.amount ?? 0,
                                  ),
                                )}
                              </p>

                              {Number(
                                dpSummary?.penalty_amount ?? 0,
                              ) > 0 && (
                                <p className="text-xs text-red-600">
                                  Denda{" "}{dpSummary?.penalty_days ?? 0}{" "}hari:{" "}
                                  {formatRupiah(
                                    Number(
                                      dpSummary?.penalty_amount ?? 0,
                                    ),
                                  )}
                                </p>
                              )}

                              <p className="text-base font-bold text-[#20366f]">
                                Total:{" "}
                                {formatRupiah(
                                  Number(
                                    dpSummary?.total_amount ?? 0,
                                  ),
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-red-500">
                              -
                            </p>
                          )}

                          {!isLoadingPayments &&
                            paymentSummary &&
                            !dpPaid &&
                            canAccessPermission("payments.create") && (
                              <button
                                type="button"
                                disabled={isCreatingDp}
                                onClick={() =>
                                  handleCreatePayment(
                                    item,
                                    "DP",
                                  )
                                }
                                className="mt-3 w-full rounded-md bg-[#1457ff] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isCreatingDp
                                  ? "Memproses..."
                                  : "Generate Payment Link"}
                              </button>
                            )}

                          {!isLoadingPayments &&
                            paymentSummary &&
                            dpPaid &&
                            dpSummary?.paid_at && (
                              <p className="mt-1 text-xs text-[#7a89ad]">
                                {formatPaymentDate(
                                  dpSummary.paid_at,
                                )}
                              </p>
                            )}

                          {!isLoadingPayments &&
                            paymentSummary &&
                            !dpPaid &&
                            Number(
                              dpSummary?.penalty_days ?? 0,
                            ) > 0 && (
                              <div className="mt-2 text-xs leading-5 text-[#7a89ad]">
{dpSummary?.late_payment_permission && (
                                  <>
                                    <p className="mt-1">
                                      Sedang mengajukan ijin telat
                                    </p>
                                    <p>
                                      sampai {formatDate(
                                        dpSummary.late_payment_permission.payment_date,
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
                              dpSummary?.penalty_days ?? 0,
                            ) === 0 &&
                            dpSummary?.late_payment_permission && (
                              <div className="mt-2 text-xs leading-5 text-[#7a89ad]">
                                <p>Sedang mengajukan ijin telat</p>
                                <p>
                                  sampai {formatDate(
                                    dpSummary.late_payment_permission.payment_date,
                                  )}
                                </p>
                              </div>
                            )}
                        </div>

                        {/* PELUNASAN */}
                        <div className="mt-4 border-t border-[#edf0f6] pt-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Pelunasan
                            </p>

                            {!isLoadingPayments &&
                              paymentSummary &&
                              pelunasanPaid && (
                                <span className="inline-flex items-center rounded-md bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-600">
                                  Paid
                                </span>
                              )}
                          </div>

                          {isLoadingPayments ? (
                            <p className="mt-2 text-sm text-[#7a89ad]">
                              Memuat...
                            </p>
                          ) : dpPaid && paymentSummary ? (
                            <div className="mt-1 space-y-0.5">
                              <p className="text-sm text-[#65749b]">
                                Nominal Dasar:{" "}
                                {formatRupiah(
                                  Number(
                                    pelunasanSummary?.amount ?? 0,
                                  ),
                                )}
                              </p>

                              {Number(
                                pelunasanSummary?.penalty_amount ?? 0,
                              ) > 0 && (
                                <p className="text-xs text-red-600">
                                  Denda{" "}{pelunasanSummary?.penalty_days ?? 0}{" "}hari:{" "}
                                  {formatRupiah(
                                    Number(
                                      pelunasanSummary?.penalty_amount ?? 0,
                                    ),
                                  )}
                                </p>
                              )}

                              <p className="text-base font-bold text-[#20366f]">
                                Total:{" "}
                                {formatRupiah(
                                  Number(
                                    pelunasanSummary?.total_amount ?? 0,
                                  ),
                                )}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-1 text-sm text-[#7a89ad]">
                              -
                            </p>
                          )}

                          {!isLoadingPayments &&
                            dpPaid &&
                            paymentSummary &&
                            !pelunasanPaid &&
                            canAccessPermission("payments.create") && (
                              <button
                                type="button"
                                disabled={isCreatingPelunasan}
                                onClick={() =>
                                  handleCreatePayment(
                                    item,
                                    "PELUNASAN",
                                  )
                                }
                                className="mt-3 w-full rounded-md bg-[#1457ff] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#0d4be0] disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {isCreatingPelunasan
                                  ? "Memproses..."
                                  : "Generate Payment Link"}
                              </button>
                            )}

                          {!isLoadingPayments &&
                            dpPaid &&
                            paymentSummary &&
                            pelunasanPaid &&
                            pelunasanSummary?.paid_at && (
                              <p className="mt-1 text-xs text-[#7a89ad]">
                                {formatPaymentDate(
                                  pelunasanSummary.paid_at,
                                )}
                              </p>
                            )}

                          {!isLoadingPayments &&
                            dpPaid &&
                            paymentSummary &&
                            !pelunasanPaid &&
                            Number(
                              pelunasanSummary?.penalty_days ?? 0,
                            ) > 0 && (
                              <div className="mt-2 text-xs leading-5 text-[#7a89ad]">
{pelunasanSummary?.late_payment_permission && (
                                  <>
                                    <p className="mt-1">
                                      Sedang mengajukan ijin telat
                                    </p>
                                    <p>
                                      sampai {formatDate(
                                        pelunasanSummary.late_payment_permission.payment_date,
                                      )}
                                    </p>
                                  </>
                                )}
                              </div>
                            )}

                          {!isLoadingPayments &&
                            dpPaid &&
                            paymentSummary &&
                            !pelunasanPaid &&
                            Number(
                              pelunasanSummary?.penalty_days ?? 0,
                            ) === 0 &&
                            pelunasanSummary?.late_payment_permission && (
                              <div className="mt-2 text-xs leading-5 text-[#7a89ad]">
                                <p>Sedang mengajukan ijin telat</p>
                                <p>
                                  sampai {formatDate(
                                    pelunasanSummary.late_payment_permission.payment_date,
                                  )}
                                </p>
                              </div>
                            )}
                        </div>

                        {/* MAX TIMBUN + CHECKOUT */}
                        <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#edf0f6] pt-4 sm:grid-cols-2">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Maksimal Timbun
                            </p>
                            <p className="mt-1 text-sm font-medium text-[#20366f]">
                              {formatMaxTimbun(
                                getRecapMaxTimbun(item),
                              )}
                            </p>
                          </div>

                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Sudah CO?
                            </p>

                            <div className="mt-1">
                              {!isFullyPaid ? (
                                <span className="text-sm text-[#20366f]">
                                  Belum
                                </span>
                              ) : item.sudah_co ? (
                                <span className="text-sm font-medium text-[#20366f]">
                                  Sudah
                                </span>
                              ) : isHnr ? (
                                <button
                                  type="button"
                                  disabled
                                  className="rounded-md bg-[#e9eef8] px-3 py-1.5 text-xs font-medium text-[#7a89ad] disabled:cursor-not-allowed"
                                  title="Member HNR tidak dapat melakukan CO"
                                >
                                  Belum
                                </button>
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
                            </div>
                          </div>
                        </div>

                        {/* ACTION */}
                        {canAccessPermission("recaps.delete") && (
                          <div className="mt-4 flex justify-end border-t border-[#edf0f6] pt-4">
                            {isHnr ? (
                              <button
                                type="button"
                                disabled
                                aria-label={`Hapus rekapan ${item.member?.name ?? ""}`}
                                title="Member HNR tidak dapat menghapus rekapan"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#9aa5bf] disabled:cursor-not-allowed"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : !isRecapDeleteDisabled ? (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteRecap(item)
                                }
                                aria-label={`Hapus rekapan ${item.member?.name ?? ""}`}
                                title="Hapus rekapan"
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : (
                              <span className="text-base text-[#7a89ad]">
                                -
                              </span>
                            )}
                          </div>
                        )}

                      </article>
                    );
                  })}

                {!isLoadingRecaps &&
                  !isRecapError &&
                  filteredRecaps.length > 0 && (
                    <div className="rounded-xl border border-[#edf0f6] bg-white px-4 py-4 shadow-sm">
                      <p className="text-sm text-[#7a89ad]">
                        Menampilkan {filteredRecaps.length} data
                      </p>

                      <p className="mt-1 text-sm font-semibold text-[#20366f]">
                        Total Rekapan: {formatRupiah(totalRekap)}
                      </p>
                    </div>
                  )}

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
          batchStatus={
            activeBatch?.status
          }
        />

      </div>

      {/* ===================================
          HISTORY
      ==================================== */}

      {isHistoryDialogOpen && (
        <div
          className="fixed inset-0 z-[110] flex justify-end bg-black/30"
          onClick={
            handleCloseBatchHistory
          }
        >
          <div
            className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* HEADER */}

            <div className="flex items-start justify-between border-b border-[#edf0f6] px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-[#10245c]">
                  {selectedHistoryBatch
                    ? `Riwayat - ${selectedHistoryBatch.name}`
                    : `Riwayat - ${config.name}`}
                </h2>

                <p className="mt-1 text-sm text-[#7a89ad]">
                  {selectedHistoryBatch
                    ? "Seluruh aktivitas batch dan rekapan pada batch ini."
                    : "Seluruh aktivitas batch dan rekapan untuk negara ini."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  handleCloseBatchHistory
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                aria-label="Tutup riwayat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* CONTENT */}

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {isLoadingHistory && (
                <div className="flex min-h-[240px] items-center justify-center">
                  <p className="text-sm text-[#7a89ad]">
                    Memuat riwayat...
                  </p>
                </div>
              )}

              {isHistoryError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
                  <p className="text-sm font-medium text-red-600">
                    Gagal mengambil riwayat.
                  </p>

                  <p className="mt-1 text-xs text-red-500">
                    {historyError?.message}
                  </p>
                </div>
              )}

              {!isLoadingHistory &&
                !isHistoryError &&
                combinedHistories.length ===
                  0 && (
                  <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-dashed border-[#d9e0ef] bg-[#f8faff] px-6 text-center">
                    <div>
                      <History className="mx-auto h-8 w-8 text-[#8a96b4]" />

                      <p className="mt-3 text-sm font-medium text-[#20366f]">
                        Belum ada riwayat.
                      </p>

                      <p className="mt-1 text-xs text-[#7a89ad]">
                        Perubahan batch dan rekapan akan muncul di sini.
                      </p>
                    </div>
                  </div>
                )}

              {!isLoadingHistory &&
                !isHistoryError &&
                combinedHistories.length >
                  0 && (
                  <div className="space-y-4">
                    {combinedHistories.map(
                      (item) => {
                        if (item.type === "batch") {
                          const history =
                            item.history;
                          const changes =
                            getHistoryChanges(
                              history,
                            );

                          return (
                            <div
                              key={`batch-${history.id}`}
                              className="rounded-xl border border-[#edf0f6] bg-white p-5 shadow-sm"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span
                                      className={[
                                        "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                        getHistoryActionClassName(
                                          history.action,
                                        ),
                                      ].join(
                                        " ",
                                      )}
                                    >
                                      {getHistoryActionLabel(
                                        history.action,
                                      )}
                                    </span>

                                    <span className="text-xs text-[#7a89ad]">
                                      {formatPaymentDate(
                                        history.created_at,
                                      )}
                                    </span>
                                  </div>

                                  {!selectedHistoryBatch && (
                                    <p className="mt-3 text-sm font-semibold text-[#20366f]">
                                      {history.batch_name}
                                    </p>
                                  )}

                                  <p className="mt-1 text-xs text-[#7a89ad]">
                                    Admin:{" "}
                                    <span className="font-medium text-[#50628e]">
                                      {history.admin_name}
                                    </span>
                                  </p>
                                </div>
                              </div>

                              {history.action ===
                                "CREATE" && (
                                <p className="mt-4 text-sm text-[#50628e]">
                                  Membuat batch baru.
                                </p>
                              )}

                              {history.action ===
                                "DELETE" && (
                                <p className="mt-4 text-sm text-[#50628e]">
                                  Menghapus batch ini.
                                </p>
                              )}

                              {history.action ===
                                "EDIT" && (
                                <div className="mt-4">
                                  {changes.length ===
                                    0 ? (
                                    <p className="text-sm text-[#7a89ad]">
                                      Tidak ada perubahan field yang tercatat.
                                    </p>
                                  ) : (
                                    <div className="space-y-3">
                                      {changes.map(
                                        (change) => (
                                          <div
                                            key={
                                              change.field
                                            }
                                            className="rounded-lg bg-[#f8faff] p-3"
                                          >
                                            <p className="text-xs font-semibold text-[#65749b]">
                                              {change.label}
                                            </p>

                                            {change.field ===
                                            "image_path" ? (
                                              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                <div className="rounded-lg border border-red-100 bg-red-50 p-3">
                                                  <p className="mb-2 text-xs font-medium text-red-500">
                                                    Sebelum
                                                  </p>

                                                  {getHistoryImageUrl(
                                                    history.old_data,
                                                  ) ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const imageUrl =
                                                          getHistoryImageUrl(
                                                            history.old_data,
                                                          );

                                                        if (!imageUrl) {
                                                          return;
                                                        }

                                                        handlePreviewImage(
                                                          imageUrl,
                                                          `${history.batch_name} - Gambar Lama`,
                                                        );
                                                      }}
                                                      className="group relative block h-32 w-full overflow-hidden rounded-lg bg-white"
                                                      title="Preview gambar lama"
                                                    >
                                                      <img
                                                        src={
                                                          getHistoryImageUrl(
                                                            history.old_data,
                                                          ) ??
                                                          undefined
                                                        }
                                                        alt={`${history.batch_name} - gambar lama`}
                                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                                      />

                                                      <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] font-medium text-white">
                                                        Klik untuk preview
                                                      </span>
                                                    </button>
                                                  ) : (
                                                    <div className="flex h-32 items-center justify-center rounded-lg bg-white px-3 text-center text-xs text-[#7a89ad]">
                                                      Tidak ada gambar
                                                    </div>
                                                  )}
                                                </div>

                                                <span className="text-center text-[#8a96b4]">
                                                  →
                                                </span>

                                                <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                                                  <p className="mb-2 text-xs font-medium text-emerald-600">
                                                    Sesudah
                                                  </p>

                                                  {getHistoryImageUrl(
                                                    history.new_data,
                                                  ) ? (
                                                    <button
                                                      type="button"
                                                      onClick={() => {
                                                        const imageUrl =
                                                          getHistoryImageUrl(
                                                            history.new_data,
                                                          );

                                                        if (!imageUrl) {
                                                          return;
                                                        }

                                                        handlePreviewImage(
                                                          imageUrl,
                                                          `${history.batch_name} - Gambar Baru`,
                                                        );
                                                      }}
                                                      className="group relative block h-32 w-full overflow-hidden rounded-lg bg-white"
                                                      title="Preview gambar baru"
                                                    >
                                                      <img
                                                        src={
                                                          getHistoryImageUrl(
                                                            history.new_data,
                                                          ) ??
                                                          undefined
                                                        }
                                                        alt={`${history.batch_name} - gambar baru`}
                                                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                                      />

                                                      <span className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[11px] font-medium text-white">
                                                        Klik untuk preview
                                                      </span>
                                                    </button>
                                                  ) : (
                                                    <div className="flex h-32 items-center justify-center rounded-lg bg-white px-3 text-center text-xs text-[#7a89ad]">
                                                      Tidak ada gambar
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="mt-2 grid grid-cols-1 gap-2 text-sm sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                                                <div className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-red-600">
                                                  {change.oldValue}
                                                </div>

                                                <span className="text-center text-[#8a96b4]">
                                                  →
                                                </span>

                                                <div className="rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-600">
                                                  {change.newValue}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        }

                        const history =
                          item.history;
                        const recapSummary =
                          getRecapHistorySummary(
                            history,
                          );
                        const isPaymentHistory =
                          history.action ===
                            "GENERATE_PAYMENT_LINK" ||
                          history.action ===
                            "COPY_PAYMENT_LINK" ||
                          history.action ===
                            "SEND_WHATSAPP";
                        const paymentHistorySummary =
                          isPaymentHistory
                            ? getRecapPaymentHistorySummary(
                                history,
                              )
                            : null;

                        return (
                          <div
                            key={`recap-${history.id}`}
                            className="rounded-xl border border-[#edf0f6] bg-white p-5 shadow-sm"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={[
                                      "inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold",
                                      getHistoryActionClassName(
                                        history.action,
                                      ),
                                    ].join(
                                      " ",
                                    )}
                                  >
                                    {getRecapHistoryActionLabel(
                                      history.action,
                                    )}
                                  </span>

                                  <span className="text-xs text-[#7a89ad]">
                                    {formatPaymentDate(
                                      history.created_at,
                                    )}
                                  </span>
                                </div>

                                {!selectedHistoryBatch && (
                                  <p className="mt-3 text-sm font-semibold text-[#20366f]">
                                    {history.batch_name}
                                  </p>
                                )}

                                <p className="mt-1 text-xs text-[#7a89ad]">
                                  Admin:{" "}
                                  <span className="font-medium text-[#50628e]">
                                    {history.admin_name}
                                  </span>
                                </p>
                              </div>
                            </div>

                            <p className="mt-4 text-sm text-[#50628e]">
                              {getRecapHistoryActionDescription(
                                history.action,
                              )}
                            </p>

                            {isPaymentHistory &&
                            paymentHistorySummary && (
                              <div className="mt-4 rounded-lg bg-[#f8faff] p-3">
                                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                                  <div>
                                    <p className="text-xs font-semibold text-[#65749b]">
                                      Nama Pembeli
                                    </p>
                                    <p className="mt-1 text-[#20366f]">
                                      {
                                        paymentHistorySummary.memberName
                                      }
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold text-[#65749b]">
                                      Nomor WhatsApp
                                    </p>
                                    <p className="mt-1 text-[#20366f]">
                                      {
                                        paymentHistorySummary.memberPhone
                                      }
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-xs font-semibold text-[#65749b]">
                                      Tipe Pembayaran
                                    </p>
                                    <p className="mt-1 text-[#20366f]">
                                      {
                                        paymentHistorySummary.paymentType
                                      }
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {!isPaymentHistory && (
                              <div className="mt-4 rounded-lg bg-[#f8faff] p-3">
                                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Nama Pembeli
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.memberName}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Detail Barang
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.detailBarang}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Qty
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.qty}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Harga Barang
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.hargaBarang}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Total Harga
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.totalHarga}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Persentase DP
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.persentaseDp}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Total DP
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.totalDp}
                                  </p>
                                </div>

                                <div>
                                  <p className="text-xs font-semibold text-[#65749b]">
                                    Sisa Pelunasan
                                  </p>
                                  <p className="mt-1 text-[#20366f]">
                                    {recapSummary.sisaPelunasan}
                                  </p>
                                </div>
                              </div>
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>
      )}

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