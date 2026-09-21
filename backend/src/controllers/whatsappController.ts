import type { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
import {
  calculateCurrentPaymentAmount,
  createPayment,
  generatePaymentLink,
  getManualShipmentPaymentSummary,
} from "../services/paymentService.js";
import { sendWhatsApp } from "../services/whatsappService.js";

/* =========================================
   COUNTRY NAME
========================================= */

function getCountryName(
  country: string | null | undefined,
): string {
  switch (String(country ?? "").toLowerCase()) {
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
      return country ?? "-";
  }
}

/* =========================================
   FORMAT RUPIAH
========================================= */

function formatRupiah(
  amount: number,
): string {
  return new Intl.NumberFormat(
    "id-ID",
    {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  ).format(amount);
}

/* =========================================
   FORMAT DATE
========================================= */

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

  return new Intl.DateTimeFormat(
    "id-ID",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    },
  ).format(date);
}

/* =========================================
   SEND WHATSAPP
========================================= */

export async function sendWhatsAppHandler(
  req: Request,
  res: Response,
) {
  let sendSucceeded = false;
  let activePaymentId = "";

  try {
    const {
      target,
      payment_id,
      recap_id,
      manual_shipment_id,
      payment_type,
    } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        message:
          "Nomor tujuan wajib diisi.",
      });
    }

    /* -------------------------------------
       Payment ID aktif
    ------------------------------------- */

    activePaymentId =
      typeof payment_id === "string"
        ? payment_id.trim()
        : "";

    type WhatsAppPayment = {
      id: string;
      recap_id: string | null;
      manual_shipment_id: string | null;
      payment_type: string;
      amount: number | null;
      penalty_amount?: number | null;
      payment_url: string | null;
    };

    let payment: WhatsAppPayment | null =
      null;

    /* -------------------------------------
       Get payment jika ID tersedia
    ------------------------------------- */

    if (activePaymentId) {
      const {
        data: existingPayment,
        error: paymentError,
      } = await supabase
        .from("payments")
        .select(`
          id,
          recap_id,
          manual_shipment_id,
          payment_type,
          amount,
          payment_url
        `)
        .eq(
          "id",
          activePaymentId,
        )
        .maybeSingle();

      if (paymentError) {
        throw new Error(
          `Gagal mengambil data pembayaran: ${paymentError.message}`,
        );
      }

      if (existingPayment) {
        payment =
          existingPayment as WhatsAppPayment;
      }
    }

    /* -------------------------------------
       Payment tidak ditemukan
       → buat / ambil payment baru
    ------------------------------------- */

    if (!payment) {
      const normalizedRecapId =
        typeof recap_id === "string"
          ? recap_id.trim()
          : "";

      const normalizedManualShipmentId =
        typeof manual_shipment_id === "string"
          ? manual_shipment_id.trim()
          : "";

      const normalizedPaymentType =
        typeof payment_type === "string"
          ? payment_type.trim().toUpperCase()
          : "";

      if (
        normalizedPaymentType !== "DP" &&
        normalizedPaymentType !== "PELUNASAN"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Tipe pembayaran wajib diisi dan harus DP atau PELUNASAN.",
        });
      }

      if (
        normalizedRecapId &&
        normalizedManualShipmentId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "ID rekapan dan ID manual shipment tidak boleh diisi bersamaan.",
        });
      }

      if (
        !normalizedRecapId &&
        !normalizedManualShipmentId
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Data pembayaran tidak ditemukan. ID rekapan atau ID manual shipment wajib diisi untuk membuat pembayaran baru.",
        });
      }

      const createdPayment =
        await createPayment({
          ...(normalizedRecapId
            ? {
                recap_id:
                  normalizedRecapId,
              }
            : {}),
          ...(normalizedManualShipmentId
            ? {
                manual_shipment_id:
                  normalizedManualShipmentId,
              }
            : {}),
          payment_type:
            normalizedPaymentType as
              "DP" | "PELUNASAN",
        });

      payment =
        createdPayment as WhatsAppPayment;

      activePaymentId =
        createdPayment.id;
    }

    /* -------------------------------------
       Generate payment link untuk payment baru
       / payment yang belum memiliki link
    ------------------------------------- */

    if (!payment.payment_url) {
      const generatedPayment =
        await generatePaymentLink(
          payment.id,
        );

      payment =
        generatedPayment.payment as
          WhatsAppPayment;

      activePaymentId =
        generatedPayment.payment.id;
    }

    if (!payment.payment_url) {
      return res.status(400).json({
        success: false,
        message:
          "Payment Link belum tersedia.",
      });
    }

    /* -------------------------------------
       PAYMENT SOURCE
    ------------------------------------- */

    let productName = "-";
    let batchName = "-";
    let countryName = "-";
    let buyerName = "Kak";

    let dueDate: string | null = null;

    /* -------------------------------------
       RECAP PAYMENT
    ------------------------------------- */

    if (payment.recap_id) {
      const {
        data: recap,
        error: recapError,
      } = await supabase
        .from("recaps")
        .select(`
          detail_barang,
          batch:batches (
            name,
            country,
            last_payment_dp,
            last_payment_pelunasan
          ),
          member:members (
            name
          )
        `)
        .eq(
          "id",
          payment.recap_id,
        )
        .single();

      if (
        recapError ||
        !recap
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Data rekapan tidak ditemukan.",
        });
      }

      /* -------------------------------------
         Normalize relation
      ------------------------------------- */

      const batch =
        Array.isArray(recap.batch)
          ? recap.batch[0]
          : recap.batch;

      const member =
        Array.isArray(recap.member)
          ? recap.member[0]
          : recap.member;

      /* -------------------------------------
         Product
      ------------------------------------- */

      productName =
        typeof recap.detail_barang ===
          "string" &&
        recap.detail_barang.trim()
          ? recap.detail_barang.trim()
          : "-";

      /* -------------------------------------
         Batch
      ------------------------------------- */

      batchName =
        batch &&
        typeof batch.name ===
          "string" &&
        batch.name.trim()
          ? batch.name.trim()
          : "-";

      /* -------------------------------------
         Country
      ------------------------------------- */

      countryName =
        getCountryName(
          batch?.country,
        );

      /* -------------------------------------
         Buyer Name
      ------------------------------------- */

      buyerName =
        member &&
        typeof member.name ===
          "string" &&
        member.name.trim()
          ? member.name.trim()
          : "Kak";

      /* -------------------------------------
         Payment Due Date
      ------------------------------------- */

      const paymentType =
        String(
          payment.payment_type ??
            "",
        ).toUpperCase();

      if (
        paymentType === "DP"
      ) {
        dueDate =
          batch?.last_payment_dp ??
          null;
      } else if (
        paymentType ===
        "PELUNASAN"
      ) {
        dueDate =
          batch?.last_payment_pelunasan ??
          null;
      }
    }

    /* -------------------------------------
       MANUAL SHIPPING PAYMENT
    ------------------------------------- */

    else if (
      payment.manual_shipment_id
    ) {
      /* -------------------------------------
         Get Manual Shipment
      ------------------------------------- */

      const {
        data: manualShipment,
        error: manualShipmentError,
      } = await supabase
        .from("manual_shipments")
        .select(`
          id,
          batch_id,
          member_id,
          due_date
        `)
        .eq(
          "id",
          payment.manual_shipment_id,
        )
        .single();

      if (
        manualShipmentError ||
        !manualShipment
      ) {
        console.error(
          "GET MANUAL SHIPMENT ERROR:",
          {
            manualShipmentId:
              payment.manual_shipment_id,
            error:
              manualShipmentError,
          },
        );

        return res.status(404).json({
          success: false,
          message:
            "Data manual shipment tidak ditemukan.",
        });
      }

      /* -------------------------------------
         Get Member
      ------------------------------------- */

      const {
        data: member,
        error: memberError,
      } = await supabase
        .from("members")
        .select("name")
        .eq(
          "id",
          manualShipment.member_id,
        )
        .single();

      if (
        memberError ||
        !member
      ) {
        console.error(
          "GET MANUAL SHIPMENT MEMBER ERROR:",
          {
            memberId:
              manualShipment.member_id,
            error:
              memberError,
          },
        );

        return res.status(404).json({
          success: false,
          message:
            "Data member manual shipment tidak ditemukan.",
        });
      }

      /* -------------------------------------
         Get Manual Shipping Batch
      ------------------------------------- */

      const {
        data: batch,
        error: batchError,
      } = await supabase
        .from("manual_shipping_batches")
        .select(`
          id,
          event_name
        `)
        .eq(
          "id",
          manualShipment.batch_id,
        )
        .single();

      if (
        batchError ||
        !batch
      ) {
        console.error(
          "GET MANUAL SHIPPING BATCH ERROR:",
          {
            batchId:
              manualShipment.batch_id,
            error:
              batchError,
          },
        );

        return res.status(404).json({
          success: false,
          message:
            "Data batch manual shipment tidak ditemukan.",
        });
      }

      /* -------------------------------------
         Product
         Manual Shipping = statis
      ------------------------------------- */

      productName =
        "Pengiriman Manual";

      /* -------------------------------------
         Batch
      ------------------------------------- */

      batchName =
        typeof batch.event_name ===
          "string" &&
        batch.event_name.trim()
          ? batch.event_name.trim()
          : "-";

      /* -------------------------------------
         Country
         Manual Shipping = "-"
      ------------------------------------- */

      countryName = "-";

      /* -------------------------------------
         Buyer Name
      ------------------------------------- */

      buyerName =
        typeof member.name ===
          "string" &&
        member.name.trim()
          ? member.name.trim()
          : "Kak";

      /* -------------------------------------
         Manual Shipping Due Date
      ------------------------------------- */

      dueDate =
        manualShipment.due_date ??
        null;
    }

    /* -------------------------------------
       INVALID PAYMENT SOURCE
    ------------------------------------- */

    else {
      return res.status(400).json({
        success: false,
        message:
          "Payment tidak memiliki sumber data yang valid.",
      });
    }

    /* -------------------------------------
       Payment Type
    ------------------------------------- */

    const paymentType =
      String(
        payment.payment_type ??
          "",
      ).toUpperCase();

    let paymentLabel =
      paymentType;

    if (
      paymentType === "DP"
    ) {
      paymentLabel = "DP";
    } else if (
      paymentType ===
      "PELUNASAN"
    ) {
      paymentLabel =
        "Pelunasan";
    }

    /* -------------------------------------
       Payment Amount
    ------------------------------------- */

    const paymentAmount =
      Number(
        payment.amount ?? 0,
      );

    let paymentBaseAmount =
      Math.max(
        0,
        paymentAmount,
      );

    let paymentPenalty =
      Number(
        payment.penalty_amount ?? 0,
      );

    /* -------------------------------------
       Payment Penalty

       penalty_amount bukan kolom database.
       Untuk payment existing, hitung ulang
       dari sumber pembayaran.

       Base amount = harga asli
       Penalty     = denda berjalan
       Total       = harga asli + denda
    ------------------------------------- */

    if (payment.recap_id) {
      const penaltyResult =
        await calculateCurrentPaymentAmount(
          payment.recap_id,
          payment.payment_type as
            "DP" | "PELUNASAN",
        );

      paymentBaseAmount =
        penaltyResult.baseAmount;

      paymentPenalty =
        penaltyResult.penaltyAmount;
    } else if (
      payment.manual_shipment_id
    ) {
      const manualPaymentSummary =
        await getManualShipmentPaymentSummary(
          payment.manual_shipment_id,
        );

      paymentBaseAmount =
        manualPaymentSummary.base_amount;

      paymentPenalty =
        manualPaymentSummary.penalty_amount;
    }

    const paymentTotalAmount =
      paymentBaseAmount +
      paymentPenalty;

    const formattedBaseAmount =
      formatRupiah(
        paymentBaseAmount,
      );

    const formattedPenalty =
      formatRupiah(
        paymentPenalty,
      );

    const formattedTotalAmount =
      formatRupiah(
        paymentTotalAmount,
      );

    /* -------------------------------------
       Payment Due Date
    ------------------------------------- */

    const formattedDueDate =
      formatLongDate(
        dueDate,
      );

    /* -------------------------------------
       Final WhatsApp Message
    ------------------------------------- */

    const finalMessage = [
      `Halo Kak ${buyerName} 👋`,
      "",
      "Kakak ada pesanan yang harus dibayar:",
      `📦 Product: ${productName}`,
      `🏷️ Batch: ${batchName}`,
      `🌏 Negara: ${countryName}`,
      `💰 Jenis Pembayaran: ${paymentLabel}`,
      `💰 Harga Barang: ${formattedBaseAmount}`,
      `📅 Maksimal Pembayaran: ${formattedDueDate}`,
      `💰 Jumlah Denda: ${formattedPenalty}`,
      `💰 Total yang Harus Dibayar: ${formattedTotalAmount}`,
      "",
      "Silakan lakukan pembayaran melalui link berikut:",
      payment.payment_url,
      "",
      "*Mohon untuk Tidak klik Link jika tidak langsung membayar, karena batas pembayaran setelah klik link adalah 15 Menit*",
      "",
      "Terima kasih Sudah Belanja di Lecy Soulgo 🙏",
    ].join("\n");

    /* -------------------------------------
       CHECK WHATSAPP SEND STATUS
    ------------------------------------- */

    const notificationType =
      "RECAP_PAYMENT";

    const {
      data: existingNotificationLog,
      error: notificationLogError,
    } = await supabase
      .from("notification_logs")
      .select(`
        id,
        status,
        attempt_count
      `)
      .eq(
        "payment_id",
        payment.id,
      )
      .eq(
        "notification_type",
        notificationType,
      )
      .maybeSingle();

    if (notificationLogError) {
      throw new Error(
        `Gagal mengecek status pengiriman WhatsApp: ${notificationLogError.message}`,
      );
    }

    if (
      existingNotificationLog?.status ===
      "sent"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "WhatsApp untuk Payment Link ini sudah dikirim.",
      });
    }

    if (
      existingNotificationLog?.status ===
      "scheduled"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Pengiriman WhatsApp untuk Payment Link ini sedang diproses.",
      });
    }

    /* -------------------------------------
       CREATE / PREPARE NOTIFICATION LOG
    ------------------------------------- */

    const memberId =
      payment.recap_id
        ? (
            await supabase
              .from("recaps")
              .select("member_id")
              .eq(
                "id",
                payment.recap_id,
              )
              .single()
          ).data?.member_id ??
          null
        : payment.manual_shipment_id
          ? (
              await supabase
                .from("manual_shipments")
                .select("member_id")
                .eq(
                  "id",
                  payment.manual_shipment_id,
                )
                .single()
            ).data?.member_id ??
            null
          : null;

    if (!memberId) {
      throw new Error(
        "Member pembayaran tidak ditemukan.",
      );
    }

    const attemptCount =
      Number(
        existingNotificationLog?.attempt_count ??
          0,
      ) + 1;

    let notificationLogId =
      existingNotificationLog?.id ??
      null;

    if (existingNotificationLog) {
      const {
        error: updateNotificationLogError,
      } = await supabase
        .from("notification_logs")
        .update({
          status: "scheduled",
          attempt_count:
            attemptCount,
          last_attempt_at:
            new Date().toISOString(),
          error_message: null,
          skip_reason: null,
        })
        .eq(
          "id",
          existingNotificationLog.id,
        );

      if (updateNotificationLogError) {
        throw new Error(
          `Gagal menyiapkan log pengiriman WhatsApp: ${updateNotificationLogError.message}`,
        );
      }
    } else {
      const {
        data: newNotificationLog,
        error: createNotificationLogError,
      } = await supabase
        .from("notification_logs")
        .insert({
          member_id: memberId,
          recap_id:
            payment.recap_id ?? null,
          payment_id: payment.id,
          notification_type:
            notificationType,
          scheduled_at:
            new Date().toISOString(),
          status: "scheduled",
          attempt_count: 1,
          last_attempt_at:
            new Date().toISOString(),
        })
        .select("id")
        .single();

      if (
        createNotificationLogError ||
        !newNotificationLog
      ) {
        throw new Error(
          `Gagal membuat log pengiriman WhatsApp: ${
            createNotificationLogError?.message ??
            "Unknown error"
          }`,
        );
      }

      notificationLogId =
        newNotificationLog.id;
    }

    /* -------------------------------------
       Send WhatsApp
    ------------------------------------- */

    const result =
      await sendWhatsApp({
        target,
        message: finalMessage,
      });

    sendSucceeded = true;

    const providerMessageId =
      Array.isArray(result?.id) &&
      result.id.length > 0
        ? result.id[0]
        : null;

    /* -------------------------------------
       MARK AS SENT
    ------------------------------------- */

    const {
      error: markSentError,
    } = await supabase
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
      .eq(
        "id",
        notificationLogId,
      );

    if (markSentError) {
      throw new Error(
        `WhatsApp berhasil dikirim tetapi status log gagal diperbarui: ${markSentError.message}`,
      );
    }

    return res.status(200).json({
      success: true,
      message:
        "WhatsApp berhasil dikirim.",
      data: result,
    });
  } catch (error) {
    console.error(
      "SEND WHATSAPP ERROR:",
      error,
    );

    if (!sendSucceeded) {
      /*
       * Fonnte gagal / menolak pengiriman.
       * Tandai failed agar PaymentDialog
       * tetap boleh melakukan retry.
       */
      const paymentId =
        activePaymentId ||
        (typeof req.body?.payment_id ===
        "string"
          ? req.body.payment_id.trim()
          : "");

      if (paymentId) {
        await supabase
          .from("notification_logs")
          .update({
            status: "failed",
            error_message:
              error instanceof Error
                ? error.message
                : "Gagal mengirim WhatsApp.",
            last_attempt_at:
              new Date().toISOString(),
          })
          .eq(
            "payment_id",
            paymentId,
          )
          .eq(
            "notification_type",
            "RECAP_PAYMENT",
          )
          .in("status", [
            "scheduled",
            "failed",
          ]);
      }
    }

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengirim WhatsApp.",
    });
  }
}

/* =========================================
   GET WHATSAPP PAYMENT STATUS
========================================= */

export async function getWhatsAppPaymentStatusHandler(
  req: Request,
  res: Response,
) {
  try {
    const paymentId =
      typeof req.params.payment_id ===
      "string"
        ? req.params.payment_id.trim()
        : "";

    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message:
          "ID pembayaran wajib diisi.",
      });
    }

    const {
      data: notificationLog,
      error,
    } = await supabase
      .from("notification_logs")
      .select(`
        status,
        sent_at,
        error_message
      `)
      .eq(
        "payment_id",
        paymentId,
      )
      .eq(
        "notification_type",
        "RECAP_PAYMENT",
      )
      .maybeSingle();

    if (error) {
      return res.status(500).json({
        success: false,
        message:
          `Gagal mengambil status WhatsApp: ${error.message}`,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        status:
          notificationLog?.status ??
          null,
        sent_at:
          notificationLog?.sent_at ??
          null,
        error_message:
          notificationLog?.error_message ??
          null,
      },
    });
  } catch (error) {
    console.error(
      "GET WHATSAPP STATUS ERROR:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil status WhatsApp.",
    });
  }
}

