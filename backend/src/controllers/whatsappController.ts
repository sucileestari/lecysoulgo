import type { Request, Response } from "express";
import { supabase } from "../config/supabase.js";
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
  try {
    const {
      target,
      payment_id,
    } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        message:
          "Nomor tujuan wajib diisi.",
      });
    }

    if (
      typeof payment_id !== "string" ||
      !payment_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID pembayaran wajib diisi.",
      });
    }

    /* -------------------------------------
       Get payment
    ------------------------------------- */

    const {
      data: payment,
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
        payment_id.trim(),
      )
      .single();

    if (
      paymentError ||
      !payment
    ) {
      return res.status(404).json({
        success: false,
        message:
          "Data pembayaran tidak ditemukan.",
      });
    }

    /* -------------------------------------
       Validate payment link
    ------------------------------------- */

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

    const formattedAmount =
      formatRupiah(
        paymentAmount,
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
      `💰 Total Pembayaran: ${formattedAmount}`,
      `📅 Maksimal Pembayaran: ${formattedDueDate}`,
      "",
      "Silakan lakukan pembayaran melalui link berikut:",
      payment.payment_url,
      "",
      "*Mohon untuk Tidak klik Link jika tidak langsung membayar, karena batas pembayaran setelah klik link adalah 15 Menit*",
      "",
      "Terima kasih Sudah Belanja di Lecy Soulgo 🙏",
    ].join("\n");

    /* -------------------------------------
       Send WhatsApp
    ------------------------------------- */

    const result =
      await sendWhatsApp({
        target,
        message: finalMessage,
      });

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

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengirim WhatsApp.",
    });
  }
}