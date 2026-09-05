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
   SEND WHATSAPP
========================================= */

export async function sendWhatsAppHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      target,
      message,
      payment_id,
    } = req.body;

    if (!target) {
      return res.status(400).json({
        success: false,
        message:
          "Nomor tujuan wajib diisi.",
      });
    }

    if (!message) {
      return res.status(400).json({
        success: false,
        message:
          "Pesan wajib diisi.",
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
        payment_type,
        amount
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
       Get recap + batch + member
    ------------------------------------- */

    const {
      data: recap,
      error: recapError,
    } = await supabase
      .from("recaps")
      .select(`
        detail_barang,
        batch:batches (
          name,
          country
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

    const productName =
      typeof recap.detail_barang ===
        "string" &&
      recap.detail_barang.trim()
        ? recap.detail_barang.trim()
        : "-";

    /* -------------------------------------
       Batch
    ------------------------------------- */

    const batchName =
      batch &&
      typeof batch.name ===
        "string" &&
      batch.name.trim()
        ? batch.name.trim()
        : "-";

    /* -------------------------------------
       Country
    ------------------------------------- */

    const countryName =
      getCountryName(
        batch?.country,
      );

    /* -------------------------------------
       Buyer Name
    ------------------------------------- */

    const buyerName =
      member &&
      typeof member.name ===
        "string" &&
      member.name.trim()
        ? member.name.trim()
        : "Kak";

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
       Payment URL
       
       URL tetap diambil dari message
       yang dikirim PaymentDialog.
    ------------------------------------- */

    const paymentUrl =
      message
        .split("\n")
        .find(
          (line: string) =>
            line.startsWith(
              "http://",
            ) ||
            line.startsWith(
              "https://",
            ),
        ) ?? "";

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
      "",
      "Silakan lakukan pembayaran melalui link berikut:",
      paymentUrl,
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