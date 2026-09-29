import { supabase } from "../config/supabase.js";

import {
  calculateCurrentPaymentAmount,
  type PaymentType,
} from "./paymentService.js";

/* =========================================
   TYPES
========================================= */

type MemberRecord = {
  id: string;
  name: string;
  phone: string;
  type: string | null;
};

type BatchRecord = {
  id: string;
  country: string | null;
  name: string | null;
  image_path: string | null;
  last_payment_dp: string | null;
  last_payment_pelunasan: string | null;
  status: string | null;
};

type RecapRecord = {
  id: string;
  batch_id: string;
  member_id: string;
  detail_barang: string;
  qty: number | null;
  harga_barang: number | null;
  total_harga: number | null;
  sudah_co: boolean | null;
  max_timbun: string | null;
  created_at: string;
  batch:
    | BatchRecord
    | BatchRecord[]
    | null;
};

type PaymentRecord = {
  id: string;
  recap_id: string | null;
  payment_type: PaymentType;
  amount: number | null;
  status: string | null;
  payment_url: string | null;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

type NotificationLogRecord = {
  payment_id: string;
  status: string | null;
  sent_at: string | null;
  error_message: string | null;
  scheduled_at: string | null;
  last_attempt_at: string | null;
};

/* =========================================
   HELPERS
========================================= */

function normalizeBatch(
  batch:
    | BatchRecord
    | BatchRecord[]
    | null,
): BatchRecord | null {
  return Array.isArray(batch)
    ? batch[0] ?? null
    : batch;
}

function isPaid(
  payment: PaymentRecord | undefined,
): boolean {
  return (
    payment?.status?.toLowerCase() ===
    "paid"
  );
}

function isPaymentPending(
  payment: PaymentRecord,
): boolean {
  return (
    payment.status?.toLowerCase() ===
    "pending"
  );
}

function getPaymentDueDate(
  batch: BatchRecord | null,
  paymentType: PaymentType,
): string | null {
  if (!batch) {
    return null;
  }

  return paymentType === "DP"
    ? batch.last_payment_dp
    : batch.last_payment_pelunasan;
}

function sortByDueDate(
  a: { due_date: string | null },
  b: { due_date: string | null },
): number {
  if (!a.due_date && !b.due_date) {
    return 0;
  }

  if (!a.due_date) {
    return 1;
  }

  if (!b.due_date) {
    return -1;
  }

  return (
    new Date(`${a.due_date}T00:00:00`).getTime() -
    new Date(`${b.due_date}T00:00:00`).getTime()
  );
}

function getBatchImageUrl(
  imagePath: string | null,
): string | null {
  if (!imagePath) {
    return null;
  }

  const { data } =
    supabase.storage
      .from("batch-images")
      .getPublicUrl(imagePath);

  return data.publicUrl ?? null;
}

/* =========================================
   GET CUSTOMER DASHBOARD
========================================= */

export async function getCustomerDashboard(
  memberId: string,
) {
  const normalizedMemberId =
    memberId.trim();

  if (!normalizedMemberId) {
    throw new Error(
      "Member ID tidak ditemukan.",
    );
  }

  /* =======================================
     MEMBER
  ======================================== */

  const {
    data: memberData,
    error: memberError,
  } = await supabase
    .from("members")
    .select(`
      id,
      name,
      phone,
      type
    `)
    .eq("id", normalizedMemberId)
    .maybeSingle();

  if (memberError) {
    console.error(
      "getCustomerDashboard member error:",
      memberError,
    );

    throw new Error(
      "Gagal mengambil data member.",
    );
  }

  if (!memberData) {
    const error = new Error(
      "Member tidak ditemukan.",
    );

    error.name = "MEMBER_NOT_FOUND";

    throw error;
  }

  const member =
    memberData as MemberRecord;

  /* =======================================
     RECAPS + BATCH
  ======================================== */

  const {
    data: recapData,
    error: recapError,
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
      sudah_co,
      max_timbun,
      created_at,

      batch:batches (
        id,
        country,
        name,
        image_path,
        last_payment_dp,
        last_payment_pelunasan,
        status
      )
    `)
    .eq(
      "member_id",
      normalizedMemberId,
    )
    .order("created_at", {
      ascending: false,
    });

  if (recapError) {
    console.error(
      "getCustomerDashboard recaps error:",
      recapError,
    );

    throw new Error(
      "Gagal mengambil data rekapan.",
    );
  }

  const recaps =
    (recapData ?? []) as unknown as RecapRecord[];

  /* =======================================
     EMPTY RECAPS
  ======================================== */

  if (recaps.length === 0) {
    return {
      member: {
        id: member.id,
        name: member.name,
        phone: member.phone,
        type: member.type,
      },

      summary: {
        total_recaps: 0,
        unpaid_recaps: 0,
        pending_payments: 0,
        checked_out: 0,
      },

      upcoming_payments: [],
      upcoming_recaps: [],
      checkout_ready: [],
    };
  }

  const recapIds = recaps.map(
    (recap) => recap.id,
  );

  /* =======================================
     PAYMENTS
  ======================================== */

  const {
    data: paymentData,
    error: paymentError,
  } = await supabase
    .from("payments")
    .select(`
      id,
      recap_id,
      payment_type,
      amount,
      status,
      payment_url,
      expires_at,
      paid_at,
      created_at,
      updated_at
    `)
    .in("recap_id", recapIds)
    .order("created_at", {
      ascending: false,
    });

  if (paymentError) {
    console.error(
      "getCustomerDashboard payments error:",
      paymentError,
    );

    throw new Error(
      "Gagal mengambil data pembayaran.",
    );
  }

  const payments =
    (paymentData ?? []) as PaymentRecord[];

  /* =======================================
     GROUP PAYMENTS
  ======================================== */

  const paymentsByRecap =
    new Map<
      string,
      PaymentRecord[]
    >();

  const latestPaymentByType =
    new Map<string, PaymentRecord>();

  for (const payment of payments) {
    if (!payment.recap_id) {
      continue;
    }

    const recapPayments =
      paymentsByRecap.get(
        payment.recap_id,
      ) ?? [];

    recapPayments.push(payment);

    paymentsByRecap.set(
      payment.recap_id,
      recapPayments,
    );

    const key = `${payment.recap_id}:${payment.payment_type}`;

    if (!latestPaymentByType.has(key)) {
      latestPaymentByType.set(
        key,
        payment,
      );
    }
  }

  /* =======================================
     WHATSAPP NOTIFICATION STATUS
  ======================================== */

  const paymentIds = payments.map(
    (payment) => payment.id,
  );

  const notificationByPayment =
    new Map<
      string,
      NotificationLogRecord
    >();

  if (paymentIds.length > 0) {
    const {
      data: notificationData,
      error: notificationError,
    } = await supabase
      .from("notification_logs")
      .select(`
        payment_id,
        status,
        sent_at,
        error_message,
        scheduled_at,
        last_attempt_at
      `)
      .in("payment_id", paymentIds)
      .eq(
        "notification_type",
        "RECAP_PAYMENT",
      )
      .order("last_attempt_at", {
        ascending: false,
      });

    if (notificationError) {
      console.error(
        "getCustomerDashboard notification error:",
        notificationError,
      );

      throw new Error(
        "Gagal mengambil status pengiriman WhatsApp.",
      );
    }

    for (const notification of
      (notificationData ?? []) as NotificationLogRecord[]) {
      if (
        !notificationByPayment.has(
          notification.payment_id,
        )
      ) {
        notificationByPayment.set(
          notification.payment_id,
          notification,
        );
      }
    }
  }

  /* =======================================
     SUMMARY
  ======================================== */

  const checkedOut = recaps.filter(
    (recap) =>
      recap.sudah_co === true,
  ).length;

  let unpaidRecaps = 0;
  let pendingPaymentCount = 0;

  for (const recap of recaps) {
    const recapPayments =
      paymentsByRecap.get(
        recap.id,
      ) ?? [];

    const dpPaid = recapPayments.some(
      (payment) =>
        payment.payment_type ===
          "DP" &&
        isPaid(payment),
    );

    const pelunasanPaid = recapPayments.some(
      (payment) =>
        payment.payment_type ===
          "PELUNASAN" &&
        isPaid(payment),
    );

    if (!dpPaid || !pelunasanPaid) {
      unpaidRecaps += 1;
    }

    pendingPaymentCount +=
      recapPayments.filter(
        isPaymentPending,
      ).length;
  }

  /* =======================================
     UPCOMING PAYMENTS
  ======================================== */

  const upcomingPaymentCandidates =
    recaps.flatMap(
      (recap) => {
        const batch = normalizeBatch(
          recap.batch,
        );

        const recapPayments =
          paymentsByRecap.get(
            recap.id,
          ) ?? [];

        const dpPaid = recapPayments.some(
          (payment) =>
            payment.payment_type ===
              "DP" &&
            isPaid(payment),
        );

        const pelunasanPaid = recapPayments.some(
          (payment) =>
            payment.payment_type ===
              "PELUNASAN" &&
            isPaid(payment),
        );

        let paymentType: PaymentType | null =
          null;

        if (!dpPaid) {
          paymentType = "DP";
        } else if (!pelunasanPaid) {
          paymentType = "PELUNASAN";
        }

        if (!paymentType) {
          return [];
        }

        const paymentKey =
          `${recap.id}:${paymentType}`;

        const latestPayment =
          latestPaymentByType.get(
            paymentKey,
          ) ?? null;

        return [
          {
            recap,
            batch,
            paymentType,
            latestPayment,
          },
        ];
      },
    );

  const calculatedUpcomingPayments =
    await Promise.all(
      upcomingPaymentCandidates.map(
        async (candidate) => {
          const calculation =
            await calculateCurrentPaymentAmount(
              candidate.recap.id,
              candidate.paymentType,
            );

          const notification =
            candidate.latestPayment
              ? notificationByPayment.get(
                  candidate.latestPayment.id,
                ) ?? null
              : null;

          return {
            recap_id:
              candidate.recap.id,
            batch_id:
              candidate.recap.batch_id,
            batch_name:
              candidate.batch?.name ??
              null,
            country:
              candidate.batch?.country ??
              null,
            product_image:
              getBatchImageUrl(
                candidate.batch?.image_path ??
                  null,
              ),
            detail_barang:
              candidate.recap.detail_barang,
            qty: Number(
              candidate.recap.qty ?? 0,
            ),
            payment_type:
              candidate.paymentType,
            amount:
              calculation.currentAmount,
            base_amount:
              calculation.baseAmount,
            penalty_days:
              calculation.penaltyDays,
            penalty_amount:
              calculation.penaltyAmount,
            due_date:
              calculation.dueDate,
            payment_id:
              candidate.latestPayment?.id ??
              null,
            payment_status:
              candidate.latestPayment?.status ??
              "unpaid",
            payment_url:
              candidate.latestPayment?.payment_url ??
              null,
            payment_link_status:
              notification?.status ??
              "not_sent",
            payment_link_sent_at:
              notification?.sent_at ??
              null,
          };
        },
      ),
    );

  calculatedUpcomingPayments.sort(
    sortByDueDate,
  );

  const upcomingPayments =
    calculatedUpcomingPayments.slice(0, 6);

  /* =======================================
     UPCOMING RECAPS
     BATCH = AKAN DI ORDER
  ======================================== */

  const upcomingRecaps = recaps
    .filter((recap) => {
      const batch = normalizeBatch(
        recap.batch,
      );

      return (
        batch?.status ===
        "Akan di Order"
      );
    })
    .map((recap) => {
      const batch = normalizeBatch(
        recap.batch,
      );

      return {
        recap_id: recap.id,
        batch_id: recap.batch_id,
        batch_name:
          batch?.name ?? null,
        country:
          batch?.country ?? null,
        product_image:
          getBatchImageUrl(
            batch?.image_path ?? null,
          ),
        detail_barang:
          recap.detail_barang,
        qty: Number(
          recap.qty ?? 0,
        ),
        created_at:
          recap.created_at,
      };
    });

  /* =======================================
     CHECKOUT READY
     FOLLOW EXISTING MANUAL SHIPPING RULE
  ======================================== */

  const batchIds = Array.from(
    new Set(
      recaps
        .map(
          (recap) =>
            recap.batch_id,
        )
        .filter(Boolean),
    ),
  );

  const batchInfoMap =
    new Map<
      string,
      {
        status: string | null;
        last_payment_pelunasan:
          string | null;
      }
    >();

  if (batchIds.length > 0) {
    const {
      data: batchData,
      error: batchError,
    } = await supabase
      .from("batches")
      .select(
        "id, status, last_payment_pelunasan",
      )
      .in("id", batchIds);

    if (batchError) {
      console.error(
        "getCustomerDashboard batch error:",
        batchError,
      );

      throw new Error(
        "Gagal mengambil status batch.",
      );
    }

    for (const batch of
      batchData ?? []) {
      batchInfoMap.set(
        batch.id,
        {
          status:
            batch.status ?? null,
          last_payment_pelunasan:
            batch.last_payment_pelunasan ??
            null,
        },
      );
    }
  }

  const {
    data: usedManualItems,
    error: usedManualError,
  } = await supabase
    .from("manual_shipment_items")
    .select("recap_id")
    .in("recap_id", recapIds);

  if (usedManualError) {
    console.error(
      "getCustomerDashboard manual shipment items error:",
      usedManualError,
    );

    throw new Error(
      "Gagal memeriksa riwayat pengiriman manual.",
    );
  }

  const usedManualRecapIds =
    new Set(
      (usedManualItems ?? []).map(
        (item) => item.recap_id,
      ),
    );

  const {
    data: usedMarketplaceItems,
    error: usedMarketplaceError,
  } = await supabase
    .from("marketplace_order_items")
    .select("recap_id")
    .in("recap_id", recapIds);

  if (usedMarketplaceError) {
    console.error(
      "getCustomerDashboard marketplace items error:",
      usedMarketplaceError,
    );

    throw new Error(
      "Gagal memeriksa pesanan Marketplace.",
    );
  }

  const usedMarketplaceRecapIds =
    new Set(
      (usedMarketplaceItems ?? []).map(
        (item) => item.recap_id,
      ),
    );

  const checkoutReady = recaps
    .filter((recap) => {
      const batchInfo =
        batchInfoMap.get(
          recap.batch_id,
        );

      if (
        batchInfo?.status !==
        "Sudah sampai di Admin"
      ) {
        return false;
      }

      if (
        usedManualRecapIds.has(
          recap.id,
        )
      ) {
        return false;
      }

      if (
        usedMarketplaceRecapIds.has(
          recap.id,
        )
      ) {
        return false;
      }

      if (
        recap.sudah_co !== false
      ) {
        return false;
      }

      const recapPayments =
        paymentsByRecap.get(
          recap.id,
        ) ?? [];

      const dpPaid = recapPayments.some(
        (payment) =>
          payment.payment_type ===
            "DP" &&
          isPaid(payment),
      );

      const pelunasanPaid = recapPayments.some(
        (payment) =>
          payment.payment_type ===
            "PELUNASAN" &&
          isPaid(payment),
      );

      return (
        dpPaid &&
        pelunasanPaid
      );
    })
    .map((recap) => {
      const batch = normalizeBatch(
        recap.batch,
      );

      const batchInfo =
        batchInfoMap.get(
          recap.batch_id,
        );

      return {
        recap_id: recap.id,
        batch_id: recap.batch_id,
        batch_name:
          batch?.name ?? null,
        country:
          batch?.country ?? null,
        product_image:
          getBatchImageUrl(
            batch?.image_path ?? null,
          ),
        detail_barang:
          recap.detail_barang,
        qty: Number(
          recap.qty ?? 0,
        ),
        status_barang:
          batchInfo?.status ??
          null,
        max_timbun:
          recap.max_timbun ?? null,
        created_at:
          recap.created_at,
      };
    });

  /* =======================================
     RESPONSE
  ======================================== */

  return {
    member: {
      id: member.id,
      name: member.name,
      phone: member.phone,
      type: member.type,
    },

    summary: {
      total_recaps:
        recaps.length,
      unpaid_recaps:
        unpaidRecaps,
      pending_payments:
        pendingPaymentCount,
      checked_out:
        checkedOut,
    },

    upcoming_payments:
      upcomingPayments,

    upcoming_recaps:
      upcomingRecaps,

    checkout_ready:
      checkoutReady,
  };
}
