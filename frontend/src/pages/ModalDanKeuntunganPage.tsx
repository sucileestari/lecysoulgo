import {
  BadgeAlert,
  Boxes,
  Pencil,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import AddModalPenjualanDialog from "../components/common/AddModalPenjualanDialog";
import EditModalPenjualanDialog from "../components/common/EditModalPenjualanDialog";

import {
  getBatches,
  type Batch,
  type Country,
} from "../services/batchService";

import {
  getRecaps,
  type Recap,
} from "../services/recapService";

import {
  getPaymentSummary,
  type PaymentSummary,
} from "../services/paymentService";

import {
  createProductCost,
  getProductCosts,
  type ProductCost,
} from "../services/productCostService";

import {
  getActiveBankAccounts,
  type BankAccount,
} from "../services/bankAccountService";

import {
  createFinanceTransaction,
} from "../services/financeService";

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

import { canAccessPermission } from "../utils/permissions";

/* =========================================
   TYPES
========================================= */

type ModalProfitRow = {
  id: string;

  country: string;

  countryFlag: FlagComponent;

  batchName: string;

  transactionDate: string;

  bankName: string;

  qty: number;

  modalBeli: number;

  hargaModalPerBarang: number;

  hargaModalPembulatan: number;

  totalHargaJual: number;

  denda: number;

  totalFee: number;

  qtyTerjual: number;

  keuntungan: number;
};

type BatchSalesSummary = {
  totalHargaJual: number;

  denda: number;

  qtyTerjual: number;

  totalFee: number;
};

/* =========================================
   COUNTRY CONFIG
========================================= */

const countryConfig: Record<
  Country,
  {
    name: string;
    flag: FlagComponent;
  }
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

const COUNTRIES: Country[] = [
  "china",
  "indonesia",
  "jepang",
  "korea",
  "thailand",
];

/* =========================================
   HELPERS
========================================= */

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
  ).format(value || 0);
}

/* =========================================
   PAYMENT PENALTY HELPER

   Urutan sumber denda:
   1. penalty_amount pada payment
   2. amount - base_amount pada payment
   3. penalty_amount pada payment summary

   Ini dibuat supaya denda tetap bisa terbaca
   walaupun payment sudah paid dan summary
   tidak lagi menampilkan penalty aktif.
========================================= */

function getPaymentPenalty(
  paymentSection: PaymentSummary["dp"],
): number {
  const explicitPaymentPenalty =
    Number(
      paymentSection.payment
        ?.penalty_amount,
    );

  if (
    Number.isFinite(
      explicitPaymentPenalty,
    ) &&
    explicitPaymentPenalty > 0
  ) {
    return explicitPaymentPenalty;
  }

  const paymentAmount =
    Number(
      paymentSection.payment
        ?.amount,
    );

  const paymentBaseAmount =
    Number(
      paymentSection.payment
        ?.base_amount ??
        paymentSection.base_amount ??
        0,
    );

  if (
    Number.isFinite(
      paymentAmount,
    ) &&
    Number.isFinite(
      paymentBaseAmount,
    ) &&
    paymentAmount >
      paymentBaseAmount
  ) {
    return (
      paymentAmount -
      paymentBaseAmount
    );
  }

  const summaryPenalty =
    Number(
      paymentSection.penalty_amount ??
        0,
    );

  return Number.isFinite(
    summaryPenalty,
  ) &&
    summaryPenalty > 0
    ? summaryPenalty
    : 0;
}

/* =========================================
   PAGE
========================================= */

