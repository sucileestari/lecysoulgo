import { supabase } from "../config/supabase.js";

/* =========================================
   TYPES
========================================= */

export type MarketplaceOrderStatus =
  | "waiting"
  | "processing"
  | "processed";

export type MarketplaceOrderItem = {
  id: string;
  marketplace_order_id: string;
  recap_id: string;
  created_at: string;
  recap?: {
    id: string;
    detail_barang?: string | null;
    qty?: number | null;
    batch?: {
      id: string;
      name?: string | null;
      country?: string | null;
    } | null;
  } | null;
};

export type MarketplaceOrder = {
  id: string;
  order_number: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  member_type?: string | null;
  status: MarketplaceOrderStatus;
  created_at: string;
  updated_at: string;
  items: MarketplaceOrderItem[];
};

export type MarketplaceAvailableItem = {
  recap_id: string;
  member_id: string;
  member_name: string;
  member_phone: string;
  detail_barang: string;
  qty: number;
  total_harga: number;
  reference_date: string;
  batch_id: string;
  batch_name: string;
  batch_country: string;
  batch_status: string;
  pelunasan_due_date: string | null;
};

export type CreateMarketplaceOrderInput = {
  member_id: string;
  order_number: string;
  recap_ids: string[];
};

export type MarketplaceMemberOption = {
  id: string;
  name: string;
  phone: string;
};

/* =========================================
   CONSTANT
========================================= */

const ELIGIBLE_BATCH_STATUS =
  "Sudah sampai di Admin";

const MAX_TIMBUN_DAYS = 60;

/* =========================================
   MAX TIMBUN HELPER
========================================= */

function addDaysToDateOnly(
  value: string | null | undefined,
  days: number,
): string | null {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return null;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setUTCDate(
    date.getUTCDate() + days,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function getJakartaDateOnly(): string {
  const parts = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    },
  ).formatToParts(new Date());

  const year =
    parts.find(
      (part) => part.type === "year",
    )?.value ?? "0000";
  const month =
    parts.find(
      (part) => part.type === "month",
    )?.value ?? "00";
  const day =
    parts.find(
      (part) => part.type === "day",
    )?.value ?? "00";

  return `${year}-${month}-${day}`;
}

function isPastMaxTimbun(
  pelunasanDueDate:
    | string
    | null
    | undefined,
): boolean {
  const maxTimbunDate =
    addDaysToDateOnly(
      pelunasanDueDate,
      MAX_TIMBUN_DAYS,
    );

  if (!maxTimbunDate) {
    return false;
  }

  return (
    getJakartaDateOnly() >
    maxTimbunDate
  );
}

/* =========================================
   PAYMENT HELPER
========================================= */

function isPaymentPaid(
  payments: Array<{
    payment_type: string;
    status: string;
  }>,
  paymentType: "DP" | "PELUNASAN",
): boolean {
  return payments.some(
    (payment) =>
      payment.payment_type === paymentType &&
      payment.status.toLowerCase() === "paid",
  );
}

/* =========================================
   GET MARKETPLACE ORDERS
========================================= */

/**
 * Mengambil seluruh pesanan Marketplace
 * milik customer yang sedang login.
 *
 * member_id berasal dari JWT customer.
 */
