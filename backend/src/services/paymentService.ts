import { supabase } from "../config/supabase.js";

import {
  createMidtransPaymentLink,
  deleteMidtransPaymentLink,
  generateMidtransOrderId,
  verifyMidtransNotificationSignature,
  type MidtransNotification,
} from "./midtransService.js";

/* =========================================
   TYPES
========================================= */

export type PaymentType =
  | "DP"
  | "PELUNASAN";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "expired"
  | "cancelled";

export type Payment = {
  id: string;

  recap_id: string;

  payment_type: PaymentType;

  /**
   * Nominal payment.
   *
   * Untuk payment baru:
   * nominal dasar + denda berjalan.
   */
  amount: number;

  status: PaymentStatus;

  provider: string;

  /**
   * Order ID dari payment provider.
   *
   * Untuk Midtrans berisi:
   * PAY-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   */
  provider_order_id?:
    | string
    | null;

  provider_transaction_id:
    | string
    | null;

  /**
   * URL Payment Link dari Midtrans.
   */
  payment_url?:
    | string
    | null;

  /**
   * Waktu Payment Link akan expired.
   */
  expires_at?:
    | string
    | null;

  /**
   * Metode pembayaran yang digunakan customer.
   *
   * Contoh:
   * qris
   * bank_transfer
   * gopay
   * dll.
   */
  payment_method?:
    | string
    | null;

  paid_at:
    | string
    | null;

  created_at: string;

  updated_at: string;

  /**
   * Informasi tambahan perhitungan denda.
   */
  base_amount?: number;

  penalty_days?: number;

  penalty_amount?: number;

  due_date?:
    | string
    | null;

  /**
   * Ijin telat bayar yang sedang aktif.
   */
  late_payment_permission?:
    | {
        id: string;

        payment_date: string;

        created_at: string;

        status:
          | "unpaid"
          | "paid";
      }
    | null;
};

export type CreatePaymentInput = {
  recap_id: string;

  payment_type: PaymentType;
};

/* =========================================
   CONSTANTS
========================================= */

/**
 * Denda keterlambatan:
 * Rp2.000 / hari.
 */
const LATE_PAYMENT_PENALTY_PER_DAY =
  2_000;

/* =========================================
   INTERNAL TYPES
========================================= */

type RecapPaymentContext = {
  id: string;

  qty: number;

  harga_barang: number;

  persentase_dp: number;

  batch_id: string;

  batch:
    | {
        id: string;

        last_payment_dp:
          | string
          | null;

        last_payment_pelunasan:
          | string
          | null;
      }
    | null;
};

type LatePermissionContext = {
  id: string;

  payment_date: string;

  payment_status:
    | "unpaid"
    | "paid";

  created_at: string;

  items: {
    recap_id: string;

    payment_type: PaymentType;
  }[];
};

/* =========================================
   DATE HELPERS
========================================= */

/**
 * Parse YYYY-MM-DD sebagai
 * local date tanpa time.
 */
function parseDateOnly(
  dateString: string,
): Date {
  return new Date(
    `${dateString}T00:00:00`,
  );
}

/**
 * Format Date menjadi YYYY-MM-DD.
 */
function formatDateOnly(
  date: Date,
): string {
  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    );

  const day =
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    );

  return `${year}-${month}-${day}`;
}

/**
 * Mendapatkan tanggal hari ini
 * tanpa jam.
 */
function getTodayDateOnly(): Date {
  const now =
    new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
}

/**
 * Menghasilkan timestamp
 * 23:59:59 WIB pada tanggal tertentu.
 *
 * Contoh:
 *
 * 2026-09-10
 *
 * menjadi:
 *
 * 2026-09-10 23:59:59 WIB
 *
 * yang disimpan sebagai UTC:
 *
 * 2026-09-10T16:59:59.000Z
 */
function getEndOfDayJakarta(
  date: Date,
): Date {
  const year =
    date.getFullYear();

  const month =
    date.getMonth();

  const day =
    date.getDate();

  /**
   * WIB = UTC+7.
   *
   * 23:59:59 WIB
   * = 16:59:59 UTC
   */
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      16,
      59,
      59,
    ),
  );
}

/**
 * Menghitung expiry Payment Link.
 *
 * RULE:
 *
 * 1. Jika hari ini belum melewati
 *    tanggal jatuh tempo:
 *
 *    expiry = tanggal jatuh tempo
 *             23:59:59 WIB
 *
 * 2. Jika hari ini sudah melewati
 *    tanggal jatuh tempo:
 *
 *    expiry = hari ini
 *             23:59:59 WIB
 *
 * Dengan aturan ini:
 *
 * Sebelum jatuh tempo:
 * link berlaku sampai due date.
 *
 * Setelah jatuh tempo:
 * setiap link baru hanya berlaku
 * sampai hari itu saja.
 */
function getPaymentLinkExpiry(
  hasPenalty: boolean,
): Date {
  const expiresAt = new Date();
  const durationDays = hasPenalty ? 1 : 7;

  expiresAt.setDate(
    expiresAt.getDate() + durationDays,
  );

  expiresAt.setHours(
    23,
    59,
    59,
    999,
  );

  return expiresAt;
}
/**
 * Menghitung selisih hari.
 *
 * Contoh:
 *
 * 5 Sep -> 7 Sep = 2
 */
function differenceInDays(
  from: Date,
  to: Date,
): number {
  const millisecondsPerDay =
    1000 *
    60 *
    60 *
    24;

  return Math.floor(
    (
      to.getTime() -
      from.getTime()
    ) /
      millisecondsPerDay,
  );
}

/**
 * Tambah sejumlah hari.
 */
function addDays(
  date: Date,
  amount: number,
): Date {
  const result =
    new Date(date);

  result.setDate(
    result.getDate() +
      amount,
  );

  return result;
}

/* =========================================
   PAYMENT STATUS HELPERS
========================================= */

/**
 * Cek payment sudah paid atau belum.
 */
function isPaymentPaid(
  payments: Payment[],
  paymentType: PaymentType,
): boolean {
  return payments.some(
    (payment) =>
      payment.payment_type ===
        paymentType &&
      payment.status ===
        "paid",
  );
}

/**
 * Ambil payment paid.
 */
function getPaidPayment(
  payments: Payment[],
  paymentType: PaymentType,
): Payment | null {
  return (
    payments.find(
      (payment) =>
        payment.payment_type ===
          paymentType &&
        payment.status ===
          "paid",
    ) ??
    null
  );
}

