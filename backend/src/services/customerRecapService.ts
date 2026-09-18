import { supabase } from "../config/supabase.js";

import {
  calculateCurrentPaymentAmount,
} from "./paymentService.js";

/* =========================================
   TYPES
========================================= */

type PaymentRecord = {
  payment_type:
    | "DP"
    | "PELUNASAN"
    | string;

  amount:
    | number
    | null;

  status:
    | string
    | null;

  paid_at:
    | string
    | null;
};

type CustomerRecap = {
  id: string;

  country: string | null;

  batch_name: string | null;

  product_image: string | null;

  detail_barang: string;

  qty: number;

  total_harga: number;

  sudah_co: boolean;

  member_type:
    | "customer"
    | "employee"
    | "hnr";

  down_payment: {
    amount: number;

    status: string;

    paid_at: string | null;

    due_date: string | null;

    penalty_days: number;

    penalty_amount: number;
  };

  pelunasan: {
    amount: number;

    status: string;

    paid_at: string | null;

    due_date: string | null;

    penalty_days: number;

    penalty_amount: number;
  };
};

/* =========================================
   HELPER
========================================= */

/**
 * Mengambil payment berdasarkan tipe.
 *
 * Karena payments diambil berdasarkan
 * created_at descending, payment pertama
 * adalah payment terbaru.
 */
function getPaymentByType(
  payments: PaymentRecord[],
  paymentType:
    | "DP"
    | "PELUNASAN",
): PaymentRecord | null {
  return (
    payments.find(
      (payment) =>
        payment.payment_type ===
        paymentType,
    ) ?? null
  );
}

/**
 * Normalisasi status pembayaran.
 *
 * Jika belum ada payment sama sekali,
 * tampilkan "unpaid".
 */
function getPaymentStatus(
  payment:
    | PaymentRecord
    | null,
): string {
  if (!payment) {
    return "unpaid";
  }

  return (
    payment.status?.toLowerCase() ??
    "unpaid"
  );
}

/* =========================================
   GET CUSTOMER RECAPS
========================================= */

/**
 * Mengambil seluruh rekapan milik
 * satu customer.
 *
 * PENTING:
 * memberId berasal dari customer token.
 *
 * Tidak boleh menerima member_id
 * dari frontend.
 */