export async function getMarketplaceOrders(
  memberId?: string,
): Promise<MarketplaceOrder[]> {

  let ordersQuery = supabase
    .from("marketplace_orders")
    .select(`
      id,
      order_number,
      member_id,
      status,
      created_at,
      updated_at,
      member:members (
        name,
        phone,
        type
      ),
      items:marketplace_order_items (
        id,
        marketplace_order_id,
        recap_id,
        created_at,
        recap:recaps (
          id,
          detail_barang,
          qty,
          batch:batches (
            id,
            name,
            country
          )
        )
      )
    `);

  if (memberId) {
    ordersQuery = ordersQuery.eq("member_id", memberId);
  }

  const { data, error } = await ordersQuery
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "getMarketplaceOrders error:",
      error,
    );

    throw new Error(
      `Gagal mengambil pesanan Marketplace: ${error.message}`,
    );
  }

  return (data ?? []).map(
    (order) => {
      const rawMember =
        Array.isArray(order.member)
          ? order.member[0] ?? null
          : order.member ?? null;

      return {
        id: order.id,
        order_number:
          order.order_number,
        member_id:
          order.member_id,
        member_name:
          typeof rawMember?.name ===
          "string"
            ? rawMember.name
            : "",
        member_phone:
          typeof rawMember?.phone ===
          "string"
            ? rawMember.phone
            : "",
        member_type:
          typeof rawMember?.type ===
          "string"
            ? rawMember.type
            : null,
        status:
          order.status as MarketplaceOrderStatus,
        created_at:
          order.created_at,
        updated_at:
          order.updated_at,
        items:
          (order.items ?? []).map(
            (item) => {
              const rawRecap =
                Array.isArray(item.recap)
                  ? item.recap[0] ?? null
                  : item.recap ?? null;

              const rawBatch =
                Array.isArray(rawRecap?.batch)
                  ? rawRecap.batch[0] ?? null
                  : rawRecap?.batch ?? null;

              return {
                id: item.id,
                marketplace_order_id:
                  item.marketplace_order_id,
                recap_id:
                  item.recap_id,
                created_at:
                  item.created_at,
                recap: rawRecap
                  ? {
                      id: rawRecap.id,
                      detail_barang:
                        typeof rawRecap.detail_barang ===
                        "string"
                          ? rawRecap.detail_barang
                          : null,
                      qty:
                        typeof rawRecap.qty === "number"
                          ? rawRecap.qty
                          : Number(rawRecap.qty),
                      batch: rawBatch
                        ? {
                            id: rawBatch.id,
                            name:
                              typeof rawBatch.name ===
                              "string"
                                ? rawBatch.name
                                : null,
                            country:
                              typeof rawBatch.country ===
                              "string"
                                ? rawBatch.country
                                : null,
                          }
                        : null,
                    }
                  : null,
              };
            },
          ),
      };
    },
  );
}

/* =========================================
   GET AVAILABLE ITEMS
========================================= */

/**
 * Mengambil barang Rekapan yang eligible
 * untuk Marketplace. Jika member_id diberikan, hasil dibatasi untuk member tersebut.
 *
 * Syarat:
 * - jika member_id diberikan, milik member tersebut
 * - batch "Sudah sampai di Admin"
 * - DP paid
 * - Pelunasan paid
 * - belum CO
 * - belum digunakan Marketplace
 * - belum digunakan Pengiriman Manual
 *
 * Barang yang sudah melewati Max Timbun
 * tetap dikembalikan agar Frontend dapat
 * menampilkannya sebagai disabled.
 */