/* =========================================
   GET PAYMENTS BY RECAP
========================================= */

export async function getPaymentsByRecapId(
  recapId: string,
): Promise<Payment[]> {
  if (!recapId.trim()) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("payments")
      .select("*")
      .eq(
        "recap_id",
        recapId,
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    throw new Error(
      `Gagal mengambil pembayaran: ${error.message}`,
    );
  }

  return (
    (data ??
      []) as Payment[]
  );
}

/* =========================================
   GET PAYMENT BY ID
========================================= */

export async function getPaymentById(
  paymentId: string,
): Promise<Payment> {
  if (!paymentId.trim()) {
    throw new Error(
      "ID pembayaran wajib diisi.",
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from("payments")
      .select("*")
      .eq(
        "id",
        paymentId.trim(),
      )
      .single();

  if (
    error ||
    !data
  ) {
    throw new Error(
      "Data pembayaran tidak ditemukan.",
    );
  }

  return data as Payment;
}

/* =========================================
   GET PAYMENT STATUS BY RECAP
========================================= */

export async function getPaymentStatusByRecapId(
  recapId: string,
) {
  const payments =
    await getPaymentsByRecapId(
      recapId,
    );

  const dpPayment =
    getPaidPayment(
      payments,
      "DP",
    );

  const pelunasanPayment =
    getPaidPayment(
      payments,
      "PELUNASAN",
    );

  return {
    dp_paid:
      Boolean(
        dpPayment,
      ),

    pelunasan_paid:
      Boolean(
        pelunasanPayment,
      ),

    dp_payment:
      dpPayment,

    pelunasan_payment:
      pelunasanPayment,
  };
}

/* =========================================
   GET RECAP CONTEXT
========================================= */

async function getRecapPaymentContext(
  recapId: string,
): Promise<RecapPaymentContext> {
  const {
    data,
    error,
  } =
    await supabase
      .from("recaps")
      .select(`
        id,
        qty,
        harga_barang,
        persentase_dp,
        batch_id,

        batch:batches (
          id,
          last_payment_dp,
          last_payment_pelunasan
        )
      `)
      .eq(
        "id",
        recapId,
      )
      .single();

  if (
    error ||
    !data
  ) {
    console.error(
      "getRecapPaymentContext error:",
      error,
    );

    throw new Error(
      "Data rekapan tidak ditemukan.",
    );
  }

  /* -------------------------------------
     Normalize batch relation
  ------------------------------------- */

  const rawBatch =
    Array.isArray(data.batch)
      ? data.batch[0] ?? null
      : data.batch ?? null;

  return {
    id:
      data.id,

    qty:
      Number(
        data.qty ?? 0,
      ),

    harga_barang:
      Number(
        data.harga_barang ??
          0,
      ),

    persentase_dp:
      Number(
        data.persentase_dp ??
          0,
      ),

    batch_id:
      data.batch_id,

    batch:
      rawBatch
        ? {
            id:
              rawBatch.id,

            last_payment_dp:
              rawBatch.last_payment_dp ??
              null,

            last_payment_pelunasan:
              rawBatch.last_payment_pelunasan ??
              null,
          }
        : null,
  };
}

/* =========================================
   BASE PAYMENT AMOUNT
========================================= */

function calculateBasePaymentAmount(
  recap: RecapPaymentContext,
  paymentType: PaymentType,
): number {
  const qty =
    Number(
      recap.qty ?? 0,
    );

  const hargaBarang =
    Number(
      recap.harga_barang ??
        0,
    );

  const persentaseDp =
    Number(
      recap.persentase_dp ??
        0,
    );

  const totalHarga =
    qty *
    hargaBarang;

  const nominalDp =
    Math.round(
      totalHarga *
        (persentaseDp /
          100),
    );

  const nominalPelunasan =
    totalHarga -
    nominalDp;

  if (
    paymentType ===
    "DP"
  ) {
    return nominalDp;
  }

  return nominalPelunasan;
}

/* =========================================
   PAYMENT DUE DATE
========================================= */

function getPaymentDueDate(
  recap: RecapPaymentContext,
  paymentType: PaymentType,
): string | null {
  if (
    !recap.batch
  ) {
    return null;
  }

  if (
    paymentType ===
    "DP"
  ) {
    return (
      recap.batch
        .last_payment_dp ??
      null
    );
  }

  return (
    recap.batch
      .last_payment_pelunasan ??
    null
  );
}

/* =========================================
   GET RELATED LATE PERMISSIONS
========================================= */

async function getLatePaymentPermissionsForPayment(
  recapId: string,
  paymentType: PaymentType,
): Promise<LatePermissionContext[]> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .select(`
        id,
        payment_date,
        payment_status,
        created_at,

        items:late_payment_permission_items (
          recap_id,
          payment_type
        )
      `)
      .eq(
        "payment_status",
        "unpaid",
      )
      .order(
        "created_at",
        {
          ascending: false,
        },
      );

  if (error) {
    console.error(
      "getLatePaymentPermissionsForPayment error:",
      error,
    );

    throw new Error(
      `Gagal mengambil data ijin telat bayar: ${error.message}`,
    );
  }

  const permissions =
    (data ??
      []) as LatePermissionContext[];

  return permissions.filter(
    (
      permission,
    ) =>
      permission.items?.some(
        (item) =>
          item.recap_id ===
            recapId &&
          item.payment_type ===
            paymentType,
      ) ??
      false,
  );
}

/* =========================================
   GET ACTIVE LATE PAYMENT PERMISSION
========================================= */

/**
 * Ijin aktif jika:
 *
 * created_at date
 *      <= hari ini
 *      <= payment_date
 *
 * Setelah payment_date terlewati,
 * ijin tidak lagi aktif sehingga
 * denda dapat berjalan kembali.
 */
async function getActiveLatePaymentPermission(
  recapId: string,
  paymentType: PaymentType,
): Promise<
  LatePermissionContext | null
> {
  const permissions =
    await getLatePaymentPermissionsForPayment(
      recapId,
      paymentType,
    );

  if (
    permissions.length ===
    0
  ) {
    return null;
  }

  const today =
    getTodayDateOnly();

  for (
    const permission of
    permissions
  ) {
    const createdAt =
      new Date(
        permission.created_at,
      );

    const permissionStartDate =
      new Date(
        createdAt.getFullYear(),
        createdAt.getMonth(),
        createdAt.getDate(),
      );

    const permissionEndDate =
      parseDateOnly(
        permission.payment_date,
      );

    if (
      today >=
        permissionStartDate &&
      today <=
        permissionEndDate
    ) {
      return permission;
    }
  }

  return null;
}

/* =========================================
   GET LATEST PERMISSION
========================================= */

/**
 * Digunakan untuk mendapatkan permission
 * terbaru yang pernah dibuat untuk
 * payment tertentu.
 *
 * Ini berguna untuk menghitung:
 *
 * denda sebelum izin
 * +
 * pause
 * +
 * denda setelah izin
 */
async function getLatestLatePaymentPermission(
  recapId: string,
  paymentType: PaymentType,
): Promise<
  LatePermissionContext | null
> {
  const {
    data,
    error,
  } =
    await supabase
      .from(
        "late_payment_permissions",
      )
      .select(`
        id,
        payment_date,
        payment_status,
        created_at,

        items:late_payment_permission_items (
          recap_id,
          payment_type
        )
      `)
      .order(
        "created_at",
        {
          ascending: false,
        },
      )
      .limit(50);

  if (error) {
    console.error(
      "getLatestLatePaymentPermission error:",
      error,
    );

    throw new Error(
      `Gagal mengambil riwayat ijin telat bayar: ${error.message}`,
    );
  }

  const permissions =
    (data ??
      []) as LatePermissionContext[];

  return (
    permissions.find(
      (
        permission,
      ) =>
        permission.items?.some(
          (item) =>
            item.recap_id ===
              recapId &&
            item.payment_type ===
              paymentType,
        ) ??
        false,
    ) ??
    null
  );
}

/* =========================================
   PAYMENT PENALTY RESULT
========================================= */

type PaymentPenaltyResult = {
  baseAmount: number;

  penaltyDays: number;

  penaltyAmount: number;

  currentAmount: number;

  dueDate: string | null;

  permission:
    | LatePermissionContext
    | null;
};

/* =========================================
   CALCULATE PENALTY
========================================= */

/**
 * Menghitung nominal payment saat ini.
 *
 * RULE:
 *
 * 1. Sebelum jatuh tempo:
 *    tidak ada denda.
 *
 * 2. Setelah jatuh tempo:
 *    denda +Rp2.000 / hari.
 *
 * 3. Jika ada ijin:
 *    denda sebelum ijin tetap dihitung.
 *
 * 4. Selama ijin aktif:
 *    denda PAUSE.
 *
 * 5. Setelah payment_date lewat:
 *    jika payment masih unpaid,
 *    denda berjalan lagi.
 *
 * Contoh:
 *
 * Due date:
 * 5 Sep
 *
 * Ijin dibuat:
 * 8 Sep
 *
 * Perkiraan bayar:
 * 13 Sep
 *
 * Denda:
 *
 * 6 Sep = 1
 * 7 Sep = 2
 * 8-13 Sep = PAUSE
 * 14 Sep = 3
 * 15 Sep = 4
 *
 * Jadi tanggal pause tidak menambah
 * penaltyDays.
 */
export async function calculateCurrentPaymentAmount(
  recapId: string,
  paymentType: PaymentType,
): Promise<PaymentPenaltyResult> {
  /* -------------------------------------
     Get recap
  ------------------------------------- */

  const recap =
    await getRecapPaymentContext(
      recapId,
    );

  /* -------------------------------------
     Base amount
  ------------------------------------- */

  const baseAmount =
    calculateBasePaymentAmount(
      recap,
      paymentType,
    );

  /* -------------------------------------
     Due date
  ------------------------------------- */

  const dueDate =
    getPaymentDueDate(
      recap,
      paymentType,
    );

  /**
   * Jika tanggal jatuh tempo belum ada,
   * tidak ada denda yang bisa dihitung.
   */
  if (
    !dueDate
  ) {
    return {
      baseAmount,

      penaltyDays:
        0,

      penaltyAmount:
        0,

      currentAmount:
        baseAmount,

      dueDate:
        null,

      permission:
        null,
    };
  }

  const today =
    getTodayDateOnly();

  const dueDateObject =
    parseDateOnly(
      dueDate,
    );

  /* -------------------------------------
     GET PERMISSION
  ------------------------------------- */

  const activePermission =
    await getActiveLatePaymentPermission(
      recapId,
      paymentType,
    );

  const latestPermission =
    await getLatestLatePaymentPermission(
      recapId,
      paymentType,
    );

  let penaltyDays =
    0;

  /* =====================================
     BELUM JATUH TEMPO
  ====================================== */

  if (
    today <=
    dueDateObject
  ) {
    penaltyDays =
      0;
  }

  /* =====================================
     SUDAH JATUH TEMPO
  ====================================== */
  else {
    /**
     * Jumlah hari keterlambatan
     * normal dari due date.
     *
     * Due 5:
     *
     * 6 -> 1
     * 7 -> 2
     * 8 -> 3
     */
    const totalDaysLate =
      Math.max(
        0,
        differenceInDays(
          dueDateObject,
          today,
        ),
      );

    /* ===================================
       TANPA PERMISSION SAMA SEKALI
    ==================================== */

    if (
      !latestPermission
    ) {
      penaltyDays =
        totalDaysLate;
    }

    /* ===================================
       ADA PERMISSION
    ==================================== */
    else {
      const permissionCreatedAt =
        new Date(
          latestPermission.created_at,
        );

      const permissionStartDate =
        new Date(
          permissionCreatedAt.getFullYear(),
          permissionCreatedAt.getMonth(),
          permissionCreatedAt.getDate(),
        );

      const permissionEndDate =
        parseDateOnly(
          latestPermission.payment_date,
        );

      /**
       * ---------------------------------
       * BAGIAN 1
       * Denda sebelum izin
       * ---------------------------------
       *
       * Due 5
       * Izin 8
       *
       * Denda:
       * 6 = 1
       * 7 = 2
       *
       * Jadi:
       *
       * diff(5, 8) = 3
       * dikurangi 1
       * = 2 hari
       */
      const penaltyDaysBeforePermission =
        Math.max(
          0,
          differenceInDays(
            dueDateObject,
            permissionStartDate,
          ) - 1,
        );

      /**
       * ---------------------------------
       * BAGIAN 2
       * Denda setelah izin berakhir
       * ---------------------------------
       *
       * Izin sampai 13.
       *
       * 13 = masih pause.
       *
       * 14 = denda hari pertama.
       *
       * Jadi:
       *
       * diff(13, 14) = 1
       */
      let penaltyDaysAfterPermission =
        0;

      if (
        today >
        permissionEndDate
      ) {
        penaltyDaysAfterPermission =
          Math.max(
            0,
            differenceInDays(
              permissionEndDate,
              today,
            ),
          );
      }

      /**
       * Total denda:
       *
       * sebelum izin
       * +
       * setelah izin
       */
      penaltyDays =
        penaltyDaysBeforePermission +
        penaltyDaysAfterPermission;
    }
  }

  const penaltyAmount =
    penaltyDays *
    LATE_PAYMENT_PENALTY_PER_DAY;

  const currentAmount =
    baseAmount +
    penaltyAmount;

  /**
   * Permission yang dikembalikan
   * hanya permission yang MASIH AKTIF.
   *
   * Kalau sudah lewat payment_date:
   *
   * late_payment_permission = null
   *
   * sehingga frontend tidak lagi
   * menampilkan:
   *
   * "Sedang mengajukan ijin telat..."
   */
  return {
    baseAmount,

    penaltyDays,

    penaltyAmount,

    currentAmount,

    dueDate,

    permission:
      activePermission,
  };
}

/* =========================================
   PAYMENT META HELPER
========================================= */

function buildPaymentMeta(
  payment: Payment,
  baseAmount: number,
  penalty: PaymentPenaltyResult,
): Payment {
  return {
    ...payment,

    base_amount:
      baseAmount,

    penalty_days:
      penalty.penaltyDays,

    penalty_amount:
      penalty.penaltyAmount,

    due_date:
      penalty.dueDate,

    late_payment_permission:
      penalty.permission
        ? {
            id:
              penalty.permission
                .id,

            payment_date:
              penalty.permission
                .payment_date,

            created_at:
              penalty.permission
                .created_at,

            status:
              penalty.permission
                .payment_status,
          }
        : null,
  };
}

/* =========================================
   CREATE PAYMENT
========================================= */

export async function createPayment(
  input: CreatePaymentInput,
): Promise<Payment> {
  /* -------------------------------------
     Validate input
  ------------------------------------- */

  if (
    !input.recap_id?.trim()
  ) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  if (
    input.payment_type !==
      "DP" &&
    input.payment_type !==
      "PELUNASAN"
  ) {
    throw new Error(
      "Tipe pembayaran tidak valid.",
    );
  }

  /* -------------------------------------
     Get recap
  ------------------------------------- */

  const recap =
    await getRecapPaymentContext(
      input.recap_id,
    );

  /* -------------------------------------
     Base amount
  ------------------------------------- */

  const baseAmount =
    calculateBasePaymentAmount(
      recap,
      input.payment_type,
    );

  /* -------------------------------------
     Current amount
  ------------------------------------- */

  const penalty =
    await calculateCurrentPaymentAmount(
      input.recap_id,
      input.payment_type,
    );

  const currentAmount =
    penalty.currentAmount;

  /* -------------------------------------
     Existing payments
  ------------------------------------- */

  const payments =
    await getPaymentsByRecapId(
      input.recap_id,
    );

  /* =====================================
     DP
  ====================================== */

  if (
    input.payment_type ===
    "DP"
  ) {
    /* -----------------------------------
       Already paid
    ----------------------------------- */

    const paidDp =
      payments.find(
        (payment) =>
          payment.payment_type ===
            "DP" &&
          payment.status ===
            "paid",
      );

    if (
      paidDp
    ) {
      throw new Error(
        "DP sudah dibayar.",
      );
    }

    /* -----------------------------------
       Existing pending
    ----------------------------------- */

    const pendingDp =
      payments.find(
        (payment) =>
          payment.payment_type ===
            "DP" &&
          payment.status ===
            "pending",
      );

    if (
      pendingDp
    ) {
      /**
       * Pending payment selalu menggunakan
       * nominal terbaru.
       *
       * Jadi jika terjadi denda setelah
       * payment dibuat, nominal pending
       * akan ikut berubah.
       */
      if (
        Number(
          pendingDp.amount,
        ) !==
        currentAmount
      ) {
        const {
          data:
            updatedPending,
          error:
            updatePendingError,
        } =
          await supabase
            .from(
              "payments",
            )
            .update({
              amount:
                currentAmount,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              pendingDp.id,
            )
            .select("*")
            .single();

        if (
          updatePendingError ||
          !updatedPending
        ) {
          throw new Error(
            `Gagal memperbarui nominal pembayaran DP: ${
              updatePendingError?.message ??
              "Unknown error"
            }`,
          );
        }

        return buildPaymentMeta(
          updatedPending as Payment,
          baseAmount,
          penalty,
        );
      }

      return buildPaymentMeta(
        pendingDp,
        baseAmount,
        penalty,
      );
    }

    /* -----------------------------------
       Create payment
    ----------------------------------- */

    const {
      data,
      error,
    } =
      await supabase
        .from("payments")
        .insert({
          recap_id:
            input.recap_id,

          payment_type:
            "DP",

          amount:
            currentAmount,

          status:
            "pending",

          provider:
            "simulation",
        })
        .select("*")
        .single();

    if (
      error ||
      !data
    ) {
      throw new Error(
        `Gagal membuat pembayaran DP: ${
          error?.message ??
          "Unknown error"
        }`,
      );
    }

    return buildPaymentMeta(
      data as Payment,
      baseAmount,
      penalty,
    );
  }

  /* =====================================
     PELUNASAN
  ====================================== */

  if (
    input.payment_type ===
    "PELUNASAN"
  ) {
    /* -----------------------------------
       DP must be paid first
    ----------------------------------- */

    const paidDp =
      payments.find(
        (payment) =>
          payment.payment_type ===
            "DP" &&
          payment.status ===
            "paid",
      );

    if (
      !paidDp
    ) {
      throw new Error(
        "DP harus dibayar terlebih dahulu.",
      );
    }

    /* -----------------------------------
       Already paid
    ----------------------------------- */

    const paidPelunasan =
      payments.find(
        (payment) =>
          payment.payment_type ===
            "PELUNASAN" &&
          payment.status ===
            "paid",
      );

    if (
      paidPelunasan
    ) {
      throw new Error(
        "Pelunasan sudah dibayar.",
      );
    }

    /* -----------------------------------
       Existing pending
    ----------------------------------- */

    const pendingPelunasan =
      payments.find(
        (payment) =>
          payment.payment_type ===
            "PELUNASAN" &&
          payment.status ===
            "pending",
      );

    if (
      pendingPelunasan
    ) {
      if (
        Number(
          pendingPelunasan.amount,
        ) !==
        currentAmount
      ) {
        const {
          data:
            updatedPending,
          error:
            updatePendingError,
        } =
          await supabase
            .from(
              "payments",
            )
            .update({
              amount:
                currentAmount,

              updated_at:
                new Date().toISOString(),
            })
            .eq(
              "id",
              pendingPelunasan.id,
            )
            .select("*")
            .single();

        if (
          updatePendingError ||
          !updatedPending
        ) {
          throw new Error(
            `Gagal memperbarui nominal pembayaran pelunasan: ${
              updatePendingError?.message ??
              "Unknown error"
            }`,
          );
        }

        return buildPaymentMeta(
          updatedPending as Payment,
          baseAmount,
          penalty,
        );
      }

      return buildPaymentMeta(
        pendingPelunasan,
        baseAmount,
        penalty,
      );
    }

    /* -----------------------------------
       Create payment
    ----------------------------------- */

    const {
      data,
      error,
    } =
      await supabase
        .from("payments")
        .insert({
          recap_id:
            input.recap_id,

          payment_type:
            "PELUNASAN",

          amount:
            currentAmount,

          status:
            "pending",

          provider:
            "simulation",
        })
        .select("*")
        .single();

    if (
      error ||
      !data
    ) {
      throw new Error(
        `Gagal membuat pembayaran pelunasan: ${
          error?.message ??
          "Unknown error"
        }`,
      );
    }

    return buildPaymentMeta(
      data as Payment,
      baseAmount,
      penalty,
    );
  }

  throw new Error(
    "Tipe pembayaran tidak valid.",
  );
}

/* =========================================
   GENERATE MIDTRANS PAYMENT LINK
========================================= */

/**
 * Membuat Payment Link Midtrans
 * untuk payment yang masih pending.
 *
 * RULE:
 *
 * 1. Belum jatuh tempo:
 *    expiry = due date 23:59:59 WIB.
 *
 * 2. Sudah lewat jatuh tempo:
 *    expiry = hari ini 23:59:59 WIB.
 *
 * Nominal selalu dihitung ulang
 * sebelum Payment Link dibuat.
 *
 * Tujuannya agar denda terbaru
 * selalu digunakan.
 */
export async function generatePaymentLink(
  paymentId: string,
): Promise<{
  payment: Payment;
  paymentUrl: string;
  expiresAt: string;
}> {
  /* -------------------------------------
     Validate payment ID
  ------------------------------------- */

  if (!paymentId.trim()) {
    throw new Error(
      "ID pembayaran wajib diisi.",
    );
  }

  /* -------------------------------------
     Get payment
  ------------------------------------- */

  const payment =
    await getPaymentById(
      paymentId.trim(),
    );

  /* -------------------------------------
     Validate payment status
  ------------------------------------- */

  if (payment.status === "paid") {
    throw new Error(
      "Pembayaran sudah lunas.",
    );
  }

  if (payment.status === "cancelled") {
    throw new Error(
      "Pembayaran sudah dibatalkan.",
    );
  }

  /* -------------------------------------
     Calculate latest amount
  ------------------------------------- */

  const penalty =
    await calculateCurrentPaymentAmount(
      payment.recap_id,
      payment.payment_type,
    );

  const currentAmount =
    penalty.currentAmount;

  /* -------------------------------------
     Update amount if needed
  ------------------------------------- */

  let paymentData =
    payment;

  const amountChanged =
    Number(payment.amount) !==
    currentAmount;

  if (amountChanged) {
    const {
      data,
      error,
    } = await supabase
      .from("payments")
      .update({
        amount:
          currentAmount,
        updated_at:
          new Date().toISOString(),
      })
      .eq(
        "id",
        payment.id,
      )
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(
        `Gagal memperbarui nominal pembayaran: ${
          error?.message ??
          "Unknown error"
        }`,
      );
    }

    paymentData =
      data as Payment;
  }

  /* -------------------------------------
     Determine expiry
  ------------------------------------- */

  const expiresAt =
    getPaymentLinkExpiry(
      penalty.penaltyAmount > 0,
    );

  const now =
    new Date();

  /* -------------------------------------
     Reuse existing active link
  ------------------------------------- */

  const existingLinkExpiresAt =
    paymentData.expires_at
      ? new Date(
          paymentData.expires_at,
        )
      : null;

  const hasValidExistingExpiry =
    existingLinkExpiresAt !==
      null &&
    !Number.isNaN(
      existingLinkExpiresAt.getTime(),
    ) &&
    existingLinkExpiresAt.getTime() >
      now.getTime();

  const hasReusableLink =
    paymentData.provider ===
      "midtrans" &&
    Boolean(
      paymentData.provider_order_id,
    ) &&
    Boolean(
      paymentData.payment_url,
    ) &&
    hasValidExistingExpiry &&
    Number(paymentData.amount) ===
      currentAmount;

  if (hasReusableLink) {
    /**
     * Payment Link masih aktif dan nominal
     * masih sama. Gunakan link yang sudah ada.
     */
    return {
      payment:
        buildPaymentMeta(
          paymentData,
          currentAmount -
            penalty.penaltyAmount,
          penalty,
        ),

      paymentUrl:
        paymentData.payment_url!,

      expiresAt:
        paymentData.expires_at!,
    };
  }

  /* -------------------------------------
     Disable old active link if necessary
  ------------------------------------- */

  const hasExistingMidtransLink =
    paymentData.provider ===
      "midtrans" &&
    Boolean(
      paymentData.provider_order_id,
    );

  if (hasExistingMidtransLink) {
    const oldExpiresAt =
      paymentData.expires_at
        ? new Date(
            paymentData.expires_at,
          )
        : null;

    const oldLinkStillActive =
      oldExpiresAt !== null &&
      !Number.isNaN(
        oldExpiresAt.getTime(),
      ) &&
      oldExpiresAt.getTime() >
        now.getTime();

    /**
     * Hanya perlu delete jika link lama
     * masih aktif. Kalau sudah expired,
     * tidak perlu memanggil Midtrans.
     */
    if (oldLinkStillActive) {
      try {
        await deleteMidtransPaymentLink(
          paymentData.provider_order_id!,
        );
      } catch (error) {
        console.error(
          "Gagal menonaktifkan Payment Link Midtrans lama:",
          {
            paymentId:
              paymentData.id,
            orderId:
              paymentData.provider_order_id,
            error,
          },
        );

        throw new Error(
          "Payment Link lama masih aktif dan gagal dinonaktifkan. Payment Link baru tidak dibuat.",
        );
      }
    }
  }

  /* -------------------------------------
     Generate provider order ID
  ------------------------------------- */

  const orderId =
    generateMidtransOrderId();

  /* -------------------------------------
     Get buyer information

     Buyer diambil langsung dari relasi
     recap -> member sehingga frontend tidak
     perlu mengirim nama / nomor HP ke backend.
  ------------------------------------- */

  const {
    data: recapBuyer,
    error: recapBuyerError,
  } = await supabase
    .from("recaps")
    .select(`
      member:members (
        name,
        phone
      )
    `)
    .eq("id", payment.recap_id)
    .single();

  if (recapBuyerError) {
    throw new Error(
      `Gagal mengambil data pembeli: ${recapBuyerError.message}`,
    );
  }

  const rawMember = Array.isArray(recapBuyer?.member)
    ? recapBuyer.member[0] ?? null
    : recapBuyer?.member ?? null;

  const buyerName =
    typeof rawMember?.name === "string"
      ? rawMember.name.trim()
      : null;

  const buyerPhone =
    typeof rawMember?.phone === "string"
      ? rawMember.phone.trim()
      : null;

  /* -------------------------------------
     Create Midtrans Payment Link
  ------------------------------------- */

  const midtrans =
    await createMidtransPaymentLink({
      orderId,
      amount:
        currentAmount,
      paymentType:
        payment.payment_type,
      expiresAt,
      customer: {
        name: buyerName,
        phone: buyerPhone,
      },
    });

  /* -------------------------------------
     Save Midtrans data
  ------------------------------------- */

  const {
    data:
      updatedPayment,
    error:
      updateError,
  } = await supabase
    .from("payments")
    .update({
      provider:
        "midtrans",

      provider_order_id:
        midtrans.orderId,

      payment_url:
        midtrans.paymentUrl,

      expires_at:
        midtrans.expiresAt,

      updated_at:
        new Date().toISOString(),
    })
    .eq(
      "id",
      paymentData.id,
    )
    .select("*")
    .single();

  if (
    updateError ||
    !updatedPayment
  ) {
    console.error(
      "Payment Link berhasil dibuat di Midtrans tetapi gagal disimpan:",
      {
        paymentId:
          paymentData.id,
        orderId:
          midtrans.orderId,
        paymentUrl:
          midtrans.paymentUrl,
        error:
          updateError,
      },
    );

    throw new Error(
      `Payment Link berhasil dibuat di Midtrans, tetapi gagal menyimpan data pembayaran: ${
        updateError?.message ??
        "Unknown error"
      }`,
    );
  }

  return {
    payment:
      buildPaymentMeta(
        updatedPayment as Payment,
        currentAmount -
          penalty.penaltyAmount,
        penalty,
      ),

    paymentUrl:
      midtrans.paymentUrl,

    expiresAt:
      midtrans.expiresAt,
  };
}

/* =========================================
   HANDLE MIDTRANS NOTIFICATION
========================================= */

export async function handleMidtransNotification(
  notification: MidtransNotification,
): Promise<Payment> {
  /* -------------------------------------
     1. VERIFY SIGNATURE
  ------------------------------------- */

  const isValidSignature =
    verifyMidtransNotificationSignature(
      notification,
    );

  if (!isValidSignature) {
    throw new Error(
      "Signature notification Midtrans tidak valid.",
    );
  }

  /* -------------------------------------
     2. VALIDATE REQUIRED DATA
  ------------------------------------- */

  const orderId =
    typeof notification.order_id === "string"
      ? notification.order_id.trim()
      : "";

  const transactionStatus =
    typeof notification.transaction_status === "string"
      ? notification.transaction_status
          .trim()
          .toLowerCase()
      : "";

  const fraudStatus =
    typeof notification.fraud_status === "string"
      ? notification.fraud_status
          .trim()
          .toLowerCase()
      : "";

  const grossAmount =
    typeof notification.gross_amount === "string"
      ? Number(notification.gross_amount)
      : NaN;

  if (!orderId) {
    throw new Error(
      "order_id dari Midtrans wajib diisi.",
    );
  }

  if (!transactionStatus) {
    throw new Error(
      "transaction_status dari Midtrans wajib diisi.",
    );
  }

  if (
    !Number.isFinite(grossAmount) ||
    grossAmount <= 0
  ) {
    throw new Error(
      "gross_amount dari Midtrans tidak valid.",
    );
  }

  /* -------------------------------------
     3. FIND PAYMENT
  ------------------------------------- */

  const originalOrderId =
    typeof notification.custom_field1 === "string" &&
    notification.custom_field1.trim()
      ? notification.custom_field1.trim()
      : orderId.replace(/-\d+$/, "");

  const {
    data: paymentData,
    error: paymentError,
  } = await supabase
    .from("payments")
    .select("*")
    .eq(
      "provider_order_id",
      originalOrderId,
    )
    .maybeSingle();

  if (paymentError) {
    throw new Error(
      `Gagal mencari pembayaran Midtrans: ${paymentError.message}`,
    );
  }

  if (!paymentData) {
    throw new Error(
      `Pembayaran dengan order ID "${originalOrderId}" tidak ditemukan.`,
    );
  }

  const payment =
    paymentData as Payment;

  /* -------------------------------------
     4. VERIFY AMOUNT
  ------------------------------------- */

  if (
    Number(payment.amount) !==
    grossAmount
  ) {
    throw new Error(
      `Nominal pembayaran tidak cocok. Expected ${payment.amount}, received ${grossAmount}.`,
    );
  }

  /* -------------------------------------
     5. IDEMPOTENCY
  ------------------------------------- */

  /**
   * Kalau sudah paid, jangan diproses lagi.
   *
   * Midtrans dapat mengirim notification
   * lebih dari sekali.
   */
  if (
    payment.status === "paid"
  ) {
    return payment;
  }

  /* -------------------------------------
     6. MAP MIDTRANS STATUS
  ------------------------------------- */

  let newStatus:
    | PaymentStatus
    | null = null;

  const isPaid =
    transactionStatus ===
      "settlement" ||
    (
      transactionStatus ===
        "capture" &&
      (
        !fraudStatus ||
        fraudStatus ===
          "accept"
      )
    );

  if (isPaid) {
    newStatus = "paid";
  } else if (
    transactionStatus ===
    "pending"
  ) {
    newStatus = "pending";
  } else if (
    transactionStatus ===
    "expire"
  ) {
    newStatus = "expired";
  } else if (
    transactionStatus ===
      "cancel" ||
    transactionStatus ===
      "deny"
  ) {
    newStatus = "failed";
  }

  /* -------------------------------------
     UNKNOWN STATUS
  ------------------------------------- */

  /**
   * Jangan mengubah database kalau status
   * Midtrans belum kita mapping.
   */
  if (!newStatus) {
    return payment;
  }

  /* -------------------------------------
     PREVENT STATUS REGRESSION
  ------------------------------------- */

  /**
   * Status terminal tidak boleh turun
   * kembali menjadi pending.
   */
  if (
    (
      payment.status ===
        "expired" ||
      payment.status ===
        "failed" ||
      payment.status ===
        "cancelled"
    ) &&
    newStatus ===
      "pending"
  ) {
    return payment;
  }

  /* -------------------------------------
     7. PAID AT
  ------------------------------------- */

  const now =
    new Date().toISOString();

  const paidAt =
    newStatus === "paid"
      ? (
          payment.paid_at ??
          now
        )
      : payment.paid_at;

  /* -------------------------------------
     8. UPDATE PAYMENT
  ------------------------------------- */

  const {
    data: updatedData,
    error: updateError,
  } = await supabase
    .from("payments")
    .update({
      status:
        newStatus,

      provider_transaction_id:
        typeof notification.transaction_id ===
        "string"
          ? notification.transaction_id
          : payment.provider_transaction_id,

      payment_method:
        typeof notification.payment_type ===
        "string"
          ? notification.payment_type
          : payment.payment_method,

      paid_at:
        paidAt,

      updated_at:
        now,
    })
    .eq(
      "id",
      payment.id,
    )
    .select("*")
    .single();

  if (
    updateError ||
    !updatedData
  ) {
    throw new Error(
      `Gagal memperbarui status pembayaran: ${
        updateError?.message ??
        "Unknown error"
      }`,
    );
  }

  const updatedPayment =
    updatedData as Payment;

  /* -------------------------------------
     9. SYNC LATE PAYMENT PERMISSION
  ------------------------------------- */

  if (
    newStatus ===
    "paid"
  ) {
    await syncLatePaymentPermissionStatuses(
      updatedPayment.recap_id,
      updatedPayment.payment_type,
    );
  }

  return updatedPayment;
}

/* =========================================
   SIMULATE PAYMENT SUCCESS
========================================= */

/**
 * Sementara untuk testing.
 *
 * Nanti digantikan webhook Midtrans.
 */
export async function simulatePaymentSuccess(
  paymentId: string,
): Promise<Payment> {
  if (
    !paymentId.trim()
  ) {
    throw new Error(
      "ID pembayaran wajib diisi.",
    );
  }

  const payment =
    await getPaymentById(
      paymentId,
    );

  if (
    payment.status ===
    "paid"
  ) {
    return payment;
  }

  const now =
    new Date().toISOString();

  const {
    data,
    error,
  } =
    await supabase
      .from("payments")
      .update({
        status:
          "paid",

        paid_at:
          now,

        updated_at:
          now,
      })
      .eq(
        "id",
        paymentId.trim(),
      )
      .select("*")
      .single();

  if (
    error ||
    !data
  ) {
    throw new Error(
      `Gagal mengupdate pembayaran: ${
        error?.message ??
        "Unknown error"
      }`,
    );
  }

  /**
   * Setelah payment menjadi paid,
   * permission terkait akan dicek.
   */
  await syncLatePaymentPermissionStatuses(
    data.recap_id,
    data.payment_type,
  );

  return data as Payment;
}

/* =========================================
   SYNC LATE PAYMENT PERMISSION STATUS
========================================= */

/**
 * Permission otomatis menjadi paid
 * jika SEMUA item yang tercakup
 * dalam permission sudah mempunyai
 * payment dengan status paid.
 */
export async function syncLatePaymentPermissionStatuses(
  recapId?: string,
  paymentType?: PaymentType,
): Promise<void> {
  let query =
    supabase
      .from(
        "late_payment_permissions",
      )
      .select(`
        id,
        payment_status,

        items:late_payment_permission_items (
          recap_id,
          payment_type
        )
      `);

  /* -------------------------------------
     Filter permission terkait payment
  ------------------------------------- */

  if (
    recapId
  ) {
    const {
      data:
        permissionIdsData,
      error:
        permissionIdsError,
    } =
      await supabase
        .from(
          "late_payment_permission_items",
        )
        .select(
          "permission_id",
        )
        .eq(
          "recap_id",
          recapId,
        )
        .eq(
          "payment_type",
          paymentType,
        );

    if (
      permissionIdsError
    ) {
      throw new Error(
        `Gagal mencari ijin telat bayar: ${permissionIdsError.message}`,
      );
    }

    const permissionIds =
      Array.from(
        new Set(
          (
            permissionIdsData ??
            []
          ).map(
            (item) =>
              item.permission_id,
          ),
        ),
      );

    if (
      permissionIds.length ===
      0
    ) {
      return;
    }

    query =
      query.in(
        "id",
        permissionIds,
      );
  }

  /* -------------------------------------
     Get permissions
  ------------------------------------- */

  const {
    data: permissions,
    error,
  } = await query;

  if (error) {
    throw new Error(
      `Gagal mengambil status ijin telat bayar: ${error.message}`,
    );
  }

  if (
    !permissions ||
    permissions.length ===
      0
  ) {
    return;
  }

  const now =
    new Date().toISOString();

  /* -------------------------------------
     Process each permission
  ------------------------------------- */

  for (
    const permission of
    permissions
  ) {
    const items =
      permission.items ??
      [];

    if (
      items.length ===
      0
    ) {
      continue;
    }

    const recapIds =
      Array.from(
        new Set(
          items.map(
            (item) =>
              item.recap_id,
          ),
        ),
      );

    if (
      recapIds.length ===
      0
    ) {
      continue;
    }

    const {
      data: payments,
      error:
        paymentsError,
    } =
      await supabase
        .from("payments")
        .select(`
          recap_id,
          payment_type,
          status
        `)
        .in(
          "recap_id",
          recapIds,
        );

    if (
      paymentsError
    ) {
      throw new Error(
        `Gagal memeriksa pembayaran ijin telat: ${paymentsError.message}`,
      );
    }

    /**
     * SETIAP item permission harus
     * mempunyai payment yang paid.
     */
    const allItemsPaid =
      items.every(
        (permissionItem) =>
          (
            payments ??
            []
          ).some(
            (payment) =>
              payment.recap_id ===
                permissionItem.recap_id &&
              payment.payment_type ===
                permissionItem.payment_type &&
              payment.status ===
                "paid",
          ),
      );

    if (
      allItemsPaid &&
      permission.payment_status ===
        "unpaid"
    ) {
      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "late_payment_permissions",
          )
          .update({
            payment_status:
              "paid",

            paid_at:
              now,

            updated_at:
              now,
          })
          .eq(
            "id",
            permission.id,
          );

      if (
        updateError
      ) {
        throw new Error(
          `Gagal mengubah status ijin telat bayar: ${updateError.message}`,
        );
      }
    }
  }
}

