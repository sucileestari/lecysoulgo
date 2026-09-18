import { supabase } from "../config/supabase.js";
import type { PaymentType } from "./paymentService.js";

/* =========================================
   CONSTANTS
========================================= */

const HNR_LATE_DAYS = 30;
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

/* =========================================
   TYPES
========================================= */

type HnrJobResult = {
  checked: number;
  markedHnr: number;
  skipped: number;
  failed: number;
};

type RecapHnrContext = {
  id: string;
  member_id: string;
  member:
    | {
        id: string;
        type:
          | "customer"
          | "employee"
          | "hnr";
      }
    | {
        id: string;
        type:
          | "customer"
          | "employee"
          | "hnr";
      }[]
    | null;
  batch:
    | {
        last_payment_dp: string | null;
        last_payment_pelunasan: string | null;
      }
    | {
        last_payment_dp: string | null;
        last_payment_pelunasan: string | null;
      }[]
    | null;
};

type LatePermissionRow = {
  id: string;
  payment_date: string;
  payment_status: "unpaid" | "paid";
  created_at: string;
  items: {
    recap_id: string;
    payment_type: PaymentType;
  }[];
};

type BatchData = {
  last_payment_dp: string | null;
  last_payment_pelunasan: string | null;
};

/* =========================================
   DATE HELPERS
========================================= */

function jakartaDate(
  date = new Date(),
): string {
  const parts =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone:
          JAKARTA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      },
    ).formatToParts(date);

  const result: Record<
    string,
    string
  > = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      result[part.type] =
        part.value;
    }
  }

  return `${result.year}-${result.month}-${result.day}`;
}

function addDays(
  dateOnly: string,
  amount: number,
): string {
  const date = new Date(
    `${dateOnly}T00:00:00+07:00`,
  );

  date.setUTCDate(
    date.getUTCDate() + amount,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

/* =========================================
   RELATION HELPERS
========================================= */

function normalizeBatch(
  batch:
    | RecapHnrContext["batch"]
    | undefined,
): BatchData | null {
  if (!batch) {
    return null;
  }

  if (Array.isArray(batch)) {
    return batch[0] ?? null;
  }

  return batch;
}

/* =========================================
   RESULT HELPERS
========================================= */

function emptyHnrResult(): HnrJobResult {
  return {
    checked: 0,
    markedHnr: 0,
    skipped: 0,
    failed: 0,
  };
}

/* =========================================
   PAYMENT HELPERS
========================================= */

function isPaymentPaid(
  payments: Array<{
    recap_id: string | null;
    payment_type: PaymentType;
    status: string;
  }>,
  recapId: string,
  paymentType: PaymentType,
): boolean {
  return payments.some(
    (payment) =>
      payment.recap_id ===
        recapId &&
      payment.payment_type ===
        paymentType &&
      payment.status ===
        "paid",
  );
}

/* =========================================
   LATE PAYMENT PERMISSION
========================================= */

async function hasActiveLatePaymentPermission(
  recapId: string,
  paymentType: PaymentType,
  today: string,
): Promise<boolean> {
  const {
    data,
    error,
  } = await supabase
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
        ascending:
          false,
      },
    );

  if (error) {
    throw new Error(
      `Gagal mengambil ijin telat bayar: ${error.message}`,
    );
  }

  const permissions =
    (data ?? []) as LatePermissionRow[];

  return permissions.some(
    (permission) =>
      permission.items?.some(
        (item) =>
          item.recap_id ===
            recapId &&
          item.payment_type ===
            paymentType,
      ) &&
      today <=
        permission.payment_date,
  );
}

/* =========================================
   GET RECAPS
========================================= */

async function getCustomerRecaps(): Promise<
  RecapHnrContext[]
> {
  const {
    data,
    error,
  } = await supabase
    .from("recaps")
    .select(`
      id,
      member_id,
      member:members!inner (
        id,
        type
      ),
      batch:batches!inner (
        last_payment_dp,
        last_payment_pelunasan
      )
    `)
    .eq(
      "member.type",
      "customer",
    );

  if (error) {
    throw new Error(
      `Gagal mengambil data rekapan untuk HNR: ${error.message}`,
    );
  }

  return (data ?? []) as RecapHnrContext[];
}

/* =========================================
   PROCESS HNR
========================================= */

