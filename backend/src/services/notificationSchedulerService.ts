import { supabase } from "../config/supabase.js";
import {
  calculateCurrentPaymentAmount,
  createPayment,
  generatePaymentLink,
  type Payment,
  type PaymentType,
} from "./paymentService.js";
import {
  createScheduledNotificationLog,
  markNotificationSkipped,
  sendLoggedWhatsApp,
  type NotificationType,
} from "./notificationService.js";
import {
  processHnrMembers,
} from "./hnrService.js";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const PAYMENT_SEND_HOUR = 22;
const REMINDER_SEND_HOUR = 22;
const REMINDER_WINDOW_MINUTES = 60;

type RecapContext = {
  id: string;
  created_at: string;
  detail_barang: string | null;
  member: { id: string; name: string | null; phone: string | null } | null;
  batch: {
    id: string;
    name: string | null;
    country: string | null;
    last_payment_dp: string | null;
    last_payment_pelunasan: string | null;
  } | null;
};

type LatePermission = {
  id: string;
  payment_date: string;
  payment_status: "unpaid" | "paid";
  created_at: string;
  items: { recap_id: string; payment_type: PaymentType }[];
};

type JobResult = { processed: number; sent: number; failed: number; skipped: number };

function emptyResult(): JobResult {
  return { processed: 0, sent: 0, failed: 0, skipped: 0 };
}

function jakartaParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const result: Record<string, string> = {};
  for (const part of parts) if (part.type !== "literal") result[part.type] = part.value;
  return {
    year: Number(result.year),
    month: Number(result.month),
    day: Number(result.day),
    hour: Number(result.hour),
    minute: Number(result.minute),
    second: Number(result.second),
  };
}

function jakartaDate(date = new Date()): string {
  const p = jakartaParts(date);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function addDays(dateOnly: string, amount: number): string {
  const date = new Date(`${dateOnly}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function inWindow(date: Date, hour: number): boolean {
  const p = jakartaParts(date);
  return p.hour === hour && p.minute < REMINDER_WINDOW_MINUTES;
}

function normalizeRecaps(rows: unknown[]): RecapContext[] {
  return rows.map((row) => {
    const item = row as any;
    const member = Array.isArray(item.member) ? item.member[0] ?? null : item.member ?? null;
    const batch = Array.isArray(item.batch) ? item.batch[0] ?? null : item.batch ?? null;
    return { id: item.id, created_at: item.created_at, detail_barang: item.detail_barang ?? null, member, batch };
  });
}

async function getRecapsCreatedToday(date = new Date()): Promise<RecapContext[]> {
  const dateOnly = jakartaDate(date);
  const { data, error } = await supabase
    .from("recaps")
    .select(`
      id,
      created_at,
      detail_barang,
      member:members ( id, name, phone ),
      batch:batches ( id, name, country, last_payment_dp, last_payment_pelunasan )
    `)
    .gte("created_at", `${dateOnly}T00:00:00+07:00`)
    .lte("created_at", `${dateOnly}T23:59:59.999+07:00`);
  if (error) throw new Error(`Gagal mengambil rekapan hari ini: ${error.message}`);
  return normalizeRecaps(data ?? []);
}

async function getRecapsByDueDate(paymentType: PaymentType, dateOnly: string): Promise<RecapContext[]> {
  const { data, error } = await supabase
    .from("recaps")
    .select(`
      id,
      created_at,
      detail_barang,
      member:members ( id, name, phone ),
      batch:batches!inner ( id, name, country, last_payment_dp, last_payment_pelunasan )
    `)
    .eq(paymentType === "DP" ? "batch.last_payment_dp" : "batch.last_payment_pelunasan", dateOnly);
  if (error) throw new Error(`Gagal mengambil rekapan ${paymentType}: ${error.message}`);
  return normalizeRecaps(data ?? []);
}

async function getPayment(recapId: string, paymentType: PaymentType): Promise<Payment | null> {
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("recap_id", recapId)
    .eq("payment_type", paymentType)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Gagal mengambil payment ${paymentType}: ${error.message}`);
  return (data as Payment | null) ?? null;
}

async function ensurePayment(recapId: string, paymentType: PaymentType): Promise<Payment> {
  const existing = await getPayment(recapId, paymentType);
  return existing ?? createPayment({ recap_id: recapId, payment_type: paymentType });
}

function rupiah(amount: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);
}

function formatLongDate(
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
    timeZone: JAKARTA_TIME_ZONE,
  }).format(date);
}

function countryName(value: string | null | undefined): string {
  switch (String(value ?? "").toLowerCase()) {
    case "china": return "China";
    case "indonesia": return "Indonesia";
    case "jepang": return "Jepang";
    case "korea": return "Korea";
    case "thailand": return "Thailand";
    default: return value ?? "-";
  }
}

function paymentLabel(type: PaymentType): string {
  return type === "DP" ? "DP" : "Pelunasan";
}

