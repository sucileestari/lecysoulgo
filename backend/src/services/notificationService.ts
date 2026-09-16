import { supabase } from "../config/supabase.js";
import {
  generatePaymentLink,
  type Payment,
  type PaymentType,
} from "./paymentService.js";
import { sendWhatsApp } from "./whatsappService.js";

export type NotificationType =
  | "RECAP_PAYMENT"
  | "DUE_DATE_REMINDER"
  | "OVERDUE_H3";

export type NotificationLogStatus =
  | "scheduled"
  | "sent"
  | "failed"
  | "skipped";

type CreateNotificationLogInput = {
  member_id: string;
  recap_id: string;
  payment_id: string;
  notification_type: NotificationType;
  scheduled_at: string;
};

type MarkNotificationResult = {
  logId: string;
  status: NotificationLogStatus;
};

/* =========================================
   GET EXISTING NOTIFICATION LOG
========================================= */

export async function getNotificationLog(
  paymentId: string,
  notificationType: NotificationType,
) {
  const { data, error } = await supabase
    .from("notification_logs")
    .select("*")
    .eq("payment_id", paymentId)
    .eq(
      "notification_type",
      notificationType,
    )
    .maybeSingle();

  if (error) {
    throw new Error(
      `Gagal mengambil log notifikasi: ${error.message}`,
    );
  }

  return data;
}

/* =========================================
   CREATE SCHEDULED LOG
========================================= */

export async function createScheduledNotificationLog(
  input: CreateNotificationLogInput,
) {
  const existing =
    await getNotificationLog(
      input.payment_id,
      input.notification_type,
    );

  if (existing) {
    return existing;
  }

  const { data, error } =
    await supabase
      .from("notification_logs")
      .insert({
        member_id:
          input.member_id,
        recap_id:
          input.recap_id,
        payment_id:
          input.payment_id,
        notification_type:
          input.notification_type,
        scheduled_at:
          input.scheduled_at,
        status: "scheduled",
      })
      .select("*")
      .single();

  if (error || !data) {
    throw new Error(
      `Gagal membuat log notifikasi: ${
        error?.message ?? "Unknown error"
      }`,
    );
  }

  return data;
}

/* =========================================
   MARK SKIPPED
========================================= */

export async function markNotificationSkipped(
  logId: string,
  reason: string,
): Promise<MarkNotificationResult> {
  const { data, error } =
    await supabase
      .from("notification_logs")
      .update({
        status: "skipped",
        skip_reason:
          reason,
        last_attempt_at:
          new Date().toISOString(),
      })
      .eq("id", logId)
      .select("id, status")
      .single();

  if (error || !data) {
    throw new Error(
      `Gagal memperbarui log skipped: ${
        error?.message ?? "Unknown error"
      }`,
    );
  }

  return {
    logId: data.id,
    status:
      data.status as NotificationLogStatus,
  };
}

/* =========================================
   SEND + LOG WHATSAPP
========================================= */

