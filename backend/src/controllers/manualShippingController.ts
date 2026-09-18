import type {
  Request,
  Response,
} from "express";

import {
  createManualShipment,
  deleteManualShipment,
  getManualShipmentById,
  getManualShipmentOptions,
  getManualShipmentsByBatch,
  updateManualShipment,
  type CreateManualShipmentInput,
  type ManualShipmentExpedition,
  type ManualShipmentPaymentStatus,
  type ManualShipmentShippingStatus,
  type UpdateManualShipmentInput,
} from "../services/manualShippingService.js";

/* =========================================
   GET SHIPMENTS BY BATCH
========================================= */

export async function listManualShipmentsHandler(
  req: Request,
  res: Response,
) {
  try {
    const batchId =
      req.query.batch_id;

    if (
      typeof batchId !== "string" ||
      !batchId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "batch_id wajib diisi.",
      });
    }

    const data =
      await getManualShipmentsByBatch(
        batchId.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "listManualShipmentsHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data pengiriman.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   GET SHIPMENT BY ID
========================================= */

export async function getManualShipmentByIdHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID pengiriman wajib diisi.",
      });
    }

    const data =
      await getManualShipmentById(
        id.trim(),
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getManualShipmentByIdHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil data pengiriman.";

    if (
      message ===
      "Data pengiriman tidak ditemukan."
    ) {
      return res.status(404).json({
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

/* =========================================
   GET OPTIONS
========================================= */

export async function getManualShipmentOptionsHandler(
  req: Request,
  res: Response,
) {
  try {
    const batchId =
      req.query.batch_id;

    if (
      batchId !== undefined &&
      (
        typeof batchId !== "string" ||
        !batchId.trim()
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "batch_id tidak valid.",
      });
    }

    const data =
      await getManualShipmentOptions(
        typeof batchId === "string"
          ? batchId.trim()
          : undefined,
      );

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error(
      "getManualShipmentOptionsHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal mengambil pilihan data pengiriman.";

    return res.status(500).json({
      success: false,
      message,
    });
  }
}

/* =========================================
   CREATE SHIPMENT
========================================= */

export async function createManualShipmentHandler(
  req: Request,
  res: Response,
) {
  try {
    const {
      batch_id,
      member_id,
      recap_ids,
      address,
      expedition,
      packing_price,
      shipping_price,
      due_date,
      shipping_status,
      payment_status,
    } = req.body;

    if (
      typeof batch_id !== "string" ||
      !batch_id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "batch_id wajib diisi.",
      });
    }

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
      !Array.isArray(recap_ids) ||
      recap_ids.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Minimal satu barang harus dipilih.",
      });
    }

    if (
      recap_ids.some(
        (recapId: unknown) =>
          typeof recapId !== "string" ||
          !recapId.trim(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Salah satu ID barang tidak valid.",
      });
    }

    if (
      typeof address !== "string" ||
      !address.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Alamat lengkap wajib diisi.",
      });
    }

    if (
      typeof expedition !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Ekspedisi wajib dipilih.",
      });
    }

    const normalizedPackingPrice =
      packing_price ?? 0;

    const normalizedShippingPrice =
      shipping_price ?? 0;

    if (
      typeof normalizedPackingPrice !== "number" ||
      !Number.isFinite(
        normalizedPackingPrice,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Harga packing tidak valid.",
      });
    }

    if (
      typeof normalizedShippingPrice !== "number" ||
      !Number.isFinite(
        normalizedShippingPrice,
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Harga ongkos kirim tidak valid.",
      });
    }

    const normalizedDueDate =
      typeof due_date === "string"
        ? due_date.trim() || null
        : null;

    const input: CreateManualShipmentInput =
      {
        batch_id:
          batch_id.trim(),

        member_id:
          member_id.trim(),

        recap_ids:
          recap_ids.map(
            (recapId: string) =>
              recapId.trim(),
          ),

        address:
          address.trim(),

        expedition:
          expedition as ManualShipmentExpedition,

        packing_price:
          normalizedPackingPrice,

        shipping_price:
          normalizedShippingPrice,

        due_date:
          normalizedDueDate,

        shipping_status:
          shipping_status as
            | ManualShipmentShippingStatus
            | undefined,

        payment_status:
          payment_status as
            | ManualShipmentPaymentStatus
            | undefined,
      };

    const data =
      await createManualShipment(
        input,
      );

    return res.status(201).json({
      success: true,
      data,
      message:
        "Pengiriman berhasil ditambahkan.",
    });
  } catch (error) {
    console.error(
      "createManualShipmentHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menambahkan pengiriman.";

    const notFoundMessages = [
      "Batch tidak ditemukan.",
      "Member tidak ditemukan.",
      "Salah satu barang tidak ditemukan.",
    ];

    const badRequestMessages = [
      "ID batch wajib diisi.",
      "ID member wajib diisi.",
      "Minimal satu barang harus dipilih.",
      "ID barang tidak valid.",
      "Salah satu ID barang tidak valid.",
      "Alamat lengkap wajib diisi.",
      "Ekspedisi tidak valid.",
      "Ekspedisi wajib dipilih.",
      "Harga packing tidak valid.",
      "Harga ongkos kirim tidak valid.",
      "Barang harus berasal dari batch yang sama dengan pengiriman.",
      "Barang yang dipilih harus milik pembeli yang sama.",
    ];

    if (
      notFoundMessages.includes(
        message,
      )
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    if (
      badRequestMessages.some(
        (item) =>
          message === item ||
          message.startsWith(item),
      )
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (
      message.includes(
        "belum lunas",
      )
    ) {
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

/* =========================================
   UPDATE SHIPMENT
========================================= */

export async function updateManualShipmentHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID pengiriman wajib diisi.",
      });
    }

    const {
      member_id,
      recap_ids,
      address,
      expedition,
      packing_price,
      shipping_price,
      shipping_status,
      payment_status,
      due_date,
    } = req.body;

    const input: UpdateManualShipmentInput =
      {};

    if (
      member_id !== undefined
    ) {
      if (
        typeof member_id !== "string" ||
        !member_id.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "member_id tidak valid.",
        });
      }

      input.member_id =
        member_id.trim();
    }

    if (
      recap_ids !== undefined
    ) {
      if (
        !Array.isArray(recap_ids) ||
        recap_ids.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Minimal satu barang harus dipilih.",
        });
      }

      if (
        recap_ids.some(
          (recapId: unknown) =>
            typeof recapId !== "string" ||
            !recapId.trim(),
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Salah satu ID barang tidak valid.",
        });
      }

      input.recap_ids =
        recap_ids.map(
          (recapId: string) =>
            recapId.trim(),
        );
    }

    if (
      address !== undefined
    ) {
      if (
        typeof address !== "string" ||
        !address.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Alamat lengkap tidak valid.",
        });
      }

      input.address =
        address.trim();
    }

    if (
      expedition !== undefined
    ) {
      if (
        typeof expedition !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Ekspedisi tidak valid.",
        });
      }

      input.expedition =
        expedition as ManualShipmentExpedition;
    }

    if (
      packing_price !== undefined
    ) {
      if (
        typeof packing_price !== "number" ||
        !Number.isFinite(
          packing_price,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Harga packing tidak valid.",
        });
      }

      input.packing_price =
        packing_price;
    }

    if (
      shipping_price !== undefined
    ) {
      if (
        typeof shipping_price !== "number" ||
        !Number.isFinite(
          shipping_price,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Harga ongkos kirim tidak valid.",
        });
      }

      input.shipping_price =
        shipping_price;
    }

    if (
      shipping_status !== undefined
    ) {
      if (
        typeof shipping_status !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status pengiriman tidak valid.",
        });
      }

      input.shipping_status =
        shipping_status as ManualShipmentShippingStatus;
    }

    if (
      payment_status !== undefined
    ) {
      if (
        typeof payment_status !== "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Status pembayaran tidak valid.",
        });
      }

      input.payment_status =
        payment_status as ManualShipmentPaymentStatus;
    }

    if (
      due_date !== undefined
    ) {
      if (
        typeof due_date !== "string" ||
        !due_date.trim()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Tanggal jatuh tempo tidak valid.",
        });
      }

      input.due_date =
        due_date.trim();
    }

    const data =
      await updateManualShipment(
        id.trim(),
        input,
      );

    return res.status(200).json({
      success: true,
      data,
      message:
        "Pengiriman berhasil diperbarui.",
    });
  } catch (error) {
    console.error(
      "updateManualShipmentHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal memperbarui pengiriman.";

    if (
      message ===
      "Data pengiriman tidak ditemukan."
    ) {
      return res.status(404).json({
        success: false,
        message,
      });
    }

    const badRequestMessages = [
      "ID pengiriman wajib diisi.",
      "ID member wajib diisi.",
      "Member tidak ditemukan.",
      "Minimal satu barang harus dipilih.",
      "ID barang tidak valid.",
      "Alamat lengkap wajib diisi.",
      "Ekspedisi tidak valid.",
      "Harga packing tidak valid.",
      "Harga ongkos kirim tidak valid.",
      "Status pengiriman tidak valid.",
      "Status pembayaran tidak valid.",
      "Tanggal jatuh tempo tidak valid.",
      "Barang harus berasal dari batch yang sama dengan pengiriman.",
      "Barang yang dipilih harus milik pembeli yang sama.",
    ];

    if (
      badRequestMessages.some(
        (item) =>
          message === item ||
          message.startsWith(item),
      ) ||
      message.includes("belum lunas")
    ) {
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

/* =========================================
   DELETE SHIPMENT
========================================= */

export async function deleteManualShipmentHandler(
  req: Request,
  res: Response,
) {
  try {
    const id = Array.isArray(req.params.id)
  ? req.params.id[0]
  : req.params.id;

    if (
      !id ||
      !id.trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "ID pengiriman wajib diisi.",
      });
    }

    await deleteManualShipment(
      id.trim(),
    );

    return res.status(200).json({
      success: true,
      message:
        "Pengiriman berhasil dihapus.",
    });
  } catch (error) {
    console.error(
      "deleteManualShipmentHandler error:",
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : "Gagal menghapus pengiriman.";

    if (
      message ===
      "ID pengiriman wajib diisi."
    ) {
      return res.status(400).json({
        success: false,
        message,
      });
    }

    if (
      message ===
      "Data pengiriman tidak ditemukan."
    ) {
      return res.status(404).json({
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