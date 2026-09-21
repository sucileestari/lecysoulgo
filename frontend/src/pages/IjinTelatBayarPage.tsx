import {
  useMemo,
  useState,
} from "react";

import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";

import {
  getLatePaymentPermissions,
  type LatePaymentPermission,
} from "@/services/latePaymentPermissionService";

import AjukanIjinTelatBayarDialog from "@/components/common/AjukanIjinTelatBayarDialog";

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

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    },
  ).format(date);
}

function formatDateTime(
  dateString: string | null,
): string {
  if (!dateString) {
    return "—";
  }

  const date =
    new Date(dateString);

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
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(date);
}

/* =========================================
   PAGE
========================================= */

export default function IjinTelatBayarPage() {
  const queryClient =
    useQueryClient();

  /* =======================================
     STATE
  ======================================= */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    isDialogOpen,
    setIsDialogOpen,
  ] = useState(false);

  const [
    actionError,
    setActionError,
  ] = useState("");

  const itemsPerPage = 10;

  /* =======================================
     GET DATA
  ======================================= */

  const {
    data: permissions = [],
    isLoading,
    isError,
    error,
  } =
    useQuery<
      LatePaymentPermission[],
      Error
    >({
      queryKey: [
        "late-payment-permissions",
      ],

      queryFn:
        getLatePaymentPermissions,

      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: 60_000,
    });

  /* =======================================
     SEARCH
  ======================================= */

  const filteredPermissions =
    useMemo(() => {
      const keyword =
        search
          .trim()
          .toLowerCase();

      if (!keyword) {
        return permissions;
      }

      return permissions.filter(
        (item) => {
          const buyerName =
            item.member?.name ??
            "";

          const buyerPhone =
            item.member?.phone ??
            "";

          const detailBarang =
            item.items
              ?.map(
                (
                  permissionItem,
                ) =>
                  permissionItem
                    .recap
                    ?.detail_barang ??
                  "",
              )
              .join(" ") ??
            "";

          const reason =
            item.reason ??
            "";

          return (
            buyerName
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            buyerPhone
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            detailBarang
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            reason
              .toLowerCase()
              .includes(
                keyword,
              )
          );
        },
      );
    }, [
      permissions,
      search,
    ]);

  /* =======================================
     PAGINATION
  ======================================= */

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredPermissions.length /
          itemsPerPage,
      ),
    );

  const paginatedPermissions =
    useMemo(() => {
      const start =
        (currentPage - 1) *
        itemsPerPage;

      return filteredPermissions.slice(
        start,
        start + itemsPerPage,
      );
    }, [
      filteredPermissions,
      currentPage,
    ]);

  /* =======================================
     SUCCESS CREATE
  ======================================= */

  async function handlePermissionCreated() {
    await queryClient.invalidateQueries(
      {
        queryKey: [
          "late-payment-permissions",
        ],
      },
    );

    setIsDialogOpen(
      false,
    );

    setCurrentPage(
      1,
    );
  }

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

            <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
              Ijin Telat Bayar
            </h1>

            <p className="mt-2 text-sm text-[#5d6f9f]">
              Kelola permintaan ijin keterlambatan pembayaran dari pelanggan
            </p>

          </div>

          <div className="flex flex-col gap-3 sm:flex-row">

            {/* SEARCH */}

            <div className="relative">

              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#7a89ad]" />

              <input
                type="text"
                value={
                  search
                }
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
                placeholder="Cari pembeli..."
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 sm:w-[250px]"
              />

            </div>

            {/* AJUKAN IJIN */}

            <button
              type="button"
              onClick={() => {
                setActionError("");

                setIsDialogOpen(
                  true,
                );
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0]"
            >

              <Plus className="h-5 w-5" />

              Ajukan Ijin

            </button>

          </div>

        </div>

        {/* =================================
            ACTION ERROR
        ================================== */}

        {actionError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-5 py-4">

            <p className="text-sm font-medium text-red-600">
              {actionError}
            </p>

          </div>
        )}

        {/* =================================
            TABLE
        ================================== */}

        <section className="mt-7 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1000px] border-collapse">

              <thead>

                <tr className="border-b border-[#e8ecf4]">

                  <th className="min-w-[220px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    Nama Pembeli
                  </th>

                  <th className="min-w-[260px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    Detail Barang
                  </th>

                  <th className="min-w-[260px] px-6 py-5 text-left text-sm font-semibold text-[#17285d]">
                    Alasan Telat
                  </th>

                  <th className="min-w-[190px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Tanggal Pembayaran
                  </th>

                  <th className="min-w-[190px] px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Status Pembayaran
                  </th>

                </tr>

              </thead>

              <tbody>

                {/* =================================
                    LOADING
                ================================== */}

                {isLoading && (
                  <tr>

                    <td
                      colSpan={5}
                      className="px-6 py-20 text-center"
                    >

                      <p className="text-base text-[#7a89ad]">
                        Memuat data ijin telat bayar...
                      </p>

                    </td>

                  </tr>
                )}

                {/* =================================
                    ERROR
                ================================== */}

                {isError &&
                  !isLoading && (
                    <tr>

                      <td
                        colSpan={5}
                        className="px-6 py-20 text-center"
                      >

                        <p className="text-base font-medium text-red-500">
                          Gagal mengambil data ijin telat bayar.
                        </p>

                        <p className="mt-2 text-sm text-[#7a89ad]">
                          {
                            error?.message
                          }
                        </p>

                      </td>

                    </tr>
                  )}

                {/* =================================
                    EMPTY
                ================================== */}

                {!isLoading &&
                  !isError &&
                  paginatedPermissions.length ===
                    0 && (
                    <tr>

                      <td
                        colSpan={5}
                        className="px-6 py-20 text-center"
                      >

                        <p className="text-base font-medium text-[#20366f]">
                          {search
                            ? "Data tidak ditemukan"
                            : "Belum ada ijin telat bayar"}
                        </p>

                        <p className="mt-2 text-sm text-[#7a89ad]">
                          {search
                            ? "Coba gunakan kata kunci pencarian lain."
                            : "Klik Ajukan Ijin untuk membuat pengajuan baru."}
                        </p>

                      </td>

                    </tr>
                  )}

                {/* =================================
                    DATA
                ================================== */}

                {!isLoading &&
                  !isError &&
                  paginatedPermissions.map(
                    (
                      item,
                    ) => {
                      const isPaid =
                        item.payment_status ===
                        "paid";

                      const isHnr =
                        item.member?.type === "hnr";

                      return (
                        <tr
                          key={
                            item.id
                          }
                          aria-disabled={
                            isHnr
                          }
                          className={[
                            "border-b border-[#eef1f6] last:border-b-0",
                            isHnr
                              ? "pointer-events-none bg-[#f7f9fc]"
                              : "hover:bg-[#fbfcff]",
                          ].join(" ")}
                        >

                          {/* ======================
                              NAMA PEMBELI
                          ======================= */}

                          <td className="px-6 py-6 align-middle">

                            <div>

                              <div className="flex items-center gap-2">
                                <p className="text-base font-medium text-[#20366f]">
                                  {item.member
                                    ?.name ??
                                    "-"}
                                </p>

                                {isHnr && (
                                  <span className="inline-flex rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                                    HNR
                                  </span>
                                )}
                              </div>

                              {item.member
                                ?.phone && (
                                <p className="mt-1 text-xs text-[#7a89ad]">
                                  {
                                    item
                                      .member
                                      .phone
                                  }
                                </p>
                              )}

                            </div>

                          </td>

                          {/* ======================
                              DETAIL BARANG
                          ======================= */}

                          <td className="px-6 py-6 align-middle">

                            <div className="space-y-3">

                              {item.items &&
                              item.items.length >
                                0 ? (
                                item.items.map(
                                  (
                                    permissionItem,
                                  ) => (
                                    <div
                                      key={
                                        permissionItem.id
                                      }
                                      className="flex items-start gap-2"
                                    >

                                      {/* BULLET */}

                                      <span className="mt-0.5 shrink-0 text-sm text-[#7a89ad]">
                                        •
                                      </span>

                                      <div className="min-w-0">

                                        <p className="text-sm font-semibold text-[#20366f]">
                                          {
                                            permissionItem
                                              .recap
                                              ?.detail_barang ??
                                            "-"
                                          }
                                        </p>

                                        <p className="mt-1 text-xs text-[#7a89ad]">
                                          {permissionItem.recap?.batch?.name ??
                                            "Batch tidak diketahui"}
                                          {" - "}
                                          {permissionItem.recap?.batch?.country ??
                                            "Country tidak diketahui"}
                                        </p>

                                        <p className="mt-1 text-xs text-[#7a89ad]">
                                          {
                                            permissionItem.payment_type
                                          }
                                        </p>

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

                          {/* ======================
                              ALASAN
                          ======================= */}

                          <td className="px-6 py-6 align-middle">

                            <p className="max-w-[260px] text-base text-[#20366f]">
                              {
                                item.reason
                              }
                            </p>

                          </td>

                          {/* ======================
                              TANGGAL
                          ======================= */}

                          <td className="px-6 py-6 text-center align-middle">

                            <p className="text-base font-medium text-[#20366f]">
                              {formatDate(
                                item.payment_date,
                              )}
                            </p>

                          </td>

                          {/* ======================
                              STATUS
                          ======================= */}

                          <td className="px-6 py-6 text-center align-middle">

                            {isPaid ? (
                              <div className="flex flex-col items-center">

                                <span className="inline-flex items-center gap-1.5 rounded-md bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-600">

                                  <CheckCircle2 className="h-4 w-4" />

                                  Sudah Dibayar

                                </span>

                                {item.paid_at && (
                                  <p className="mt-1 text-xs text-[#7a89ad]">
                                    {formatDateTime(
                                      item.paid_at,
                                    )}
                                  </p>
                                )}

                              </div>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-600">
                                Belum Dibayar
                              </span>
                            )}

                          </td>

                        </tr>
                      );
                    },
                  )}

              </tbody>

            </table>

          </div>

          {/* =================================
              PAGINATION
          ================================== */}

          <div className="flex items-center justify-between border-t border-[#edf0f6] px-6 py-5">

            <p className="text-sm text-[#7a89ad]">

              Menampilkan{" "}

              {filteredPermissions.length ===
                0
                ? 0
                : (currentPage - 1) *
                    itemsPerPage +
                  1}

              {" - "}

              {Math.min(
                currentPage *
                  itemsPerPage,
                filteredPermissions.length,
              )}

              {" dari "}

              {
                filteredPermissions.length
              }{" "}
              data

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
                        page - 1,
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
                        page + 1,
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

        {/* =================================
            AJUKAN IJIN DIALOG
        ================================== */}

        <AjukanIjinTelatBayarDialog
          open={
            isDialogOpen
          }
          onClose={() =>
            setIsDialogOpen(
              false,
            )
          }
          onSuccess={
            handlePermissionCreated
          }
        />

      </div>

    </div>
  );
}