export async function sendLoggedWhatsApp(
  logId: string,
  target: string,
  message: string,
): Promise<MarkNotificationResult> {
  const { data: log, error: logError } =
    await supabase
      .from("notification_logs")
      .select("id, status, attempt_count")
      .eq("id", logId)
      .single();

  if (logError || !log) {
    throw new Error(
      `Log notifikasi tidak ditemukan: ${
        logError?.message ?? "Unknown error"
      }`,
    );
  }

  if (
    log.status === "sent" ||
    log.status === "skipped"
  ) {
    return {
      logId: log.id,
      status:
        log.status as NotificationLogStatus,
    };
  }

  const nextAttemptCount =
    Number(log.attempt_count ?? 0) + 1;

  await supabase
    .from("notification_logs")
    .update({
      status: "scheduled",
      attempt_count:
        nextAttemptCount,
      last_attempt_at:
        new Date().toISOString(),
      error_message: null,
    })
    .eq("id", log.id);

  try {
    const result =
      await sendWhatsApp({
        target,
        message,
      });

    const providerMessageId =
      typeof result === "object" &&
      result !== null &&
      "id" in result &&
      typeof result.id === "string"
        ? result.id
        : typeof result === "object" &&
            result !== null &&
            "message_id" in result &&
            typeof result.message_id ===
              "string"
          ? result.message_id
          : null;

    const { data, error } =
      await supabase
        .from("notification_logs")
        .update({
          status: "sent",
          sent_at:
            new Date().toISOString(),
          provider_message_id:
            providerMessageId,
          error_message: null,
          last_attempt_at:
            new Date().toISOString(),
        })
        .eq("id", log.id)
        .select("id, status")
        .single();

    if (error || !data) {
      throw new Error(
        `WhatsApp berhasil dikirim tetapi log gagal diperbarui: ${
          error?.message ?? "Unknown error"
        }`,
      );
    }

    return {
      logId: data.id,
      status: "sent",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Gagal mengirim WhatsApp.";

    await supabase
      .from("notification_logs")
      .update({
        status: "failed",
        error_message:
          errorMessage,
        last_attempt_at:
          new Date().toISOString(),
      })
      .eq("id", log.id);

    return {
      logId: log.id,
      status: "failed",
    };
  }
}


/* =========================================
   NOTIFICATION LOG LIST
========================================= */

export type NotificationLogFilter = {
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
  notificationType?: "RECAP_PAYMENT" | "DUE_DATE_REMINDER";
  status?: NotificationLogStatus;
  buyer?: string;
};

export type NotificationLogListItem = {
  id: string;
  notification_type: NotificationType;
  scheduled_at: string;
  sent_at: string | null;
  status: NotificationLogStatus;
  provider_message_id: string | null;
  error_message: string | null;
  skip_reason: string | null;
  attempt_count: number;
  last_attempt_at: string | null;
  created_at: string;
  member: {
    id: string;
    name: string | null;
    phone: string | null;
  } | null;
  recap: {
    id: string;
    detail_barang: string | null;
    batch: {
      id: string;
      name: string | null;
      country: string | null;
      last_payment_dp: string | null;
      last_payment_pelunasan: string | null;
    } | null;
  } | null;
  payment: {
    id: string;
    payment_type: PaymentType;
    amount: number;
    status: string;
    due_date: string | null;
  } | null;
};

export type NotificationLogListResult = {
  items: NotificationLogListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    total: number;
    sent: number;
    failed: number;
    skipped: number;
  };
};

function normalizePositiveInteger(
  value: number | undefined,
  fallback: number,
): number {
  if (!Number.isInteger(value) || Number(value) <= 0) {
    return fallback;
  }

  return Number(value);
}

function getDateRange(
  dateFrom?: string,
  dateTo?: string,
): { from: string | null; toExclusive: string | null } {
  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    throw new Error("Tanggal mulai tidak valid.");
  }

  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    throw new Error("Tanggal akhir tidak valid.");
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error("Tanggal mulai tidak boleh melebihi tanggal akhir.");
  }

  return {
    from: dateFrom
      ? `${dateFrom}T00:00:00+07:00`
      : null,
    toExclusive: dateTo
      ? `${addOneDay(dateTo)}T00:00:00+07:00`
      : null,
  };
}

