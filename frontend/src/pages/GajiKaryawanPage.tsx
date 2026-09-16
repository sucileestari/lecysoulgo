import {
  BadgeCheck,
  Clock3,
  CircleDollarSign,
  Search,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import {
  getFinanceData,
  type FinanceBankAccount,
  type FinanceData,
  type FinanceTransaction,
} from "../services/financeService";
import {
  getBatches,
  type Batch,
  type Country,
} from "../services/batchService";
import { getRecaps } from "../services/recapService";
import {
  getPaymentSummary,
  type PaymentSummary,
} from "../services/paymentService";
import {
  getProductCosts,
  type ProductCost,
} from "../services/productCostService";
import {
  getMembers,
  type Member,
} from "../services/memberService";

const COUNTRIES: Country[] = [
  "china",
  "indonesia",
  "jepang",
  "korea",
  "thailand",
];

const PAYMENT_FEE_RATE = 0.008;
const SALARY_RATE = 0.1;

type RecapForPayroll = {
  id: string;
  batch_id: string;
  member_id: string | null;
  qty: number;
  total_harga: number;
};

type PayrollFinanceTransaction =
  FinanceTransaction & {
    to_member_id?: string | null;
  };

type EmployeeSalaryRow = {
  memberId: string;
  name: string;
  phone: string;
  netProfit: number;
  salary: number;
  paid: number;
  remaining: number;
};

type SalaryPaymentRow = {
  id: string;
  transactionDate: string;
  memberId: string | null;
  employeeName: string;
  bankName: string;
  amount: number;
};

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

function formatDate(
  value: string,
): string {
  if (!value) return "-";

  const date = new Date(
    `${value}T00:00:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return value;
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

function calculatePaymentFee(
  paymentSection: PaymentSummary["dp"],
): number {
  if (paymentSection.status !== "paid") {
    return 0;
  }

  const paymentAmount = Number(
    paymentSection.payment?.amount ?? 0,
  );

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    return 0;
  }

  return (
    paymentAmount *
    PAYMENT_FEE_RATE
  );
}

function getMemberName(
  membersById: Map<string, Member>,
  memberId:
    | string
    | null
    | undefined,
): string {
  if (!memberId) {
    return "Tidak diketahui";
  }

  return (
    membersById.get(memberId)?.name ??
    "Tidak diketahui"
  );
}

function getBankName(
  bankAccountsById: Map<
    string,
    FinanceBankAccount
  >,
  bankId:
    | string
    | null
    | undefined,
): string {
  if (!bankId) return "-";

  return (
    bankAccountsById.get(bankId)?.name ??
    "-"
  );
}

export default function GajiKaryawanPage() {
  const [search, setSearch] =
    useState("");

  const {
    data: financeData,
    isLoading: isLoadingFinance,
    isError: isFinanceError,
    error: financeError,
  } = useQuery<
    FinanceData,
    Error
  >({
    queryKey: ["finance"],
    queryFn: getFinanceData,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const {
    data: batchesData,
    isLoading: isLoadingBatches,
    isError: isBatchError,
    error: batchError,
  } = useQuery<
    Batch[],
    Error
  >({
    queryKey: [
      "gaji-karyawan-batches",
    ],
    queryFn: async () =>
      (
        await Promise.all(
          COUNTRIES.map(
            (country) =>
              getBatches(country),
          ),
        )
      ).flat(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const batches: Batch[] =
    batchesData ?? [];

  const {
    data: productCostsData,
    isLoading:
      isLoadingProductCosts,
    isError:
      isProductCostError,
    error:
      productCostError,
  } = useQuery<
    ProductCost[],
    Error
  >({
    queryKey: [
      "product-costs",
    ],
    queryFn:
      getProductCosts,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const productCosts: ProductCost[] =
    productCostsData ?? [];

  const {
    data: membersData,
    isLoading:
      isLoadingMembers,
    isError:
      isMemberError,
    error: memberError,
  } = useQuery<
    Member[],
    Error
  >({
    queryKey: ["members"],
    queryFn: () => getMembers(),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const members: Member[] =
    membersData ?? [];

  const membersById =
    useMemo(() => {
      const map =
        new Map<
          string,
          Member
        >();

      members.forEach(
        (member) =>
          map.set(
            member.id,
            member,
          ),
      );

      return map;
    }, [members]);

  const bankAccountsById =
    useMemo(() => {
      const map =
        new Map<
          string,
          FinanceBankAccount
        >();

      (
        financeData?.bank_accounts ??
        []
      ).forEach(
        (account) =>
          map.set(
            account.id,
            account,
          ),
      );

      return map;
    }, [
      financeData?.bank_accounts,
    ]);

  const productCostBatchIds =
    useMemo(
      () =>
        productCosts
          .map(
            (item) =>
              item.batch_id,
          )
          .sort(),
      [productCosts],
    );

  const {
    data:
      payrollByMemberData,
    isLoading:
      isLoadingProfit,
    isError:
      isProfitError,
    error: profitError,
  } = useQuery<
    {
      netProfitByMember: Record<string, number>;
      salaryByMember: Record<string, number>;
    },
    Error
  >({
    queryKey: [
      "gaji-karyawan-net-profit",
      productCostBatchIds,
    ],
    enabled:
      productCostBatchIds.length >
        0 &&
      batches.length > 0,
    queryFn: async () => {
      const result: Record<
        string,
        number
      > = {};

      const salaryResult: Record<
        string,
        number
      > = {};

      const relevantBatches =
        batches.filter(
          (batch) =>
            productCostBatchIds.includes(
              batch.id,
            ),
        );

      await Promise.all(
        relevantBatches.map(
          async (batch) => {
            const adminNyelemId =
              batch.admin_nyelem_id;

            const adminRekapId =
              batch.admin_rekap_id;

            if (
              !adminNyelemId &&
              !adminRekapId
            ) {
              return;
            }

            const productCost =
              productCosts.find(
                (item) =>
                  item.batch_id ===
                  batch.id,
              );

            if (!productCost) {
              return;
            }

            const recaps =
              (await getRecaps(
                batch.id,
              )) as RecapForPayroll[];

            if (
              recaps.length ===
              0
            ) {
              return;
            }

            const paymentSummaries =
              await Promise.all(
                recaps.map(
                  (recap) =>
                    getPaymentSummary(
                      recap.id,
                    ),
                ),
              );

            let batchTotalHargaJual =
              0;
            let batchQtyTerjual =
              0;
            let batchTotalFee =
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

                const dpPaid =
                  paymentSummary.dp
                    .status ===
                  "paid";

                const pelunasanPaid =
                  paymentSummary
                    .pelunasan
                    .status ===
                  "paid";

                if (
                  !dpPaid ||
                  !pelunasanPaid
                ) {
                  return;
                }

                const totalHargaJual =
                  Number(
                    recap.total_harga ??
                      0,
                  );

                const qty =
                  Number(
                    recap.qty ??
                      0,
                  );

                const totalFee =
                  calculatePaymentFee(
                    paymentSummary.dp,
                  ) +
                  calculatePaymentFee(
                    paymentSummary.pelunasan,
                  );

                if (
                  !Number.isFinite(
                    totalHargaJual,
                  ) ||
                  !Number.isFinite(
                    qty,
                  ) ||
                  !Number.isFinite(
                    totalFee,
                  )
                ) {
                  return;
                }

                batchTotalHargaJual +=
                  totalHargaJual;
                batchQtyTerjual +=
                  qty;
                batchTotalFee +=
                  totalFee;
              },
            );

            const modalPerQty =
              Number(
                productCost.modal_per_qty ??
                  0,
              );

            const totalModal =
              modalPerQty *
              batchQtyTerjual;

            const batchNetProfit =
              batchTotalHargaJual -
              totalModal -
              batchTotalFee;

            if (
              !Number.isFinite(
                batchNetProfit,
              )
            ) {
              return;
            }

            if (adminNyelemId) {
              result[
                adminNyelemId
              ] =
                (result[
                  adminNyelemId
                ] ?? 0) +
                batchNetProfit;

              salaryResult[
                adminNyelemId
              ] =
                (salaryResult[
                  adminNyelemId
                ] ?? 0) +
                batchNetProfit *
                SALARY_RATE;
            }

            if (adminRekapId) {
              result[
                adminRekapId
              ] =
                adminRekapId === adminNyelemId
                  ? result[adminRekapId] ?? 0
                  : (result[
                      adminRekapId
                    ] ?? 0) +
                    batchNetProfit;

              salaryResult[
                adminRekapId
              ] =
                (salaryResult[
                  adminRekapId
                ] ?? 0) +
                batchNetProfit *
                SALARY_RATE;
            }
          },
        ),
      );

      return {
        netProfitByMember: result,
        salaryByMember: salaryResult,
      };
    },
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const netProfitByMember: Record<
    string,
    number
  > =
    payrollByMemberData?.netProfitByMember ?? {};

  const salaryByMember: Record<
    string,
    number
  > =
    payrollByMemberData?.salaryByMember ?? {};

  const salaryTransactions =
    useMemo(() => {
      const transactions =
        (financeData?.transactions ??
          []) as PayrollFinanceTransaction[];

      return transactions.filter(
        (transaction) =>
          transaction.type ===
            "expense" &&
          transaction.description
            .trim()
            .toLowerCase()
            .startsWith(
              "gaji",
            ),
      );
    }, [
      financeData?.transactions,
    ]);

  const paidByMember =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >();

      salaryTransactions.forEach(
        (transaction) => {
          const memberId =
            transaction.to_member_id;

          if (!memberId) return;

          const amount = Number(
            transaction.amount ??
              0,
          );

          if (
            !Number.isFinite(
              amount,
            ) ||
            amount <= 0
          ) {
            return;
          }

          map.set(
            memberId,
            (map.get(
              memberId,
            ) ?? 0) + amount,
          );
        },
      );

      return map;
    }, [salaryTransactions]);

  const salaryRows =
    useMemo<
      EmployeeSalaryRow[]
    >(() => {
      const employeeMembers =
        members.filter(
          (member) =>
            member.type ===
            "employee",
        );

      return employeeMembers
        .map((member) => {
          const memberId =
            member.id;

          const netProfit =
            Math.max(
              0,
              Number(
                netProfitByMember[
                  memberId
                ] ?? 0,
              ),
            );

          const salary =
            Math.max(
              0,
              Number(
                salaryByMember[
                  memberId
                ] ?? 0,
              ),
            );

          const paid =
            Math.max(
              0,
              Number(
                paidByMember.get(
                  memberId,
                ) ?? 0,
              ),
            );

          return {
            memberId,
            name: member.name,
            phone: member.phone,
            netProfit,
            salary,
            paid,
            remaining:
              salary - paid,
          };
        })
        .sort((a, b) =>
          b.netProfit !==
          a.netProfit
            ? b.netProfit -
              a.netProfit
            : a.name.localeCompare(
                b.name,
              ),
        );
    }, [
      members,
      netProfitByMember,
      salaryByMember,
      paidByMember,
    ]);

  const filteredSalaryRows =
    useMemo(() => {
      const keyword =
        String(search ?? "")
          .trim()
          .toLowerCase();

      if (!keyword) {
        return salaryRows;
      }

      return salaryRows.filter(
        (row) =>
          row.name
            .toLowerCase()
            .includes(
              keyword,
            ),
      );
    }, [
      salaryRows,
      search,
    ]);

  const totalNetProfit =
    useMemo(
      () =>
        salaryRows.reduce(
          (total, row) =>
            total +
            row.netProfit,
          0,
        ),
      [salaryRows],
    );

  const totalSalary =
    useMemo(
      () =>
        salaryRows.reduce(
          (total, row) =>
            total +
            row.salary,
          0,
        ),
      [salaryRows],
    );

  const totalPaidSalary =
    useMemo(
      () =>
        salaryRows.reduce(
          (total, row) =>
            total +
            row.paid,
          0,
        ),
      [salaryRows],
    );

  const totalUnpaidSalary =
    useMemo(
      () =>
        salaryRows.reduce(
          (total, row) =>
            total +
            row.remaining,
          0,
        ),
      [salaryRows],
    );

  const salaryHistory:
    SalaryPaymentRow[] =
    useMemo(
      () =>
        salaryTransactions.map(
          (transaction) => {
            const memberId =
              transaction.to_member_id ??
              null;

            return {
              id: transaction.id,
              transactionDate:
                transaction.transaction_date,
              memberId,
              employeeName:
                getMemberName(
                  membersById,
                  memberId,
                ),
              bankName:
                getBankName(
                  bankAccountsById,
                  transaction.from_bank_account_id,
                ),
              amount: Number(
                transaction.amount ??
                  0,
              ),
            };
          },
        ),
      [
        salaryTransactions,
        membersById,
        bankAccountsById,
      ],
    );

  const hasError =
    isFinanceError ||
    isBatchError ||
    isProductCostError ||
    isMemberError ||
    isProfitError;

  const errorMessage =
    financeError?.message ||
    batchError?.message ||
    productCostError?.message ||
    memberError?.message ||
    profitError?.message ||
    "Gagal mengambil data gaji karyawan.";

  const isLoading =
    isLoadingFinance ||
    isLoadingBatches ||
    isLoadingProductCosts ||
    isLoadingMembers ||
    isLoadingProfit;

  return (
    <div className="min-h-screen bg-[#f8faff] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Gaji Karyawan
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Pantau perhitungan gaji
              (10% dari keuntungan
              bersih) dan riwayat
              pembayaran gaji
              karyawan.
            </p>
          </div>

          <div className="relative w-full lg:w-[280px]">
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Cari karyawan..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-300 focus:ring-2 focus:ring-slate-100"
            />
          </div>
        </div>

        {hasError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Total Keuntungan Bersih"
            value={
              isLoading
                ? "..."
                : formatRupiah(
                    totalNetProfit,
                  )
            }
            icon={
              <TrendingUp
                size={22}
              />
            }
            iconClass="bg-blue-50 text-blue-600"
          />

          <SummaryCard
            label="Total Gaji Karyawan (10%)"
            value={
              isLoading
                ? "..."
                : formatRupiah(
                    totalSalary,
                  )
            }
            icon={
              <CircleDollarSign
                size={22}
              />
            }
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <SummaryCard
            label="Total Gaji Sudah Dibayar"
            value={
              isLoading
                ? "..."
                : formatRupiah(
                    totalPaidSalary,
                  )
            }
            icon={
              <BadgeCheck
                size={22}
              />
            }
            iconClass="bg-violet-50 text-violet-600"
          />

          <SummaryCard
            label="Total Gaji Belum Dibayar"
            value={
              isLoading
                ? "..."
                : formatRupiah(
                    totalUnpaidSalary,
                  )
            }
            icon={
              <Clock3 size={22} />
            }
            iconClass="bg-amber-50 text-amber-600"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="text-base font-semibold text-slate-900">
              Daftar Gaji Karyawan
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Gaji dihitung sebesar
              10% dari keuntungan
              bersih masing-masing
              karyawan.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  {[
                    [
                      "No",
                      "text-center",
                    ],
                    [
                      "Nama Karyawan",
                      "text-center",
                    ],
                    [
                      "No. WA",
                      "text-center",
                    ],
                    [
                      "Total Keuntungan Bersih",
                      "text-center",
                    ],
                    [
                      "Gaji Karyawan (10%)",
                      "text-center",
                    ],
                    [
                      "Sudah Dibayar",
                      "text-center",
                    ],
                    [
                      "Sisa Gaji",
                      "text-center",
                    ],
                    [
                      "Status",
                      "text-center",
                    ],
                  ].map(
                    ([
                      label,
                      align,
                    ]) => (
                      <th
                        key={label}
                        className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${align}`}
                      >
                        {label}
                      </th>
                    ),
                  )}
                </tr>
              </thead>

              <tbody>
                {filteredSalaryRows.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        8
                      }
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      {isLoading
                        ? "Memuat data gaji..."
                        : search
                          ? "Karyawan tidak ditemukan."
                          : "Belum ada data karyawan."}
                    </td>
                  </tr>
                ) : (
                  filteredSalaryRows.map(
                    (
                      row,
                      index,
                    ) => {
                      const isLoan =
                        row.remaining < 0;

                      const isPaid =
                        !isLoan &&
                        row.salary > 0 &&
                        row.remaining === 0;

                      const isPartial =
                        !isLoan &&
                        row.salary > 0 &&
                        row.paid > 0 &&
                        row.remaining > 0;

                      const hasNoSalary =
                        !isLoan &&
                        row.salary <= 0 &&
                        row.paid <= 0;

                      return (
                        <tr
                          key={
                            row.memberId
                          }
                          className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                        >
                          <td className="px-5 py-4 text-center text-sm text-slate-600">
                            {index +
                              1}
                          </td>

                          <td className="px-5 py-4 text-center text-sm font-medium text-slate-900">
                            {
                              row.name
                            }
                          </td>

                          <td className="px-5 py-4 text-center text-sm text-slate-700">
                            {
                              row.phone
                            }
                          </td>

                          <td className="px-5 py-4 text-center text-sm text-slate-700">
                            {formatRupiah(
                              row.netProfit,
                            )}
                          </td>

                          <td className="px-5 py-4 text-center text-sm font-semibold text-slate-900">
                            {formatRupiah(
                              row.salary,
                            )}
                          </td>

                          <td className="px-5 py-4 text-center text-sm text-emerald-600">
                            {formatRupiah(
                              row.paid,
                            )}
                          </td>

                          <td
                            className={[
                              "px-5 py-4 text-center text-sm",
                              row.remaining < 0
                                ? "text-red-600"
                                : "text-amber-600",
                            ].join(" ")}
                          >
                            {formatRupiah(
                              row.remaining,
                            )}
                          </td>

                          <td className="px-5 py-4 text-center">
                            {isLoan ? (
                              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                Pinjaman
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                Lunas
                              </span>
                            ) : isPartial ? (
                              <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                                Sebagian
                              </span>
                            ) : hasNoSalary ? (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                Belum Ada Gaji
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                Belum Dibayar
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Riwayat Pembayaran Gaji
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Data diambil langsung
                dari Arus Dana
                dengan keterangan
                &quot;Gaji&quot;.
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-slate-600">
              <WalletCards
                size={20}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    No
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tanggal
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Karyawan
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Dari Bank
                  </th>

                  <th className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Nominal
                  </th>
                </tr>
              </thead>

              <tbody>
                {salaryHistory.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={
                        5
                      }
                      className="px-5 py-10 text-center text-sm text-slate-500"
                    >
                      Belum ada riwayat
                      pembayaran gaji.
                    </td>
                  </tr>
                ) : (
                  salaryHistory.map(
                    (
                      payment,
                      index,
                    ) => (
                      <tr
                        key={
                          payment.id
                        }
                        className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50"
                      >
                        <td className="px-5 py-4 text-center text-sm text-slate-600">
                          {index +
                            1}
                        </td>

                        <td className="px-5 py-4 text-center text-sm text-slate-700">
                          {formatDate(
                            payment.transactionDate,
                          )}
                        </td>

                        <td className="px-5 py-4 text-center text-sm font-medium text-slate-900">
                          {
                            payment.employeeName
                          }
                        </td>

                        <td className="px-5 py-4 text-center text-sm text-slate-700">
                          {
                            payment.bankName
                          }
                        </td>

                        <td className="px-5 py-4 text-center text-sm font-semibold text-slate-900">
                          {formatRupiah(
                            payment.amount,
                          )}
                        </td>
                      </tr>
                    ),
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon,
  iconClass,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-900">
            {value}
          </p>
        </div>

        <div
          className={`rounded-xl p-3 ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}