export default function ModalDanKeuntunganPage() {
  const queryClient =
    useQueryClient();

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    isAddModalDialogOpen,
    setIsAddModalDialogOpen,
  ] = useState(false);

  const [
    isEditModalDialogOpen,
    setIsEditModalDialogOpen,
  ] = useState(false);

  const [
    selectedProductCost,
    setSelectedProductCost,
  ] = useState<ProductCost | null>(null);

  const profitSyncInFlightRef =
    useRef<Set<string>>(new Set());

  /* =======================================
     GET ALL BATCHES
  ======================================== */

  const {
    data: batches = [],
    isLoading:
      isLoadingBatches,
    isError:
      isBatchError,
    error:
      batchError,
  } =
    useQuery<
      Batch[],
      Error
    >({
      queryKey: [
        "modal-profit-batches",
      ],

      queryFn:
        async () => {
          const results =
            await Promise.all(
              COUNTRIES.map(
                (
                  country,
                ) =>
                  getBatches(
                    country,
                  ),
              ),
            );

          return results.flat();
        },

      staleTime: 0,

      refetchOnWindowFocus:
        true,
    });

  /* =======================================
     GET PRODUCT COSTS
  ======================================== */

  const {
    data: productCosts = [],
    isLoading:
      isLoadingProductCosts,
    isError:
      isProductCostError,
    error:
      productCostError,
  } =
    useQuery<
      ProductCost[],
      Error
    >({
      queryKey: [
        "product-costs",
      ],

      queryFn:
        getProductCosts,

      staleTime: 0,

      refetchOnWindowFocus:
        true,
    });

  /* =======================================
     GET ACTIVE BANK ACCOUNTS
  ======================================== */

  const {
    data: bankAccounts = [],
    isLoading: isLoadingBankAccounts,
    isError: isBankAccountError,
    error: bankAccountError,
  } = useQuery<
    BankAccount[],
    Error
  >({
    queryKey: [
      "bank-accounts",
    ],

    queryFn:
      getActiveBankAccounts,

    staleTime: 0,

    refetchOnWindowFocus:
      true,
  });

  /* =======================================
     PRODUCT COST BATCH IDS
  ======================================== */

  const productCostBatchIds =
    useMemo(
      () =>
        productCosts
          .map(
            (
              item,
            ) =>
              item.batch_id,
          )
          .sort(),

      [
        productCosts,
      ],
    );

  /* =======================================
     GET SALES SUMMARY

     Untuk setiap batch:
     - ambil seluruh recap
     - ambil payment summary setiap recap
     - hitung total harga jual murni
     - hitung total denda
     - hitung qty terjual

     Total harga jual dan qty terjual:
     hanya recap dengan
     DP paid + Pelunasan paid.

     Denda:
     hanya denda dari pembayaran yang
     sudah benar-benar PAID.
  ======================================== */

  const {
    data:
      salesSummaryByBatch = {},
    isLoading:
      isLoadingSales,
    isError:
      isSalesError,
    error:
      salesError,
  } =
    useQuery<
      Record<
        string,
        BatchSalesSummary
      >,
      Error
    >({
      queryKey: [
        "modal-profit-sales",
        productCostBatchIds,
      ],

      queryFn:
        async () => {
          const result:
            Record<
              string,
              BatchSalesSummary
            > = {};

          const relevantBatches =
            batches.filter(
              (
                batch,
              ) =>
                productCostBatchIds.includes(
                  batch.id,
                ),
            );

          await Promise.all(
            relevantBatches.map(
              async (
                batch,
              ) => {
                const recaps:
                  Recap[] =
                  await getRecaps(
                    batch.id,
                  );

                if (
                  recaps.length ===
                  0
                ) {
                  result[
                    batch.id
                  ] = {
                    totalHargaJual: 0,
                    denda: 0,
                    qtyTerjual: 0,
                    totalFee: 0,
                  };

                  return;
                }

                const paymentSummaries:
                  PaymentSummary[] =
                  await Promise.all(
                    recaps.map(
                      (
                        recap,
                      ) =>
                        getPaymentSummary(
                          recap.id,
                        ),
                    ),
                  );

                let totalHargaJual =
                  0;

                let denda =
                  0;

                let qtyTerjual =
                  0;

                let totalFee =
                  0;

                recaps.forEach(
                  (
                    recap,
                    index,
                  ) => {
                    const paymentSummary =
                      paymentSummaries[
                        index
                      ];

                    if (
                      !paymentSummary
                    ) {
                      return;
                    }

                    /* ---------------------------------
                       PAYMENT STATUS

                       Denda hanya dihitung apabila
                       pembayaran yang bersangkutan
                       sudah benar-benar PAID.

                       Contoh:
                       DP normal Rp18.000
                       Denda Rp2.000
                       Total bayar Rp20.000

                       Jika DP masih unpaid:
                       denda tidak dihitung.

                       Jika DP sudah paid:
                       denda Rp2.000 dihitung.

                       Hal yang sama berlaku untuk
                       pembayaran Pelunasan.
                    ---------------------------------- */

                    const dpPaid =
                      paymentSummary
                        .dp
                        .status ===
                      "paid";

                    const pelunasanPaid =
                      paymentSummary
                        .pelunasan
                        .status ===
                      "paid";

                    if (
                      dpPaid
                    ) {
                      denda +=
                        getPaymentPenalty(
                          paymentSummary.dp,
                        );
                    }

                    if (
                      pelunasanPaid
                    ) {
                      denda +=
                        getPaymentPenalty(
                          paymentSummary.pelunasan,
                        );
                    }

                    const isFullyPaid =
                      dpPaid &&
                      pelunasanPaid;

                    /* ---------------------------------
                       TOTAL HARGA JUAL

                       IMPORTANT:
                       Gunakan recap.total_harga,
                       bukan payment.amount.

                       recap.total_harga adalah harga
                       jual murni dan tidak memasukkan
                       denda pembayaran.
                    ---------------------------------- */

                    if (
                      !isFullyPaid
                    ) {
                      return;
                    }

                    /* ---------------------------------
                       FEE PEMBAYARAN

                       Setiap pembayaran customer
                       yang sudah PAID dikenakan fee
                       sebesar 0,8% dari nominal payment.

                       Fee dihitung dari nominal aktual
                       yang dibayar customer, bukan
                       dari recap.total_harga.
                    ---------------------------------- */

                    const dpPaymentAmount =
                      Number(
                        paymentSummary.dp.payment?.amount ??
                          0,
                      );

                    const pelunasanPaymentAmount =
                      Number(
                        paymentSummary.pelunasan.payment?.amount ??
                          0,
                      );

                    if (
                      dpPaid &&
                      Number.isFinite(
                        dpPaymentAmount,
                      ) &&
                      dpPaymentAmount > 0
                    ) {
                      totalFee +=
                        dpPaymentAmount * 0.008;
                    }

                    if (
                      pelunasanPaid &&
                      Number.isFinite(
                        pelunasanPaymentAmount,
                      ) &&
                      pelunasanPaymentAmount > 0
                    ) {
                      totalFee +=
                        pelunasanPaymentAmount * 0.008;
                    }

                    totalHargaJual +=
                      Number(
                        recap.total_harga ??
                          0,
                      );

                    /* ---------------------------------
                       QTY TERJUAL
                    ---------------------------------- */

                    qtyTerjual +=
                      Number(
                        recap.qty ??
                          0,
                      );
                  },
                );

                result[
                  batch.id
                ] = {
                  totalHargaJual,

                  denda,

                  qtyTerjual,

                  totalFee,
                };
              },
            ),
          );

          return result;
        },

      enabled:
        batches.length > 0 &&
        productCostBatchIds.length >
          0,

      staleTime: 0,

      refetchOnWindowFocus:
        true,

      /*
       * Cek ulang setiap 60 detik
       * supaya perubahan status pembayaran
       * otomatis ikut masuk ke halaman.
       */
      refetchInterval:
        60 * 1000,
    });

  /* =======================================
     CREATE TABLE ROWS
  ======================================== */

  const rows =
    useMemo<
      ModalProfitRow[]
    >(
      () => {
        return productCosts
          .map(
            (
              productCost,
            ) => {
              const batch =
                batches.find(
                  (
                    item,
                  ) =>
                    item.id ===
                    productCost.batch_id,
                );

              if (!batch) {
                return null;
              }

              const country =
                countryConfig[
                  batch.country
                ];

              const batchSales =
                salesSummaryByBatch[
                  batch.id
                ] ?? {
                  totalHargaJual: 0,
                  denda: 0,
                  qtyTerjual: 0,
                  totalFee: 0,
                };

              const totalHargaJual =
                Number(
                  batchSales.totalHargaJual,
                );

              const denda =
                Number(
                  batchSales.denda,
                );

              const qtyTerjual =
                Number(
                  batchSales.qtyTerjual,
                );

              const totalFee =
                Number(
                  batchSales.totalFee,
                );

              /* -------------------------------------
                 KEUNTUNGAN BERSIH

                 Total Harga Jual
                 -
                 Harga Modal per Barang × Qty Terjual
                 -
                 Fee pembayaran 0,8%
              -------------------------------------- */

              const keuntungan =
                totalHargaJual -
                Number(
                  productCost.modal_per_qty,
                ) *
                  qtyTerjual -
                totalFee;

              return {
                id: productCost.id,

                country:
                  country.name,

                countryFlag:
                  country.flag,

                batchName:
                  batch.name,

                transactionDate:
                  productCost.transaction_date,

                bankName:
                  bankAccounts.find(
                    (account) =>
                      account.id ===
                      productCost.bank_account_id,
                  )?.name ?? "-",

                qty:
                  Number(
                    productCost.qty,
                  ),

                modalBeli:
                  Number(
                    productCost.total_modal,
                  ),

                hargaModalPerBarang:
                  Number(
                    productCost.modal_per_qty,
                  ),

                hargaModalPembulatan:
                  Number(
                    productCost.modal_per_qty_rounded,
                  ),

                totalHargaJual,

                denda,

                totalFee,

                qtyTerjual,

                keuntungan,
              };
            },
          )
          .filter(
            (
              row,
            ): row is ModalProfitRow =>
              row !== null,
          );
      },
      [
        batches,
        productCosts,
        salesSummaryByBatch,
        bankAccounts,
      ],
    );

  /* =======================================
     SYNC KEUNTUNGAN KE CIMB

     Bank modal penjualan tetap mengikuti
     bank yang dipilih saat input modal.

     KEUNTUNGAN selalu masuk ke rekening CIMB.

     Setiap productCost hanya boleh mempunyai
     satu transaksi profit berdasarkan:
       reference_type = "profit"
       reference_id   = productCost.id

     Backend menangani create/update transaksi
     profit secara idempotent.
  ======================================== */

  useEffect(() => {
    const syncProfitToCimb =
      async () => {
        if (
          bankAccounts.length === 0 ||
          rows.length === 0
        ) {
          return;
        }

        const cimbAccounts =
          bankAccounts.filter(
            (account) =>
              account.name
                .trim()
                .toLowerCase() ===
              "cimb",
          );

        if (
          cimbAccounts.length === 0
        ) {
          console.error(
            "Rekening CIMB tidak ditemukan. Keuntungan tidak dapat dicatat.",
          );
          return;
        }

        if (cimbAccounts.length > 1) {
          console.error(
            "Terdapat lebih dari satu rekening CIMB aktif. Pastikan hanya ada satu rekening CIMB aktif untuk keuntungan.",
          );
          return;
        }

        const cimbAccount =
          cimbAccounts[0];

        const profitRows =
          rows.filter(
            (row) =>
              Number(
                row.keuntungan,
              ) > 0 &&
              Boolean(
                row.transactionDate,
              ),
          );

        const rowsToSync =
          profitRows.filter(
            (row) =>
              !profitSyncInFlightRef.current.has(
                row.id,
              ),
          );

        if (
          rowsToSync.length === 0
        ) {
          return;
        }

        await Promise.all(
          rowsToSync.map(
            async (row) => {
              profitSyncInFlightRef.current.add(
                row.id,
              );

              try {
                await createFinanceTransaction({
                  transaction_date:
                    row.transactionDate,
                  type: "income",
                  description:
                    `Keuntungan Penjualan - ${row.batchName}`,
                  amount:
                    Number(
                      row.keuntungan,
                    ),
                  to_bank_account_id:
                    cimbAccount.id,
                  reference_type:
                    "profit",
                  reference_id:
                    row.id,
                });
              } catch (error) {
                console.error(
                  `Gagal mencatat keuntungan batch ${row.batchName} ke CIMB:`,
                  error,
                );
              } finally {
                profitSyncInFlightRef.current.delete(
                  row.id,
                );
              }
            },
          ),
        );

        await queryClient.invalidateQueries({
          queryKey: [
            "finance",
          ],
        });
      };

    void syncProfitToCimb();
  }, [
    bankAccounts,
    queryClient,
    rows,
  ]);

  /* =======================================
     FILTER
  ======================================== */

  const filteredRows =
    useMemo(
      () => {
        const keyword =
          search
            .trim()
            .toLowerCase();

        if (!keyword) {
          return rows;
        }

        return rows.filter(
          (
            row,
          ) =>
            row.country
              .toLowerCase()
              .includes(
                keyword,
              ) ||
            row.batchName
              .toLowerCase()
              .includes(
                keyword,
              ),
        );
      },
      [
        rows,
        search,
      ],
    );

  /* =======================================
     SUMMARY
  ======================================== */

  const totalBatch =
    rows.length;

  const totalModalBeli =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.modalBeli,
      0,
    );

  const totalHargaJual =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.totalHargaJual,
      0,
    );

  const totalDenda =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.denda,
      0,
    );

  const totalKeuntungan =
    rows.reduce(
      (
        total,
        row,
      ) =>
        total +
        row.keuntungan,
      0,
    );

  /* =======================================
     LOADING / ERROR
  ======================================== */

  const isLoading =
    isLoadingBatches ||
    isLoadingProductCosts ||
    isLoadingSales ||
    isLoadingBankAccounts;

  const isError =
    isBatchError ||
    isProductCostError ||
    isSalesError ||
    isBankAccountError;

  const errorMessage =
    batchError?.message ||
    productCostError?.message ||
    salesError?.message ||
    bankAccountError?.message ||
    "Gagal mengambil data.";

  /* =======================================
     EDIT MODAL
  ======================================== */

  const handleOpenEditModal = (
    productCost: ProductCost,
  ) => {
    setSelectedProductCost(productCost);
    setIsEditModalDialogOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalDialogOpen(false);
    setSelectedProductCost(null);
  };

  const handleUpdateProductCost = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["product-costs"],
    });

    handleCloseEditModal();
  };

  /* =======================================
     ADD MODAL
  ======================================== */

  const handleCreateProductCost =
    async (
      input: {
        batch_id: string;
        qty: number;
        modal_beli: number;
        transaction_date: string;
        bank_account_id: string;
      },
    ) => {
      await createProductCost({
        batch_id:
          input.batch_id,

        qty:
          input.qty,

        total_modal:
          input.modal_beli,

        transaction_date:
          input.transaction_date,

        bank_account_id:
          input.bank_account_id,
      });

      await queryClient.invalidateQueries(
        {
          queryKey: [
            "product-costs",
          ],
        },
      );

      setIsAddModalDialogOpen(
        false,
      );
    };

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
              Modal dan Keuntungan
            </h1>

            <p className="mt-2 text-sm text-[#5d6f9f]">
              Perhitungan Modal dan Keuntungan Penjualan
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
                ) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Cari batch..."
                className="h-12 w-full rounded-lg border border-[#d9e0ef] bg-white pl-11 pr-4 text-sm text-[#20366f] outline-none transition placeholder:text-[#8a96b4] focus:border-[#1457ff] focus:ring-2 focus:ring-[#1457ff]/10 sm:w-[250px]"
              />

            </div>

            {/* TAMBAH MODAL */}

            {canAccessPermission("modal.create") && (
              <button
                type="button"
                onClick={() =>
                  setIsAddModalDialogOpen(
                    true,
                  )
                }
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0] active:scale-[0.99]"
              >
                <Plus className="h-5 w-5" />

                Tambah Modal Penjualan
              </button>
            )}

          </div>
        </div>

        {/* =================================
            SUMMARY
        ================================== */}

        <section className="mt-7 rounded-xl border border-[#edf0f6] bg-white shadow-sm">

          <div className="grid grid-cols-1 gap-5 px-6 py-6 sm:grid-cols-2 xl:flex xl:items-center xl:justify-between xl:gap-6">

            {/* TOTAL BATCH */}

            <div className="flex min-w-0 items-center gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff]">
                <Boxes className="h-5 w-5 text-[#1457ff]" />
              </div>

              <div className="min-w-0">

                <p className="text-sm text-[#65749b]">
                  Total Batch
                </p>

                <p className="mt-1 text-xl font-bold text-[#10245c]">
                  {totalBatch}
                </p>

              </div>

            </div>

            {/* TOTAL MODAL BELI */}

            <div className="flex min-w-0 items-center gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff]">
                <WalletCards className="h-5 w-5 text-[#1457ff]" />
              </div>

              <div className="min-w-0">

                <p className="text-sm text-[#65749b]">
                  Total Modal Beli
                </p>

                <p className="mt-1 text-xl font-bold text-[#10245c]">
                  {formatRupiah(
                    totalModalBeli,
                  )}
                </p>

              </div>

            </div>

            {/* TOTAL HARGA JUAL */}

            <div className="flex min-w-0 items-center gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff]">
                <ShoppingCart className="h-5 w-5 text-[#1457ff]" />
              </div>

              <div className="min-w-0">

                <p className="text-sm text-[#65749b]">
                  Total Harga Jual
                </p>

                <p className="mt-1 text-xl font-bold text-[#10245c]">
                  {formatRupiah(
                    totalHargaJual,
                  )}
                </p>

              </div>

            </div>

            {/* TOTAL DENDA */}

            <div className="flex min-w-0 items-center gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff7ed]">
                <BadgeAlert className="h-5 w-5 text-[#f97316]" />
              </div>

              <div className="min-w-0">

                <p className="text-sm text-[#65749b]">
                  Total Denda
                </p>

                <p className="mt-1 text-xl font-bold text-[#10245c]">
                  {formatRupiah(
                    totalDenda,
                  )}
                </p>

              </div>

            </div>

            {/* TOTAL KEUNTUNGAN */}

            <div className="flex min-w-0 items-center gap-4">

              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#effcf4]">
                <TrendingUp className="h-5 w-5 text-[#16a34a]" />
              </div>

              <div className="min-w-0">

                <p className="text-sm text-[#65749b]">
                  Total Keuntungan
                </p>

                <p
                  className={[
                    "mt-1 text-xl font-bold",
                    totalKeuntungan <
                    0
                      ? "text-[#ef4444]"
                      : "text-[#16a34a]",
                  ].join(
                    " ",
                  )}
                >
                  {formatRupiah(
                    totalKeuntungan,
                  )}
                </p>

              </div>

            </div>

          </div>

        </section>

        {/* =================================
            TABLE
        ================================== */}

        <section className="mt-6 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">

          {/* =================================
              MOBILE CARDS
          ================================== */}

          <div className="space-y-4 p-4 md:hidden">

            {isLoading && (
              Array.from({
                length: 3,
              }).map((_, index) => (
                <article
                  key={`mobile-loading-${index}`}
                  className="rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm"
                >
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-2/3 rounded bg-[#eef2f8]" />
                    <div className="h-3 w-1/2 rounded bg-[#eef2f8]" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="h-10 rounded-lg bg-[#eef2f8]" />
                      <div className="h-10 rounded-lg bg-[#eef2f8]" />
                    </div>
                    <div className="h-12 rounded-lg bg-[#eef2f8]" />
                  </div>
                </article>
              ))
            )}

            {!isLoading &&
              isError && (
                <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-12 text-center">
                  <p className="text-sm font-medium text-red-500">
                    Gagal mengambil data modal penjualan.
                  </p>

                  <p className="mt-2 break-words text-xs text-red-500">
                    {errorMessage}
                  </p>
                </div>
              )}

            {!isLoading &&
              !isError &&
              filteredRows.length === 0 && (
                <div className="rounded-xl border border-[#edf0f6] bg-white px-5 py-14 text-center">
                  <p className="text-base font-medium text-[#20366f]">
                    {search
                      ? "Batch tidak ditemukan"
                      : "Belum ada data modal dan keuntungan"}
                  </p>

                  <p className="mt-2 text-sm text-[#7a89ad]">
                    {search
                      ? "Coba gunakan kata kunci pencarian lain."
                      : "Tambahkan modal penjualan menggunakan tombol Tambah Modal Penjualan."}
                  </p>
                </div>
              )}

            {!isLoading &&
              !isError &&
              filteredRows.map((row) => {
                const Flag =
                  row.countryFlag;

                return (
                  <article
                    key={row.id}
                    className="rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm"
                  >

                    {/* HEADER */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Flag
                            title={row.country}
                            className="h-5 w-auto shrink-0 rounded-sm"
                          />

                          <p className="text-base font-semibold text-[#20366f]">
                            {row.country}
                          </p>
                        </div>

                        <h3 className="mt-2 break-words text-base font-bold text-[#10245c]">
                          {row.batchName}
                        </h3>
                      </div>

                      <div className="shrink-0 rounded-lg bg-[#eef4ff] px-2.5 py-1.5 text-xs font-semibold text-[#1457ff]">
                        Qty {row.qty}
                      </div>
                    </div>

                    {/* TRANSACTION INFO */}
                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#edf0f6] pt-4 sm:grid-cols-2">

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                          Tanggal Transaksi
                        </p>

                        <p className="mt-1 text-sm font-medium text-[#20366f]">
                          {row.transactionDate
                            ? new Intl.DateTimeFormat(
                                "id-ID",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                },
                              ).format(
                                new Date(
                                  `${row.transactionDate}T00:00:00`,
                                ),
                              )
                            : "-"}
                        </p>
                      </div>

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                          Bank
                        </p>

                        <p className="mt-1 text-sm font-medium text-[#20366f]">
                          {row.bankName}
                        </p>
                      </div>

                    </div>

                    {/* MODAL */}
                    <div className="mt-4 space-y-3 border-t border-[#edf0f6] pt-4">

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-[#65749b]">
                          Modal Beli
                        </span>

                        <span className="text-sm font-semibold text-[#20366f]">
                          {formatRupiah(
                            row.modalBeli,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-[#65749b]">
                          Harga Modal / Barang
                        </span>

                        <span className="text-right text-sm text-[#20366f]">
                          {formatRupiah(
                            row.hargaModalPerBarang,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-[#65749b]">
                          Harga Modal / Barang (Pembulatan)
                        </span>

                        <span className="text-right text-sm font-medium text-[#20366f]">
                          {formatRupiah(
                            row.hargaModalPembulatan,
                          )}
                        </span>
                      </div>

                    </div>

                    {/* SALES */}
                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#edf0f6] pt-4 sm:grid-cols-2">

                      <div className="rounded-lg bg-[#f8faff] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                          Total Harga Jual
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#20366f]">
                          {formatRupiah(
                            row.totalHargaJual,
                          )}
                        </p>
                      </div>

                      <div className="rounded-lg bg-[#f8faff] p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                          Qty Terjual
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#20366f]">
                          {row.qtyTerjual}
                        </p>
                      </div>

                    </div>

                    {/* DEDUCTIONS */}
                    <div className="mt-4 space-y-3 border-t border-[#edf0f6] pt-4">

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-[#65749b]">
                          Denda
                        </span>

                        <span className="text-right text-sm text-[#20366f]">
                          {formatRupiah(
                            row.denda,
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-sm text-[#65749b]">
                          Fee 0,8%
                        </span>

                        <span className="text-right text-sm font-medium text-[#ef4444]">
                          {formatRupiah(
                            row.totalFee,
                          )}
                        </span>
                      </div>

                    </div>

                    {/* PROFIT */}
                    <div className="mt-4 rounded-lg border border-[#edf0f6] bg-[#f8faff] p-4">

                      <p className="text-xs font-semibold uppercase tracking-wide text-[#65749b]">
                        Keuntungan
                      </p>

                      <p
                        className={[
                          "mt-1 text-lg font-bold",
                          row.keuntungan < 0
                            ? "text-[#ef4444]"
                            : "text-[#16a34a]",
                        ].join(" ")}
                      >
                        {row.keuntungan < 0
                          ? `- ${formatRupiah(
                              Math.abs(
                                row.keuntungan,
                              ),
                            )}`
                          : formatRupiah(
                              row.keuntungan,
                            )}
                      </p>

                    </div>

                    {/* ACTION */}
                    <div className="mt-4 flex items-center gap-2 border-t border-[#edf0f6] pt-4">

                      {canAccessPermission("modal.edit") && (
                        <button
                          type="button"
                          aria-label={`Edit ${row.batchName}`}
                          title={`Edit ${row.batchName}`}
                          onClick={() => {
                            const productCost =
                              productCosts.find(
                                (item) =>
                                  item.id ===
                                  row.id,
                              );

                            if (productCost) {
                              handleOpenEditModal(
                                productCost,
                              );
                            }
                          }}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </button>
                      )}

                      {canAccessPermission("modal.delete") && (
                        <button
                          type="button"
                          aria-label={`Hapus ${row.batchName}`}
                          title={`Hapus ${row.batchName}`}
                          className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Hapus
                        </button>
                      )}

                    </div>

                  </article>
                );
              })}

          </div>

          {/* =================================
              DESKTOP TABLE
          ================================== */}

          <div className="hidden overflow-x-auto md:block">

            <table className="w-full min-w-[2120px] table-fixed border-collapse">

              {/* =================================
                  FIXED COLUMN WIDTH
              ================================== */}

              <colgroup>

                <col className="w-[130px]" />

                <col className="w-[170px]" />

                <col className="w-[150px]" />

                <col className="w-[150px]" />

                <col className="w-[90px]" />

                <col className="w-[180px]" />

                <col className="w-[190px]" />

                <col className="w-[250px]" />

                <col className="w-[180px]" />

                <col className="w-[130px]" />

                <col className="w-[130px]" />

                <col className="w-[150px]" />

                <col className="w-[180px]" />

                <col className="w-[120px]" />

              </colgroup>

              <thead>

                <tr className="border-b border-[#e8ecf4] bg-white">

                  {/* NEGARA */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Negara
                  </th>

                  {/* NAMA BATCH */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Nama Batch
                  </th>

                  {/* TANGGAL TRANSAKSI */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Tanggal Transaksi
                  </th>

                  {/* BANK */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Bank
                  </th>

                  {/* QTY */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Qty
                  </th>

                  {/* MODAL BELI */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Modal Beli
                  </th>

                  {/* HARGA MODAL */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Harga Modal
                    <br />
                    per Barang
                  </th>

                  {/* PEMBULATAN */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Harga Modal
                    <br />
                    per Barang (Pembulatan)
                  </th>

                  {/* TOTAL HARGA JUAL */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Total Harga Jual
                  </th>

                  {/* DENDA */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Denda
                  </th>

                  {/* FEE */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Fee 0,8%
                  </th>

                  {/* QTY TERJUAL */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Qty Terjual
                  </th>

                  {/* KEUNTUNGAN */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Keuntungan
                  </th>

                  {/* AKSI */}

                  <th className="px-5 py-5 text-center text-sm font-semibold text-[#17285d]">
                    Aksi
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
                      colSpan={14}
                      className="px-6 py-20 text-center"
                    >

                      <p className="text-base text-[#7a89ad]">
                        Memuat data modal penjualan...
                      </p>

                    </td>

                  </tr>
                )}

                {/* =================================
                    ERROR
                ================================== */}

                {!isLoading &&
                  isError && (
                    <tr>

                      <td
                        colSpan={14}
                        className="px-6 py-20 text-center"
                      >

                        <p className="text-base font-medium text-red-500">
                          Gagal mengambil data modal penjualan.
                        </p>

                        <p className="mt-2 text-sm text-[#7a89ad]">
                          {errorMessage}
                        </p>

                      </td>

                    </tr>
                  )}

                {/* =================================
                    EMPTY
                ================================== */}

                {!isLoading &&
                  !isError &&
                  filteredRows.length ===
                    0 && (
                    <tr>

                      <td
                        colSpan={14}
                        className="px-6 py-20 text-center"
                      >

                        <p className="text-base font-medium text-[#20366f]">
                          {search
                            ? "Batch tidak ditemukan"
                            : "Belum ada data modal dan keuntungan"}
                        </p>

                        <p className="mt-2 text-sm text-[#7a89ad]">
                          {search
                            ? "Coba gunakan kata kunci pencarian lain."
                            : "Tambahkan modal penjualan menggunakan tombol Tambah Modal Penjualan."}
                        </p>

                      </td>

                    </tr>
                  )}

                {/* =================================
                    DATA
                ================================== */}

                {!isLoading &&
                  !isError &&
                  filteredRows.map(
                    (
                      row,
                    ) => {
                      const Flag =
                        row.countryFlag;

                      return (
                        <tr
                          key={
                            row.id
                          }
                          className="border-b border-[#eef1f6] last:border-b-0 hover:bg-[#fbfcff]"
                        >

                          {/* NEGARA */}

                          <td className="px-5 py-5 text-center">

                            <div className="flex items-center justify-center gap-3">

                              <Flag
                                title={
                                  row.country
                                }
                                className="h-5 w-auto shrink-0 rounded-sm"
                              />

                              <span className="text-sm text-[#20366f]">
                                {
                                  row.country
                                }
                              </span>

                            </div>

                          </td>

                          {/* BATCH */}

                          <td className="px-5 py-5 text-center text-sm font-medium text-[#20366f]">
                            {
                              row.batchName
                            }
                          </td>

                          {/* TANGGAL TRANSAKSI */}

                          <td className="px-5 py-5 text-center text-sm text-[#20366f]">
                            {row.transactionDate
                              ? new Intl.DateTimeFormat(
                                  "id-ID",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                ).format(
                                  new Date(
                                    `${row.transactionDate}T00:00:00`,
                                  ),
                                )
                              : "-"}
                          </td>

                          {/* BANK */}

                          <td className="px-5 py-5 text-center text-sm font-medium text-[#20366f]">
                            {row.bankName}
                          </td>

                          {/* QTY */}

                          <td className="px-5 py-5 text-center text-sm text-[#20366f]">
                            {
                              row.qty
                            }
                          </td>

                          {/* MODAL BELI */}

                          <td className="px-5 py-5 text-center text-sm text-[#20366f]">
                            {formatRupiah(
                              row.modalBeli,
                            )}
                          </td>

                          {/* HARGA MODAL */}

                          <td className="px-5 py-5 text-center text-sm text-[#20366f]">
                            {formatRupiah(
                              row.hargaModalPerBarang,
                            )}
                          </td>

                          {/* PEMBULATAN */}

                          <td className="px-5 py-5 text-center text-sm font-medium text-[#20366f]">
                            {formatRupiah(
                              row.hargaModalPembulatan,
                            )}
                          </td>

                          {/* TOTAL HARGA JUAL */}

                          <td className="px-5 py-5 text-center text-sm text-[#20366f]">
                            {formatRupiah(
                              row.totalHargaJual,
                            )}
                          </td>

                          {/* DENDA */}

                          <td className="px-5 py-5 text-center text-sm text-[#20366f]">
                            {formatRupiah(
                              row.denda,
                            )}
                          </td>

                          {/* FEE */}

                          <td className="px-5 py-5 text-center text-sm text-[#ef4444]">
                            {formatRupiah(
                              row.totalFee,
                            )}
                          </td>

                          {/* QTY TERJUAL */}

                          <td className="px-5 py-5 text-center text-sm text-[#20366f]">
                            {
                              row.qtyTerjual
                            }
                          </td>

                          {/* KEUNTUNGAN */}

                          <td className="px-5 py-5 text-center">

                            <span
                              className={[
                                "text-sm font-semibold",
                                row.keuntungan <
                                0
                                  ? "text-[#ef4444]"
                                  : "text-[#16a34a]",
                              ].join(
                                " ",
                              )}
                            >
                              {row.keuntungan <
                              0
                                ? `- ${formatRupiah(
                                    Math.abs(
                                      row.keuntungan,
                                    ),
                                  )}`
                                : formatRupiah(
                                    row.keuntungan,
                                  )}
                            </span>

                          </td>

                          {/* AKSI */}

                          <td className="px-5 py-5">

                            <div className="flex items-center justify-center gap-2">

                              {canAccessPermission("modal.edit") && (
                                <button
                                  type="button"
                                  aria-label={`Edit ${row.batchName}`}
                                  title={`Edit ${row.batchName}`}
                                  onClick={() => {
                                    const productCost =
                                      productCosts.find(
                                        (item) => item.id === row.id,
                                      );

                                    if (productCost) {
                                      handleOpenEditModal(
                                        productCost,
                                      );
                                    }
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#50628e] transition hover:bg-[#f8faff] hover:text-[#1457ff]"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              )}

                              {canAccessPermission("modal.delete") && (
                                <button
                                  type="button"
                                  aria-label={`Hapus ${row.batchName}`}
                                  title={`Hapus ${row.batchName}`}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 transition hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
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

          {/* =================================
              PAGINATION
          ================================== */}

          <div className="flex items-center justify-between border-t border-[#edf0f6] px-6 py-5">

            <p className="text-sm text-[#7a89ad]">

              Menampilkan{" "}

              {
                filteredRows.length ===
                0
                  ? 0
                  : 1
              }{" "}

              -{" "}

              {
                filteredRows.length
              }{" "}

              dari{" "}

              {
                filteredRows.length
              }{" "}

              data

            </p>

            <div className="flex items-center gap-2">

              <button
                type="button"
                disabled
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ‹
              </button>

              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1457ff] text-sm font-medium text-white"
              >
                1
              </button>

              <button
                type="button"
                disabled
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#d9e0ef] text-[#8290ae] disabled:cursor-not-allowed disabled:opacity-40"
              >
                ›
              </button>

            </div>

          </div>

        </section>

      </div>

      {/* =================================
          ADD MODAL PENJUALAN
      ================================== */}

      <AddModalPenjualanDialog
        open={
          isAddModalDialogOpen
        }
        batches={
          batches
        }
        onClose={() =>
          setIsAddModalDialogOpen(
            false,
          )
        }
        onSubmit={
          handleCreateProductCost
        }
      />

      <EditModalPenjualanDialog
        open={isEditModalDialogOpen}
        productCost={selectedProductCost}
        batches={batches}
        onClose={handleCloseEditModal}
        onSuccess={handleUpdateProductCost}
      />

    </div>
  );
}