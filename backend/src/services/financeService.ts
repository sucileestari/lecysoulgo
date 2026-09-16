import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type FinanceTransactionType =
  | "income"
  | "expense"
  | "transfer";

export type FinanceTransaction = {
  id: string;
  transaction_date: string;
  type: FinanceTransactionType;
  description: string;
  amount: number;
  from_bank_account_id:
    | string
    | null;
  to_bank_account_id:
    | string
    | null;
  from_member_id:
    | string
    | null;
  to_member_id:
    | string
    | null;
  reference_type:
    | string
    | null;
  reference_id:
    | string
    | null;
  created_at: string;
  updated_at: string;
};

export type FinanceBankAccount = {
  id: string;
  name: string;
  account_number:
    | string
    | null;
  is_active: boolean;
  balance: number;
  total_income: number;
  total_expense: number;
  total_transfer_in: number;
  total_transfer_out: number;
};

export type FinanceSummary = {
  total_balance: number;
  total_income: number;
  total_expense: number;
  total_transfer: number;
};

export type FinanceResult = {
  summary: FinanceSummary;
  bank_accounts: FinanceBankAccount[];
  transactions: FinanceTransaction[];
};

export type CreateFinanceTransactionInput = {
  transaction_date: string;
  type: FinanceTransactionType;
  description: string;
  amount: number;
  from_bank_account_id?:
    | string
    | null;
  to_bank_account_id?:
    | string
    | null;
  from_member_id?:
    | string
    | null;
  to_member_id?:
    | string
    | null;
  reference_type?:
    | string
    | null;
  reference_id?:
    | string
    | null;
};

/* =========================================
   CREATE FINANCE TRANSACTION
========================================= */

