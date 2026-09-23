import {
  ChevronDown,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

import {
  useMemo,
  useState,
} from "react";

import {
  useQuery,
} from "@tanstack/react-query";

import TambahPesananMarketplaceDialog from "../components/common/TambahPesananMarketplaceDialog";
import HapusPesananMarketplaceDialog from "../components/common/HapusPesananMarketplaceDialog";

import {
  deleteMarketplaceOrder,
  getMarketplaceOrders,
  updateMarketplaceOrderStatus,
  type MarketplaceOrder,
} from "../services/marketplaceOrderService";

import {
  getMembers,
  type Member,
} from "../services/memberService";

/* =========================================
   STATUS PENGIRIMAN
========================================= */

type MarketplaceShippingStatus =
  | "Sedang dikemas"
  | "Dalam proses pick up";

function getShippingStatusValue(
  status: MarketplaceOrder["status"],
): MarketplaceShippingStatus {
  switch (status) {
    case "processing":
    case "processed":
      return "Dalam proses pick up";

    case "waiting":
    default:
      return "Sedang dikemas";
  }
}

function getShippingStatusLabel(
  status: MarketplaceShippingStatus,
) {
  switch (status) {
    case "Sedang dikemas":
      return "Sudah di packing";

    case "Dalam proses pick up":
      return "Sudah di pick up";

    default:
      return status;
  }
}

/* =========================================
   DATE FORMAT
========================================= */

function formatDate(
  value: string,
) {
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
      month: "2-digit",
      year: "numeric",
    },
  ).format(date);
}

/* =========================================
   PHONE FORMAT
========================================= */

function formatPhone(
  phone: string,
) {
  if (!phone) {
    return "-";
  }

  return phone;
}

/* =========================================
   MARKETPLACE ITEM TYPE
========================================= */

type MarketplaceItemWithDetail =
  MarketplaceOrder["items"][number] & {
    recap?: {
      detail_barang?: string | null;
      qty?: number | null;
      batch?: {
        name?: string | null;
        country?: string | null;
      } | null;
    } | null;

    detail_barang?: string | null;

    product_name?: string | null;

    batch_name?: string | null;

    batch_country?: string | null;

    qty?: number | null;
  };

/* =========================================
   ITEM DETAIL
========================================= */

function getMarketplaceItemDetail(
  item: MarketplaceOrder["items"][number],
) {
  const marketplaceItem =
    item as MarketplaceItemWithDetail;

  const productName =
    marketplaceItem.recap
      ?.detail_barang ||
    marketplaceItem.detail_barang ||
    marketplaceItem.product_name ||
    "-";

  const qty =
    marketplaceItem.recap?.qty ??
    marketplaceItem.qty ??
    0;

  const batchName =
    marketplaceItem.recap
      ?.batch?.name ||
    marketplaceItem.batch_name ||
    "-";

  const batchCountry =
    marketplaceItem.recap
      ?.batch?.country ||
    marketplaceItem.batch_country ||
    "-";

  return {
    productName,
    qty,
    batchName,
    batchCountry,
  };
}

/* =========================================
   CUSTOMER SESSION
========================================= */

function isCustomerSession(): boolean {
  return Boolean(
    localStorage.getItem("customer_token"),
  );
}

/* =========================================
   PAGE
========================================= */