export async function getAvailableMarketplaceItems(
  memberId?: string,
): Promise<MarketplaceAvailableItem[]> {

  /* -----------------------------------------
     GET RECAPS
  ----------------------------------------- */

  let recapsQuery = supabase
    .from("recaps")
    .select(`
      id,
      member_id,
      detail_barang,
      qty,
      total_harga,
      created_at,
      sudah_co,
      batch:batches (
        id,
        name,
        country,
        status,
        last_payment_pelunasan
      ),
      member:members (
        name,
        phone
      )
    `)
    .eq("sudah_co", false);

  if (memberId) {
    recapsQuery = recapsQuery.eq("member_id", memberId);
  }

  const { data: recaps, error: recapsError } = await recapsQuery;

  if (recapsError) {
    console.error(
      "getAvailableMarketplaceItems recaps error:",
      recapsError,
    );

    throw new Error(
      `Gagal mengambil data Rekapan: ${recapsError.message}`,
    );
  }

  if (!recaps || recaps.length === 0) {
    return [];
  }

  const recapIds =
    recaps.map(
      (recap) => recap.id,
    );

  /* -----------------------------------------
     GET PAYMENTS
  ----------------------------------------- */

  const {
    data: payments,
    error: paymentsError,
  } = await supabase
    .from("payments")
    .select(`
      recap_id,
      payment_type,
      status
    `)
    .in("recap_id", recapIds);

  if (paymentsError) {
    console.error(
      "getAvailableMarketplaceItems payments error:",
      paymentsError,
    );

    throw new Error(
      `Gagal mengambil data pembayaran: ${paymentsError.message}`,
    );
  }

  /* -----------------------------------------
     GROUP PAYMENTS
  ----------------------------------------- */

  const paymentsByRecap =
    new Map<
      string,
      Array<{
        payment_type: string;
        status: string;
      }>
    >();

  for (const payment of
    payments ?? []) {
    const current =
      paymentsByRecap.get(
        payment.recap_id,
      ) ?? [];

    current.push({
      payment_type:
        payment.payment_type,
      status:
        payment.status,
    });

    paymentsByRecap.set(
      payment.recap_id,
      current,
    );
  }

  /* -----------------------------------------
     GET USED RECAPS
  ----------------------------------------- */

  const {
    data: usedItems,
    error: usedItemsError,
  } = await supabase
    .from("marketplace_order_items")
    .select("recap_id")
    .in(
      "recap_id",
      recapIds,
    );

  if (usedItemsError) {
    console.error(
      "getAvailableMarketplaceItems used items error:",
      usedItemsError,
    );

    throw new Error(
      `Gagal memeriksa barang Marketplace: ${usedItemsError.message}`,
    );
  }

  const usedRecapIds =
    new Set(
      (usedItems ?? []).map(
        (item) =>
          item.recap_id,
      ),
    );

  /* -----------------------------------------
     GET USED MANUAL SHIPMENT RECAPS
  ----------------------------------------- */

  const {
    data: manualShipmentItems,
    error: manualShipmentItemsError,
  } = await supabase
    .from("manual_shipment_items")
    .select("recap_id")
    .in(
      "recap_id",
      recapIds,
    );

  if (manualShipmentItemsError) {
    console.error(
      "getAvailableMarketplaceItems manual shipment items error:",
      manualShipmentItemsError,
    );

    throw new Error(
      `Gagal memeriksa barang Pengiriman Manual: ${manualShipmentItemsError.message}`,
    );
  }

  const manualShipmentRecapIds =
    new Set(
      (manualShipmentItems ?? []).map(
        (item) =>
          item.recap_id,
      ),
    );

  /* -----------------------------------------
     FILTER ELIGIBLE ITEMS
  ----------------------------------------- */

  return recaps
    .filter((recap) => {
      const rawBatch =
        Array.isArray(recap.batch)
          ? recap.batch[0] ?? null
          : recap.batch ?? null;

      if (!rawBatch) {
        return false;
      }

      if (
        rawBatch.status !==
        ELIGIBLE_BATCH_STATUS
      ) {
        return false;
      }

      if (
        usedRecapIds.has(
          recap.id,
        )
      ) {
        return false;
      }

      if (
        manualShipmentRecapIds.has(
          recap.id,
        )
      ) {
        return false;
      }

      const recapPayments =
        paymentsByRecap.get(
          recap.id,
        ) ?? [];

      if (
        !isPaymentPaid(
          recapPayments,
          "DP",
        )
      ) {
        return false;
      }

      if (
        !isPaymentPaid(
          recapPayments,
          "PELUNASAN",
        )
      ) {
        return false;
      }

      return true;
    })
    .map((recap) => {
      const rawBatch =
        Array.isArray(recap.batch)
          ? recap.batch[0] ?? null
          : recap.batch ?? null;

      const rawMember =
        Array.isArray(recap.member)
          ? recap.member[0] ?? null
          : recap.member ?? null;

      return {
        recap_id:
          recap.id,
        member_id:
          recap.member_id,
        member_name:
          typeof rawMember?.name ===
          "string"
            ? rawMember.name
            : "",
        member_phone:
          typeof rawMember?.phone ===
          "string"
            ? rawMember.phone
            : "",
        detail_barang:
          recap.detail_barang,
        qty:
          Number(recap.qty),
        total_harga:
          Number(recap.total_harga),
        reference_date:
          recap.created_at,
        batch_id:
          rawBatch?.id ?? "",
        batch_name:
          rawBatch?.name ?? "",
        batch_country:
          rawBatch?.country ?? "",
        batch_status:
          rawBatch?.status ?? "",
        pelunasan_due_date:
          typeof rawBatch?.last_payment_pelunasan ===
          "string"
            ? rawBatch.last_payment_pelunasan
            : null,
      };
    });
}