async function getActiveLatePermission(recapId: string, paymentType: PaymentType): Promise<LatePermission | null> {
  const { data, error } = await supabase
    .from("late_payment_permissions")
    .select(`
      id,
      payment_date,
      payment_status,
      created_at,
      items:late_payment_permission_items ( recap_id, payment_type )
    `)
    .eq("payment_status", "unpaid")
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Gagal mengambil ijin telat bayar: ${error.message}`);

  const today = jakartaDate();
  return ((data ?? []) as LatePermission[]).find((permission) =>
    permission.items?.some((item) => item.recap_id === recapId && item.payment_type === paymentType) &&
    today <= permission.payment_date,
  ) ?? null;
}

async function buildPaymentMessage(
  recap: RecapContext,
  payment: Payment,
  paymentUrl: string,
): Promise<string> {
  const buyer =
    recap.member?.name?.trim() ||
    "Kak";
  const product =
    recap.detail_barang?.trim() ||
    "-";
  const batch =
    recap.batch?.name?.trim() ||
    "-";

  const paymentAmount =
    await calculateCurrentPaymentAmount(
      recap.id,
      payment.payment_type,
    );

  const dueDate =
    paymentAmount.dueDate ??
    (payment.payment_type === "DP"
      ? recap.batch?.last_payment_dp
      : recap.batch?.last_payment_pelunasan);

  return [
    `Halo Kak ${buyer} 👋`,
    "",
    "Kakak ada pesanan yang harus dibayar:",
    `📦 Product: ${product}`,
    `🏷️ Batch: ${batch}`,
    `🌏 Negara: ${countryName(recap.batch?.country)}`,
    `💰 Jenis Pembayaran: ${paymentLabel(payment.payment_type)}`,
    `💰 Harga Barang: ${rupiah(paymentAmount.baseAmount)}`,
    `📅 Maksimal Pembayaran: ${formatLongDate(dueDate)}`,
    `💰 Jumlah Denda: ${rupiah(paymentAmount.penaltyAmount)}`,
    `💰 Total yang Harus Dibayar: ${rupiah(paymentAmount.currentAmount)}`,
    "",
    "Silakan lakukan pembayaran melalui link berikut:",
    paymentUrl,
    "",
    "*Mohon untuk Tidak klik Link jika tidak langsung membayar, karena batas pembayaran setelah klik link adalah 15 Menit*",
    "",
    "Terima kasih Sudah Belanja di Lecy Soulgo 🙏",
  ].join("\n");
}

async function buildReminderMessage(
  recap: RecapContext,
  payment: Payment,
): Promise<string> {
  const buyer =
    recap.member?.name?.trim() ||
    "Kak";
  const product =
    recap.detail_barang?.trim() ||
    "-";
  const batch =
    recap.batch?.name?.trim() ||
    "-";

  const paymentAmount =
    await calculateCurrentPaymentAmount(
      recap.id,
      payment.payment_type,
    );

  const dueDate =
    paymentAmount.dueDate ??
    (payment.payment_type === "DP"
      ? recap.batch?.last_payment_dp
      : recap.batch?.last_payment_pelunasan);

  return [
    `Halo Kak ${buyer} 👋`,
    "",
    "Ini adalah pengingat pembayaran:",
    `📦 Product: ${product}`,
    `🏷️ Batch: ${batch}`,
    `🌏 Negara: ${countryName(recap.batch?.country)}`,
    `💰 Jenis Pembayaran: ${paymentLabel(payment.payment_type)}`,
    `💰 Harga Barang: ${rupiah(paymentAmount.baseAmount)}`,
    `📅 Maksimal Pembayaran: ${formatLongDate(dueDate)}`,
    `💰 Jumlah Denda: ${rupiah(paymentAmount.penaltyAmount)}`,
    `💰 Total yang Harus Dibayar: ${rupiah(paymentAmount.currentAmount)}`,
    "",
    "Pembayaran kamu masih belum kami terima.",
    "Mohon segera lakukan pembayaran melalui link pembayaran yang tersedia.",
    "",
    "Terima kasih Sudah Belanja di Lecy Soulgo 🙏",
  ].join("\n");
}

async function buildOverdueMessage(
  recap: RecapContext,
  payment: Payment,
): Promise<string> {
  const buyer =
    recap.member?.name?.trim() ||
    "Kak";
  const product =
    recap.detail_barang?.trim() ||
    "-";
  const batch =
    recap.batch?.name?.trim() ||
    "-";

  const paymentAmount =
    await calculateCurrentPaymentAmount(
      recap.id,
      payment.payment_type,
    );

  const dueDate =
    paymentAmount.dueDate ??
    (payment.payment_type === "DP"
      ? recap.batch?.last_payment_dp
      : recap.batch?.last_payment_pelunasan);

  return [
    `Halo Kak ${buyer} 👋`,
    "",
    `Pembayaran ${paymentLabel(payment.payment_type)} untuk Batch ${batch} sudah melewati batas pembayaran dan saat ini sudah masuk keterlambatan.`,
    "",
    `📦 Product: ${product}`,
    `🏷️ Batch: ${batch}`,
    `🌏 Negara: ${countryName(recap.batch?.country)}`,
    `💰 Jenis Pembayaran: ${paymentLabel(payment.payment_type)}`,
    `💰 Harga Barang: ${rupiah(paymentAmount.baseAmount)}`,
    `📅 Maksimal Pembayaran: ${formatLongDate(dueDate)}`,
    `💰 Jumlah Denda: ${rupiah(paymentAmount.penaltyAmount)}`,
    `💰 Total yang Harus Dibayar: ${rupiah(paymentAmount.currentAmount)}`,
    "",
    "Mohon segera hubungi admin untuk melakukan pembayaran dan konfirmasi keterlambatan.",
    "",
    "Terima kasih Sudah Belanja di Lecy Soulgo 🙏",
  ].join("\n");
}


async function processPaymentNotification(recap: RecapContext, paymentType: PaymentType, notificationType: NotificationType): Promise<keyof JobResult> {
  if (!recap.member?.id || !recap.member.phone) throw new Error("Member atau nomor WhatsApp tidak tersedia.");
  const payment = await ensurePayment(recap.id, paymentType);
  if (payment.status === "paid") return "processed";

  const log = await createScheduledNotificationLog({
    member_id: recap.member.id,
    recap_id: recap.id,
    payment_id: payment.id,
    notification_type: notificationType,
    scheduled_at: new Date().toISOString(),
  });

  if (log.status === "sent" || log.status === "skipped") return log.status as keyof JobResult;

  if (notificationType === "OVERDUE_H3") {
    const permission = await getActiveLatePermission(recap.id, paymentType);
    if (permission) {
      await markNotificationSkipped(log.id, "Memiliki izin telat bayar.");
      return "skipped";
    }
  }

  const link = await generatePaymentLink(payment.id);
  const message = notificationType === "RECAP_PAYMENT"
    ? await buildPaymentMessage(recap, link.payment, link.paymentUrl)
    : notificationType === "DUE_DATE_REMINDER"
      ? await buildReminderMessage(recap, link.payment)
      : await buildOverdueMessage(recap, link.payment);

  const result = await sendLoggedWhatsApp(log.id, recap.member.phone, message);
  return result.status === "sent" ? "sent" : "failed";
}

async function runJob(recaps: RecapContext[], paymentType: PaymentType, notificationType: NotificationType): Promise<JobResult> {
  const result = emptyResult();
  for (const recap of recaps) {
    try {
      result.processed += 1;
      const status = await processPaymentNotification(recap, paymentType, notificationType);
      if (status === "sent" || status === "failed" || status === "skipped") result[status] += 1;
    } catch (error) {
      result.failed += 1;
      console.error(`${notificationType} error:`, { recapId: recap.id, paymentType, error });
    }
  }
  return result;
}

export async function processWhatsAppAutomations(date = new Date()) {
  const parts = jakartaParts(date);
  const result = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    recapPayment: emptyResult(),
    dueDateDp: emptyResult(),
    dueDatePelunasan: emptyResult(),
    overdueH3Dp: emptyResult(),
    overdueH3Pelunasan: emptyResult(),
  };

  if (parts.hour === PAYMENT_SEND_HOUR && parts.minute < REMINDER_WINDOW_MINUTES) {
    result.recapPayment = await runJob(await getRecapsCreatedToday(date), "DP", "RECAP_PAYMENT");
  }

  if (inWindow(date, REMINDER_SEND_HOUR)) {
    const today = jakartaDate(date);
    const h3DueDate = addDays(today, -3);
    result.dueDateDp = await runJob(await getRecapsByDueDate("DP", today), "DP", "DUE_DATE_REMINDER");
    result.dueDatePelunasan = await runJob(await getRecapsByDueDate("PELUNASAN", today), "PELUNASAN", "DUE_DATE_REMINDER");
    result.overdueH3Dp = await runJob(await getRecapsByDueDate("DP", h3DueDate), "DP", "OVERDUE_H3");
    result.overdueH3Pelunasan = await runJob(await getRecapsByDueDate("PELUNASAN", h3DueDate), "PELUNASAN", "OVERDUE_H3");
  }

  await processHnrMembers(date);

  const jobs = [result.recapPayment, result.dueDateDp, result.dueDatePelunasan, result.overdueH3Dp, result.overdueH3Pelunasan];
  result.processed = jobs.reduce((sum, job) => sum + job.processed, 0);
  result.sent = jobs.reduce((sum, job) => sum + job.sent, 0);
  result.failed = jobs.reduce((sum, job) => sum + job.failed, 0);
  result.skipped = jobs.reduce((sum, job) => sum + job.skipped, 0);
  return result;
}