export default function PesananMarketplacePage() {
  /* =======================================
     SEARCH
  ======================================== */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isAddModalOpen,
    setIsAddModalOpen,
  ] = useState(false);

  const [
    shippingStatusOverrides,
    setShippingStatusOverrides,
  ] = useState<Record<string, MarketplaceShippingStatus>>({});

  const [
    deletingOrder,
    setDeletingOrder,
  ] = useState<MarketplaceOrder | null>(null);

  const [
    isDeletingOrder,
    setIsDeletingOrder,
  ] = useState(false);

  /* =======================================
     QUERY
  ======================================== */

  const {
    data: orders = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<
    MarketplaceOrder[],
    Error
  >({
    queryKey: [
      "marketplace-orders",
    ],

    queryFn:
      getMarketplaceOrders,

    staleTime:
      30_000,
  });

  const {
    data: members = [],
  } = useQuery<
    Member[],
    Error
  >({
    queryKey: [
      "members",
    ],

    queryFn: () =>
      getMembers(),

    staleTime:
      5 * 60 * 1000,
  });

  const memberTypeMap =
    useMemo(() => {
      const map =
        new Map<
          string,
          Member["type"]
        >();

      members.forEach(
        (member) => {
          map.set(
            member.id,
            member.type,
          );
        },
      );

      return map;
    }, [members]);

  /* =======================================
     FILTER
  ======================================== */

  const filteredOrders =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return orders;
      }

      return orders.filter(
        (order) =>
          order.order_number
            .toLowerCase()
            .includes(keyword) ||
          order.member_name
            .toLowerCase()
            .includes(keyword) ||
          order.member_phone
            .toLowerCase()
            .includes(keyword) ||
          getShippingStatusLabel(
            shippingStatusOverrides[
              order.id
            ] ??
              getShippingStatusValue(
                order.status,
              ),
          )
            .toLowerCase()
            .includes(keyword),
      );
    }, [
      orders,
      search,
      shippingStatusOverrides,
    ]);

  /* =======================================
     UPDATE SHIPPING STATUS
  ======================================== */

  const handleShippingStatusChange = async (
    order: MarketplaceOrder,
    nextStatus: MarketplaceShippingStatus,
  ) => {
    const memberType =
      memberTypeMap.get(
        order.member_id,
      ) ??
      order.member_type;

    if (
      isCustomerSession() ||
      memberType === "hnr"
    ) {
      return;
    }

    const previousStatus =
      shippingStatusOverrides[
        order.id
      ];

    setShippingStatusOverrides(
      (current) => ({
        ...current,
        [order.id]: nextStatus,
      }),
    );

    try {
      const nextOrderStatus =
        nextStatus ===
        "Dalam proses pick up"
          ? "processed"
          : "waiting";

      await updateMarketplaceOrderStatus(
        order.id,
        nextOrderStatus,
      );

      setShippingStatusOverrides(
        (current) => {
          const updated = {
            ...current,
          };

          delete updated[
            order.id
          ];

          return updated;
        },
      );

      await refetch();
    } catch (error) {
      setShippingStatusOverrides(
        (current) => {
          const updated = {
            ...current,
          };

          if (
            previousStatus !==
            undefined
          ) {
            updated[
              order.id
            ] = previousStatus;
          } else {
            delete updated[
              order.id
            ];
          }

          return updated;
        },
      );

      console.error(
        "handleShippingStatusChange error:",
        error,
      );
    }
  };

  /* =======================================
     ADD
  ======================================== */

  const handleAddOrder =
    () => {
      setIsAddModalOpen(true);
    };

  const handleMarketplaceOrderCreated =
    async () => {
      await refetch();
    };

  /* =======================================
     DELETE
  ======================================== */

  const handleDeleteOrder = (
    order: MarketplaceOrder,
  ) => {
    const memberType =
      memberTypeMap.get(
        order.member_id,
      ) ??
      order.member_type;

    if (
      memberType === "hnr"
    ) {
      return;
    }

    setDeletingOrder(order);
  };

  const handleConfirmDeleteOrder =
    async () => {
      if (!deletingOrder) {
        return;
      }

      setIsDeletingOrder(true);

      try {
        await deleteMarketplaceOrder(
          deletingOrder.id,
        );

        setShippingStatusOverrides(
          (current) => {
            const updated = {
              ...current,
            };

            delete updated[
              deletingOrder.id
            ];

            return updated;
          },
        );

        setDeletingOrder(null);

        await refetch();
      } catch (error) {
        console.error(
          "handleConfirmDeleteOrder error:",
          error,
        );
      } finally {
        setIsDeletingOrder(false);
      }
    };

  /* =======================================
     RENDER
  ======================================== */

  return (
    <div className="min-h-screen bg-[#f8faff] px-6 py-8 lg:px-8">

      {/* =================================
          HEADER
      ================================== */}

      <div className="mb-6 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
            Pesanan Marketplace
          </h1>

          <p className="mt-2 text-sm text-[#5d6f9f]">
            Kelola pesanan barang dari
            Marketplace.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">

          {/* SEARCH */}

          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a89ad]" />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Cari nomor pesanan, nama, atau WhatsApp..."
              className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 sm:w-[250px]"
            />
          </div>

          {/* TAMBAH PESANAN */}

          <button
            type="button"
            onClick={
              handleAddOrder
            }
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0]"
          >
            <Plus className="h-5 w-5" />
            Tambah Pesanan
          </button>

        </div>

      </div>

      {/* =================================
          MOBILE
      ================================== */}

      <div className="space-y-4 md:hidden">

        {isLoading && (
          <div className="rounded-xl border border-[#e1e6f0] bg-white px-5 py-12 text-center shadow-sm">
            <p className="text-sm text-[#7a89ad]">
              Memuat pesanan Marketplace...
            </p>
          </div>
        )}

        {!isLoading && isError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center">
            <p className="text-sm font-medium text-red-600">
              {error?.message ||
                "Gagal mengambil pesanan Marketplace."}
            </p>

            <button
              type="button"
              onClick={() => refetch()}
              className="mt-3 text-sm font-semibold text-[#1457ff] hover:underline"
            >
              Coba lagi
            </button>
          </div>
        )}

        {!isLoading &&
          !isError &&
          filteredOrders.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center shadow-sm">
              <p className="text-sm text-[#7a89ad]">
                {search
                  ? "Pesanan Marketplace tidak ditemukan."
                  : "Belum ada pesanan Marketplace."}
              </p>
            </div>
          )}

        {!isLoading &&
          !isError &&
          filteredOrders.map((order) => {
            const memberType =
              memberTypeMap.get(
                order.member_id,
              ) ??
              order.member_type;

            const isHnr =
              memberType
                ?.trim()
                .toLowerCase() ===
              "hnr";

            const currentShippingStatus =
              shippingStatusOverrides[
                order.id
              ] ??
              getShippingStatusValue(
                order.status,
              );

            return (
              <div
                key={order.id}
                className={[
                  "rounded-xl border p-4 shadow-sm",
                  isHnr
                    ? "border-gray-200 bg-gray-50"
                    : "border-[#e1e6f0] bg-white",
                ].join(" ")}
              >
                {/* ORDER + DATE */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-all text-sm font-bold text-[#10245c]">
                      {order.order_number}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-[#20366f]">
                        {order.member_name}
                      </p>

                      {isHnr && (
                        <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
                          HNR
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-[#7a89ad]">
                      {formatPhone(
                        order.member_phone,
                      )}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-[#8a96b4]">
                      Tanggal Input
                    </p>
                    <p className="mt-1 text-xs font-semibold text-[#50628e]">
                      {formatDate(
                        order.created_at,
                      )}
                    </p>
                  </div>
                </div>

                {/* DETAIL BARANG */}
                <div className="mt-4 rounded-lg bg-[#f8faff] px-3 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a89ad]">
                    Detail Barang
                  </p>

                  <div className="space-y-3">
                    {order.items.length > 0 ? (
                      order.items.map((item) => {
                        const {
                          productName,
                          qty,
                          batchName,
                          batchCountry,
                        } =
                          getMarketplaceItemDetail(
                            item,
                          );

                        return (
                          <div
                            key={item.id}
                            className="min-w-0"
                          >
                            <p className="text-sm font-semibold text-[#20366f]">
                              • {productName}{" "}
                              <span className="font-normal text-[#7a89ad]">
                                x{qty}
                              </span>
                            </p>

                            <p className="mt-1 text-xs text-[#7a89ad]">
                              {batchName} -{" "}
                              {batchCountry}
                            </p>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-sm text-[#7a89ad]">
                        -
                      </p>
                    )}
                  </div>
                </div>

                {/* STATUS */}
                <div className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#7a89ad]">
                    Status Pengiriman
                  </p>

                  <div className="relative">
                    <select
                      value={
                        currentShippingStatus
                      }
                      onChange={(event) =>
                        void handleShippingStatusChange(
                          order,
                          event.target.value as MarketplaceShippingStatus,
                        )
                      }
                      disabled={
                        isHnr ||
                        isCustomerSession() ||
                        currentShippingStatus ===
                          "Dalam proses pick up"
                      }
                      style={{
                        appearance: "none",
                        WebkitAppearance:
                          "none",
                        MozAppearance:
                          "none",
                        paddingRight:
                          "44px",
                        color: "#000000",
                      }}
                      className={[
                        "h-11 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10",
                        isHnr
                          ? "cursor-not-allowed bg-[#f5f6fa] !text-black disabled:!text-black disabled:opacity-100"
                          : isCustomerSession() ||
                              currentShippingStatus ===
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

                    <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#536795]" />
                  </div>
                </div>

                {/* ACTION */}
                <div className="mt-4 flex items-center justify-between border-t border-[#edf0f6] pt-4">
                  <span className="text-xs text-[#8a96b4]">
                    {isHnr
                      ? "Pesanan HNR"
                      : currentShippingStatus ===
                          "Dalam proses pick up"
                        ? "Sudah di-pick up"
                        : "Aksi pesanan"}
                  </span>

                  {isHnr ? (
                    <button
                      type="button"
                      disabled
                      className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg text-[#9aa4bb] opacity-60"
                      title="Pesanan HNR tidak dapat dihapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : currentShippingStatus ===
                    "Dalam proses pick up" ? (
                    <span className="text-sm text-[#7a89ad]">
                      -
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        handleDeleteOrder(
                          order,
                        )
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5d6f9f] transition hover:bg-red-50 hover:text-red-600"
                      title="Hapus"
                      aria-label={`Hapus pesanan ${order.order_number}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>

      {/* =================================
          TABLE
      ================================== */}

      <div className="hidden overflow-hidden rounded-xl border border-[#e1e6f0] bg-white shadow-sm md:block">

        <div className="overflow-x-auto">

          <table className="w-full min-w-[1050px]">

            {/* =================================
                TABLE HEADER
            ================================== */}

            <thead>
              <tr className="border-b border-[#e8ecf4] bg-white">

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#17285d]">
                  Nomor Pesanan
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#17285d]">
                  Nama Pembeli
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#17285d]">
                  Detail Barang
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#17285d]">
                  Tanggal Input
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#17285d]">
                  Status Pengiriman
                </th>

                <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#17285d]">
                  Aksi
                </th>

              </tr>
            </thead>

            {/* =================================
                TABLE BODY
            ================================== */}

            <tbody>

              {/* LOADING */}

              {isLoading && (
                <tr>

                  <td
                    colSpan={6}
                    className="px-5 py-12 text-center text-sm text-[#7a89ad]"
                  >
                    Memuat pesanan Marketplace...
                  </td>

                </tr>
              )}

              {/* ERROR */}

              {!isLoading &&
                isError && (
                  <tr>

                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center"
                    >

                      <p className="text-sm font-medium text-red-600">
                        {error?.message ||
                          "Gagal mengambil pesanan Marketplace."}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          refetch()
                        }
                        className="mt-3 text-sm font-semibold text-[#1457ff] hover:underline"
                      >
                        Coba lagi
                      </button>

                    </td>

                  </tr>
                )}

              {/* EMPTY */}

              {!isLoading &&
                !isError &&
                filteredOrders.length ===
                  0 && (
                  <tr>

                    <td
                      colSpan={6}
                      className="px-5 py-12 text-center"
                    >

                      <p className="text-sm text-[#7a89ad]">
                        {search
                          ? "Pesanan Marketplace tidak ditemukan."
                          : "Belum ada pesanan Marketplace."}
                      </p>

                    </td>

                  </tr>
                )}

              {/* DATA */}

              {!isLoading &&
                !isError &&
                filteredOrders.map(
                  (order) => {
                    const memberType =
                      memberTypeMap.get(
                        order.member_id,
                      ) ??
                      order.member_type;

                    const isHnr =
                      memberType
                        ?.trim()
                        .toLowerCase() ===
                      "hnr";

                    const currentShippingStatus =
                      shippingStatusOverrides[
                        order.id
                      ] ??
                      getShippingStatusValue(
                        order.status,
                      );

                    return (
                      <tr
                        key={
                          order.id
                        }
                        className={[
                          "border-b border-[#edf0f6] last:border-b-0",
                          isHnr
                            ? "bg-gray-50"
                            : "hover:bg-[#fafbfe]",
                        ].join(" ")}
                        title={
                          isHnr
                            ? "Pesanan member HNR tidak dapat diubah atau dihapus."
                            : undefined
                        }
                      >

                        {/* NOMOR PESANAN */}

                        <td className="px-5 py-4 text-center text-sm font-medium text-[#20366f]">
                          {
                            order.order_number
                          }
                        </td>

                        {/* NAMA PEMBELI */}

                        <td className="px-5 py-4 align-top text-center">

                          <div className="space-y-1">

                            <div className="flex items-center justify-center gap-2">

                              <p className="text-sm font-semibold text-[#20366f]">
                                {
                                  order.member_name
                                }
                              </p>

                              {isHnr && (
                                <span className="rounded-md bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-600">
                                  HNR
                                </span>
                              )}

                            </div>

                            <p className="text-xs text-[#7a89ad]">
                              {formatPhone(
                                order.member_phone,
                              )}
                            </p>

                          </div>

                        </td>

                        {/* DETAIL BARANG */}

                        <td className="px-5 py-4 align-top text-left">

                          <div className="space-y-3">

                            {order.items.length >
                            0 ? (
                              order.items.map(
                                (item) => {
                                  const {
                                    productName,
                                    qty,
                                    batchName,
                                    batchCountry,
                                  } =
                                    getMarketplaceItemDetail(
                                      item,
                                    );

                                  return (
                                    <div
                                      key={
                                        item.id
                                      }
                                      className="min-w-0"
                                    >

                                      <p className="text-sm font-semibold text-[#20366f]">
                                        • {productName}{" "}
                                        <span className="font-normal text-[#7a89ad]">
                                          x{qty}
                                        </span>
                                      </p>

                                      <p className="mt-1 text-xs text-[#7a89ad]">
                                        {batchName} - {batchCountry}
                                      </p>

                                    </div>
                                  );
                                },
                              )
                            ) : (
                              <p className="text-sm text-[#7a89ad]">
                                -
                              </p>
                            )}

                          </div>

                        </td>

                        {/* TANGGAL INPUT */}

                        <td className="px-5 py-4 text-center text-sm text-[#50628e]">
                          {formatDate(
                            order.created_at,
                          )}
                        </td>

                        {/* STATUS PENGIRIMAN */}

                        <td className="px-5 py-4 text-center align-top">

                          <div className="relative mx-auto inline-block w-[170px]">

                            <select
                              value={
                                currentShippingStatus
                              }
                              onChange={(event) =>
                                void handleShippingStatusChange(
                                  order,
                                  event.target.value as MarketplaceShippingStatus,
                                )
                              }
                              disabled={
                                isHnr ||
                                isCustomerSession() ||
                                currentShippingStatus ===
                                  "Dalam proses pick up"
                              }
                              style={{
                                appearance:
                                  "none",
                                WebkitAppearance:
                                  "none",
                                MozAppearance:
                                  "none",
                                paddingRight:
                                  "44px",
                                color: "#000000",
                              }}
                              className={[
                                "h-10 w-full rounded-lg border border-[#d9e0ef] bg-white px-3 text-sm text-[#20366f] outline-none transition focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10",
                                isHnr
                                  ? "cursor-not-allowed bg-[#f5f6fa] !text-black disabled:!text-black disabled:opacity-100"
                                  : isCustomerSession() ||
                                      currentShippingStatus ===
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

                        {/* AKSI */}

                        <td className="px-5 py-5 text-center align-top">

                          {isHnr ? (
                            <button
                              type="button"
                              disabled
                              className="inline-flex h-9 w-9 cursor-not-allowed items-center justify-center rounded-lg text-[#9aa4bb] opacity-60"
                              title="Pesanan HNR tidak dapat dihapus"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : currentShippingStatus ===
                            "Dalam proses pick up" ? (
                            <span className="text-sm text-[#7a89ad]">
                              -
                            </span>
                          ) : (
                            <div className="flex items-center justify-center gap-2">

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteOrder(
                                    order,
                                  )
                                }
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5d6f9f] transition hover:bg-red-50 hover:text-red-600"
                                title="Hapus"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>

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

      </div>

      <TambahPesananMarketplaceDialog
        isOpen={isAddModalOpen}
        onClose={() =>
          setIsAddModalOpen(false)
        }
        onSuccess={
          handleMarketplaceOrderCreated
        }
      />

      <HapusPesananMarketplaceDialog
        order={deletingOrder}
        isDeleting={isDeletingOrder}
        onCancel={() =>
          setDeletingOrder(null)
        }
        onConfirm={
          handleConfirmDeleteOrder
        }
      />

    </div>
  );
}