/* =========================================
   GET MEMBER OPTIONS
========================================= */

/**
 * Mengambil seluruh member yang pernah muncul di Rekapan.
 */
export async function getMarketplaceMemberOptions(): Promise<MarketplaceMemberOption[]> {
  const { data: recaps, error: recapsError } = await supabase
    .from("recaps")
    .select("member_id");

  if (recapsError) {
    throw new Error(
      `Gagal mengambil data pembeli Marketplace: ${recapsError.message}`,
    );
  }

  const memberIds = Array.from(
    new Set(
      (recaps ?? [])
        .map((recap) => recap.member_id)
        .filter((memberId): memberId is string => typeof memberId === "string" && Boolean(memberId)),
    ),
  );

  if (memberIds.length === 0) {
    return [];
  }

  const { data: members, error: membersError } = await supabase
    .from("members")
    .select("id, name, phone")
    .in("id", memberIds)
    .order("name", { ascending: true });

  if (membersError) {
    throw new Error(
      `Gagal mengambil data pembeli Marketplace: ${membersError.message}`,
    );
  }

  return (members ?? []).map((member) => ({
    id: member.id,
    name: member.name,
    phone: member.phone,
  }));
}

/* =========================================
   VALIDATE RECAPS
========================================= */

async function validateMarketplaceRecaps(
  memberId: string,
  recapIds: string[],
): Promise<void> {
  const uniqueRecapIds =
    Array.from(
      new Set(
        recapIds
          .filter(
            (recapId) =>
              typeof recapId ===
              "string",
          )
          .map(
            (recapId) =>
              recapId.trim(),
          )
          .filter(Boolean),
      ),
    );

  if (
    uniqueRecapIds.length ===
    0
  ) {
    throw new Error(
      "Minimal pilih satu barang.",
    );
  }

  const {
    data: recaps,
    error: recapsError,
  } = await supabase
    .from("recaps")
    .select(`
      id,
      member_id,
      sudah_co,
      batch:batches (
        id,
        status,
        last_payment_pelunasan
      )
    `)
    .in(
      "id",
      uniqueRecapIds,
    );

  if (recapsError) {
    throw new Error(
      `Gagal memvalidasi barang: ${recapsError.message}`,
    );
  }

  if (
    !recaps ||
    recaps.length !==
      uniqueRecapIds.length
  ) {
    throw new Error(
      "Salah satu barang yang dipilih tidak ditemukan.",
    );
  }

  for (const recap of recaps) {
    if (
      recap.member_id !==
      memberId
    ) {
      throw new Error(
        "Barang yang dipilih bukan milik pembeli yang dipilih.",
      );
    }

    if (recap.sudah_co) {
      throw new Error(
        "Salah satu barang yang dipilih sudah CO.",
      );
    }

    const rawBatch =
      Array.isArray(recap.batch)
        ? recap.batch[0] ?? null
        : recap.batch ?? null;

    if (
      !rawBatch ||
      rawBatch.status !==
        ELIGIBLE_BATCH_STATUS
    ) {
      throw new Error(
        "Salah satu barang yang dipilih belum sampai di Admin.",
      );
    }

    if (
      isPastMaxTimbun(
        typeof rawBatch.last_payment_pelunasan ===
          "string"
          ? rawBatch.last_payment_pelunasan
          : null,
      )
    ) {
      throw new Error(
        "Salah satu barang yang dipilih sudah melewati masa timbun.",
      );
    }
  }

  /* -----------------------------------------
     PAYMENTS
  ----------------------------------------- */

  const {
    data: payments,
    error: paymentsError,
  } = await supabase
    .from("payments")
    .select(`
      recap_id,
      payment_type,
      status
    `)
    .in(
      "recap_id",
      uniqueRecapIds,
    );

  if (paymentsError) {
    throw new Error(
      `Gagal memvalidasi pembayaran: ${paymentsError.message}`,
    );
  }

  for (const recapId of
    uniqueRecapIds) {
    const recapPayments =
      (payments ?? [])
        .filter(
          (payment) =>
            payment.recap_id ===
            recapId,
        );

    if (
      !isPaymentPaid(
        recapPayments,
        "DP",
      )
    ) {
      throw new Error(
        "Salah satu barang yang dipilih belum memiliki DP yang dibayar.",
      );
    }

    if (
      !isPaymentPaid(
        recapPayments,
        "PELUNASAN",
      )
    ) {
      throw new Error(
        "Salah satu barang yang dipilih belum memiliki pelunasan yang dibayar.",
      );
    }
  }

  /* -----------------------------------------
     MARKETPLACE DUPLICATE
  ----------------------------------------- */

  const {
    data: existingItems,
    error: existingItemsError,
  } = await supabase
    .from("marketplace_order_items")
    .select("recap_id")
    .in(
      "recap_id",
      uniqueRecapIds,
    );

  if (existingItemsError) {
    throw new Error(
      `Gagal memeriksa pesanan Marketplace: ${existingItemsError.message}`,
    );
  }

  if (
    existingItems &&
    existingItems.length >
      0
  ) {
    throw new Error(
      "Salah satu barang yang dipilih sudah digunakan pada pesanan Marketplace lain.",
    );
  }

  /* -----------------------------------------
     MANUAL SHIPMENT DUPLICATE
  ----------------------------------------- */

  const {
    data: existingManualShipmentItems,
    error: existingManualShipmentItemsError,
  } = await supabase
    .from("manual_shipment_items")
    .select("recap_id")
    .in(
      "recap_id",
      uniqueRecapIds,
    );

  if (existingManualShipmentItemsError) {
    throw new Error(
      `Gagal memeriksa Pengiriman Manual: ${existingManualShipmentItemsError.message}`,
    );
  }

  if (
    existingManualShipmentItems &&
    existingManualShipmentItems.length >
      0
  ) {
    throw new Error(
      "Salah satu barang yang dipilih sudah digunakan pada Pengiriman Manual.",
    );
  }
}

