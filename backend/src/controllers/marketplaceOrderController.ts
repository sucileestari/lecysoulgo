import type {
  Request,
  Response,
} from "express";

import {
  createMarketplaceOrder,
  getAvailableMarketplaceItems,
  getMarketplaceMemberOptions,
  getMarketplaceOrders,
} from "../services/marketplaceOrderService.js";

/* =========================================
   GET MARKETPLACE ORDERS
========================================= */

export async function getMarketplaceOrdersHandler(
  req: Request,
  res: Response,
) {
  try {
    const memberId =
      typeof req.query.member_id === "string"
        ? req.query.member_id.trim()
        : undefined;

    const orders =
      await getMarketplaceOrders(
        memberId || undefined,
      );

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error(
      "getMarketplaceOrdersHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil pesanan Marketplace.",
    });
  }
}

/* =========================================
   GET MEMBER OPTIONS
========================================= */

export async function getMarketplaceMemberOptionsHandler(
  _req: Request,
  res: Response,
) {
  try {
    const members =
      await getMarketplaceMemberOptions();

    return res.status(200).json({
      success: true,
      data: members,
    });
  } catch (error) {
    console.error(
      "getMarketplaceMemberOptionsHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil data pembeli Marketplace.",
    });
  }
}

/* =========================================
   GET AVAILABLE ITEMS
========================================= */

export async function getAvailableMarketplaceItemsHandler(
  req: Request,
  res: Response,
) {
  try {
    const memberId =
      typeof req.query.member_id === "string"
        ? req.query.member_id.trim()
        : undefined;

    const items =
      await getAvailableMarketplaceItems(
        memberId || undefined,
      );

    return res.status(200).json({
      success: true,
      data: items,
    });
  } catch (error) {
    console.error(
      "getAvailableMarketplaceItemsHandler error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "Gagal mengambil barang Marketplace.",
    });
  }
}

/* =========================================
   CREATE MARKETPLACE ORDER
========================================= */

export async function createMarketplaceOrderHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      member_id,
      order_number,
      recap_ids,
    } = req.body ?? {};

    if (
      typeof member_id !== "string" ||
      !member_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "member_id wajib diisi.",
      });
    }

    if (
      typeof order_number !== "string" ||
      !order_number.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Nomor pesanan wajib diisi.",
      });
    }

    if (!Array.isArray(recap_ids)) {
      return res.status(400).json({
        success: false,
        message:
          "Barang pesanan tidak valid.",
      });
    }

    const order =
      await createMarketplaceOrder({
        member_id: member_id.trim(),
        order_number: order_number.trim(),
        recap_ids,
      });

    return res.status(201).json({
      success: true,
      message:
        "Pesanan Marketplace berhasil dibuat.",
      data: order,
    });
  } catch (error) {
    console.error(
      "createMarketplaceOrderHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal membuat pesanan Marketplace.";

    const validationMessages = [
      "member_id wajib diisi.",
      "Nomor pesanan Marketplace sudah digunakan.",
      "Minimal pilih satu barang.",
      "Barang yang dipilih bukan milik customer yang sedang login.",
      "Salah satu barang yang dipilih sudah CO.",
      "Salah satu barang yang dipilih belum sampai di Admin.",
      "Salah satu barang yang dipilih belum memiliki DP yang dibayar.",
      "Salah satu barang yang dipilih belum memiliki pelunasan yang dibayar.",
      "Salah satu barang yang dipilih sudah digunakan pada pesanan Marketplace lain.",
      "Salah satu barang yang dipilih tidak ditemukan.",
      "Data customer tidak ditemukan.",
      "Member tidak ditemukan.",
    ];

    if (validationMessages.includes(message)) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    return res.status(500).json({
      success: false,
      message,
    });
  }
}