export async function getCustomerRecaps(
  memberId: string,
): Promise<CustomerRecap[]> {
  if (!memberId.trim()) {
    throw new Error(
      "Member ID wajib diisi.",
    );
  }

  /* -------------------------------------
     GET MEMBER
  ------------------------------------- */

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("members")
    .select(`
      id,
      name,
      phone,
      type
    `)
    .eq(
      "id",
      memberId.trim(),
    )
    .maybeSingle();

  if (memberError) {
    console.error(
      "getCustomerRecaps member error:",
      memberError,
    );

    throw new Error(
      "Gagal mengambil data member.",
    );
  }

  if (!member) {
    const error = new Error(
      "Member tidak ditemukan.",
    );

    error.name =
      "MEMBER_NOT_FOUND";

    throw error;
  }

  /* -------------------------------------
     GET RECAPS + BATCH
  ------------------------------------- */

  const {
    data: recaps,
    error: recapsError,
  } = await supabase
    .from("recaps")
    .select(`
      id,
      batch_id,
      member_id,
      detail_barang,
      qty,
      harga_barang,
      total_harga,
      total_dp,
      sisa_pelunasan,
      sudah_co,
      created_at,
      updated_at,

      batch:batches (
        id,
        country,
        name,
        image_path,
        last_payment_dp,
        last_payment_pelunasan
      )
    `)
    .eq(
      "member_id",
      memberId.trim(),
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (recapsError) {
    console.error(
      "getCustomerRecaps recaps error:",
      recapsError,
    );

    throw new Error(
      `Gagal mengambil data rekapan: ${recapsError.message}`,
    );
  }

  if (!recaps || recaps.length === 0) {
    return [];
  }

  /* -------------------------------------
     GET PAYMENTS
  ------------------------------------- */

  const recapIds =
    recaps.map(
      (recap) =>
        recap.id,
    );

  const {
    data: payments,
    error: paymentsError,
  } = await supabase
    .from("payments")
    .select(`
      recap_id,
      payment_type,
      amount,
      status,
      paid_at,
      created_at
    `)
    .in(
      "recap_id",
      recapIds,
    )
    .order(
      "created_at",
      {
        ascending: false,
      },
    );

  if (paymentsError) {
    console.error(
      "getCustomerRecaps payments error:",
      paymentsError,
    );

    throw new Error(
      `Gagal mengambil data pembayaran: ${paymentsError.message}`,
    );
  }

  /* -------------------------------------
     GROUP PAYMENTS BY RECAP
  ------------------------------------- */

  const paymentsByRecap =
    new Map<
      string,
      PaymentRecord[]
    >();

  for (
    const payment of
    payments ?? []
  ) {
    const existing =
      paymentsByRecap.get(
        payment.recap_id,
      ) ?? [];

    existing.push(
      payment,
    );

    paymentsByRecap.set(
      payment.recap_id,
      existing,
    );
  }

  /* -------------------------------------
     BUILD RESPONSE
  ------------------------------------- */

  return Promise.all(
    recaps.map(
      async (recap) => {
        const batch =
          Array.isArray(
            recap.batch,
          )
            ? recap.batch[0] ??
              null
            : recap.batch;

        const recapPayments =
          paymentsByRecap.get(
            recap.id,
          ) ?? [];

        const dpPayment =
          getPaymentByType(
            recapPayments,
            "DP",
          );

        const pelunasanPayment =
          getPaymentByType(
            recapPayments,
            "PELUNASAN",
          );

        /* -------------------------------------
           CALCULATE CURRENT PENALTY
        ------------------------------------- */

        const [
          dpCalculation,
          pelunasanCalculation,
        ] = await Promise.all([
          calculateCurrentPaymentAmount(
            recap.id,
            "DP",
          ),
          calculateCurrentPaymentAmount(
            recap.id,
            "PELUNASAN",
          ),
        ]);

        const dpPaid =
          dpPayment?.status ===
          "paid";

        const pelunasanPaid =
          pelunasanPayment?.status ===
          "paid";

        return {
          id: recap.id,

          country:
            batch?.country ??
            null,

          batch_name:
            batch?.name ??
            null,

          /*
           * image_path berasal dari tabel batches.
           *
           * Untuk sementara kita ambil URL public
           * langsung dari bucket yang digunakan
           * oleh existing batch service.
           */
          product_image:
            batch?.image_path
              ? getBatchImageUrl(
                  batch.image_path,
                )
              : null,

          detail_barang:
            recap.detail_barang,

          qty:
            Number(
              recap.qty ?? 0,
            ),

          total_harga:
            Number(
              recap.total_harga ?? 0,
            ),

          sudah_co:
            Boolean(
              recap.sudah_co,
            ),

          /*
           * Status tipe member saat ini.
           *
           * Jika member diubah menjadi HNR
           * dari Members Page, seluruh rekapan
           * customer tersebut akan menerima
           * member_type = "hnr".
           */
          member_type:
            member.type as
              | "customer"
              | "employee"
              | "hnr",

          down_payment: {
            amount:
              dpPaid
                ? Number(
                    dpPayment?.amount ??
                      dpCalculation.baseAmount,
                  )
                : dpCalculation.currentAmount,

            status:
              getPaymentStatus(
                dpPayment,
              ),

            paid_at:
              dpPayment?.paid_at ??
              null,

            due_date:
              dpCalculation.dueDate,

            penalty_days:
              dpPaid
                ? 0
                : dpCalculation.penaltyDays,

            penalty_amount:
              dpPaid
                ? 0
                : dpCalculation.penaltyAmount,
          },

          pelunasan: {
            amount:
              pelunasanPaid
                ? Number(
                    pelunasanPayment?.amount ??
                      pelunasanCalculation.baseAmount,
                  )
                : pelunasanCalculation.currentAmount,

            status:
              getPaymentStatus(
                pelunasanPayment,
              ),

            paid_at:
              pelunasanPayment?.paid_at ??
              null,

            due_date:
              pelunasanCalculation.dueDate,

            penalty_days:
              pelunasanPaid
                ? 0
                : pelunasanCalculation.penaltyDays,

            penalty_amount:
              pelunasanPaid
                ? 0
                : pelunasanCalculation.penaltyAmount,
          },
        };
      },
    ),
  );
}

/* =========================================
   BATCH IMAGE URL
========================================= */

/**
 * Mengubah image_path menjadi URL public.
 *
 * Sesuaikan bucket dengan bucket existing
 * pada batchService kamu.
 */
function getBatchImageUrl(
  imagePath:
    | string
    | null,
): string | null {
  if (!imagePath) {
    return null;
  }

  const {
    data,
  } =
    supabase.storage
      .from("batch-images")
      .getPublicUrl(
        imagePath,
      );

  return (
    data.publicUrl ??
    null
  );
}