export async function createFinanceTransaction(
  input: CreateFinanceTransactionInput,
): Promise<FinanceTransaction> {
  const transactionDate =
    input.transaction_date?.trim();

  const type =
    input.type;

  const description =
    input.description?.trim();

  const amount =
    Number(input.amount);

  const fromBankAccountId =
    input.from_bank_account_id ??
    null;

  const toBankAccountId =
    input.to_bank_account_id ??
    null;

  const fromMemberId =
    input.from_member_id ??
    null;

  const toMemberId =
    input.to_member_id ??
    null;

  const referenceType =
    input.reference_type?.trim() ||
    null;

  const referenceId =
    input.reference_id ??
    null;

  /* =======================================
     PROFIT TRANSACTION
  ======================================== */

  if (referenceType === "profit") {
    if (!referenceId) {
      throw new Error(
        "Reference ID keuntungan wajib diisi.",
      );
    }

    const syncedProfit =
      await syncProfitToCimb({
        product_cost_id:
          referenceId,
        transaction_date:
          transactionDate,
        description,
        amount,
      });

    if (!syncedProfit) {
      throw new Error(
        "Transaksi keuntungan tidak dibuat karena nominal keuntungan harus lebih besar dari 0.",
      );
    }

    return syncedProfit;
  }

  /* =======================================
     BASIC VALIDATION
  ======================================== */

  if (!transactionDate) {
    throw new Error(
      "Tanggal transaksi wajib diisi.",
    );
  }

  if (
    type !== "income" &&
    type !== "expense" &&
    type !== "transfer"
  ) {
    throw new Error(
      "Jenis transaksi tidak valid.",
    );
  }

  if (!description) {
    throw new Error(
      "Keterangan wajib diisi.",
    );
  }

  if (
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    throw new Error(
      "Nominal harus lebih besar dari 0.",
    );
  }

  if (
    fromMemberId &&
    toMemberId &&
    fromMemberId === toMemberId
  ) {
    throw new Error(
      "Member asal dan penerima tidak boleh sama.",
    );
  }

  /* =======================================
     VALIDASI BERDASARKAN TIPE
  ======================================== */

  if (type === "income") {
    if (!toBankAccountId) {
      throw new Error(
        "Rekening tujuan wajib dipilih untuk pemasukan.",
      );
    }

    if (fromBankAccountId) {
      throw new Error(
        "Pemasukan tidak boleh memiliki rekening asal.",
      );
    }

    if (toMemberId) {
      throw new Error(
        "Pemasukan tidak boleh memiliki member penerima.",
      );
    }
  }

  if (type === "expense") {
    if (!fromBankAccountId) {
      throw new Error(
        "Rekening asal wajib dipilih untuk pengeluaran.",
      );
    }

    if (toBankAccountId) {
      throw new Error(
        "Pengeluaran tidak boleh memiliki rekening tujuan.",
      );
    }

    if (fromMemberId) {
      throw new Error(
        "Pengeluaran tidak boleh memiliki member asal.",
      );
    }
  }

  if (type === "transfer") {
    if (
      !fromBankAccountId ||
      !toBankAccountId
    ) {
      throw new Error(
        "Rekening asal dan tujuan wajib dipilih untuk transfer.",
      );
    }

    if (
      fromBankAccountId ===
      toBankAccountId
    ) {
      throw new Error(
        "Rekening asal dan tujuan tidak boleh sama.",
      );
    }

    if (fromMemberId || toMemberId) {
      throw new Error(
        "Transfer tidak boleh memiliki member asal atau penerima.",
      );
    }
  }

  /* =======================================
     VALIDASI REKENING
  ======================================== */

  const bankAccountIds = [
    fromBankAccountId,
    toBankAccountId,
  ].filter(
    (
      value,
    ): value is string =>
      Boolean(value),
  );

  if (bankAccountIds.length > 0) {
    const {
      data: bankAccounts,
      error: bankAccountsError,
    } = await supabase
      .from("bank_accounts")
      .select(
        `
          id,
          is_active
        `,
      )
      .in(
        "id",
        bankAccountIds,
      );

    if (bankAccountsError) {
      console.error(
        "createFinanceTransaction bank accounts error:",
        bankAccountsError,
      );

      throw new Error(
        "Gagal memvalidasi rekening.",
      );
    }

    const accountMap =
      new Map(
        (bankAccounts ?? []).map(
          (
            account,
          ) => [
            account.id,
            account,
          ],
        ),
      );

    for (
      const bankAccountId of bankAccountIds
    ) {
      const account =
        accountMap.get(
          bankAccountId,
        );

      if (!account) {
        throw new Error(
          "Rekening tidak ditemukan.",
        );
      }

      if (!account.is_active) {
        throw new Error(
          "Rekening yang dipilih tidak aktif.",
        );
      }
    }
  }

  /* =======================================
     VALIDASI MEMBER
  ======================================== */

  const memberIds = [
    fromMemberId,
    toMemberId,
  ].filter(
    (
      value,
    ): value is string =>
      Boolean(value),
  );

  if (memberIds.length > 0) {
    const {
      data: members,
      error: membersError,
    } = await supabase
      .from("members")
      .select(
        `
          id
        `,
      )
      .in(
        "id",
        memberIds,
      );

    if (membersError) {
      console.error(
        "createFinanceTransaction members error:",
        membersError,
      );

      throw new Error(
        "Gagal memvalidasi member.",
      );
    }

    const memberIdsFound =
      new Set(
        (members ?? []).map(
          (member) =>
            member.id,
        ),
      );

    for (
      const memberId of memberIds
    ) {
      if (!memberIdsFound.has(memberId)) {
        throw new Error(
          "Member tidak ditemukan.",
        );
      }
    }
  }

  /* =======================================
     INSERT
  ======================================== */

  const {
    data,
    error,
  } = await supabase
    .from("finance_transactions")
    .insert({
      transaction_date:
        transactionDate,

      type,

      description,

      amount,

      from_bank_account_id:
        fromBankAccountId,

      to_bank_account_id:
        toBankAccountId,

      from_member_id:
        fromMemberId,

      to_member_id:
        toMemberId,

      reference_type:
        referenceType,

      reference_id:
        referenceId,
    })
    .select(
      `
        id,
        transaction_date,
        type,
        description,
        amount,
        from_bank_account_id,
        to_bank_account_id,
        from_member_id,
        to_member_id,
        reference_type,
        reference_id,
        created_at,
        updated_at
      `,
    )
    .single();

  if (error) {
    console.error(
      "createFinanceTransaction insert error:",
      error,
    );

    throw new Error(
      "Gagal menyimpan transaksi keuangan.",
    );
  }

  return data as FinanceTransaction;
}

/* =========================================
   SYNC PROFIT TO CIMB
========================================= */

/**
 * Sinkronisasi keuntungan ke rekening CIMB.
 *
 * Aturan:
 * - selalu masuk ke rekening aktif bernama CIMB
 * - tidak menggunakan bank dari product_cost
 * - satu product_cost hanya memiliki satu transaksi profit
 * - jika nominal profit berubah, transaksi lama di-update
 * - jika profit <= 0, transaksi profit yang sudah ada dihapus
 */
