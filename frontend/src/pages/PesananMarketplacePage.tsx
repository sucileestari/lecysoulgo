import {
  Pencil,
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

import {
  getMarketplaceOrders,
  type MarketplaceOrder,
} from "../services/marketplaceOrderService";

/* =========================================
   STATUS LABEL
========================================= */

function getStatusLabel(
  status: MarketplaceOrder["status"],
) {
  switch (status) {
    case "waiting":
      return "Menunggu Diproses";

    case "processing":
      return "Sedang Diproses";

    case "processed":
      return "Sudah Diproses";

    default:
      return status;
  }
}

/* =========================================
   STATUS STYLE
========================================= */

function getStatusClassName(
  status: MarketplaceOrder["status"],
) {
  switch (status) {
    case "waiting":
      return "bg-amber-50 text-amber-700";

    case "processing":
      return "bg-blue-50 text-blue-700";

    case "processed":
      return "bg-emerald-50 text-emerald-700";

    default:
      return "bg-slate-50 text-slate-600";
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
      batch?: {
        name?: string | null;
        country?: string | null;
      } | null;
    } | null;

    detail_barang?: string | null;

    product_name?: string | null;

    batch_name?: string | null;

    batch_country?: string | null;
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
    batchName,
    batchCountry,
  };
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
    MarketplaceOrderWithMember[],
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
          getStatusLabel(
            order.status,
          )
            .toLowerCase()
            .includes(keyword),
      );
    }, [
      orders,
      search,
    ]);

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
     EDIT
  ======================================== */

  const handleEditOrder = (
    order: MarketplaceOrderWithMember,
  ) => {
    /*
     * Dialog edit akan dibuat
     * pada langkah berikutnya.
     */
    console.log(
      "Edit pesanan Marketplace:",
      order.id,
    );
  };

  /* =======================================
     DELETE
  ======================================== */

  const handleDeleteOrder = (
    order: MarketplaceOrderWithMember,
  ) => {
    /*
     * Dialog konfirmasi delete
     * akan dibuat pada langkah berikutnya.
     */
    console.log(
      "Delete pesanan Marketplace:",
      order.id,
    );
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
          TABLE
      ================================== */}

      <div className="overflow-hidden rounded-xl border border-[#e1e6f0] bg-white shadow-sm">

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
                  Status
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
                  (order) => (
                    <tr
                      key={
                        order.id
                      }
                      className="border-b border-[#edf0f6] last:border-b-0 hover:bg-[#fafbfe]"
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

                          <p className="text-sm font-semibold text-[#20366f]">
                            {
                              order.member_name
                            }
                          </p>

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
                                    className="flex items-start gap-2"
                                  >

                                    <span className="mt-1 shrink-0 text-sm text-[#7a89ad]">
                                      •
                                    </span>

                                    <div className="min-w-0">

                                      <p className="text-sm font-semibold text-[#20366f]">
                                        {
                                          productName
                                        }
                                      </p>

                                      <p className="mt-1 text-xs text-[#7a89ad]">
                                        Batch:{" "}
                                        {
                                          batchName
                                        }
                                      </p>

                                      <p className="text-xs text-[#7a89ad]">
                                        Negara:{" "}
                                        {
                                          batchCountry
                                        }
                                      </p>

                                    </div>

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

                      {/* STATUS */}

                      <td className="px-5 py-4 text-center">

                        <span
                          className={[
                            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
                            getStatusClassName(
                              order.status,
                            ),
                          ].join(
                            " ",
                          )}
                        >
                          {getStatusLabel(
                            order.status,
                          )}
                        </span>

                      </td>

                      {/* AKSI */}

                      <td className="px-5 py-4">

                        <div className="flex items-center justify-center gap-2">

                          <button
                            type="button"
                            onClick={() =>
                              handleEditOrder(
                                order,
                              )
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5d6f9f] transition hover:bg-[#edf3ff] hover:text-[#1457ff]"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

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

                      </td>

                    </tr>
                  ),
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
        onSuccess={handleMarketplaceOrderCreated}
      />

    </div>
  );
}