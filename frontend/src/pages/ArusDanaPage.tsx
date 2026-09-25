import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  WalletCards,
  Plus,
} from "lucide-react";
import {
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import TambahTransaksiDialog from "../components/common/TambahTransaksiDialog";

import { canAccessPermission } from "../utils/permissions";

import {
  getFinanceData,
  type FinanceBankAccount,
  type FinanceTransaction,
} from "../services/financeService";
import {
  getMembers,
  type Member,
} from "../services/memberService";

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
  ).format(value);
}

function formatDate(
  value: string,
): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  ).format(
    new Date(
      `${value}T00:00:00`,
    ),
  );
}

function getTransactionTypeLabel(
  type: FinanceTransaction["type"],
): string {
  switch (type) {
    case "income":
      return "Pemasukan";

    case "expense":
      return "Pengeluaran";

    case "transfer":
      return "Transfer";

    default:
      return "-";
  }
}

function getTransactionTypeClass(
  type: FinanceTransaction["type"],
): string {
  switch (type) {
    case "income":
      return "bg-[#effcf4] text-[#16a34a]";

    case "expense":
      return "bg-[#fff1f2] text-[#ef4444]";

    case "transfer":
      return "bg-[#eef4ff] text-[#1457ff]";

    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getBankName(
  bankAccounts: FinanceBankAccount[],
  bankId: string | null,
): string {
  if (!bankId) {
    return "-";
  }

  return (
    bankAccounts.find(
      (account) =>
        account.id === bankId,
    )?.name ?? "-"
  );
}

function getMemberName(
  members: Member[],
  memberId: string | null | undefined,
): string {
  if (!memberId) {
    return "Seller";
  }

  return (
    members.find(
      (member) =>
        member.id === memberId,
    )?.name ?? "Seller"
  );
}

/* =========================================
   PAGE
========================================= */

export default function ArusDanaPage() {
  const queryClient =
    useQueryClient();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["finance"],
    queryFn: getFinanceData,
  });

  const { data: members = [] } =
    useQuery<Member[], Error>({
      queryKey: ["members"],
      queryFn: () => getMembers(),
    });

  const [isAddTransactionOpen, setIsAddTransactionOpen] =
    useState(false);

  function handleOpenAddTransaction() {
    setIsAddTransactionOpen(true);
  }

  async function handleTransactionSuccess() {
    await queryClient.invalidateQueries({
      queryKey: ["finance"],
    });

    setIsAddTransactionOpen(false);
  }

  /* =========================================
     LOADING
  ========================================= */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8faff] text-left">
        <div className="w-full px-6 py-8 lg:px-8">
          <div className="rounded-xl border border-[#edf0f6] bg-white p-20 text-center shadow-sm">
            <p className="text-base text-[#7a89ad]">
              Memuat data keuangan...
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* =========================================
     ERROR
  ========================================= */

  if (
    isError ||
    !data
  ) {
    return (
      <div className="min-h-screen bg-[#f8faff] text-left">
        <div className="w-full px-6 py-8 lg:px-8">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6">
            <p className="text-sm font-medium text-red-600">
              Gagal mengambil data keuangan.
            </p>

            <p className="mt-2 text-sm text-[#7a89ad]">
              {error instanceof Error
                ? error.message
                : "Terjadi kesalahan saat mengambil data."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const {
    summary,
    bank_accounts,
    transactions,
  } = data;

  return (
    <>
      <div className="min-h-screen bg-[#f8faff] text-left">
        <div className="w-full px-6 py-8 lg:px-8">

          {/* =================================
              HEADER
          ================================== */}

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">

            <div>

              <h1 className="text-3xl font-bold tracking-tight text-[#10245c]">
                Keuangan / Arus Dana
              </h1>

              <p className="mt-2 text-sm text-[#5d6f9f]">
                Pantau arus dana, saldo rekening,
                dan riwayat transaksi keuangan.
              </p>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row">

              {/* TAMBAH TRANSAKSI */}

              {canAccessPermission("finance.create") && (
                <button
                  type="button"
                  onClick={
                    handleOpenAddTransaction
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#1457ff] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#0d4be0] active:scale-[0.99]"
                >
                  <Plus className="h-5 w-5" />

                  Tambah Transaksi
                </button>
              )}

            </div>

          </div>

          {/* =================================
              SUMMARY
          ================================== */}

          <section className="mt-7 rounded-xl border border-[#edf0f6] bg-white shadow-sm">

            <div className="grid grid-cols-1 gap-6 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">

              {/* TOTAL SALDO */}

              <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff]">
                  <WalletCards className="h-5 w-5 text-[#1457ff]" />
                </div>

                <div className="min-w-0">

                  <p className="text-sm text-[#65749b]">
                    Total Saldo
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#10245c]">
                    {formatRupiah(
                      summary.total_balance,
                    )}
                  </p>

                </div>

              </div>

              {/* TOTAL PEMASUKAN */}

              <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#effcf4]">
                  <ArrowDownLeft className="h-5 w-5 text-[#16a34a]" />
                </div>

                <div className="min-w-0">

                  <p className="text-sm text-[#65749b]">
                    Total Pemasukan
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#10245c]">
                    {formatRupiah(
                      summary.total_income,
                    )}
                  </p>

                </div>

              </div>

              {/* TOTAL PENGELUARAN */}

              <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff1f2]">
                  <ArrowUpRight className="h-5 w-5 text-[#ef4444]" />
                </div>

                <div className="min-w-0">

                  <p className="text-sm text-[#65749b]">
                    Total Pengeluaran
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#10245c]">
                    {formatRupiah(
                      summary.total_expense,
                    )}
                  </p>

                </div>

              </div>

              {/* TOTAL TRANSFER */}

              <div className="flex min-w-0 items-center gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff]">
                  <ArrowLeftRight className="h-5 w-5 text-[#1457ff]" />
                </div>

                <div className="min-w-0">

                  <p className="text-sm text-[#65749b]">
                    Total Transfer
                  </p>

                  <p className="mt-1 text-xl font-bold text-[#10245c]">
                    {formatRupiah(
                      summary.total_transfer,
                    )}
                  </p>

                </div>

              </div>

            </div>

          </section>

          {/* =================================
              SALDO REKENING
          ================================== */}

          <section className="mt-6 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">

            <div className="border-b border-[#edf0f6] px-6 py-6">

              <h2 className="text-base font-semibold text-[#17285d]">
                Saldo Rekening
              </h2>

              <p className="mt-1 text-sm text-[#7a89ad]">
                Ringkasan saldo dan pergerakan dana
                setiap rekening.
              </p>

            </div>

            {bank_accounts.length === 0 ? (

              <div className="px-6 py-20 text-center">

                <p className="text-base font-medium text-[#20366f]">
                  Belum ada rekening
                </p>

                <p className="mt-2 text-sm text-[#7a89ad]">
                  Belum ada data rekening yang tersedia.
                </p>

              </div>

            ) : (

              <>
                {/* =================================
                    MOBILE CARDS
                ================================== */}

                <div className="space-y-4 p-4 md:hidden">

                  {bank_accounts.map(
                    (account) => (
                      <article
                        key={account.id}
                        className="rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm"
                      >

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-base font-semibold text-[#20366f]">
                              {account.name}
                            </p>

                            {account.account_number && (
                              <p className="mt-1 text-xs text-[#7a89ad]">
                                {account.account_number}
                              </p>
                            )}
                          </div>

                          <div
                            className={[
                              "shrink-0 text-right text-sm font-semibold",
                              account.balance < 0
                                ? "text-[#ef4444]"
                                : "text-[#10245c]",
                            ].join(" ")}
                          >
                            {formatRupiah(
                              account.balance,
                            )}
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[#edf0f6] pt-4">

                          <div className="rounded-lg bg-[#effcf4] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Pemasukan
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-[#16a34a]">
                              {formatRupiah(
                                account.total_income,
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg bg-[#fff1f2] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Pengeluaran
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-[#ef4444]">
                              {formatRupiah(
                                account.total_expense,
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg bg-[#eef4ff] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Transfer Masuk
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-[#1457ff]">
                              {formatRupiah(
                                account.total_transfer_in,
                              )}
                            </p>
                          </div>

                          <div className="rounded-lg bg-[#f4f7fc] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Transfer Keluar
                            </p>

                            <p className="mt-1 break-words text-sm font-semibold text-[#50628e]">
                              {formatRupiah(
                                account.total_transfer_out,
                              )}
                            </p>
                          </div>

                        </div>

                      </article>
                    ),
                  )}

                </div>

                {/* =================================
                    DESKTOP TABLE
                ================================== */}

                <div className="hidden overflow-x-auto md:block">

                  <table className="w-full min-w-[950px] border-collapse">

                  <thead>

                    <tr className="border-b border-[#e8ecf4] bg-white">

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Rekening
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Saldo Saat Ini
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Pemasukan
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Pengeluaran
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Transfer Masuk
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Transfer Keluar
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {bank_accounts.map(
                      (account) => (
                        <tr
                          key={account.id}
                          className="border-b border-[#eef1f6] last:border-b-0 hover:bg-[#fbfcff]"
                        >

                          <td className="px-6 py-5 text-center">

                            <div>

                              <p className="text-sm font-medium text-[#20366f]">
                                {account.name}
                              </p>

                              {account.account_number && (
                                <p className="mt-1 text-xs text-[#7a89ad]">
                                  {account.account_number}
                                </p>
                              )}

                            </div>

                          </td>

                          <td className="px-6 py-5 text-center">

                            <span
                              className={[
                                "text-sm font-semibold",
                                account.balance < 0
                                  ? "text-[#ef4444]"
                                  : "text-[#10245c]",
                              ].join(" ")}
                            >
                              {formatRupiah(
                                account.balance,
                              )}
                            </span>

                          </td>

                          <td className="px-6 py-5 text-center text-sm text-[#16a34a]">
                            {formatRupiah(
                              account.total_income,
                            )}
                          </td>

                          <td className="px-6 py-5 text-center text-sm text-[#ef4444]">
                            {formatRupiah(
                              account.total_expense,
                            )}
                          </td>

                          <td className="px-6 py-5 text-center text-sm text-[#1457ff]">
                            {formatRupiah(
                              account.total_transfer_in,
                            )}
                          </td>

                          <td className="px-6 py-5 text-center text-sm text-[#50628e]">
                            {formatRupiah(
                              account.total_transfer_out,
                            )}
                          </td>

                        </tr>
                      ),
                    )}

                  </tbody>

                  </table>

                </div>
              </>

            )}

          </section>

          {/* =================================
              RIWAYAT TRANSAKSI
          ================================== */}

          <section className="mt-6 overflow-hidden rounded-xl border border-[#edf0f6] bg-white shadow-sm">

            <div className="border-b border-[#edf0f6] px-6 py-6">

              <h2 className="text-base font-semibold text-[#17285d]">
                Riwayat Transaksi
              </h2>

              <p className="mt-1 text-sm text-[#7a89ad]">
                Riwayat pergerakan dana yang tercatat
                dalam sistem.
              </p>

            </div>

            {transactions.length === 0 ? (

              <div className="px-6 py-20 text-center">

                <p className="text-base font-medium text-[#20366f]">
                  Belum ada transaksi keuangan
                </p>

                <p className="mt-2 text-sm text-[#7a89ad]">
                  Tambahkan transaksi menggunakan tombol
                  Tambah Transaksi.
                </p>

              </div>

            ) : (

              <>
                {/* =================================
                    MOBILE CARDS
                ================================== */}

                <div className="space-y-4 p-4 md:hidden">

                  {transactions.map(
                    (transaction) => (
                      <article
                        key={transaction.id}
                        className="rounded-xl border border-[#edf0f6] bg-white p-4 shadow-sm"
                      >

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-[#7a89ad]">
                              {formatDate(
                                transaction.transaction_date,
                              )}
                            </p>

                            <p className="mt-1 break-words text-base font-semibold text-[#20366f]">
                              {transaction.description}
                            </p>
                          </div>

                          <span
                            className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${getTransactionTypeClass(
                              transaction.type,
                            )}`}
                          >
                            {getTransactionTypeLabel(
                              transaction.type,
                            )}
                          </span>
                        </div>

                        <div className="mt-4 border-t border-[#edf0f6] pt-4">

                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Dari
                            </p>

                            <p className="mt-1 break-words text-sm text-[#50628e]">
                              {transaction.type === "income"
                                ? "Customer"
                                : getBankName(
                                    bank_accounts,
                                    transaction.from_bank_account_id,
                                  )}
                            </p>
                          </div>

                          <div className="mt-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                              Ke
                            </p>

                            <p className="mt-1 break-words text-sm text-[#50628e]">
                              {transaction.type === "expense"
                                ? getMemberName(
                                    members,
                                    (
                                      transaction as FinanceTransaction & {
                                        to_member_id?: string | null;
                                      }
                                    ).to_member_id,
                                  )
                                : getBankName(
                                    bank_accounts,
                                    transaction.to_bank_account_id,
                                  )}
                            </p>
                          </div>

                        </div>

                        <div className="mt-4 rounded-lg border border-[#edf0f6] bg-[#f8faff] p-4">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a89ad]">
                            Nominal
                          </p>

                          <p className="mt-1 text-lg font-bold text-[#10245c]">
                            {formatRupiah(
                              transaction.amount,
                            )}
                          </p>
                        </div>

                      </article>
                    ),
                  )}

                </div>

                {/* =================================
                    DESKTOP TABLE
                ================================== */}

                <div className="hidden overflow-x-auto md:block">

                  <table className="w-full min-w-[1000px] border-collapse">

                  <thead>

                    <tr className="border-b border-[#e8ecf4] bg-white">

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Tanggal
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Jenis
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Keterangan
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Dari
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Ke
                      </th>

                      <th className="px-6 py-5 text-center text-sm font-semibold text-[#17285d]">
                        Nominal
                      </th>

                    </tr>

                  </thead>

                  <tbody>

                    {transactions.map(
                      (transaction) => (
                        <tr
                          key={transaction.id}
                          className="border-b border-[#eef1f6] last:border-b-0 hover:bg-[#fbfcff]"
                        >

                          <td className="px-6 py-5 text-center text-sm text-[#20366f]">
                            {formatDate(
                              transaction.transaction_date,
                            )}
                          </td>

                          <td className="px-6 py-5 text-center">

                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getTransactionTypeClass(
                                transaction.type,
                              )}`}
                            >
                              {getTransactionTypeLabel(
                                transaction.type,
                              )}
                            </span>

                          </td>

                          <td className="px-6 py-5">

                            <p className="text-center text-sm font-medium text-[#20366f]">
                              {transaction.description}
                            </p>

                          </td>

                          <td className="px-6 py-5 text-center text-sm text-[#50628e]">
                            {transaction.type === "income"
                              ? "Customer"
                              : getBankName(
                                  bank_accounts,
                                  transaction.from_bank_account_id,
                                )}
                          </td>

                          <td className="px-6 py-5 text-center text-sm text-[#50628e]">
                            {transaction.type === "expense"
                              ? getMemberName(
                                  members,
                                  (
                                    transaction as FinanceTransaction & {
                                      to_member_id?: string | null;
                                    }
                                  ).to_member_id,
                                )
                              : getBankName(
                                  bank_accounts,
                                  transaction.to_bank_account_id,
                                )}
                          </td>

                          <td className="px-6 py-5 text-center text-sm font-semibold text-[#10245c]">
                            {formatRupiah(
                              transaction.amount,
                            )}
                          </td>

                        </tr>
                      ),
                    )}

                  </tbody>

                  </table>

                </div>
              </>

            )}

          </section>

        </div>
      </div>

      <TambahTransaksiDialog
        isOpen={isAddTransactionOpen}
        bankAccounts={bank_accounts}
        onClose={() => setIsAddTransactionOpen(false)}
        onSuccess={handleTransactionSuccess}
      />

    </>
  );
}