/* =========================================
   GET PAYMENT SUMMARY FOR RECAP
========================================= */

/**
 * Digunakan frontend Rekapan untuk
 * mendapatkan:
 *
 * - nominal dasar
 * - nominal saat ini
 * - jumlah hari denda
 * - total denda
 * - status
 * - tanggal jatuh tempo
 * - permission aktif
 */
export async function getRecapPaymentSummary(
  recapId: string,
) {
  if (
    !recapId.trim()
  ) {
    throw new Error(
      "ID rekapan wajib diisi.",
    );
  }

  /* -------------------------------------
     Get recap
  ------------------------------------- */

  const {
    data: recap,
    error,
  } =
    await supabase
      .from("recaps")
      .select(`
        id,
        qty,
        harga_barang,
        persentase_dp,

        member:members (
          id,
          name,
          phone
        )
      `)
      .eq(
        "id",
        recapId,
      )
      .single();

  if (
    error ||
    !recap
  ) {
    throw new Error(
      "Data rekapan tidak ditemukan.",
    );
  }

  const recapWithMember =
    recap as typeof recap & {
      member:
        | {
            id: string;

            name: string;

            phone: string;
          }
        | null;
    };

  /* -------------------------------------
     Get payments
  ------------------------------------- */

  const payments =
    await getPaymentsByRecapId(
      recapId,
    );

  /* -------------------------------------
     Status
  ------------------------------------- */

  const dpPaid =
    isPaymentPaid(
      payments,
      "DP",
    );

  const pelunasanPaid =
    isPaymentPaid(
      payments,
      "PELUNASAN",
    );

  /* -------------------------------------
     Calculate DP
  ------------------------------------- */

  const dpCalculation =
    await calculateCurrentPaymentAmount(
      recapId,
      "DP",
    );

  /* -------------------------------------
     Calculate Pelunasan
  ------------------------------------- */

  const pelunasanCalculation =
    await calculateCurrentPaymentAmount(
      recapId,
      "PELUNASAN",
    );

  /* -------------------------------------
     Paid payments
  ------------------------------------- */

  const dpPaidPayment =
    getPaidPayment(
      payments,
      "DP",
    );

  const pelunasanPaidPayment =
    getPaidPayment(
      payments,
      "PELUNASAN",
    );

  /**
   * Jika sudah paid,
   * gunakan nominal actual payment.
   *
   * Jangan gunakan nominal current
   * karena denda sudah berhenti.
   */
  const dpCurrentAmount =
    dpPaid
      ? Number(
          dpPaidPayment?.amount ??
            dpCalculation.baseAmount,
        )
      : dpCalculation.currentAmount;

  const pelunasanCurrentAmount =
    pelunasanPaid
      ? Number(
          pelunasanPaidPayment?.amount ??
            pelunasanCalculation.baseAmount,
        )
      : pelunasanCalculation.currentAmount;

  /* -------------------------------------
     Sync permission status
  ------------------------------------- */

  await syncLatePaymentPermissionStatuses(
    recapId,
    "DP",
  );

  await syncLatePaymentPermissionStatuses(
    recapId,
    "PELUNASAN",
  );

  /* -------------------------------------
     Return summary
  ------------------------------------- */

  return {
    recap_id:
      recapId,

    buyer: {
      id:
        recapWithMember.member
          ?.id ??
        null,

      name:
        recapWithMember.member
          ?.name ??
        null,

      phone:
        recapWithMember.member
          ?.phone ??
        null,
    },

    dp: {
      amount:
        dpCurrentAmount,

      base_amount:
        dpCalculation.baseAmount,

      /**
       * Setelah paid, denda tidak relevan lagi
       * untuk display current payment.
       */
      penalty_days:
        dpPaid
          ? 0
          : dpCalculation.penaltyDays,

      penalty_amount:
        dpPaid
          ? 0
          : dpCalculation.penaltyAmount,

      status:
        dpPaid
          ? "paid"
          : payments.find(
              (
                payment,
              ) =>
                payment.payment_type ===
                  "DP",
            )?.status ??
            "unpaid",

      paid_at:
        dpPaidPayment?.paid_at ??
        null,

      due_date:
        dpCalculation.dueDate,

      late_payment_permission:
        dpCalculation.permission
          ? {
              id:
                dpCalculation
                  .permission
                  .id,

              payment_date:
                dpCalculation
                  .permission
                  .payment_date,

              created_at:
                dpCalculation
                  .permission
                  .created_at,

              status:
                dpCalculation
                  .permission
                  .payment_status,
            }
          : null,

      payment:
        dpPaidPayment ??
        payments.find(
          (
            payment,
          ) =>
            payment.payment_type ===
            "DP",
        ) ??
        null,
    },

    pelunasan: {
      amount:
        pelunasanCurrentAmount,

      base_amount:
        pelunasanCalculation.baseAmount,

      penalty_days:
        pelunasanPaid
          ? 0
          : pelunasanCalculation.penaltyDays,

      penalty_amount:
        pelunasanPaid
          ? 0
          : pelunasanCalculation.penaltyAmount,

      status:
        pelunasanPaid
          ? "paid"
          : payments.find(
              (
                payment,
              ) =>
                payment.payment_type ===
                  "PELUNASAN",
            )?.status ??
            "unpaid",

      can_pay:
        dpPaid,

      paid_at:
        pelunasanPaidPayment?.paid_at ??
        null,

      due_date:
        pelunasanCalculation.dueDate,

      late_payment_permission:
        pelunasanCalculation.permission
          ? {
              id:
                pelunasanCalculation
                  .permission
                  .id,

              payment_date:
                pelunasanCalculation
                  .permission
                  .payment_date,

              created_at:
                pelunasanCalculation
                  .permission
                  .created_at,

              status:
                pelunasanCalculation
                  .permission
                  .payment_status,
            }
          : null,

      payment:
        pelunasanPaidPayment ??
        payments.find(
          (
            payment,
          ) =>
            payment.payment_type ===
            "PELUNASAN",
        ) ??
        null,
    },
  };
}