/* =========================================
   CREATE MARKETPLACE ORDER
========================================= */

export async function createMarketplaceOrder(
  input: CreateMarketplaceOrderInput,
): Promise<MarketplaceOrder> {
  const memberId =
    input.member_id.trim();

  const orderNumber =
    input.order_number.trim();

  const recapIds =
    Array.from(
      new Set(
        input.recap_ids
          .filter(
            (recapId) =>
              typeof recapId ===
              "string",
          )
          .map(
            (recapId) =>
              recapId.trim(),
          )
          .filter(Boolean),
      ),
    );

  if (!orderNumber) {
    throw new Error(
      "Nomor pesanan wajib diisi.",
    );
  }

  if (
    recapIds.length ===
    0
  ) {
    throw new Error(
      "Minimal pilih satu barang.",
    );
  }

  /* -----------------------------------------
     VALIDATE MEMBER
  ----------------------------------------- */

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
    .eq("id", memberId)
    .maybeSingle();

  if (memberError) {
    throw new Error(
      `Gagal mengambil data member: ${memberError.message}`,
    );
  }

  if (!member) {
    throw new Error(
      "Member tidak ditemukan.",
    );
  }

  /* -----------------------------------------
     VALIDATE RECAPS
  ----------------------------------------- */

  await validateMarketplaceRecaps(
    memberId,
    recapIds,
  );

  /* -----------------------------------------
     CHECK ORDER NUMBER
  ----------------------------------------- */

  const {
    data: existingOrder,
    error: existingOrderError,
  } = await supabase
    .from("marketplace_orders")
    .select("id")
    .eq(
      "order_number",
      orderNumber,
    )
    .maybeSingle();

  if (existingOrderError) {
    throw new Error(
      `Gagal memeriksa nomor pesanan: ${existingOrderError.message}`,
    );
  }

  if (existingOrder) {
    throw new Error(
      "Nomor pesanan Marketplace sudah digunakan.",
    );
  }

  /* -----------------------------------------
     CREATE ORDER
  ----------------------------------------- */

  const {
    data: createdOrder,
    error: createOrderError,
  } = await supabase
    .from("marketplace_orders")
    .insert({
      order_number:
        orderNumber,
      member_id:
        memberId,
      status:
        "waiting",
    })
    .select(`
      id,
      order_number,
      member_id,
      status,
      created_at,
      updated_at
    `)
    .single();

  if (
    createOrderError ||
    !createdOrder
  ) {
    throw new Error(
      createOrderError?.message ??
        "Gagal membuat pesanan Marketplace.",
    );
  }

  /* -----------------------------------------
     CREATE ORDER ITEMS
  ----------------------------------------- */

  const {
    data: createdItems,
    error: createItemsError,
  } = await supabase
    .from(
      "marketplace_order_items",
    )
    .insert(
      recapIds.map(
        (recapId) => ({
          marketplace_order_id:
            createdOrder.id,
          recap_id:
            recapId,
        }),
      ),
    )
    .select(`
      id,
      marketplace_order_id,
      recap_id,
      created_at
    `);

  if (
    createItemsError ||
    !createdItems
  ) {
    /*
     * Rollback sederhana apabila
     * insert item gagal.
     */
    await supabase
      .from(
        "marketplace_orders",
      )
      .delete()
      .eq(
        "id",
        createdOrder.id,
      );

    throw new Error(
      createItemsError?.message ??
        "Gagal menyimpan barang pesanan Marketplace.",
    );
  }

  return {
    id:
      createdOrder.id,
    order_number:
      createdOrder.order_number,
    member_id:
      createdOrder.member_id,
    member_name:
      member.name,
    member_phone:
      member.phone,
    member_type:
      typeof member.type === "string"
        ? member.type
        : null,
    status:
      createdOrder.status as MarketplaceOrderStatus,
    created_at:
      createdOrder.created_at,
    updated_at:
      createdOrder.updated_at,
    items:
      createdItems.map(
        (item) => ({
          id: item.id,
          marketplace_order_id:
            item.marketplace_order_id,
          recap_id:
            item.recap_id,
          created_at:
            item.created_at,
        }),
      ),
  };
}