export async function syncProfitToCimb(input: {
  product_cost_id: string;
  transaction_date: string;
  description: string;
  amount: number;
}): Promise<FinanceTransaction | null> {
  const productCostId =
    input.product_cost_id?.trim();

  const transactionDate =
    input.transaction_date?.trim();

  const description =
    input.description?.trim();

  const amount =
    Number(input.amount);

  if (!productCostId) {
    throw new Error(
      "Product cost ID wajib diisi.",
    );
  }

  if (!transactionDate) {
    throw new Error(
      "Tanggal transaksi keuntungan wajib diisi.",
    );
  }

  if (!description) {
    throw new Error(
      "Keterangan keuntungan wajib diisi.",
    );
  }

  if (!Number.isFinite(amount)) {
    throw new Error(
      "Nominal keuntungan tidak valid.",
    );
  }

  /* =======================================
     CARI CIMB
  ======================================== */

  const {
    data: cimbAccounts,
    error: cimbError,
  } = await supabase
    .from("bank_accounts")
    .select(
      `
        id,
        name,
        is_active
      `,
    )
    .ilike("name", "CIMB")
    .eq("is_active", true);

  if (cimbError) {
    console.error(
      "syncProfitToCimb cimb lookup error:",
      cimbError,
    );

    throw new Error(
      "Gagal mengambil rekening CIMB.",
    );
  }

  if (!cimbAccounts?.length) {
    throw new Error(
      "Rekening CIMB aktif tidak ditemukan.",
    );
  }

  if (cimbAccounts.length > 1) {
    throw new Error(
      "Terdapat lebih dari satu rekening CIMB aktif. Pastikan hanya ada satu rekening CIMB aktif untuk keuntungan.",
    );
  }

  const cimbBankAccountId =
    cimbAccounts[0].id;

  /* =======================================
     CARI TRANSAKSI PROFIT SEBELUMNYA
  ======================================== */

  const {
    data: existingProfit,
    error: existingProfitError,
  } = await supabase
    .from("finance_transactions")
    .select(
      `
        id,
        transaction_date,
        type,
        description,
        amount,
        from_bank_account_id,
        to_bank_account_id,
        from_member_id,
        to_member_id,
        reference_type,
        reference_id,
        created_at,
        updated_at
      `,
    )
    .eq(
      "reference_type",
      "profit",
    )
    .eq(
      "reference_id",
      productCostId,
    )
    .maybeSingle();

  if (existingProfitError) {
    console.error(
      "syncProfitToCimb existing profit lookup error:",
      existingProfitError,
    );

    throw new Error(
      "Gagal mengecek transaksi keuntungan sebelumnya.",
    );
  }

  /* =======================================
     PROFIT <= 0
  ======================================== */

  if (amount <= 0) {
    if (existingProfit) {
      const {
        error: deleteError,
      } = await supabase
        .from("finance_transactions")
        .delete()
        .eq(
          "id",
          existingProfit.id,
        );

      if (deleteError) {
        console.error(
          "syncProfitToCimb delete error:",
          deleteError,
        );

        throw new Error(
          "Gagal menghapus transaksi keuntungan.",
        );
      }
    }

    return null;
  }

  /* =======================================
     UPDATE TRANSAKSI YANG SUDAH ADA
  ======================================== */

  if (existingProfit) {
    const {
      data: updatedProfit,
      error: updateError,
    } = await supabase
      .from("finance_transactions")
      .update({
        transaction_date:
          transactionDate,

        type: "income",

        description,

        amount,

        from_bank_account_id:
          null,

        to_bank_account_id:
          cimbBankAccountId,

        from_member_id:
          null,

        to_member_id:
          null,

        reference_type:
          "profit",

        reference_id:
          productCostId,

        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        existingProfit.id,
      )
      .select(
        `
          id,
          transaction_date,
          type,
          description,
          amount,
          from_bank_account_id,
          to_bank_account_id,
          from_member_id,
          to_member_id,
          reference_type,
          reference_id,
          created_at,
          updated_at
        `,
      )
      .single();

    if (updateError) {
      console.error(
        "syncProfitToCimb update error:",
        updateError,
      );

      throw new Error(
        "Gagal memperbarui transaksi keuntungan.",
      );
    }

    return updatedProfit as FinanceTransaction;
  }

  /* =======================================
     CREATE TRANSAKSI PROFIT
  ======================================== */

  const {
    data: createdProfit,
    error: createError,
  } = await supabase
    .from("finance_transactions")
    .insert({
      transaction_date:
        transactionDate,

      type: "income",

      description,

      amount,

      from_bank_account_id:
        null,

      to_bank_account_id:
        cimbBankAccountId,

      from_member_id:
        null,

      to_member_id:
        null,

      reference_type:
        "profit",

      reference_id:
        productCostId,
    })
    .select(
      `
        id,
        transaction_date,
        type,
        description,
        amount,
        from_bank_account_id,
        to_bank_account_id,
        from_member_id,
        to_member_id,
        reference_type,
        reference_id,
        created_at,
        updated_at
      `,
    )
    .single();

  if (createError) {
    console.error(
      "syncProfitToCimb create error:",
      createError,
    );

    throw new Error(
      "Gagal membuat transaksi keuntungan.",
    );
  }

  return createdProfit as FinanceTransaction;
}

/* =========================================
   GET FINANCE DATA
========================================= */

export async function getFinanceData(): Promise<FinanceResult> {
  /* =======================================
     GET BANK ACCOUNTS
  ======================================== */

  const {
    data: bankAccountsData,
    error: bankAccountsError,
  } = await supabase
    .from("bank_accounts")
    .select(
      `
        id,
        name,
        account_number,
        is_active
      `,
    )
    .order("name", {
      ascending: true,
    });

  if (bankAccountsError) {
    console.error(
      "getFinanceData bank accounts error:",
      bankAccountsError,
    );

    throw new Error(
      "Gagal mengambil data rekening.",
    );
  }

  /* =======================================
     GET PRODUCT COSTS
  ======================================== */

  const {
    data: productCostsData,
    error: productCostsError,
  } = await supabase
    .from("product_costs")
    .select(
      `
        id,
        total_modal,
        transaction_date,
        bank_account_id,
        created_at,
        updated_at
      `,
    )
    .not(
      "bank_account_id",
      "is",
      null,
    )
    .not(
      "transaction_date",
      "is",
      null,
    );

  if (productCostsError) {
    console.error(
      "getFinanceData product costs error:",
      productCostsError,
    );

    throw new Error(
      "Gagal mengambil data modal.",
    );
  }

  /* =======================================
     GET FINANCE TRANSACTIONS
  ======================================== */

  const {
    data: financeTransactionsData,
    error: financeTransactionsError,
  } = await supabase
    .from("finance_transactions")
    .select(
      `
        id,
        transaction_date,
        type,
        description,
        amount,
        from_bank_account_id,
        to_bank_account_id,
        from_member_id,
        to_member_id,
        reference_type,
        reference_id,
        created_at,
        updated_at
      `,
    )
    .order("transaction_date", {
      ascending: false,
    })
    .order("created_at", {
      ascending: false,
    });

  if (financeTransactionsError) {
    console.error(
      "getFinanceData finance transactions error:",
      financeTransactionsError,
    );

    throw new Error(
      "Gagal mengambil data transaksi keuangan.",
    );
  }

  /* =======================================
     NORMALIZE DATA
  ======================================== */

  const bankAccounts =
    (bankAccountsData ?? []) as Array<{
      id: string;
      name: string;
      account_number:
        | string
        | null;
      is_active: boolean;
    }>;

  const productCosts =
    (productCostsData ?? []) as Array<{
      id: string;
      total_modal:
        | number
        | string;
      transaction_date:
        | string
        | null;
      bank_account_id:
        | string
        | null;
      created_at: string;
      updated_at: string;
    }>;

  const financeTransactions =
    (financeTransactionsData ??
      []) as FinanceTransaction[];

  /* =======================================
     INITIAL BANK ACCOUNT SUMMARY
  ======================================== */

  const bankAccountMap =
    new Map<
      string,
      FinanceBankAccount
    >();

  bankAccounts.forEach(
    (account) => {
      bankAccountMap.set(
        account.id,
        {
          id: account.id,

          name: account.name,

          account_number:
            account.account_number,

          is_active:
            account.is_active,

          balance: 0,

          total_income: 0,

          total_expense: 0,

          total_transfer_in: 0,

          total_transfer_out: 0,
        },
      );
    },
  );

  /* =======================================
     SUMMARY
  ======================================== */

  let totalIncome = 0;

  let totalExpense = 0;

  let totalTransfer = 0;

  /* =======================================
     PRODUCT COSTS

     product_costs merupakan
     pengeluaran modal.
  ======================================== */

  const productCostTransactions: FinanceTransaction[] =
    [];

  productCosts.forEach(
    (productCost) => {
      const amount =
        Number(
          productCost.total_modal,
        );

      const bankAccountId =
        productCost.bank_account_id;

      const transactionDate =
        productCost.transaction_date;

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0 ||
        !bankAccountId ||
        !transactionDate
      ) {
        return;
      }

      const bankAccount =
        bankAccountMap.get(
          bankAccountId,
        );

      if (!bankAccount) {
        return;
      }

      /* -----------------------------------
         SALDO
      ----------------------------------- */

      bankAccount.balance -=
        amount;

      bankAccount.total_expense +=
        amount;

      totalExpense +=
        amount;

      /* -----------------------------------
         RIWAYAT TRANSAKSI

         Hanya untuk tampilan Arus Dana.
         Tidak diproses ulang sebagai
         finance transaction.
      ----------------------------------- */

      productCostTransactions.push({
        id:
          `product-cost-${productCost.id}`,

        transaction_date:
          transactionDate,

        type: "expense",

        description:
          "Modal Penjualan",

        amount,

        from_bank_account_id:
          bankAccountId,

        to_bank_account_id:
          null,

        from_member_id:
          null,

        to_member_id:
          null,

        reference_type:
          "product_cost",

        reference_id:
          productCost.id,

        created_at:
          productCost.created_at,

        updated_at:
          productCost.updated_at,
      });
    },
  );

  /* =======================================
     FINANCE TRANSACTIONS
  ======================================== */

  financeTransactions.forEach(
    (transaction) => {
      const amount =
        Number(
          transaction.amount,
        );

      if (
        !Number.isFinite(
          amount,
        ) ||
        amount <= 0
      ) {
        return;
      }

      /* -----------------------------------
         INCOME
      ----------------------------------- */

      if (
        transaction.type ===
        "income"
      ) {
        const bankAccountId =
          transaction.to_bank_account_id;

        if (!bankAccountId) {
          return;
        }

        const bankAccount =
          bankAccountMap.get(
            bankAccountId,
          );

        if (!bankAccount) {
          return;
        }

        bankAccount.balance +=
          amount;

        bankAccount.total_income +=
          amount;

        totalIncome +=
          amount;

        return;
      }

      /* -----------------------------------
         EXPENSE
      ----------------------------------- */

      if (
        transaction.type ===
        "expense"
      ) {
        const bankAccountId =
          transaction.from_bank_account_id;

        if (!bankAccountId) {
          return;
        }

        const bankAccount =
          bankAccountMap.get(
            bankAccountId,
          );

        if (!bankAccount) {
          return;
        }

        bankAccount.balance -=
          amount;

        bankAccount.total_expense +=
          amount;

        totalExpense +=
          amount;

        return;
      }

      /* -----------------------------------
         TRANSFER
      ----------------------------------- */

      if (
        transaction.type ===
        "transfer"
      ) {
        const fromBankAccountId =
          transaction.from_bank_account_id;

        const toBankAccountId =
          transaction.to_bank_account_id;

        if (
          !fromBankAccountId ||
          !toBankAccountId
        ) {
          return;
        }

        const fromBankAccount =
          bankAccountMap.get(
            fromBankAccountId,
          );

        const toBankAccount =
          bankAccountMap.get(
            toBankAccountId,
          );

        if (
          !fromBankAccount ||
          !toBankAccount
        ) {
          return;
        }

        fromBankAccount.balance -=
          amount;

        fromBankAccount.total_transfer_out +=
          amount;

        toBankAccount.balance +=
          amount;

        toBankAccount.total_transfer_in +=
          amount;

        totalTransfer +=
          amount;
      }
    },
  );

  /* =======================================
     MERGE TRANSACTIONS

     Product costs + finance transactions
  ======================================== */

  const transactions =
    [
      ...productCostTransactions,
      ...financeTransactions,
    ].sort(
      (first, second) => {
        const dateComparison =
          second.transaction_date.localeCompare(
            first.transaction_date,
          );

        if (
          dateComparison !== 0
        ) {
          return dateComparison;
        }

        return second.created_at.localeCompare(
          first.created_at,
        );
      },
    );

  /* =======================================
     TOTAL BALANCE
  ======================================== */

  const totalBalance =
    Array.from(
      bankAccountMap.values(),
    ).reduce(
      (
        total,
        account,
      ) =>
        total +
        account.balance,
      0,
    );

  /* =======================================
     RETURN
  ======================================== */

  return {
    summary: {
      total_balance:
        totalBalance,

      total_income:
        totalIncome,

      total_expense:
        totalExpense,

      total_transfer:
        totalTransfer,
    },

    bank_accounts:
      Array.from(
        bankAccountMap.values(),
      ),

    transactions,
  };
}