function addOneDay(dateOnly: string): string {
  const date = new Date(`${dateOnly}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function getBuyerIdsByName(
  buyer?: string,
): Promise<string[] | null> {
  const keyword = buyer?.trim();

  if (!keyword) {
    return null;
  }

  const { data, error } = await supabase
    .from("members")
    .select("id")
    .ilike("name", `%${keyword}%`);

  if (error) {
    throw new Error(
      `Gagal mencari pembeli: ${error.message}`,
    );
  }

  return (data ?? []).map((item) => item.id);
}

function applyNotificationFilters(
  query: any,
  filters: {
    dateFrom?: string;
    dateTo?: string;
    notificationType?: "RECAP_PAYMENT" | "DUE_DATE_REMINDER";
    status?: NotificationLogStatus;
    memberIds?: string[] | null;
  },
): any {
  const dateRange = getDateRange(
    filters.dateFrom,
    filters.dateTo,
  );

  let result = query.or(
    "notification_type.in.(RECAP_PAYMENT,DUE_DATE_REMINDER),and(notification_type.eq.OVERDUE_H3,status.eq.skipped)",
  );

  if (dateRange.from) {
    result = result.gte(
      "scheduled_at",
      dateRange.from,
    );
  }

  if (dateRange.toExclusive) {
    result = result.lt(
      "scheduled_at",
      dateRange.toExclusive,
    );
  }

  if (filters.notificationType) {
    result = result.eq(
      "notification_type",
      filters.notificationType,
    );
  }

  if (filters.status) {
    result = result.eq(
      "status",
      filters.status,
    );
  }

  if (filters.memberIds) {
    if (filters.memberIds.length === 0) {
      result = result.in("id", [
        "00000000-0000-0000-0000-000000000000",
      ]);
    } else {
      result = result.in(
        "member_id",
        filters.memberIds,
      );
    }
  }

  return result;
}

async function countNotificationLogs(
  filters: {
    dateFrom?: string;
    dateTo?: string;
    notificationType?: "RECAP_PAYMENT" | "DUE_DATE_REMINDER";
    status?: NotificationLogStatus;
    memberIds?: string[] | null;
  },
): Promise<number> {
  let query = supabase
    .from("notification_logs")
    .select("id", {
      count: "exact",
      head: true,
    });

  query = applyNotificationFilters(
    query,
    filters,
  );

  const { count, error } = await query;

  if (error) {
    throw new Error(
      `Gagal menghitung notification log: ${error.message}`,
    );
  }

  return count ?? 0;
}

export async function getNotificationLogs(
  filters: NotificationLogFilter = {},
): Promise<NotificationLogListResult> {
  const page = normalizePositiveInteger(
    filters.page,
    1,
  );
  const limit = Math.min(
    normalizePositiveInteger(filters.limit, 10),
    100,
  );

  const memberIds =
    await getBuyerIdsByName(filters.buyer);

  const commonFilters = {
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    notificationType:
      filters.notificationType,
    memberIds,
  };

  const total = await countNotificationLogs(
    commonFilters,
  );

  const [sent, failed, skipped] =
    await Promise.all([
      countNotificationLogs({
        ...commonFilters,
        status: "sent",
      }),
      countNotificationLogs({
        ...commonFilters,
        status: "failed",
      }),
      countNotificationLogs({
        ...commonFilters,
        status: "skipped",
      }),
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit),
  );
  const normalizedPage = Math.min(
    page,
    totalPages,
  );
  const from =
    (normalizedPage - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("notification_logs")
    .select(`
      id,
      notification_type,
      scheduled_at,
      sent_at,
      status,
      provider_message_id,
      error_message,
      skip_reason,
      attempt_count,
      last_attempt_at,
      created_at,
      member:members (
        id,
        name,
        phone
      ),
      recap:recaps (
        id,
        detail_barang,
        batch:batches (
          id,
          name,
          country,
          last_payment_dp,
          last_payment_pelunasan
        )
      ),
      payment:payments (
        id,
        payment_type,
        amount,
        status
      )
    `);

  query = applyNotificationFilters(
    query,
    {
      ...commonFilters,
      status: filters.status,
    },
  );

  const { data, error } = await query
    .order("scheduled_at", {
      ascending: false,
    })
    .range(from, to);

  if (error) {
    throw new Error(
      `Gagal mengambil notification log: ${error.message}`,
    );
  }

  const items = (data ?? []).map((row) => {
    const item = row as any;
    const member = Array.isArray(item.member)
      ? item.member[0] ?? null
      : item.member ?? null;
    const recap = Array.isArray(item.recap)
      ? item.recap[0] ?? null
      : item.recap ?? null;
    const payment = Array.isArray(item.payment)
      ? item.payment[0] ?? null
      : item.payment ?? null;

    const normalizedRecap = recap
      ? {
          id: recap.id,
          detail_barang:
            recap.detail_barang ?? null,
          batch: Array.isArray(recap.batch)
            ? recap.batch[0] ?? null
            : recap.batch ?? null,
        }
      : null;

    const batch = normalizedRecap?.batch ?? null;

    const dueDate =
      payment?.payment_type === "DP"
        ? batch?.last_payment_dp ?? null
        : payment?.payment_type === "PELUNASAN"
          ? batch?.last_payment_pelunasan ?? null
          : null;

    return {
      id: item.id,
      notification_type:
        (item.notification_type === "OVERDUE_H3"
          ? "DUE_DATE_REMINDER"
          : item.notification_type) as NotificationType,
      scheduled_at: item.scheduled_at,
      sent_at: item.sent_at ?? null,
      status: item.status as NotificationLogStatus,
      provider_message_id:
        item.provider_message_id ?? null,
      error_message: item.error_message ?? null,
      skip_reason: item.skip_reason ?? null,
      attempt_count: Number(
        item.attempt_count ?? 0,
      ),
      last_attempt_at:
        item.last_attempt_at ?? null,
      created_at: item.created_at,
      member,
      recap: normalizedRecap,
      payment: payment
        ? {
            id: payment.id,
            payment_type:
              payment.payment_type as PaymentType,
            amount: Number(
              payment.amount ?? 0,
            ),
            status: payment.status,
            due_date: dueDate,
          }
        : null,
    };
  });

  return {
    items,
    pagination: {
      page: normalizedPage,
      limit,
      total,
      totalPages,
    },
    summary: {
      total,
      sent,
      failed,
      skipped,
    },
  };
}

/* =========================================
   RETRY FAILED NOTIFICATION
========================================= */

function retryRupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function retryCountryName(
  value: string | null | undefined,
): string {
  switch (
    String(value ?? "").toLowerCase()
  ) {
    case "china":
      return "China";
    case "indonesia":
      return "Indonesia";
    case "jepang":
      return "Jepang";
    case "korea":
      return "Korea";
    case "thailand":
      return "Thailand";
    default:
      return value ?? "-";
  }
}

function retryPaymentLabel(
  type: PaymentType,
): string {
  return type === "DP" ? "DP" : "Pelunasan";
}

function retryFormatLongDate(
  dateString: string | null | undefined,
): string {
  if (!dateString) {
    return "-";
  }

  const date = new Date(
    `${dateString}T00:00:00+07:00`,
  );

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function buildRetryMessage(
  notificationType: NotificationType,
  memberName: string | null | undefined,
  product: string | null | undefined,
  batchName: string | null | undefined,
  country: string | null | undefined,
  payment: Payment,
  dueDate: string | null | undefined,
  paymentUrl?: string,
): string {
  const buyer =
    memberName?.trim() || "Kak";
  const normalizedProduct =
    product?.trim() || "-";
  const normalizedBatch =
    batchName?.trim() || "-";
  if (
    notificationType ===
    "RECAP_PAYMENT"
  ) {
    return [
      `Halo Kak ${buyer} 👋`,
      "",
      "Kakak ada pesanan yang harus dibayar:",
      `📦 Product: ${normalizedProduct}`,
      `🏷️ Batch: ${normalizedBatch}`,
      `🌏 Negara: ${retryCountryName(country)}`,
      `💰 Jenis Pembayaran: ${retryPaymentLabel(payment.payment_type)}`,
      `💰 Total Pembayaran: ${retryRupiah(Number(payment.amount ?? 0))}`,
      `📅 Maksimal Pembayaran: ${retryFormatLongDate(dueDate)}`,
      "",
      "Silakan lakukan pembayaran melalui link berikut:",
      paymentUrl ?? "-",
      "",
      "*Mohon untuk Tidak klik Link jika tidak langsung membayar, karena batas pembayaran setelah klik link adalah 15 Menit*",
      "",
      "Terima kasih Sudah Belanja di Lecy Soulgo 🙏",
    ].join("\n");
  }

  return [
    `Halo Kak ${buyer} 👋`,
    "",
    "Ini adalah pengingat pembayaran:",
    `📦 Product: ${normalizedProduct}`,
    `🏷️ Batch: ${normalizedBatch}`,
    `🌏 Negara: ${retryCountryName(country)}`,
    `💰 Jenis Pembayaran: ${retryPaymentLabel(payment.payment_type)}`,
    `💰 Total Pembayaran: ${retryRupiah(Number(payment.amount ?? 0))}`,
    `📅 Maksimal Pembayaran: ${retryFormatLongDate(dueDate)}`,
    "",
    "Pembayaran kamu masih belum kami terima.",
    "Mohon segera lakukan pembayaran melalui link pembayaran yang tersedia.",
    "",
    "Terima kasih Sudah Belanja di Lecy Soulgo 🙏",
  ].join("\n");
}

export async function retryNotificationLog(
  logId: string,
): Promise<MarkNotificationResult> {
  if (!logId.trim()) {
    throw new Error(
      "ID notification log wajib diisi.",
    );
  }

  const { data, error } = await supabase
    .from("notification_logs")
    .select(`
      id,
      notification_type,
      status,
      member:members (
        id,
        name,
        phone
      ),
      recap:recaps (
        id,
        detail_barang,
        batch:batches (
          id,
          name,
          country,
          last_payment_dp,
          last_payment_pelunasan
        )
      ),
      payment:payments (
        id,
        payment_type,
        amount,
        status
      )
    `)
    .eq("id", logId.trim())
    .single();

  if (error || !data) {
    throw new Error(
      "Notification log tidak ditemukan.",
    );
  }

  const item = data as any;
  const member = Array.isArray(item.member)
    ? item.member[0] ?? null
    : item.member ?? null;
  const recap = Array.isArray(item.recap)
    ? item.recap[0] ?? null
    : item.recap ?? null;
  const batch = recap
    ? Array.isArray(recap.batch)
      ? recap.batch[0] ?? null
      : recap.batch ?? null
    : null;
  const payment = Array.isArray(item.payment)
    ? item.payment[0] ?? null
    : item.payment ?? null;

  if (item.status !== "failed") {
    throw new Error(
      "Notification hanya dapat dikirim ulang ketika statusnya failed.",
    );
  }

  if (item.notification_type === "OVERDUE_H3") {
    throw new Error(
      "Notification H+3 tidak dapat dikirim ulang dari Notification Log.",
    );
  }

  if (!member?.phone) {
    throw new Error(
      "Nomor WhatsApp pembeli tidak tersedia.",
    );
  }

  if (!payment?.id) {
    throw new Error(
      "Data pembayaran untuk notification log tidak tersedia.",
    );
  }

  const paymentData = payment as Payment;

  const dueDate =
    payment?.payment_type === "DP"
      ? batch?.last_payment_dp ?? null
      : payment?.payment_type === "PELUNASAN"
        ? batch?.last_payment_pelunasan ?? null
        : null;

  let paymentUrl: string | undefined;
  if (
    item.notification_type ===
    "RECAP_PAYMENT"
  ) {
    const generated =
      await generatePaymentLink(
        paymentData.id,
      );
    paymentUrl = generated.paymentUrl;
  }

  const message = buildRetryMessage(
    item.notification_type as NotificationType,
    member.name,
    recap?.detail_barang,
    batch?.name,
    batch?.country,
    paymentData,
    dueDate,
    paymentUrl,
  );

  return sendLoggedWhatsApp(
    logId.trim(),
    member.phone,
    message,
  );
}