/* =========================================
   UPDATE MARKETPLACE ORDER STATUS
========================================= */

/**
 * Mengubah status pesanan Marketplace.
 *
 * Jika status berubah menjadi "processed"
 * (di UI ditampilkan sebagai "Sudah di pick up"),
 * seluruh recap yang terhubung dengan pesanan
 * akan otomatis diubah menjadi sudah_co = true.
 */
export async function updateMarketplaceOrderStatus(
  orderId: string,
  status: MarketplaceOrderStatus,
): Promise<MarketplaceOrder> {
  const trimmedOrderId = orderId.trim();

  if (!trimmedOrderId) {
    throw new Error(
      "ID pesanan Marketplace wajib diisi.",
    );
  }

  /* -----------------------------------------
     GET EXISTING ORDER
  ----------------------------------------- */

  const {
    data: existingOrder,
    error: existingOrderError,
  } = await supabase
    .from("marketplace_orders")
    .select(`
      id,
      order_number,
      member_id,
      status
    `)
    .eq("id", trimmedOrderId)
    .maybeSingle();

  if (existingOrderError) {
    throw new Error(
      `Gagal mengambil pesanan Marketplace: ${existingOrderError.message}`,
    );
  }

  if (!existingOrder) {
    throw new Error(
      "Pesanan Marketplace tidak ditemukan.",
    );
  }

  /* -----------------------------------------
     VALIDATE MEMBER
  ----------------------------------------- */

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("members")
    .select("type")
    .eq("id", existingOrder.member_id)
    .maybeSingle();

  if (memberError) {
    throw new Error(
      `Gagal mengambil data member Marketplace: ${memberError.message}`,
    );
  }

  if (member?.type === "hnr") {
    throw new Error(
      "Pesanan Marketplace milik member HNR tidak dapat diubah.",
    );
  }

  /* -----------------------------------------
     GET ORDER ITEMS
  ----------------------------------------- */

  const {
    data: orderItems,
    error: orderItemsError,
  } = await supabase
    .from("marketplace_order_items")
    .select("recap_id")
    .eq(
      "marketplace_order_id",
      trimmedOrderId,
    );

  if (orderItemsError) {
    throw new Error(
      `Gagal mengambil barang pesanan Marketplace: ${orderItemsError.message}`,
    );
  }

  const recapIds = Array.from(
    new Set(
      (orderItems ?? [])
        .map((item) => item.recap_id)
        .filter(
          (recapId): recapId is string =>
            typeof recapId === "string" &&
            Boolean(recapId),
        ),
    ),
  );

  /* -----------------------------------------
     UPDATE MARKETPLACE ORDER
  ----------------------------------------- */

  const {
    data: updatedOrder,
    error: updateOrderError,
  } = await supabase
    .from("marketplace_orders")
    .update({
      status,
    })
    .eq("id", trimmedOrderId)
    .select(`
      id,
      order_number,
      member_id,
      status,
      created_at,
      updated_at
    `)
    .single();

  if (updateOrderError || !updatedOrder) {
    throw new Error(
      updateOrderError?.message ??
        "Gagal mengubah status pesanan Marketplace.",
    );
  }

  /* -----------------------------------------
     AUTO CHECKOUT RECAPS
  ----------------------------------------- */

  if (
    status === "processed" &&
    recapIds.length > 0
  ) {
    const {
      error: updateRecapsError,
    } = await supabase
      .from("recaps")
      .update({
        sudah_co: true,
      })
      .in("id", recapIds);

    if (updateRecapsError) {
      /*
       * Rollback status order apabila
       * update CO pada Rekapan gagal.
       */
      await supabase
        .from("marketplace_orders")
        .update({
          status:
            existingOrder.status as MarketplaceOrderStatus,
        })
        .eq(
          "id",
          trimmedOrderId,
        );

      throw new Error(
        `Status pesanan berhasil diubah, tetapi gagal mengubah status CO Rekapan: ${updateRecapsError.message}`,
      );
    }
  }

  /* -----------------------------------------
     GET UPDATED ORDER
  ----------------------------------------- */

  const orders =
    await getMarketplaceOrders(
      existingOrder.member_id,
    );

  const result = orders.find(
    (order) => order.id === trimmedOrderId,
  );

  if (!result) {
    throw new Error(
      "Pesanan Marketplace berhasil diubah, tetapi data pesanan terbaru tidak dapat diambil.",
    );
  }

  return result;
}