/**
 * Customer menjadi HNR jika:
 *
 * 1. Memiliki kewajiban Rekapan
 *    yang belum dibayar.
 *
 * 2. Due date kewajiban tersebut
 *    sudah lewat >= 30 hari.
 *
 * 3. Tidak sedang memiliki
 *    ijin telat bayar aktif
 *    untuk kewajiban tersebut.
 *
 * Hanya member dengan type "customer"
 * yang diproses.
 */
export async function processHnrMembers(
  date = new Date(),
): Promise<HnrJobResult> {
  const result =
    emptyHnrResult();

  const today =
    jakartaDate(date);

  const recaps =
    await getCustomerRecaps();

  if (recaps.length === 0) {
    return result;
  }

  const recapIds =
    recaps.map(
      (recap) =>
        recap.id,
    );

  const {
    data: paymentData,
    error: paymentError,
  } = await supabase
    .from("payments")
    .select(
      "recap_id, payment_type, status",
    )
    .in(
      "recap_id",
      recapIds,
    );

  if (paymentError) {
    throw new Error(
      `Gagal mengambil status pembayaran untuk HNR: ${paymentError.message}`,
    );
  }

  const payments =
    (paymentData ?? []) as Array<{
      recap_id: string | null;
      payment_type: PaymentType;
      status: string;
    }>;

  const recapsByMember =
    new Map<
      string,
      RecapHnrContext[]
    >();

  for (const recap of recaps) {
    if (!recap.member_id) {
      result.skipped += 1;
      continue;
    }

    const existing =
      recapsByMember.get(
        recap.member_id,
      );

    if (existing) {
      existing.push(
        recap,
      );
    } else {
      recapsByMember.set(
        recap.member_id,
        [recap],
      );
    }
  }

  for (
    const [
      memberId,
      memberRecaps,
    ] of recapsByMember
  ) {
    result.checked += 1;

    try {
      let shouldMarkHnr =
        false;

      for (const recap of memberRecaps) {
        const batch =
          normalizeBatch(
            recap.batch,
          );

        const dueDates: {
          paymentType: PaymentType;
          dueDate:
            | string
            | null;
        }[] = [
          {
            paymentType:
              "DP",
            dueDate:
              batch
                ?.last_payment_dp ??
              null,
          },
          {
            paymentType:
              "PELUNASAN",
            dueDate:
              batch
                ?.last_payment_pelunasan ??
              null,
          },
        ];

        for (const obligation of dueDates) {
          if (
            !obligation.dueDate
          ) {
            continue;
          }

          /*
           * Sudah lunas -> bukan kewajiban
           * yang harus diproses menjadi HNR.
           */
          if (
            isPaymentPaid(
              payments,
              recap.id,
              obligation.paymentType,
            )
          ) {
            continue;
          }

          /*
           * HNR mulai berlaku setelah
           * due date lewat >= 30 hari.
           */
          const hnrDate =
            addDays(
              obligation.dueDate,
              HNR_LATE_DAYS,
            );

          if (
            hnrDate >
            today
          ) {
            continue;
          }

          /*
           * Selama ijin telat bayar
           * masih aktif, jangan jadikan HNR.
           */
          const hasPermission =
            await hasActiveLatePaymentPermission(
              recap.id,
              obligation.paymentType,
              today,
            );

          if (
            hasPermission
          ) {
            continue;
          }

          /*
           * Minimal ada satu kewajiban
           * yang memenuhi syarat HNR.
           */
          shouldMarkHnr =
            true;

          break;
        }

        if (shouldMarkHnr) {
          break;
        }
      }

      if (
        !shouldMarkHnr
      ) {
        continue;
      }

      /*
       * Hanya customer yang boleh
       * diubah menjadi HNR.
       *
       * Kondisi type customer juga
       * mencegah update member yang
       * sudah bukan customer.
       */
      const {
        error: updateError,
      } = await supabase
        .from("members")
        .update({
          type: "hnr",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          memberId,
        )
        .eq(
          "type",
          "customer",
        );

      if (updateError) {
        throw new Error(
          `Gagal mengubah member menjadi HNR: ${updateError.message}`,
        );
      }

      result.markedHnr += 1;
    } catch (error) {
      result.failed += 1;

      console.error(
        "processHnrMembers error:",
        {
          memberId,
          error,
        },
      );
    }
  }

  return result;
}