/* =========================================
   DELETE MARKETPLACE ORDER
========================================= */

/**
 * Menghapus pesanan Marketplace.
 *
 * Item Marketplace yang terhubung dihapus terlebih dahulu,
 * kemudian pesanan Marketplace dihapus.
 *
 * Recap tidak diubah.
 * Jika pesanan sudah "processed", status CO pada Rekapan
 * tetap dipertahankan.
 */
export async function deleteMarketplaceOrder(
  orderId: string,
  customerMemberId?: string,
): Promise<void> {
  const trimmedOrderId = orderId.trim();

  if (!trimmedOrderId) {
    throw new Error(
      "ID pesanan Marketplace wajib diisi.",
    );
  }

  /* -----------------------------------------
     GET EXISTING ORDER
  ----------------------------------------- */

  const {
    data: existingOrder,
    error: existingOrderError,
  } = await supabase
    .from("marketplace_orders")
    .select(`
      id,
      member_id,
      status
    `)
    .eq("id", trimmedOrderId)
    .maybeSingle();

  if (existingOrderError) {
    throw new Error(
      `Gagal mengambil pesanan Marketplace: ${existingOrderError.message}`,
    );
  }

  if (!existingOrder) {
    throw new Error(
      "Pesanan Marketplace tidak ditemukan.",
    );
  }

  /* -----------------------------------------
     VALIDATE CUSTOMER OWNERSHIP
  ----------------------------------------- */

  if (
    customerMemberId &&
    existingOrder.member_id !==
      customerMemberId
  ) {
    throw new Error(
      "Pesanan Marketplace bukan milik customer yang sedang login.",
    );
  }

  /* -----------------------------------------
     VALIDATE MEMBER
  ----------------------------------------- */

  const {
    data: member,
    error: memberError,
  } = await supabase
    .from("members")
    .select("type")
    .eq("id", existingOrder.member_id)
    .maybeSingle();

  if (memberError) {
    throw new Error(
      `Gagal mengambil data member Marketplace: ${memberError.message}`,
    );
  }

  if (member?.type === "hnr") {
    throw new Error(
      "Pesanan Marketplace milik member HNR tidak dapat dihapus.",
    );
  }

  /* -----------------------------------------
     GET ORDER ITEMS
  ----------------------------------------- */

  const {
    data: orderItems,
    error: orderItemsError,
  } = await supabase
    .from("marketplace_order_items")
    .select(`
      id,
      marketplace_order_id,
      recap_id,
      created_at
    `)
    .eq(
      "marketplace_order_id",
      trimmedOrderId,
    );

  if (orderItemsError) {
    throw new Error(
      `Gagal mengambil barang pesanan Marketplace: ${orderItemsError.message}`,
    );
  }

  /* -----------------------------------------
     DELETE ORDER ITEMS
  ----------------------------------------- */

  if (
    orderItems &&
    orderItems.length > 0
  ) {
    const {
      error: deleteItemsError,
    } = await supabase
      .from("marketplace_order_items")
      .delete()
      .eq(
        "marketplace_order_id",
        trimmedOrderId,
      );

    if (deleteItemsError) {
      throw new Error(
        `Gagal menghapus barang pesanan Marketplace: ${deleteItemsError.message}`,
      );
    }
  }

  /* -----------------------------------------
     DELETE ORDER
  ----------------------------------------- */

  const {
    error: deleteOrderError,
  } = await supabase
    .from("marketplace_orders")
    .delete()
    .eq(
      "id",
      trimmedOrderId,
    );

  if (deleteOrderError) {
    /*
     * Coba kembalikan item apabila delete order gagal
     * setelah item berhasil dihapus.
     */
    if (
      orderItems &&
      orderItems.length > 0
    ) {
      await supabase
        .from("marketplace_order_items")
        .insert(
          orderItems.map(
            (item) => ({
              id: item.id,
              marketplace_order_id:
                item.marketplace_order_id,
              recap_id:
                item.recap_id,
              created_at:
                item.created_at,
            }),
          ),
        );
    }

    throw new Error(
      `Gagal menghapus pesanan Marketplace: ${deleteOrderError.message}`,
    );
  }
}